import { sql, ensureSchema, rowToProduct } from '../_lib/db.js';
import { setCors, handleOptions, requireOwner, requireUser, genId } from '../_lib/auth.js';
import { sendTelegramMessage, buildScanMessage } from '../_lib/telegram.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

function resolveAuth(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload;
  } catch { return null; }
}

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  await ensureSchema();

  if (req.method === 'GET') {
    const payload = resolveAuth(req);
    if (!payload) return res.status(401).json({ error: 'Missing authorization token' });
    if (payload.role === 'owner') {
      // Legacy owner view: all products (not user-scoped).
      const rows = await sql`SELECT * FROM products WHERE user_id IS NULL ORDER BY name ASC`;
      return res.json(rows.map(rowToProduct));
    }
    if (payload.role === 'user') {
      const rows = await sql`SELECT * FROM products WHERE user_id = ${payload.userId} ORDER BY name ASC`;
      return res.json(rows.map(rowToProduct));
    }
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'POST') {
    const user = requireUser(req, res);
    if (!user) return;

    const { barcode, name, sku, quantity, lowStockThreshold, category, unitPrice } = req.body;
    if (!barcode || !name) {
      return res.status(400).json({ error: 'Barcode and name are required' });
    }

    const existing = await sql`SELECT id FROM products WHERE barcode = ${barcode} AND user_id = ${user.userId}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A product with this barcode already exists in your inventory' });
    }

    const id = genId('prod');
    const qty = Number(quantity) || 0;
    const threshold = Number(lowStockThreshold) || 5;
    const price = Number(unitPrice) || 0;

    const rows = await sql`
      INSERT INTO products (id, barcode, name, sku, quantity, low_stock_threshold, category, unit_price, user_id)
      VALUES (${id}, ${barcode}, ${name}, ${sku || ''}, ${qty}, ${threshold}, ${category || 'General'}, ${price}, ${user.userId})
      RETURNING *
    `;
    const product = rowToProduct(rows[0]);

    const scanId = genId('scan');
    await sql`
      INSERT INTO scan_log (id, product_id, barcode, name, type, quantity_change, resulting_quantity, actor, user_id)
      VALUES (${scanId}, ${product.id}, ${product.barcode}, ${product.name}, 'created', ${qty}, ${qty}, 'owner', ${user.userId})
    `;

    await sendTelegramMessage(
      buildScanMessage({
        type: 'created',
        name: product.name,
        barcode: product.barcode,
        quantityChange: qty,
        resultingQuantity: qty,
        isLow: qty <= threshold,
        lowThreshold: threshold
      })
    );

    return res.status(201).json(product);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
