import { sql, ensureSchema, rowToProduct } from '../_lib/db.js';
import { setCors, handleOptions } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();

  const { barcode } = req.body;
  if (!barcode) return res.status(400).json({ error: 'Barcode is required' });

  const rows = await sql`SELECT * FROM products WHERE barcode = ${barcode}`;
  if (rows.length === 0) return res.json({ found: false, barcode });
  res.json({ found: true, product: rowToProduct(rows[0]) });
}
