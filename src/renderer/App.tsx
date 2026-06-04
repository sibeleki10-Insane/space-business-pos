import React, { useEffect } from 'react'
import { ToastProvider } from './components/ui/Toast'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { POSPage } from './pages/POSPage'
import { InventoryPage } from './pages/InventoryPage'
import { CustomersPage } from './pages/CustomersPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { useAuthStore } from './store/authStore'
import { api } from './lib/api'

function AppContent() {
  const { user, setSettings, setSyncStatus } = useAuthStore()
  const [page, setPage] = React.useState('pos')

  useEffect(() => {
    api.settings.get().then(res => {
      if (res.success && res.data) setSettings(res.data as Record<string, string>)
    })
    api.sync.getStatus().then(setSyncStatus)
    const unsub = api.sync.onStatusChanged(setSyncStatus)
    return unsub
  }, [setSettings, setSyncStatus])

  if (!user) return <LoginPage />

  const pages: Record<string, React.ReactNode> = {
    pos: <POSPage />,
    inventory: <InventoryPage />,
    customers: <CustomersPage />,
    reports: <ReportsPage />,
    settings: <SettingsPage />,
  }

  return (
    <Layout page={page} setPage={setPage}>
      {pages[page] ?? <POSPage />}
    </Layout>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
