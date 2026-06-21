import { setCors, handleOptions } from './_lib/auth.js';

export default function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  res.json({ status: 'ok' });
}
