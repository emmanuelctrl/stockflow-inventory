import { sql, ensureSchema, rowToScanEntry } from './_lib/db.js';
import { setCors, handleOptions } from './_lib/auth.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authorization token' });

  let payload;
  try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: 'Invalid token' }); }

  const limit = Number(req.query.limit) || 50;

  if (payload.role === 'owner') {
    const rows = await sql`SELECT * FROM scan_log WHERE user_id IS NULL ORDER BY created_at DESC LIMIT ${limit}`;
    return res.json(rows.map(rowToScanEntry));
  }

  if (payload.role === 'user') {
    const rows = await sql`SELECT * FROM scan_log WHERE user_id = ${payload.userId} ORDER BY created_at DESC LIMIT ${limit}`;
    return res.json(rows.map(rowToScanEntry));
  }

  return res.status(403).json({ error: 'Forbidden' });
}
