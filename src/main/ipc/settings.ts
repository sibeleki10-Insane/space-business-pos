import { ipcMain } from 'electron'
import { getDb } from '../database'
import type { AppSettings, User, IpcResponse } from '../../shared/types'
import { v4 as uuidv4 } from 'uuid'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => {
    const db = getDb()
    const rows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[]
    const settings: Record<string, string> = {}
    for (const row of rows) settings[row.key] = row.value
    return { success: true, data: settings } as IpcResponse<Partial<AppSettings>>
  })

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)').run(key, value, now)
    return { success: true } as IpcResponse
  })

  ipcMain.handle('settings:setMany', (_e, data: Record<string, string>) => {
    const db = getDb()
    const now = new Date().toISOString()
    const stmt = db.prepare('INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)')
    db.transaction(() => {
      for (const [k, v] of Object.entries(data)) stmt.run(k, v, now)
    })()
    return { success: true } as IpcResponse
  })

  ipcMain.handle('users:list', () => {
    const db = getDb()
    return { success: true, data: db.prepare('SELECT * FROM users WHERE is_active = 1 ORDER BY name').all() } as IpcResponse<User[]>
  })

  ipcMain.handle('users:authenticate', (_e, pin: string) => {
    const db = getDb()
    const user = db.prepare('SELECT * FROM users WHERE pin = ? AND is_active = 1').get(pin) as User | undefined
    if (!user) return { success: false, error: 'Invalid PIN' } as IpcResponse
    return { success: true, data: user } as IpcResponse<User>
  })

  ipcMain.handle('users:create', (_e, data: { name: string; email: string; role: string; pin: string }) => {
    const db = getDb()
    const now = new Date().toISOString()
    const id = uuidv4()
    try {
      db.prepare('INSERT INTO users (id, name, email, role, pin, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)').run(id, data.name, data.email, data.role, data.pin, now, now)
      return { success: true, data: db.prepare('SELECT * FROM users WHERE id = ?').get(id) } as IpcResponse<User>
    } catch (e) {
      return { success: false, error: (e as Error).message } as IpcResponse
    }
  })

  ipcMain.handle('users:update', (_e, id: string, data: Partial<User>) => {
    const db = getDb()
    const now = new Date().toISOString()
    const fields = ['name', 'email', 'role', 'pin', 'is_active']
    const updates: string[] = []
    const params: unknown[] = []
    for (const f of fields) {
      if (f in data) { updates.push(`${f} = ?`); params.push((data as Record<string, unknown>)[f]) }
    }
    if (updates.length === 0) return { success: true } as IpcResponse
    updates.push('updated_at = ?')
    params.push(now, id)
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    return { success: true } as IpcResponse
  })

  ipcMain.handle('locations:list', () => {
    const db = getDb()
    return { success: true, data: db.prepare('SELECT * FROM locations ORDER BY name').all() } as IpcResponse
  })

  ipcMain.handle('locations:get', (_e, id: string) => {
    const db = getDb()
    return { success: true, data: db.prepare('SELECT * FROM locations WHERE id = ?').get(id) } as IpcResponse
  })
}
