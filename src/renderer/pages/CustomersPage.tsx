import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { formatDateTime, formatCurrency } from '../lib/utils'
import type { Customer, Transaction } from '../../../shared/types'

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    const res = await api.customers.list(search || undefined)
    if (res.success && res.data) setCustomers(res.data)
  }, [search])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await api.customers.delete(deleteId)
    if (res.success) { toast('Customer deleted', 'success'); load(); if (selected?.id === deleteId) setSelected(null) }
    else toast(res.error ?? 'Delete failed', 'error')
    setDeleteId(null)
  }

  return (
    <div className="flex h-full">
      {/* Customer list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Customers <span className="text-sm text-gray-400 font-normal ml-1">({customers.length})</span></h1>
            <button onClick={() => { setEditCustomer(null); setShowForm(true) }} className="btn-primary">+ Add Customer</button>
          </div>
          <input type="text" placeholder="Search by name, email, or phone..." className="input" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Contact</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Points</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map(c => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${selected?.id === c.id ? 'bg-blue-50' : 'bg-white'}`}
                >
                  <td className="px-6 py-3">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    {c.address && <div className="text-xs text-gray-400 truncate max-w-[200px]">{c.address}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <div>{c.phone}</div>
                    <div className="text-xs">{c.email}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="badge bg-purple-100 text-purple-700">{c.loyalty_points}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={e => { e.stopPropagation(); setEditCustomer(c); setShowForm(true) }} className="btn-ghost text-xs py-1 px-2">Edit</button>
                      <button onClick={e => { e.stopPropagation(); setDeleteId(c.id) }} className="btn-ghost text-xs py-1 px-2 text-red-500">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-2">👥</div>
              <p>No customers found</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer detail panel */}
      {selected && (
        <CustomerDetailPanel customer={selected} onClose={() => setSelected(null)} />
      )}

      {showForm && (
        <CustomerForm
          customer={editCustomer}
          onClose={() => { setShowForm(false); setEditCustomer(null) }}
          onSave={() => { setShowForm(false); setEditCustomer(null); load(); toast(editCustomer ? 'Customer updated' : 'Customer created', 'success') }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Customer"
        message="This customer will be permanently deleted."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

function CustomerDetailPanel({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [stats, setStats] = useState<{ total_transactions: number; total_spent: number; avg_transaction: number; last_visit: string } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    api.reports.customerStats(customer.id).then(res => {
      if (res.success && res.data) {
        const d = res.data as { stats: typeof stats; recent: Transaction[] }
        setStats(d.stats)
        setTransactions(d.recent)
      }
    })
  }, [customer.id])

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Customer Details</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
          {customer.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}
          {customer.email && <p className="text-sm text-gray-500">{customer.email}</p>}
          {customer.address && <p className="text-sm text-gray-400 mt-1">{customer.address}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-purple-700">{customer.loyalty_points}</div>
            <div className="text-xs text-purple-500">Loyalty Points</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-blue-700">{stats?.total_transactions ?? 0}</div>
            <div className="text-xs text-blue-500">Transactions</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-green-700">${(stats?.total_spent ?? 0).toFixed(0)}</div>
            <div className="text-xs text-green-500">Total Spent</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-gray-700">${(stats?.avg_transaction ?? 0).toFixed(0)}</div>
            <div className="text-xs text-gray-500">Avg. Order</div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Transactions</h4>
          <div className="space-y-2">
            {transactions.map(txn => (
              <div key={txn.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-900">{txn.transaction_number}</span>
                  <span className="font-bold text-green-700">${txn.total.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(txn.created_at)}</div>
              </div>
            ))}
            {transactions.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No transactions yet</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function CustomerForm({ customer, onClose, onSave }: { customer: Customer | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    address: customer?.address ?? '',
    notes: customer?.notes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast('Name is required', 'error'); return }
    setLoading(true)
    const data = { name: form.name, email: form.email || null, phone: form.phone || null, address: form.address || null, notes: form.notes || null, deleted_at: null }
    const res = customer ? await api.customers.update(customer.id, data) : await api.customers.create(data)
    setLoading(false)
    if (res.success) onSave()
    else toast(res.error ?? 'Save failed', 'error')
  }

  const f = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <Modal open title={customer ? 'Edit Customer' : 'New Customer'} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Full Name *</label>
          <input autoFocus className="input" value={form.name} onChange={e => f('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
            <input className="input" value={form.phone} onChange={e => f('phone', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <input type="email" className="input" value={form.email} onChange={e => f('email', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Address</label>
          <input className="input" value={form.address} onChange={e => f('address', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
          <textarea className="input h-16 resize-none" value={form.notes} onChange={e => f('notes', e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}
