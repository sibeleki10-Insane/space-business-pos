import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database'
import { addToSyncQueue } from '../sync'
import type { Category, IpcResponse } from '../../shared/types'

export function registerCategoryHandlers(): void {
  ipcMain.handle('categories:list', () => {
    const db = getDb()
    return {
      success: true,
      data: db.prepare('SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name ASC').all(),
    } as IpcResponse<Category[]>
  })

  ipcMain.handle('categories:create', (_e, data: { name: string; color: string }) => {
    const db = getDb()
    const now = new Date().toISOString()
    const id = uuidv4()
    db.prepare('INSERT INTO categories (id, name, color, created_at, updated_at, synced) VALUES (?, ?, ?, ?, ?, 0)').run(
      id, data.name, data.color, now, now
    )
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category
    addToSyncQueue('INSERT', 'categories', id, cat)
    return { success: true, data: cat } as IpcResponse<Category>
  })

  ipcMain.handle('categories:update', (_e, id: string, data: { name?: string; color?: string }) => {
    const db = getDb()
    const now = new Date().toISOString()
    const updates: string[] = []
    const params: unknown[] = []
    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name) }
    if (data.color !== undefined) { updates.push('color = ?'); params.push(data.color) }
    updates.push('updated_at = ?', 'synced = 0')
    params.push(now, id)
    db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category
    addToSyncQueue('UPDATE', 'categories', id, cat)
    return { success: true, data: cat } as IpcResponse<Category>
  })

  ipcMain.handle('categories:delete', (_e, id: string) => {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE categories SET deleted_at = ?, synced = 0 WHERE id = ?').run(now, id)
    addToSyncQueue('DELETE', 'categories', id, { id, deleted_at: now })
    return { success: true } as IpcResponse
  })
}
