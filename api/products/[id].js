import { sql, ensureSchema, rowToProduct } from '../_lib/db.js';
import { setCors, handleOptions, requireUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  await ensureSchema();

  const { id } = req.query;

  if (req.method === 'PUT') {
    const user = requireUser(req, res);
    if (!user) return;

    const existing = await sql`SELECT * FROM products WHERE id = ${id} AND user_id = ${user.userId}`;
    if (existing.length === 0) return res.status(404).json({ error: 'Product not found' });

    const current = rowToProduct(existing[0]);
    const { name, sku, quantity, lowStockThreshold, category, unitPrice, barcode } = req.body;

    const updated = {
      name: name !== undefined ? name : current.name,
      sku: sku !== undefined ? sku : current.sku,
      quantity: quantity !== undefined ? Number(quantity) : current.quantity,
      lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : current.lowStockThreshold,
      category: category !== undefined ? category : current.category,
      unitPrice: unitPrice !== undefined ? Number(unitPrice) : current.unitPrice,
      barcode: barcode !== undefined ? barcode : current.barcode
    };

    const rows = await sql`
      UPDATE products SET
        name = ${updated.name},
        sku = ${updated.sku},
        quantity = ${updated.quantity},
        low_stock_threshold = ${updated.lowStockThreshold},
        category = ${updated.category},
        unit_price = ${updated.unitPrice},
        barcode = ${updated.barcode},
        updated_at = now()
      WHERE id = ${id} AND user_id = ${user.userId}
      RETURNING *
    `;
    return res.json(rowToProduct(rows[0]));
  }

  if (req.method === 'DELETE') {
    const user = requireUser(req, res);
    if (!user) return;

    const result = await sql`DELETE FROM products WHERE id = ${id} AND user_id = ${user.userId} RETURNING id`;
    if (result.length === 0) return res.status(404).json({ error: 'Product not found' });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
