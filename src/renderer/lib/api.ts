// Type-safe wrapper around the Electron context bridge
declare global {
  interface Window {
    api: {
      products: {
        list(opts?: { search?: string; category?: string; lowStock?: boolean }): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').Product[]>>
        getByBarcode(barcode: string): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').Product | null>>
        create(data: unknown): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').Product>>
        update(id: string, data: unknown): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').Product>>
        delete(id: string): Promise<import('../../shared/types').IpcResponse>
        adjustStock(id: string, delta: number): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').Product>>
      }
      categories: {
        list(): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').Category[]>>
        create(data: unknown): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').Category>>
        update(id: string, data: unknown): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').Category>>
        delete(id: string): Promise<import('../../shared/types').IpcResponse>
      }
      customers: {
        list(search?: string): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').Customer[]>>
        get(id: string): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').Customer>>
        create(data: unknown): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').Customer>>
        update(id: string, data: unknown): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').Customer>>
        delete(id: string): Promise<import('../../shared/types').IpcResponse>
      }
      transactions: {
        create(payload: unknown): Promise<import('../../shared/types').IpcResponse>
        list(opts?: unknown): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').Transaction[]>>
        get(id: string): Promise<import('../../shared/types').IpcResponse>
        void(id: string): Promise<import('../../shared/types').IpcResponse>
      }
      reports: {
        sales(opts: unknown): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').SalesReport[]>>
        topProducts(opts: unknown): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').TopProduct[]>>
        summary(opts: unknown): Promise<import('../../shared/types').IpcResponse>
        customerStats(id: string): Promise<import('../../shared/types').IpcResponse>
      }
      settings: {
        get(): Promise<import('../../shared/types').IpcResponse<Record<string, string>>>
        set(key: string, value: string): Promise<import('../../shared/types').IpcResponse>
        setMany(data: Record<string, string>): Promise<import('../../shared/types').IpcResponse>
      }
      users: {
        list(): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').User[]>>
        authenticate(pin: string): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').User>>
        create(data: unknown): Promise<import('../../shared/types').IpcResponse<import('../../shared/types').User>>
        update(id: string, data: unknown): Promise<import('../../shared/types').IpcResponse>
      }
      locations: {
        list(): Promise<import('../../shared/types').IpcResponse>
        get(id: string): Promise<import('../../shared/types').IpcResponse>
      }
      sync: {
        getStatus(): Promise<{ isOnline: boolean; pendingCount: number }>
        configure(url: string, anonKey: string): Promise<import('../../shared/types').IpcResponse>
        triggerNow(): Promise<{ pushed: number; pulled: number; errors: number }>
        onStatusChanged(cb: (status: { isOnline: boolean; pendingCount: number }) => void): () => void
      }
      app: {
        getVersion(): Promise<string>
      }
    }
  }
}

export const api = typeof window !== 'undefined' ? window.api : null!
