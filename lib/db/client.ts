import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS weeks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    director_token TEXT,
    created_at TEXT NOT NULL,
    closed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL REFERENCES weeks(id),
    reservation_id TEXT,
    guest_name TEXT,
    description TEXT,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    raw_row TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS bank_records (
    id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL REFERENCES weeks(id),
    bank_source TEXT NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    raw_row TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS exceptions (
    id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL REFERENCES weeks(id),
    type TEXT NOT NULL,
    reservation_id TEXT,
    guest_name TEXT,
    original_amount REAL,
    final_amount REAL,
    discount_amount REAL,
    discount_pct REAL,
    reason TEXT,
    source TEXT NOT NULL,
    source_raw TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL REFERENCES weeks(id),
    entry_id TEXT REFERENCES entries(id),
    bank_record_id TEXT REFERENCES bank_records(id),
    exception_id TEXT REFERENCES exceptions(id),
    status TEXT NOT NULL,
    match_type TEXT NOT NULL,
    confidence REAL,
    date_diff_days INTEGER,
    amount_diff REAL,
    notes TEXT,
    admin_note TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_entries_week ON entries(week_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bank_week ON bank_records(week_id)`,
  `CREATE INDEX IF NOT EXISTS idx_exceptions_week ON exceptions(week_id)`,
  `CREATE INDEX IF NOT EXISTS idx_matches_week ON matches(week_id)`,
];

const globalMigrationState = globalThis as typeof globalThis & {
  __EZ_MIGRATION_PROMISE__?: Promise<void>;
};

async function getDbFromRequestContext(): Promise<D1Database> {
  const context = await getCloudflareContext({ async: true });
  const db = context?.env?.DB as D1Database | undefined;

  if (!db) {
    throw new Error(
      "Binding DB (D1) não encontrado. Em dev, inicialize o ambiente Cloudflare com next-dev/wrangler.",
    );
  }

  return db;
}

export async function getDb() {
  const db = await getDbFromRequestContext();

  if (!globalMigrationState.__EZ_MIGRATION_PROMISE__) {
    globalMigrationState.__EZ_MIGRATION_PROMISE__ = (async () => {
      await db.prepare("PRAGMA foreign_keys = ON;").run();
      for (const sql of MIGRATIONS) {
        await db.prepare(sql).run();
      }
    })();
  }

  await globalMigrationState.__EZ_MIGRATION_PROMISE__;
  return db;
}
