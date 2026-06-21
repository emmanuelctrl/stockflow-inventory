import { sql, ensureSchema, rowToProduct } from '../_lib/db.js';
import { setCors, handleOptions, requireOwner, genId } from '../_lib/auth.js';
import { sendTelegramMessage, buildScanMessage } from '../_lib/telegram.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  await ensureSchema();

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM products ORDER BY name ASC`;
    return res.json(rows.map(rowToProduct));
  }

  if (req.method === 'POST') {
    const owner = requireOwner(req, res);
    if (!owner) return;

    const { barcode, name, sku, quantity, lowStockThreshold, category, unitPrice } = req.body;
    if (!barcode || !name) {
      return res.status(400).json({ error: 'Barcode and name are required' });
    }

    const existing = await sql`SELECT id FROM products WHERE barcode = ${barcode}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A product with this barcode already exists' });
    }

    const id = genId('prod');
    const qty = Number(quantity) || 0;
    const threshold = Number(lowStockThreshold) || 5;
    const price = Number(unitPrice) || 0;

    const rows = await sql`
      INSERT INTO products (id, barcode, name, sku, quantity, low_stock_threshold, category, unit_price)
      VALUES (${id}, ${barcode}, ${name}, ${sku || ''}, ${qty}, ${threshold}, ${category || 'General'}, ${price})
      RETURNING *
    `;
    const product = rowToProduct(rows[0]);

    const scanId = genId('scan');
    await sql`
      INSERT INTO scan_log (id, product_id, barcode, name, type, quantity_change, resulting_quantity, actor)
      VALUES (${scanId}, ${product.id}, ${product.barcode}, ${product.name}, 'created', ${qty}, ${qty}, 'owner')
    `;

    await sendTelegramMessage(
      buildScanMessage({
        type: 'created',
        name: product.name,
        barcode: product.barcode,
        quantityChange: qty,
        resultingQuantity: qty,
        isLow: qty <= threshold,
        lowThreshold: threshold
      })
    );

    return res.status(201).json(product);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
