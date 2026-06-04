import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import type { User, Category } from '../../../shared/types'

type Tab = 'general' | 'sync' | 'users' | 'categories' | 'about'

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('general')
  const { user } = useAuthStore()

  const tabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: 'general', label: 'General' },
    { id: 'sync', label: 'Cloud Sync' },
    { id: 'users', label: 'Users', adminOnly: true },
    { id: 'categories', label: 'Categories' },
    { id: 'about', label: 'About' },
  ]

  return (
    <div className="flex h-full">
      <aside className="w-48 bg-white border-r border-gray-200 py-4">
        <div className="px-4 mb-4">
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        </div>
        {tabs.filter(t => !t.adminOnly || user?.role === 'admin').map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </aside>
      <main className="flex-1 overflow-auto p-6">
        {tab === 'general' && <GeneralSettings />}
        {tab === 'sync' && <SyncSettings />}
        {tab === 'users' && <UsersSettings />}
        {tab === 'categories' && <CategoriesSettings />}
        {tab === 'about' && <AboutTab />}
      </main>
    </div>
  )
}

function GeneralSettings() {
  const { settings, setSettings } = useAuthStore()
  const { toast } = useToast()
  const [form, setForm] = useState({
    location_name: settings.location_name ?? '',
    tax_rate: settings.tax_rate ?? '10',
    currency: settings.currency ?? 'USD',
    currency_symbol: settings.currency_symbol ?? '$',
    receipt_header: settings.receipt_header ?? '',
    receipt_footer: settings.receipt_footer ?? '',
  })

  const handleSave = async () => {
    const res = await api.settings.setMany(form)
    if (res.success) {
      setSettings({ ...settings, ...form })
      toast('Settings saved', 'success')
    } else toast(res.error ?? 'Save failed', 'error')
  }

  const f = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="max-w-lg space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Store Name</label>
        <input className="input" value={form.location_name} onChange={e => f('location_name', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Tax Rate (%)</label>
          <input type="number" min="0" max="100" step="0.01" className="input" value={form.tax_rate} onChange={e => f('tax_rate', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Currency Code</label>
          <input className="input" value={form.currency} onChange={e => f('currency', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Currency Symbol</label>
          <input className="input" value={form.currency_symbol} onChange={e => f('currency_symbol', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Receipt Header</label>
        <textarea className="input h-16 resize-none" value={form.receipt_header} onChange={e => f('receipt_header', e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Receipt Footer</label>
        <textarea className="input h-16 resize-none" value={form.receipt_footer} onChange={e => f('receipt_footer', e.target.value)} />
      </div>
      <button onClick={handleSave} className="btn-primary">Save Settings</button>
    </div>
  )
}

function SyncSettings() {
  const { toast } = useToast()
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ pushed: number; pulled: number; errors: number } | null>(null)

  useEffect(() => {
    api.settings.get().then(res => {
      if (res.success && res.data) {
        setUrl(res.data.supabase_url ?? '')
        setAnonKey(res.data.supabase_anon_key ?? '')
      }
    })
  }, [])

  const handleSave = async () => {
    setLoading(true)
    await api.settings.setMany({ supabase_url: url, supabase_anon_key: anonKey })
    await api.sync.configure(url, anonKey)
    setLoading(false)
    toast('Sync settings saved', 'success')
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    const result = await api.sync.triggerNow()
    setSyncing(false)
    setSyncResult(result)
    toast(`Sync done: ${result.pushed} pushed, ${result.pulled} pulled`, 'success')
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Cloud Sync (Supabase)</h2>
        <p className="text-sm text-gray-500 mt-1">Connect to Supabase to sync data across multiple terminals and locations. The app works fully offline without this.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>Setup:</strong> Create a free Supabase project at supabase.com, then paste your project URL and anon key below.
        Run the SQL migration script from <code className="bg-blue-100 px-1 rounded">supabase/migrations.sql</code> in your Supabase SQL editor.
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Supabase Project URL</label>
        <input className="input font-mono text-sm" placeholder="https://xxxxx.supabase.co" value={url} onChange={e => setUrl(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Anon Key</label>
        <input type="password" className="input font-mono text-sm" placeholder="eyJhbG..." value={anonKey} onChange={e => setAnonKey(e.target.value)} />
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
        <button onClick={handleSyncNow} disabled={syncing || !url} className="btn-secondary">{syncing ? 'Syncing...' : 'Sync Now'}</button>
      </div>

      {syncResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          Last sync: <strong>{syncResult.pushed}</strong> records pushed, <strong>{syncResult.pulled}</strong> pulled
          {syncResult.errors > 0 && <span className="text-red-600">, {syncResult.errors} errors</span>}
        </div>
      )}
    </div>
  )
}

function UsersSettings() {
  const [users, setUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const { toast } = useToast()

  const load = async () => {
    const res = await api.users.list()
    if (res.success && res.data) setUsers(res.data)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Users & Permissions</h2>
        <button onClick={() => { setEditUser(null); setShowForm(true) }} className="btn-primary text-sm">+ Add User</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Role</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Email</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3"><span className={`badge capitalize ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setEditUser(u); setShowForm(true) }} className="btn-ghost text-xs">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <UserForm user={editUser} onClose={() => { setShowForm(false); setEditUser(null) }} onSave={() => { setShowForm(false); setEditUser(null); load(); toast(editUser ? 'User updated' : 'User created', 'success') }} />
      )}
    </div>
  )
}

function UserForm({ user, onClose, onSave }: { user: User | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', role: user?.role ?? 'cashier', pin: '' })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || (!user && !form.pin)) { toast('Name and PIN are required', 'error'); return }
    setLoading(true)
    const data = { ...form, pin: form.pin || user?.pin || '' }
    const res = user ? await api.users.update(user.id, data) : await api.users.create(data)
    setLoading(false)
    if (res.success) onSave()
    else toast(res.error ?? 'Save failed', 'error')
  }

  return (
    <Modal open title={user ? 'Edit User' : 'New User'} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Name *</label>
          <input autoFocus className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
          <input type="email" className="input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Role</label>
          <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
            <option value="cashier">Cashier</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">PIN {user ? '(leave blank to keep current)' : '*'}</label>
          <input type="password" maxLength={6} className="input tracking-widest" placeholder="••••" value={form.pin} onChange={e => setForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, '') }))} />
        </div>
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}

function CategoriesSettings() {
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  const load = async () => {
    const res = await api.categories.list()
    if (res.success && res.data) setCategories(res.data)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await api.categories.delete(deleteId)
    if (res.success) { toast('Category deleted', 'success'); load() }
    else toast(res.error ?? 'Delete failed', 'error')
    setDeleteId(null)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
        <button onClick={() => { setEditCat(null); setShowForm(true) }} className="btn-primary text-sm">+ Add Category</button>
      </div>

      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.id} className="card flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="font-medium text-gray-900">{cat.name}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditCat(cat); setShowForm(true) }} className="btn-ghost text-xs">Edit</button>
              <button onClick={() => setDeleteId(cat.id)} className="btn-ghost text-xs text-red-500">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <CategoryForm cat={editCat} onClose={() => { setShowForm(false); setEditCat(null) }} onSave={() => { setShowForm(false); setEditCat(null); load(); toast(editCat ? 'Category updated' : 'Category created', 'success') }} />
      )}

      <ConfirmDialog open={!!deleteId} title="Delete Category" message="Products in this category will be uncategorized." confirmLabel="Delete" danger onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  )
}

function CategoryForm({ cat, onClose, onSave }: { cat: Category | null; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState(cat?.name ?? '')
  const [color, setColor] = useState(cat?.color ?? '#3b82f6')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast('Name is required', 'error'); return }
    setLoading(true)
    const res = cat ? await api.categories.update(cat.id, { name, color }) : await api.categories.create({ name, color })
    setLoading(false)
    if (res.success) onSave()
    else toast(res.error ?? 'Save failed', 'error')
  }

  return (
    <Modal open title={cat ? 'Edit Category' : 'New Category'} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Name *</label>
          <input autoFocus className="input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-gray-200" />
            <input className="input" value={color} onChange={e => setColor(e.target.value)} placeholder="#3b82f6" />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}

function AboutTab() {
  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">About</h2>
      <div className="card p-5 space-y-3 text-sm text-gray-600">
        <div className="text-4xl">🛒</div>
        <div><strong className="text-gray-900">POS System</strong> v1.0.0</div>
        <p>Offline-first Point of Sale system with Supabase cloud sync. Works fully without internet; automatically syncs when reconnected.</p>
        <div className="border-t pt-3 space-y-1">
          <div className="flex gap-2"><span className="text-gray-400">Built with:</span><span>Electron, React, SQLite, Supabase</span></div>
          <div className="flex gap-2"><span className="text-gray-400">Default PIN:</span><span className="font-mono">1234</span></div>
        </div>
      </div>
    </div>
  )
}
