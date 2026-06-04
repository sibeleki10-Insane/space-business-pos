import { app, BrowserWindow, shell, ipcMain } from 'electron'
import path from 'path'
import { readFileSync } from 'fs'
import { initDatabase } from './database'

function loadEnvFile(): void {
  const candidates = [
    path.join(app.getPath('userData'), '.env'),
    path.join(__dirname, '../../.env'),
  ]
  for (const envPath of candidates) {
    try {
      const lines = readFileSync(envPath, 'utf-8').split('\n')
      for (const line of lines) {
        const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
        }
      }
      break
    } catch {}
  }
}
import { initSync } from './sync'
import { registerProductHandlers } from './ipc/products'
import { registerCategoryHandlers } from './ipc/categories'
import { registerCustomerHandlers } from './ipc/customers'
import { registerTransactionHandlers } from './ipc/transactions'
import { registerReportHandlers } from './ipc/reports'
import { registerSettingsHandlers } from './ipc/settings'

const isDev = process.env.NODE_ENV === 'development'
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'default',
    show: false,
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  loadEnvFile()
  initDatabase()
  registerProductHandlers()
  registerCategoryHandlers()
  registerCustomerHandlers()
  registerTransactionHandlers()
  registerReportHandlers()
  registerSettingsHandlers()
  initSync()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:getPath', (_e, name: string) => app.getPath(name as Parameters<typeof app.getPath>[0]))
