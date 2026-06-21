import bcrypt from 'bcryptjs';
import { sql, ensureSchema } from '../_lib/db.js';
import { setCors, handleOptions, requireOwner } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();
  const owner = requireOwner(req, res);
  if (!owner) return;

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }

  const rows = await sql`SELECT value FROM settings WHERE key = 'owner_password_hash'`;
  const match = await bcrypt.compare(currentPassword, rows[0].value);
  if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

  const newHash = await bcrypt.hash(newPassword, 10);
  await sql`
    INSERT INTO settings (key, value) VALUES ('owner_password_hash', ${newHash})
    ON CONFLICT (key) DO UPDATE SET value = ${newHash}
  `;

  res.json({ success: true });
}
