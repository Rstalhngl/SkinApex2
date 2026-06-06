#!/usr/bin/env node
/**
 * One-time migration: import existing data/*.json into PostgreSQL.
 * Usage: DATABASE_URL=postgres://... node scripts/migrate-json-to-pg.mjs
 */
import { readFile, access } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import pg from "pg"

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, "..", "data")

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const pool = new Pool({ connectionString: url })

async function readJson(name) {
  const p = path.join(dataDir, name)
  try {
    await access(p)
    return JSON.parse(await readFile(p, "utf-8"))
  } catch {
    return null
  }
}

async function main() {
  console.log("Creating schema...")
  await pool.query(`
    CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value BIGINT NOT NULL DEFAULT 1);
    INSERT INTO counters (name, value) VALUES
      ('listing_id', 1), ('sale_id', 1), ('offer_id', 1),
      ('notification_id', 1), ('wallet_tx_id', 1)
    ON CONFLICT DO NOTHING;
    CREATE TABLE IF NOT EXISTS listings (id TEXT PRIMARY KEY, payload JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, payload JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS offers (id TEXT PRIMARY KEY, payload JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, payload JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS wallets (steam_id TEXT PRIMARY KEY, balance NUMERIC(12,2) NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY, steam_id TEXT NOT NULL, type TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL, balance_after NUMERIC(12,2) NOT NULL,
      ref_id TEXT, note TEXT, created_at BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      steam_id TEXT PRIMARY KEY, trade_url TEXT,
      cart_listing_ids JSONB NOT NULL DEFAULT '[]',
      wishlist_listing_ids JSONB NOT NULL DEFAULT '[]'
    );
  `)

  const listings = await readJson("listings.json")
  if (listings?.listings?.length) {
    for (const l of listings.listings) {
      await pool.query(
        `INSERT INTO listings (id, payload) VALUES ($1, $2::jsonb) ON CONFLICT DO NOTHING`,
        [l.id, JSON.stringify(l)],
      )
    }
    await pool.query(
      `UPDATE counters SET value = $1 WHERE name = 'listing_id'`,
      [listings.nextId ?? 1],
    )
    console.log(`Migrated ${listings.listings.length} listings`)
  }

  const sales = await readJson("sales.json")
  if (sales?.sales?.length) {
    for (const s of sales.sales) {
      await pool.query(
        `INSERT INTO sales (id, payload) VALUES ($1, $2::jsonb) ON CONFLICT DO NOTHING`,
        [s.id, JSON.stringify(s)],
      )
    }
    await pool.query(`UPDATE counters SET value = $1 WHERE name = 'sale_id'`, [sales.nextId ?? 1])
    console.log(`Migrated ${sales.sales.length} sales`)
  }

  const offers = await readJson("offers.json")
  if (offers?.offers?.length) {
    for (const o of offers.offers) {
      await pool.query(
        `INSERT INTO offers (id, payload) VALUES ($1, $2::jsonb) ON CONFLICT DO NOTHING`,
        [o.id, JSON.stringify(o)],
      )
    }
    await pool.query(`UPDATE counters SET value = $1 WHERE name = 'offer_id'`, [offers.nextId ?? 1])
    console.log(`Migrated ${offers.offers.length} offers`)
  }

  const notifications = await readJson("notifications.json")
  if (notifications?.notifications?.length) {
    for (const n of notifications.notifications) {
      await pool.query(
        `INSERT INTO notifications (id, payload) VALUES ($1, $2::jsonb) ON CONFLICT DO NOTHING`,
        [n.id, JSON.stringify(n)],
      )
    }
    await pool.query(
      `UPDATE counters SET value = $1 WHERE name = 'notification_id'`,
      [notifications.nextId ?? 1],
    )
    console.log(`Migrated ${notifications.notifications.length} notifications`)
  }

  const wallets = await readJson("wallets.json")
  if (wallets?.wallets) {
    for (const [steamId, entry] of Object.entries(wallets.wallets)) {
      await pool.query(
        `INSERT INTO wallets (steam_id, balance) VALUES ($1, $2)
         ON CONFLICT (steam_id) DO UPDATE SET balance = EXCLUDED.balance`,
        [steamId, entry.balance ?? 0],
      )
    }
    if (wallets.transactions?.length) {
      for (const tx of wallets.transactions) {
        await pool.query(
          `INSERT INTO wallet_transactions
            (id, steam_id, type, amount, balance_after, ref_id, note, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
          [tx.id, tx.steamId, tx.type, tx.amount, tx.balanceAfter, tx.refId ?? null, tx.note ?? null, tx.createdAt],
        )
      }
    }
    await pool.query(
      `UPDATE counters SET value = $1 WHERE name = 'wallet_tx_id'`,
      [wallets.nextTxId ?? 1],
    )
    console.log(`Migrated wallets for ${Object.keys(wallets.wallets).length} users`)
  }

  const users = await readJson("users.json")
  if (users?.users) {
    for (const [steamId, u] of Object.entries(users.users)) {
      await pool.query(
        `INSERT INTO users (steam_id, trade_url, cart_listing_ids, wishlist_listing_ids)
         VALUES ($1, $2, $3::jsonb, $4::jsonb)
         ON CONFLICT (steam_id) DO UPDATE SET
           trade_url = EXCLUDED.trade_url,
           cart_listing_ids = EXCLUDED.cart_listing_ids,
           wishlist_listing_ids = EXCLUDED.wishlist_listing_ids`,
        [steamId, u.tradeUrl ?? null, JSON.stringify(u.cartListingIds ?? []), JSON.stringify(u.wishlistListingIds ?? [])],
      )
    }
    console.log(`Migrated ${Object.keys(users.users).length} users`)
  }

  console.log("Migration complete.")
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
