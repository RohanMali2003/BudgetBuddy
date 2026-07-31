import { open, type DB as OPSQLiteConnection } from '@op-engineering/op-sqlite';
import { DB_NAME } from '@/utils/constants';

export type { OPSQLiteConnection };

let db: OPSQLiteConnection | null = null;

export function getDatabase(): OPSQLiteConnection {
  if (db) return db;
  db = open({ name: DB_NAME });
  db.executeSync('PRAGMA journal_mode=WAL;');
  db.executeSync('PRAGMA foreign_keys=ON;');
  runMigrations(db);
  return db;
}

function runMigrations(database: OPSQLiteConnection): void {
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const result = database.executeSync('SELECT MAX(version) as v FROM migrations;');
  const currentVersion = (result.rows?.[0]?.v as number) ?? 0;

  if (currentVersion < 1) {
    database.executeSync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        raw_sms TEXT NOT NULL,
        sender_address TEXT NOT NULL,
        amount_paise INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('DEBIT', 'CREDIT')),
        merchant_or_vpa TEXT,
        category TEXT,
        account_tail TEXT,
        balance_paise INTEGER,
        parsed_by TEXT NOT NULL CHECK(parsed_by IN ('REGEX', 'SLM')),
        confidence REAL NOT NULL DEFAULT 1.0,
        transaction_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    database.executeSync('CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(transaction_date);');
    database.executeSync('CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category);');
    database.executeSync('CREATE INDEX IF NOT EXISTS idx_tx_month ON transactions(substr(transaction_date, 1, 7));');

    database.executeSync(`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        limit_paise INTEGER NOT NULL,
        month TEXT NOT NULL,
        UNIQUE(category, month)
      );
    `);

    database.executeSync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    database.executeSync(`
      CREATE TABLE IF NOT EXISTS merchant_categories (
        merchant TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    database.executeSync('INSERT INTO migrations (version) VALUES (1);');
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
