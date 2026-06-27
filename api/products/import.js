import { sql, ensureSchema, rowToProduct } from '../_lib/db.js';
import { setCors, handleOptions, requireUser, genId } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  await ensureSchema();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireUser(req, res);
  if (!user) return;

  const { products } = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'No products provided' });
  }

  const results = { inserted: 0, skipped: 0, errors: [] };

  for (const item of products) {
    const { barcode, name, sku, quantity, lowStockThreshold, category, unitPrice } = item;
    if (!barcode || !name) {
      results.errors.push({ row: name || barcode || '?', reason: 'Missing barcode or name' });
      continue;
    }

    const existing = await sql`SELECT id FROM products WHERE barcode = ${String(barcode)} AND user_id = ${user.userId}`;
    if (existing.length > 0) {
      results.skipped++;
      continue;
    }

    const id = genId('prod');
    const qty = Number(quantity) || 0;
    const threshold = Number(lowStockThreshold) || 5;
    const price = Number(unitPrice) || 0;

    try {
      await sql`
        INSERT INTO products (id, barcode, name, sku, quantity, low_stock_threshold, category, unit_price, user_id)
        VALUES (${id}, ${String(barcode)}, ${String(name)}, ${sku || ''}, ${qty}, ${threshold}, ${category || 'General'}, ${price}, ${user.userId})
      `;

      const scanId = genId('scan');
      await sql`
        INSERT INTO scan_log (id, product_id, barcode, name, type, quantity_change, resulting_quantity, actor, user_id)
        VALUES (${scanId}, ${id}, ${String(barcode)}, ${String(name)}, 'created', ${qty}, ${qty}, 'import', ${user.userId})
      `;

      results.inserted++;
    } catch (err) {
      results.errors.push({ row: name, reason: err.message });
    }
  }

  return res.json(results);
}
