import { sql, ensureSchema, rowToProduct } from '../_lib/db.js';
import { setCors, handleOptions } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  await ensureSchema();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { barcode } = req.query;
  const rows = await sql`SELECT * FROM products WHERE barcode = ${barcode}`;
  if (rows.length === 0) return res.status(404).json({ error: 'No product found for this barcode' });
  res.json(rowToProduct(rows[0]));
}
