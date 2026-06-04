import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Products
  products: {
    list: (opts?: { search?: string; category?: string; lowStock?: boolean }) =>
      ipcRenderer.invoke('products:list', opts),
    getByBarcode: (barcode: string) => ipcRenderer.invoke('products:getByBarcode', barcode),
    create: (data: unknown) => ipcRenderer.invoke('products:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('products:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('products:delete', id),
    adjustStock: (id: string, delta: number) => ipcRenderer.invoke('products:adjustStock', id, delta),
  },

  // Categories
  categories: {
    list: () => ipcRenderer.invoke('categories:list'),
    create: (data: unknown) => ipcRenderer.invoke('categories:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('categories:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('categories:delete', id),
  },

  // Customers
  customers: {
    list: (search?: string) => ipcRenderer.invoke('customers:list', search),
    get: (id: string) => ipcRenderer.invoke('customers:get', id),
    create: (data: unknown) => ipcRenderer.invoke('customers:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('customers:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('customers:delete', id),
  },

  // Transactions
  transactions: {
    create: (payload: unknown) => ipcRenderer.invoke('transactions:create', payload),
    list: (opts?: unknown) => ipcRenderer.invoke('transactions:list', opts),
    get: (id: string) => ipcRenderer.invoke('transactions:get', id),
    void: (id: string) => ipcRenderer.invoke('transactions:void', id),
  },

  // Reports
  reports: {
    sales: (opts: unknown) => ipcRenderer.invoke('reports:sales', opts),
    topProducts: (opts: unknown) => ipcRenderer.invoke('reports:topProducts', opts),
    summary: (opts: unknown) => ipcRenderer.invoke('reports:summary', opts),
    customerStats: (id: string) => ipcRenderer.invoke('reports:customerStats', id),
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    setMany: (data: Record<string, string>) => ipcRenderer.invoke('settings:setMany', data),
  },

  // Users
  users: {
    list: () => ipcRenderer.invoke('users:list'),
    authenticate: (pin: string) => ipcRenderer.invoke('users:authenticate', pin),
    create: (data: unknown) => ipcRenderer.invoke('users:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('users:update', id, data),
  },

  // Locations
  locations: {
    list: () => ipcRenderer.invoke('locations:list'),
    get: (id: string) => ipcRenderer.invoke('locations:get', id),
  },

  // Sync
  sync: {
    getStatus: () => ipcRenderer.invoke('sync:getStatus'),
    configure: (url: string, anonKey: string) => ipcRenderer.invoke('sync:configure', url, anonKey),
    triggerNow: () => ipcRenderer.invoke('sync:triggerNow'),
    onStatusChanged: (cb: (status: { isOnline: boolean; pendingCount: number }) => void) => {
      ipcRenderer.on('sync:statusChanged', (_e, status) => cb(status))
      return () => ipcRenderer.removeAllListeners('sync:statusChanged')
    },
  },

  // App
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
})
