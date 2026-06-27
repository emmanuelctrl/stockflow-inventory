import { sql, ensureSchema } from '../_lib/db.js';
import { setCors, handleOptions, signUserToken, genId } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  await ensureSchema();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing Google credential' });

  // Verify the Google ID token via Google's tokeninfo endpoint.
  const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
  if (!verifyRes.ok) return res.status(401).json({ error: 'Invalid Google token' });

  const googleUser = await verifyRes.json();
  if (googleUser.error_description) return res.status(401).json({ error: googleUser.error_description });

  const { sub: googleId, email, name, picture } = googleUser;
  if (!googleId || !email) return res.status(401).json({ error: 'Incomplete Google profile' });

  // Upsert user record.
  let rows = await sql`SELECT id FROM users WHERE google_id = ${googleId}`;
  let userId;
  if (rows.length > 0) {
    userId = rows[0].id;
    await sql`UPDATE users SET email = ${email}, name = ${name || ''}, picture = ${picture || ''} WHERE id = ${userId}`;
  } else {
    userId = genId('usr');
    await sql`INSERT INTO users (id, google_id, email, name, picture) VALUES (${userId}, ${googleId}, ${email}, ${name || ''}, ${picture || ''})`;
  }

  const token = signUserToken(userId, email, name || '', picture || '');
  return res.json({ token, user: { id: userId, email, name, picture } });
}
