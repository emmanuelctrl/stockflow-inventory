import { sql, ensureSchema, rowToProduct } from '../_lib/db.js';
import { setCors, handleOptions, genId, requireOwner } from '../_lib/auth.js';
import { sendTelegramMessage, buildScanMessage } from '../_lib/telegram.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();

  const { barcode, type, amount, name, category } = req.body;
  if (!barcode || !type) return res.status(400).json({ error: 'Barcode and type are required' });
  if (!['add', 'remove'].includes(type)) return res.status(400).json({ error: 'Type must be add or remove' });

  // Adding stock (and creating new products) is an owner-only action.
  // The worker-facing scanner only ever sends type "remove", which stays
  // open with no auth required so it works on the shop floor without a login.
  let actor = 'worker';
  if (type === 'add') {
    const owner = requireOwner(req, res);
    if (!owner) return;
    actor = 'owner';
  }

  const qty = Math.max(1, Number(amount) || 1);
  let rows = await sql`SELECT * FROM products WHERE barcode = ${barcode}`;
  let product;
  let wasCreated = false;

  if (rows.length === 0) {
    if (type === 'remove') {
      return res.status(404).json({ error: 'No product found for this barcode. Cannot remove stock for an unknown item.' });
    }
    const id = genId('prod');
    const inserted = await sql`
      INSERT INTO products (id, barcode, name, sku, quantity, low_stock_threshold, category, unit_price)
      VALUES (${id}, ${barcode}, ${name || `Unnamed item (${barcode})`}, '', 0, 5, ${category || 'Uncategorized'}, 0)
      RETURNING *
    `;
    product = rowToProduct(inserted[0]);
    wasCreated = true;
  } else {
    product = rowToProduct(rows[0]);
  }

  const newQuantity = type === 'add' ? product.quantity + qty : Math.max(0, product.quantity - qty);

  const updated = await sql`
    UPDATE products SET quantity = ${newQuantity}, updated_at = now()
    WHERE id = ${product.id}
    RETURNING *
  `;
  product = rowToProduct(updated[0]);

  const quantityChange = type === 'add' ? qty : -qty;
  const scanId = genId('scan');
  const logType = wasCreated ? 'created' : type;
  await sql`
    INSERT INTO scan_log (id, product_id, barcode, name, type, quantity_change, resulting_quantity, actor)
    VALUES (${scanId}, ${product.id}, ${product.barcode}, ${product.name}, ${logType}, ${quantityChange}, ${product.quantity}, ${actor})
  `;

  const isLow = product.quantity <= product.lowStockThreshold;

  // Fire-and-forget-ish: we await it so logs show failures, but a Telegram
  // failure never blocks or fails the actual inventory update above.
  await sendTelegramMessage(
    buildScanMessage({
      type: logType,
      name: product.name,
      barcode: product.barcode,
      quantityChange,
      resultingQuantity: product.quantity,
      isLow,
      lowThreshold: product.lowStockThreshold
    })
  );

  res.json({ success: true, product });
}
