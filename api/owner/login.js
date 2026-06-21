import bcrypt from 'bcryptjs';
import { sql, ensureSchema } from '../_lib/db.js';
import { setCors, handleOptions, signOwnerToken } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();

  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required' });

  const rows = await sql`SELECT value FROM settings WHERE key = 'owner_password_hash'`;
  if (rows.length === 0) return res.status(500).json({ error: 'Owner password is not configured' });

  const match = await bcrypt.compare(password, rows[0].value);
  if (!match) return res.status(401).json({ error: 'Incorrect password' });

  res.json({ token: signOwnerToken() });
}
