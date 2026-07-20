import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'

let db: Database.Database | null = null
let dbUserDataPath: string | null = null

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    token TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    category TEXT,
    action TEXT NOT NULL,
    buy_price REAL,
    sell_price REAL,
    margin REAL,
    notes TEXT,
    transfer_to TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS watch_filters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    params_json TEXT NOT NULL,
    is_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config_json TEXT NOT NULL,
    interval_minutes INTEGER DEFAULT 60,
    is_enabled INTEGER DEFAULT 1,
    last_run_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL UNIQUE,
    title TEXT,
    price REAL,
    target_price REAL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS upload_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL,
    item_id INTEGER,
    category TEXT,
    status TEXT NOT NULL,
    message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS seen_listings (
    item_id INTEGER PRIMARY KEY,
    seen_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS listing_tracking (
    item_id INTEGER PRIMARY KEY,
    price REAL,
    listed_at TEXT DEFAULT (datetime('now')),
    last_repriced_at TEXT
  );

  CREATE TABLE IF NOT EXISTS monitor_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    conditions_json TEXT NOT NULL,
    actions_json TEXT NOT NULL,
    is_enabled INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS buyer_blacklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(type, value)
  );

  CREATE TABLE IF NOT EXISTS autobuy_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    price REAL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS upload_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    origin TEXT DEFAULT 'personal',
    price_formula TEXT DEFAULT '500',
    title_template TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`

function migrate(database: Database.Database): void {
  const dealCols = database.prepare("PRAGMA table_info(deals)").all() as Array<{ name: string }>
  if (!dealCols.some((c) => c.name === 'transfer_to')) {
    database.exec('ALTER TABLE deals ADD COLUMN transfer_to TEXT')
  }

  const taskCols = database.prepare("PRAGMA table_info(scheduled_tasks)").all() as Array<{ name: string }>
  if (taskCols.some((c) => c.name === 'cron_expr')) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_tasks_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        config_json TEXT NOT NULL,
        interval_minutes INTEGER DEFAULT 60,
        is_enabled INTEGER DEFAULT 1,
        last_run_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO scheduled_tasks_new (id, name, type, config_json, is_enabled, last_run_at, created_at)
        SELECT id, name, type, config_json, is_enabled, last_run_at, created_at FROM scheduled_tasks;
      DROP TABLE scheduled_tasks;
      ALTER TABLE scheduled_tasks_new RENAME TO scheduled_tasks;
    `)
  } else if (!taskCols.some((c) => c.name === 'interval_minutes')) {
    database.exec('ALTER TABLE scheduled_tasks ADD COLUMN interval_minutes INTEGER DEFAULT 60')
  }

  const accountCount = database.prepare('SELECT COUNT(*) as c FROM accounts').get() as { c: number }
  if (accountCount.c > 1) {
    const active = database.prepare('SELECT id FROM accounts WHERE is_active = 1 LIMIT 1').get() as
      | { id: number }
      | undefined
    const fallback = database.prepare('SELECT id FROM accounts ORDER BY id LIMIT 1').get() as { id: number }
    const keepId = active?.id ?? fallback.id
    database.prepare('DELETE FROM accounts WHERE id != ?').run(keepId)
    database.prepare('UPDATE accounts SET is_active = 1 WHERE id = ?').run(keepId)
  }

  const uploadCols = database.prepare("PRAGMA table_info(upload_history)").all() as Array<{ name: string }>
  if (!uploadCols.some((c) => c.name === 'initial_price')) {
    database.exec('ALTER TABLE upload_history ADD COLUMN initial_price REAL')
  }
  if (!uploadCols.some((c) => c.name === 'current_price')) {
    database.exec('ALTER TABLE upload_history ADD COLUMN current_price REAL')
  }
  if (!uploadCols.some((c) => c.name === 'price_updated_at')) {
    database.exec('ALTER TABLE upload_history ADD COLUMN price_updated_at TEXT')
  }

  const dealCols2 = database.prepare('PRAGMA table_info(deals)').all() as Array<{ name: string }>
  if (!dealCols2.some((c) => c.name === 'source')) {
    database.exec("ALTER TABLE deals ADD COLUMN source TEXT DEFAULT 'flip'")
  }
  if (!dealCols2.some((c) => c.name === 'parent_deal_id')) {
    database.exec('ALTER TABLE deals ADD COLUMN parent_deal_id INTEGER')
  }

  const taskCols2 = database.prepare('PRAGMA table_info(scheduled_tasks)').all() as Array<{ name: string }>
  if (!taskCols2.some((c) => c.name === 'last_error')) {
    database.exec('ALTER TABLE scheduled_tasks ADD COLUMN last_error TEXT')
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS competitor_prices (
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      title TEXT,
      price REAL NOT NULL,
      captured_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, item_id)
    );
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS competitor_watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      label TEXT,
      username TEXT,
      is_enabled INTEGER DEFAULT 1,
      last_sync_at TEXT,
      listing_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS listing_matches (
      our_item_id INTEGER NOT NULL,
      competitor_user_id TEXT NOT NULL,
      competitor_item_id INTEGER NOT NULL,
      match_score REAL NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (our_item_id, competitor_user_id, competitor_item_id)
    );
    CREATE INDEX IF NOT EXISTS idx_listing_matches_competitor ON listing_matches(competitor_user_id);
  `)

  const listingCols = database.prepare('PRAGMA table_info(listing_tracking)').all() as Array<{ name: string }>
  if (!listingCols.some((c) => c.name === 'title')) {
    database.exec('ALTER TABLE listing_tracking ADD COLUMN title TEXT')
  }
  if (!listingCols.some((c) => c.name === 'category')) {
    database.exec('ALTER TABLE listing_tracking ADD COLUMN category TEXT')
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS invoice_webhook_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload_json TEXT NOT NULL,
      payment_key TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS imap_configs (
      domain TEXT PRIMARY KEY,
      imap_host TEXT NOT NULL,
      imap_port INTEGER NOT NULL DEFAULT 993,
      imap_ssl INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)

  database.exec(`
    UPDATE upload_history SET status = 'error' WHERE status = 'failed';
  `)
}

const BACKUP_KEEP = 7
const BACKUP_MIN_INTERVAL_MS = 20 * 60 * 60 * 1000

function backupDatabase(userDataPath: string, database: Database.Database): void {
  try {
    const dir = join(userDataPath, 'backups')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    const backups = readdirSync(dir)
      .filter((f) => f.startsWith('lzt-market-hub-') && f.endsWith('.db'))
      .map((f) => ({ name: f, mtime: statSync(join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)

    if (backups.length > 0 && Date.now() - backups[0].mtime < BACKUP_MIN_INTERVAL_MS) return

    const stamp = new Date().toISOString().slice(0, 10)
    void database
      .backup(join(dir, `lzt-market-hub-${stamp}.db`))
      .then(() => {
        for (const old of backups.slice(BACKUP_KEEP - 1)) {
          try {
            unlinkSync(join(dir, old.name))
          } catch {
          }
        }
      })
      .catch(() => undefined)
  } catch {
  }
}

function cleanupOldRows(database: Database.Database): void {
  try {
    database.exec(`
      DELETE FROM activity_log WHERE created_at < datetime('now', '-90 days');
      DELETE FROM seen_listings WHERE seen_at < datetime('now', '-30 days');
      DELETE FROM invoice_webhook_log WHERE created_at < datetime('now', '-90 days');
      DELETE FROM autobuy_log WHERE created_at < datetime('now', '-180 days');
    `)
  } catch {
  }
}

export function initDatabase(userDataPath: string): Database.Database {
  const dbPath = join(userDataPath, 'lzt-market-hub.db')
  dbUserDataPath = userDataPath
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('busy_timeout = 5000')
  db.exec(SCHEMA)
  migrate(db)
  cleanupOldRows(db)
  backupDatabase(userDataPath, db)
  return db
}

export function closeDatabase(): void {
  if (!db) return
  try {
    db.pragma('wal_checkpoint(TRUNCATE)')
    db.pragma('optimize')
    db.close()
  } catch {
  }
  db = null
}

export function getBackupsDir(): string | null {
  return dbUserDataPath ? join(dbUserDataPath, 'backups') : null
}

export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function getActiveToken(): string | null {
  const row = getDatabase()
    .prepare('SELECT token FROM accounts WHERE is_active = 1 LIMIT 1')
    .get() as { token: string } | undefined
  return row?.token ?? null
}

export function getSetting(key: string): string | null {
  const row = getDatabase().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}
