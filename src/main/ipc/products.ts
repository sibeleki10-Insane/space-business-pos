import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database'
import { addToSyncQueue } from '../sync'
import type { Product, IpcResponse } from '../../shared/types'

export function registerProductHandlers(): void {
  ipcMain.handle('products:list', (_e, opts: { search?: string; category?: string; lowStock?: boolean } = {}) => {
    const db = getDb()
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.deleted_at IS NULL AND p.is_active = 1
    `
    const params: unknown[] = []
    if (opts.search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)'
      params.push(`%${opts.search}%`, `%${opts.search}%`, `%${opts.search}%`)
    }
    if (opts.category) {
      query += ' AND p.category_id = ?'
      params.push(opts.category)
    }
    if (opts.lowStock) {
      query += ' AND p.stock_quantity <= p.min_stock'
    }
    query += ' ORDER BY p.name ASC'
    return { success: true, data: db.prepare(query).all(...params) } as IpcResponse<Product[]>
  })

  ipcMain.handle('products:getByBarcode', (_e, barcode: string) => {
    const db = getDb()
    const product = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.barcode = ? AND p.deleted_at IS NULL AND p.is_active = 1
    `).get(barcode)
    return { success: true, data: product ?? null } as IpcResponse<Product | null>
  })

  ipcMain.handle('products:create', (_e, data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'synced'>) => {
    const db = getDb()
    const now = new Date().toISOString()
    const id = uuidv4()
    try {
      db.prepare(`
        INSERT INTO products (id, name, sku, barcode, price, cost, category_id, stock_quantity, min_stock, image_url, is_active, created_at, updated_at, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(id, data.name, data.sku, data.barcode ?? null, data.price, data.cost, data.category_id ?? null, data.stock_quantity, data.min_stock, data.image_url ?? null, 1, now, now)
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product
      addToSyncQueue('INSERT', 'products', id, product)
      return { success: true, data: product } as IpcResponse<Product>
    } catch (e) {
      return { success: false, error: (e as Error).message } as IpcResponse
    }
  })

  ipcMain.handle('products:update', (_e, id: string, data: Partial<Product>) => {
    const db = getDb()
    const now = new Date().toISOString()
    const fields = ['name', 'sku', 'barcode', 'price', 'cost', 'category_id', 'stock_quantity', 'min_stock', 'image_url', 'is_active']
    const updates: string[] = []
    const params: unknown[] = []
    for (const field of fields) {
      if (field in data) {
        updates.push(`${field} = ?`)
        params.push((data as Record<string, unknown>)[field] ?? null)
      }
    }
    if (updates.length === 0) return { success: true } as IpcResponse
    updates.push('updated_at = ?', 'synced = 0')
    params.push(now, id)
    db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product
    addToSyncQueue('UPDATE', 'products', id, product)
    return { success: true, data: product } as IpcResponse<Product>
  })

  ipcMain.handle('products:delete', (_e, id: string) => {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE products SET deleted_at = ?, synced = 0 WHERE id = ?').run(now, id)
    addToSyncQueue('DELETE', 'products', id, { id, deleted_at: now })
    return { success: true } as IpcResponse
  })

  ipcMain.handle('products:adjustStock', (_e, id: string, delta: number) => {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = ?, synced = 0 WHERE id = ?').run(delta, now, id)
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product
    addToSyncQueue('UPDATE', 'products', id, product)
    return { success: true, data: product } as IpcResponse<Product>
  })
}
