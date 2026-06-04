import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'pos.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations()
  seedDefaultData()
}

function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `)

  const current = (db.prepare('SELECT MAX(version) as v FROM schema_version').get() as { v: number | null }).v ?? 0

  const migrations: { version: number; sql: string }[] = [
    {
      version: 1,
      sql: `
        CREATE TABLE IF NOT EXISTS locations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT,
          tax_rate REAL NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'USD',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          role TEXT NOT NULL DEFAULT 'cashier',
          pin TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          color TEXT NOT NULL DEFAULT '#3b82f6',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          sku TEXT NOT NULL UNIQUE,
          barcode TEXT,
          price REAL NOT NULL DEFAULT 0,
          cost REAL NOT NULL DEFAULT 0,
          category_id TEXT REFERENCES categories(id),
          stock_quantity REAL NOT NULL DEFAULT 0,
          min_stock REAL NOT NULL DEFAULT 0,
          image_url TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          address TEXT,
          loyalty_points INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          transaction_number TEXT NOT NULL UNIQUE,
          customer_id TEXT REFERENCES customers(id),
          subtotal REAL NOT NULL DEFAULT 0,
          tax_rate REAL NOT NULL DEFAULT 0,
          tax_amount REAL NOT NULL DEFAULT 0,
          discount_amount REAL NOT NULL DEFAULT 0,
          total REAL NOT NULL DEFAULT 0,
          payment_method TEXT NOT NULL DEFAULT 'cash',
          cash_given REAL NOT NULL DEFAULT 0,
          change_given REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'completed',
          notes TEXT,
          cashier_id TEXT NOT NULL,
          location_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS transaction_items (
          id TEXT PRIMARY KEY,
          transaction_id TEXT NOT NULL REFERENCES transactions(id),
          product_id TEXT NOT NULL,
          product_name TEXT NOT NULL,
          sku TEXT NOT NULL,
          quantity REAL NOT NULL,
          unit_price REAL NOT NULL,
          discount_amount REAL NOT NULL DEFAULT 0,
          total REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          operation TEXT NOT NULL,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          data TEXT NOT NULL,
          created_at TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT
        );

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
        CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
        CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
        CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
        CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
        CREATE INDEX IF NOT EXISTS idx_transaction_items_txn ON transaction_items(transaction_id);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name);
      `,
    },
  ]

  for (const migration of migrations) {
    if (migration.version > current) {
      db.exec(migration.sql)
      db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(
        migration.version,
        new Date().toISOString()
      )
    }
  }
}

function seedDefaultData(): void {
  const locationCount = (db.prepare('SELECT COUNT(*) as c FROM locations').get() as { c: number }).c
  if (locationCount === 0) {
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO locations (id, name, address, tax_rate, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(uuidv4(), 'Main Store', null, 10, 'USD', now, now)
  }

  const adminCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number }).c
  if (adminCount === 0) {
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO users (id, name, email, role, pin, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(uuidv4(), 'Admin', 'admin@pos.local', 'admin', '1234', 1, now, now)
  }

  const categoryCount = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c
  if (categoryCount === 0) {
    const now = new Date().toISOString()
    const cats = [
      { name: 'General', color: '#6b7280' },
      { name: 'Food & Drinks', color: '#f59e0b' },
      { name: 'Electronics', color: '#3b82f6' },
      { name: 'Clothing', color: '#8b5cf6' },
    ]
    for (const cat of cats) {
      db.prepare(
        'INSERT INTO categories (id, name, color, created_at, updated_at, synced) VALUES (?, ?, ?, ?, ?, 0)'
      ).run(uuidv4(), cat.name, cat.color, now, now)
    }
  }

  const settingCount = (db.prepare('SELECT COUNT(*) as c FROM app_settings').get() as { c: number }).c
  if (settingCount === 0) {
    const now = new Date().toISOString()
    const defaults: Record<string, string> = {
      tax_rate: '10',
      currency: 'USD',
      currency_symbol: '$',
      receipt_header: 'Thank you for shopping with us!',
      receipt_footer: 'Please come again.',
      auto_print_receipt: 'false',
      theme: 'light',
      supabase_url: '',
      supabase_anon_key: '',
      location_name: 'Main Store',
    }
    const stmt = db.prepare('INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)')
    for (const [k, v] of Object.entries(defaults)) {
      stmt.run(k, v, now)
    }
  }
}

export function generateTransactionNumber(): string {
  const date = new Date()
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const count = (
    db.prepare("SELECT COUNT(*) as c FROM transactions WHERE created_at LIKE ?").get(`${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}%`) as { c: number }
  ).c
  return `TXN-${datePart}-${String(count + 1).padStart(4, '0')}`
}
