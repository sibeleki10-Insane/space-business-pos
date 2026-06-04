import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDb, generateTransactionNumber } from '../database'
import { addToSyncQueue } from '../sync'
import type { CartItem, Transaction, TransactionItem, IpcResponse } from '../../shared/types'

export function registerTransactionHandlers(): void {
  ipcMain.handle('transactions:create', (_e, payload: {
    cart: CartItem[]
    customer_id: string | null
    payment_method: 'cash' | 'card' | 'mixed'
    cash_given: number
    discount_amount: number
    notes: string | null
    cashier_id: string
    location_id: string
    tax_rate: number
  }) => {
    const db = getDb()
    const now = new Date().toISOString()
    const txnId = uuidv4()
    const txnNumber = generateTransactionNumber()

    const subtotal = payload.cart.reduce((sum, item) => sum + item.total, 0)
    const taxAmount = (subtotal - payload.discount_amount) * (payload.tax_rate / 100)
    const total = subtotal - payload.discount_amount + taxAmount
    const change = Math.max(0, payload.cash_given - total)

    db.transaction(() => {
      db.prepare(`
        INSERT INTO transactions (id, transaction_number, customer_id, subtotal, tax_rate, tax_amount, discount_amount, total, payment_method, cash_given, change_given, status, notes, cashier_id, location_id, created_at, updated_at, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, 0)
      `).run(txnId, txnNumber, payload.customer_id, subtotal, payload.tax_rate, taxAmount, payload.discount_amount, total, payload.payment_method, payload.cash_given, change, payload.notes ?? null, payload.cashier_id, payload.location_id, now, now)

      const itemStmt = db.prepare(`
        INSERT INTO transaction_items (id, transaction_id, product_id, product_name, sku, quantity, unit_price, discount_amount, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const item of payload.cart) {
        itemStmt.run(uuidv4(), txnId, item.product.id, item.product.name, item.product.sku, item.quantity, item.unit_price, item.discount_amount, item.total)
        db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = ?, synced = 0 WHERE id = ?').run(item.quantity, now, item.product.id)
      }

      if (payload.customer_id) {
        const points = Math.floor(total)
        db.prepare('UPDATE customers SET loyalty_points = loyalty_points + ?, updated_at = ?, synced = 0 WHERE id = ?').run(points, now, payload.customer_id)
      }
    })()

    const txn = db.prepare(`
      SELECT t.*, c.name as customer_name, u.name as cashier_name
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN users u ON t.cashier_id = u.id
      WHERE t.id = ?
    `).get(txnId) as Transaction

    const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(txnId) as TransactionItem[]

    addToSyncQueue('INSERT', 'transactions', txnId, { ...txn, items })

    return { success: true, data: { transaction: txn, items } } as IpcResponse
  })

  ipcMain.handle('transactions:list', (_e, opts: { from?: string; to?: string; status?: string; customer_id?: string } = {}) => {
    const db = getDb()
    let query = `
      SELECT t.*, c.name as customer_name, u.name as cashier_name
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN users u ON t.cashier_id = u.id
      WHERE 1=1
    `
    const params: unknown[] = []
    if (opts.from) { query += ' AND t.created_at >= ?'; params.push(opts.from) }
    if (opts.to) { query += ' AND t.created_at <= ?'; params.push(opts.to) }
    if (opts.status) { query += ' AND t.status = ?'; params.push(opts.status) }
    if (opts.customer_id) { query += ' AND t.customer_id = ?'; params.push(opts.customer_id) }
    query += ' ORDER BY t.created_at DESC LIMIT 200'
    return { success: true, data: db.prepare(query).all(...params) } as IpcResponse<Transaction[]>
  })

  ipcMain.handle('transactions:get', (_e, id: string) => {
    const db = getDb()
    const txn = db.prepare(`
      SELECT t.*, c.name as customer_name, u.name as cashier_name
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN users u ON t.cashier_id = u.id
      WHERE t.id = ?
    `).get(id) as Transaction
    const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(id) as TransactionItem[]
    return { success: true, data: { transaction: txn, items } } as IpcResponse
  })

  ipcMain.handle('transactions:void', (_e, id: string) => {
    const db = getDb()
    const now = new Date().toISOString()
    db.transaction(() => {
      db.prepare("UPDATE transactions SET status = 'void', updated_at = ?, synced = 0 WHERE id = ?").run(now, id)
      const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(id) as TransactionItem[]
      for (const item of items) {
        db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = ?, synced = 0 WHERE id = ?').run(item.quantity, now, item.product_id)
      }
    })()
    return { success: true } as IpcResponse
  })
}
