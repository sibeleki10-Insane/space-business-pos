import { ipcMain } from 'electron'
import { getDb } from '../database'
import type { IpcResponse, SalesReport, TopProduct } from '../../shared/types'

export function registerReportHandlers(): void {
  ipcMain.handle('reports:sales', (_e, opts: { from: string; to: string; groupBy: 'day' | 'week' | 'month' }) => {
    const db = getDb()
    const format = opts.groupBy === 'day' ? '%Y-%m-%d' : opts.groupBy === 'week' ? '%Y-W%W' : '%Y-%m'
    const rows = db.prepare(`
      SELECT
        strftime('${format}', created_at) as date,
        SUM(total) as total_sales,
        COUNT(*) as total_transactions,
        SUM((SELECT SUM(quantity) FROM transaction_items WHERE transaction_id = t.id)) as total_items,
        AVG(total) as avg_transaction
      FROM transactions t
      WHERE status = 'completed' AND created_at >= ? AND created_at <= ?
      GROUP BY strftime('${format}', created_at)
      ORDER BY date ASC
    `).all(opts.from, opts.to)
    return { success: true, data: rows } as IpcResponse<SalesReport[]>
  })

  ipcMain.handle('reports:topProducts', (_e, opts: { from: string; to: string; limit?: number }) => {
    const db = getDb()
    const rows = db.prepare(`
      SELECT
        ti.product_id,
        ti.product_name,
        ti.sku,
        SUM(ti.quantity) as total_quantity,
        SUM(ti.total) as total_revenue
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE t.status = 'completed' AND t.created_at >= ? AND t.created_at <= ?
      GROUP BY ti.product_id
      ORDER BY total_revenue DESC
      LIMIT ?
    `).all(opts.from, opts.to, opts.limit ?? 10)
    return { success: true, data: rows } as IpcResponse<TopProduct[]>
  })

  ipcMain.handle('reports:summary', (_e, opts: { from: string; to: string }) => {
    const db = getDb()
    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_transactions,
        SUM(total) as total_revenue,
        SUM(tax_amount) as total_tax,
        SUM(discount_amount) as total_discounts,
        AVG(total) as avg_transaction,
        SUM((SELECT SUM(quantity) FROM transaction_items WHERE transaction_id = t.id)) as total_items
      FROM transactions t
      WHERE status = 'completed' AND created_at >= ? AND created_at <= ?
    `).get(opts.from, opts.to)

    const byPayment = db.prepare(`
      SELECT payment_method, COUNT(*) as count, SUM(total) as total
      FROM transactions
      WHERE status = 'completed' AND created_at >= ? AND created_at <= ?
      GROUP BY payment_method
    `).all(opts.from, opts.to)

    return { success: true, data: { summary, byPayment } } as IpcResponse
  })

  ipcMain.handle('reports:customerStats', (_e, customerId: string) => {
    const db = getDb()
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_transactions,
        SUM(total) as total_spent,
        AVG(total) as avg_transaction,
        MAX(created_at) as last_visit
      FROM transactions
      WHERE customer_id = ? AND status = 'completed'
    `).get(customerId)
    const recent = db.prepare(`
      SELECT * FROM transactions WHERE customer_id = ? AND status = 'completed'
      ORDER BY created_at DESC LIMIT 10
    `).all(customerId)
    return { success: true, data: { stats, recent } } as IpcResponse
  })
}
