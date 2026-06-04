import React from 'react'
import { useAuthStore } from '../store/authStore'
import { api } from '../lib/api'
import { useToast } from './ui/Toast'

interface LayoutProps {
  page: string
  setPage: (p: string) => void
  children: React.ReactNode
}

const NAV = [
  { id: 'pos', label: 'POS', icon: '🛒' },
  { id: 'inventory', label: 'Inventory', icon: '📦' },
  { id: 'customers', label: 'Customers', icon: '👥' },
  { id: 'reports', label: 'Reports', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export function Layout({ page, setPage, children }: LayoutProps) {
  const { user, syncStatus, setUser } = useAuthStore()
  const { toast } = useToast()

  const handleSync = async () => {
    try {
      const result = await api.sync.triggerNow()
      toast(`Sync complete: ${result.pushed} pushed, ${result.pulled} pulled`, 'success')
    } catch {
      toast('Sync failed', 'error')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-52 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-gray-700">
          <div className="text-base font-extrabold tracking-wide leading-tight">
            <span style={{ color: '#d97b35' }}>SPACE</span><span className="text-white">CODE</span>
          </div>
          <div className="text-xs font-semibold tracking-widest text-gray-500 uppercase mt-0.5">Space-Business POS</div>
          <div className="text-xs text-gray-400 mt-1">{user?.name}</div>
        </div>

        <nav className="flex-1 py-3">
          {NAV.map(item => (
            (item.id !== 'settings' || user?.role === 'admin' || user?.role === 'manager') && (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  page === item.id
                    ? 'text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                style={page === item.id ? { backgroundColor: '#c4621c' } : undefined}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            )
          ))}
        </nav>

        <div className="p-3 border-t border-gray-700 space-y-2">
          <button
            onClick={handleSync}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${syncStatus.isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
            <span>{syncStatus.isOnline ? 'Online' : 'Offline'}</span>
            {syncStatus.pendingCount > 0 && (
              <span className="ml-auto bg-yellow-500 text-yellow-900 text-xs px-1.5 rounded-full">{syncStatus.pendingCount}</span>
            )}
          </button>
          <button
            onClick={() => setUser(null)}
            className="w-full px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
