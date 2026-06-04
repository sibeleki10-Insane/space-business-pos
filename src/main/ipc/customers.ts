import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database'
import { addToSyncQueue } from '../sync'
import type { Customer, IpcResponse } from '../../shared/types'

export function registerCustomerHandlers(): void {
  ipcMain.handle('customers:list', (_e, search?: string) => {
    const db = getDb()
    let query = 'SELECT * FROM customers WHERE deleted_at IS NULL'
    const params: unknown[] = []
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    query += ' ORDER BY name ASC'
    return { success: true, data: db.prepare(query).all(...params) } as IpcResponse<Customer[]>
  })

  ipcMain.handle('customers:get', (_e, id: string) => {
    const db = getDb()
    return { success: true, data: db.prepare('SELECT * FROM customers WHERE id = ?').get(id) } as IpcResponse<Customer>
  })

  ipcMain.handle('customers:create', (_e, data: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'synced' | 'loyalty_points'>) => {
    const db = getDb()
    const now = new Date().toISOString()
    const id = uuidv4()
    db.prepare(`
      INSERT INTO customers (id, name, email, phone, address, loyalty_points, notes, created_at, updated_at, synced)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 0)
    `).run(id, data.name, data.email ?? null, data.phone ?? null, data.address ?? null, data.notes ?? null, now, now)
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer
    addToSyncQueue('INSERT', 'customers', id, customer)
    return { success: true, data: customer } as IpcResponse<Customer>
  })

  ipcMain.handle('customers:update', (_e, id: string, data: Partial<Customer>) => {
    const db = getDb()
    const now = new Date().toISOString()
    const fields = ['name', 'email', 'phone', 'address', 'notes', 'loyalty_points']
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
    db.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer
    addToSyncQueue('UPDATE', 'customers', id, customer)
    return { success: true, data: customer } as IpcResponse<Customer>
  })

  ipcMain.handle('customers:delete', (_e, id: string) => {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE customers SET deleted_at = ?, synced = 0 WHERE id = ?').run(now, id)
    addToSyncQueue('DELETE', 'customers', id, { id, deleted_at: now })
    return { success: true } as IpcResponse
  })
}
