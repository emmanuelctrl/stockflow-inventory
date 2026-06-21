import { sql, ensureSchema, rowToScanEntry } from './_lib/db.js';
import { setCors, handleOptions } from './_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();

  const limit = Number(req.query.limit) || 50;
  const rows = await sql`SELECT * FROM scan_log ORDER BY created_at DESC LIMIT ${limit}`;
  res.json(rows.map(rowToScanEntry));
}
