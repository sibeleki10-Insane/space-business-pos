import { BrowserWindow, ipcMain } from 'electron'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getDb } from './database'
import type { SyncQueueItem } from '../shared/types'

let supabase: SupabaseClient | null = null
let syncInterval: NodeJS.Timeout | null = null
let isOnline = false

export function addToSyncQueue(
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  tableName: string,
  recordId: string,
  data: unknown
): void {
  try {
    const db = getDb()
    db.prepare(`
      INSERT INTO sync_queue (operation, table_name, record_id, data, created_at, attempts)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(operation, tableName, recordId, JSON.stringify(data), new Date().toISOString())
  } catch {
    // silently fail — offline queue is best-effort
  }
}

export function initSync(): void {
  ipcMain.handle('sync:getStatus', () => ({
    isOnline,
    pendingCount: getPendingCount(),
  }))

  ipcMain.handle('sync:configure', (_e, url: string, anonKey: string) => {
    setupSupabase(url, anonKey)
    return { success: true }
  })

  ipcMain.handle('sync:triggerNow', async () => {
    const result = await runSync()
    return result
  })

  startConnectivityCheck()
}

function setupSupabase(url: string, anonKey: string): void {
  if (!url || !anonKey) { supabase = null; return }
  supabase = createClient(url, anonKey, {
    auth: { persistSession: false },
  })
}

function getPendingCount(): number {
  try {
    const db = getDb()
    return (db.prepare('SELECT COUNT(*) as c FROM sync_queue').get() as { c: number }).c
  } catch {
    return 0
  }
}

function startConnectivityCheck(): void {
  if (syncInterval) clearInterval(syncInterval)

  const check = async () => {
    const db = getDb()
    const urlRow = db.prepare("SELECT value FROM app_settings WHERE key = 'supabase_url'").get() as { value: string } | undefined
    const keyRow = db.prepare("SELECT value FROM app_settings WHERE key = 'supabase_anon_key'").get() as { value: string } | undefined
    const url = urlRow?.value ?? ''
    const key = keyRow?.value ?? ''

    if (!url || !key) { setOnline(false); return }
    if (!supabase) setupSupabase(url, key)

    try {
      const { error } = await supabase!.from('sync_ping').select('id').limit(1)
      const online = !error || error.code !== 'ECONNREFUSED'
      setOnline(online)
      if (online && getPendingCount() > 0) await runSync()
    } catch {
      setOnline(false)
    }
  }

  check()
  syncInterval = setInterval(check, 30_000)
}

function setOnline(online: boolean): void {
  if (online !== isOnline) {
    isOnline = online
    BrowserWindow.getAllWindows().forEach(w =>
      w.webContents.send('sync:statusChanged', { isOnline, pendingCount: getPendingCount() })
    )
  }
}

async function runSync(): Promise<{ pushed: number; pulled: number; errors: number }> {
  if (!supabase) return { pushed: 0, pulled: 0, errors: 0 }
  const db = getDb()
  let pushed = 0
  let errors = 0

  const pending = db.prepare('SELECT * FROM sync_queue ORDER BY id ASC LIMIT 100').all() as SyncQueueItem[]
  for (const item of pending) {
    try {
      const data = JSON.parse(item.data)
      if (item.operation === 'DELETE') {
        await supabase.from(item.table_name).update({ deleted_at: data.deleted_at }).eq('id', item.record_id)
      } else {
        await supabase.from(item.table_name).upsert(data, { onConflict: 'id' })
      }
      db.prepare('DELETE FROM sync_queue WHERE id = ?').run(item.id)
      db.prepare(`UPDATE ${sanitizeTableName(item.table_name)} SET synced = 1 WHERE id = ?`).run(item.record_id)
      pushed++
    } catch {
      errors++
      db.prepare('UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?').run(
        'Sync failed', item.id
      )
      if (item.attempts >= 5) {
        db.prepare('DELETE FROM sync_queue WHERE id = ?').run(item.id)
      }
    }
  }

  const pulled = await pullRemoteChanges()

  BrowserWindow.getAllWindows().forEach(w =>
    w.webContents.send('sync:statusChanged', { isOnline: true, pendingCount: getPendingCount() })
  )

  return { pushed, pulled, errors }
}

async function pullRemoteChanges(): Promise<number> {
  if (!supabase) return 0
  const db = getDb()
  let pulled = 0

  const lastSyncRow = db.prepare("SELECT value FROM app_settings WHERE key = 'last_pull_at'").get() as { value: string } | undefined
  const lastPull = lastSyncRow?.value ?? '1970-01-01T00:00:00.000Z'

  const tables = ['categories', 'products', 'customers', 'transactions']
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').gt('updated_at', lastPull)
      if (error || !data) continue

      for (const row of data) {
        const exists = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(row.id)
        if (exists) {
          const localRow = db.prepare(`SELECT updated_at FROM ${table} WHERE id = ?`).get(row.id) as { updated_at: string }
          if (row.updated_at > localRow.updated_at) {
            const cols = Object.keys(row).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ')
            const vals = Object.keys(row).filter(k => k !== 'id').map(k => row[k])
            db.prepare(`UPDATE ${table} SET ${cols}, synced = 1 WHERE id = ?`).run(...vals, row.id)
            pulled++
          }
        } else {
          const cols = Object.keys(row).join(', ')
          const placeholders = Object.keys(row).map(() => '?').join(', ')
          db.prepare(`INSERT OR IGNORE INTO ${table} (${cols}, synced) VALUES (${placeholders}, 1)`).run(...Object.values(row))
          pulled++
        }
      }
    } catch {
      // continue with next table
    }
  }

  db.prepare("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('last_pull_at', ?, ?)").run(
    new Date().toISOString(), new Date().toISOString()
  )

  return pulled
}

const ALLOWED_TABLES = new Set(['categories', 'products', 'customers', 'transactions', 'transaction_items'])

function sanitizeTableName(name: string): string {
  if (!ALLOWED_TABLES.has(name)) throw new Error(`Invalid table: ${name}`)
  return name
}
