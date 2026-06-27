import { neon } from '@neondatabase/serverless';

// Vercel's Neon integration auto-injects DATABASE_URL (or POSTGRES_URL) once you
// connect a Postgres database to your project in the Vercel dashboard.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.warn('No DATABASE_URL/POSTGRES_URL found. Connect a Postgres database in Vercel.');
}

export const sql = neon(connectionString);

let initPromise = null;

// Creates tables if they don't exist yet, and seeds a default owner password.
// Safe to call on every request — it's a cheap no-op once tables exist.
export function ensureSchema() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        google_id TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        name TEXT,
        picture TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        barcode TEXT NOT NULL,
        name TEXT NOT NULL,
        sku TEXT DEFAULT '',
        quantity INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        category TEXT DEFAULT 'General',
        unit_price NUMERIC NOT NULL DEFAULT 0,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(barcode, user_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS scan_log (
        id TEXT PRIMARY KEY,
        product_id TEXT,
        barcode TEXT,
        name TEXT,
        type TEXT NOT NULL,
        quantity_change INTEGER NOT NULL,
        resulting_quantity INTEGER NOT NULL,
        actor TEXT NOT NULL DEFAULT 'worker',
        user_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `;

    // Seed the owner password (192121) only if it hasn't been set yet.
    const existing = await sql`SELECT value FROM settings WHERE key = 'owner_password_hash'`;
    if (existing.length === 0) {
      const bcrypt = await import('bcryptjs');
      const hash = bcrypt.default.hashSync('192121', 10);
      await sql`INSERT INTO settings (key, value) VALUES ('owner_password_hash', ${hash})`;
    }
  })();

  return initPromise;
}

export function rowToProduct(row) {
  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    sku: row.sku || '',
    quantity: row.quantity,
    lowStockThreshold: row.low_stock_threshold,
    category: row.category || 'General',
    unitPrice: Number(row.unit_price) || 0,
    updatedAt: row.updated_at
  };
}

export function rowToScanEntry(row) {
  return {
    id: row.id,
    productId: row.product_id,
    barcode: row.barcode,
    name: row.name,
    type: row.type,
    quantityChange: row.quantity_change,
    resultingQuantity: row.resulting_quantity,
    actor: row.actor,
    timestamp: row.created_at
  };
}
