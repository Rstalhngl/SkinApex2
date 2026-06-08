import { Pool, type PoolClient, type QueryResultRow } from "pg"

let pool: Pool | null = null
let schemaReady: Promise<void> | null = null

export function isDbEnabled(): boolean {
  return !!process.env.DATABASE_URL?.trim()
}

function getPool(): Pool {
  if (!isDbEnabled()) throw new Error("DATABASE_URL is not configured")
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
    })
  }
  return pool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  await ensureSchema()
  return getPool().query<T>(text, params)
}

async function initSchema(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS counters (
      name TEXT PRIMARY KEY,
      value BIGINT NOT NULL DEFAULT 1
    );

    INSERT INTO counters (name, value) VALUES
      ('listing_id', 1),
      ('sale_id', 1),
      ('offer_id', 1),
      ('notification_id', 1),
      ('wallet_tx_id', 1)
    ON CONFLICT (name) DO NOTHING;

    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallets (
      steam_id TEXT PRIMARY KEY,
      balance NUMERIC(12, 2) NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      steam_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      balance_after NUMERIC(12, 2) NOT NULL,
      ref_id TEXT,
      note TEXT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      steam_id TEXT PRIMARY KEY,
      trade_url TEXT,
      cart_listing_ids JSONB NOT NULL DEFAULT '[]',
      wishlist_listing_ids JSONB NOT NULL DEFAULT '[]',
      listing_banned_until BIGINT
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS listing_banned_until BIGINT;

    CREATE INDEX IF NOT EXISTS idx_listings_status ON listings ((payload->>'status'));
    CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings ((payload->>'sellerId'));
    CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales ((payload->>'sellerId'));
    CREATE INDEX IF NOT EXISTS idx_sales_buyer ON sales ((payload->>'buyerId'));
    CREATE INDEX IF NOT EXISTS idx_offers_seller ON offers ((payload->>'sellerId'));
    CREATE INDEX IF NOT EXISTS idx_offers_buyer ON offers ((payload->>'buyerId'));
    CREATE INDEX IF NOT EXISTS idx_notifications_steam ON notifications ((payload->>'steamId'));
    CREATE INDEX IF NOT EXISTS idx_wallet_tx_steam ON wallet_transactions (steam_id, created_at DESC);
  `)
}

export async function ensureSchema(): Promise<void> {
  if (!isDbEnabled()) return
  if (!schemaReady) schemaReady = initSchema()
  await schemaReady
}

export async function getCounter(name: string): Promise<number> {
  const res = await query<{ value: string }>(
    "SELECT value FROM counters WHERE name = $1",
    [name],
  )
  return Number(res.rows[0]?.value ?? 1)
}

export async function setCounter(name: string, value: number): Promise<void> {
  await query(
    `INSERT INTO counters (name, value) VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value`,
    [name, value],
  )
}

export async function bumpCounter(name: string): Promise<number> {
  const res = await query<{ value: string }>(
    `UPDATE counters SET value = value + 1 WHERE name = $1 RETURNING value`,
    [name],
  )
  return Number(res.rows[0]?.value ?? 1)
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  await ensureSchema()
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    const result = await fn(client)
    await client.query("COMMIT")
    return result
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}
