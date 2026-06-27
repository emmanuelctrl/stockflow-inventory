import { sql, ensureSchema, rowToProduct } from '../_lib/db.js';
import { setCors, handleOptions, genId, requireUser } from '../_lib/auth.js';
import { sendTelegramMessage, buildScanMessage } from '../_lib/telegram.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();

  const { barcode, type, amount, name, category } = req.body;
  if (!barcode || !type) return res.status(400).json({ error: 'Barcode and type are required' });
  if (!['add', 'remove'].includes(type)) return res.status(400).json({ error: 'Type must be add or remove' });

  const user = requireUser(req, res);
  if (!user) return;
  const actor = type === 'add' ? 'owner' : 'worker';

  const qty = Math.max(1, Number(amount) || 1);
  let rows = await sql`SELECT * FROM products WHERE barcode = ${barcode} AND user_id = ${user.userId}`;
  let product;
  let wasCreated = false;

  if (rows.length === 0) {
    if (type === 'remove') {
      return res.status(404).json({ error: 'No product found for this barcode. Cannot remove stock for an unknown item.' });
    }
    const id = genId('prod');
    const inserted = await sql`
      INSERT INTO products (id, barcode, name, sku, quantity, low_stock_threshold, category, unit_price, user_id)
      VALUES (${id}, ${barcode}, ${name || `Unnamed item (${barcode})`}, '', 0, 5, ${category || 'Uncategorized'}, 0, ${user.userId})
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
    WHERE id = ${product.id} AND user_id = ${user.userId}
    RETURNING *
  `;
  product = rowToProduct(updated[0]);

  const quantityChange = type === 'add' ? qty : -qty;
  const scanId = genId('scan');
  const logType = wasCreated ? 'created' : type;
  await sql`
    INSERT INTO scan_log (id, product_id, barcode, name, type, quantity_change, resulting_quantity, actor, user_id)
    VALUES (${scanId}, ${product.id}, ${product.barcode}, ${product.name}, ${logType}, ${quantityChange}, ${product.quantity}, ${actor}, ${user.userId})
  `;

  const isLow = product.quantity <= product.lowStockThreshold;

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
