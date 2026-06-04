import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { formatCurrency } from '../lib/utils'
import type { Product, Category } from '../../../shared/types'

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterLowStock, setFilterLowStock] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [stockAdjust, setStockAdjust] = useState<{ product: Product; delta: string } | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([
      api.products.list({ search: search || undefined, category: filterCategory || undefined, lowStock: filterLowStock }),
      api.categories.list(),
    ])
    if (pRes.success && pRes.data) setProducts(pRes.data)
    if (cRes.success && cRes.data) setCategories(cRes.data)
  }, [search, filterCategory, filterLowStock])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await api.products.delete(deleteId)
    if (res.success) { toast('Product deleted', 'success'); load() }
    else toast(res.error ?? 'Delete failed', 'error')
    setDeleteId(null)
  }

  const handleStockAdjust = async () => {
    if (!stockAdjust) return
    const delta = parseFloat(stockAdjust.delta)
    if (isNaN(delta)) { toast('Invalid quantity', 'error'); return }
    const res = await api.products.adjustStock(stockAdjust.product.id, delta)
    if (res.success) { toast('Stock updated', 'success'); load() }
    else toast(res.error ?? 'Update failed', 'error')
    setStockAdjust(null)
  }

  const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock && p.stock_quantity > 0).length
  const outOfStockCount = products.filter(p => p.stock_quantity <= 0).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
            <div className="flex gap-4 mt-1 text-sm text-gray-500">
              <span>{products.length} products</span>
              {lowStockCount > 0 && <span className="text-yellow-600">{lowStockCount} low stock</span>}
              {outOfStockCount > 0 && <span className="text-red-600">{outOfStockCount} out of stock</span>}
            </div>
          </div>
          <button onClick={() => { setEditProduct(null); setShowForm(true) }} className="btn-primary">+ Add Product</button>
        </div>
        <div className="flex gap-3 flex-wrap">
          <input type="text" placeholder="Search..." className="input max-w-xs" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input max-w-[180px]" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={filterLowStock} onChange={e => setFilterLowStock(e.target.checked)} className="rounded" />
            Low stock only
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Product</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">SKU</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Category</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Price</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Cost</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Stock</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(product => (
              <tr key={product.id} className="bg-white hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3">
                  <div className="font-medium text-gray-900">{product.name}</div>
                  {product.barcode && <div className="text-xs text-gray-400">{product.barcode}</div>}
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{product.sku}</td>
                <td className="px-4 py-3">
                  {product.category_name ? (
                    <span className="badge bg-gray-100 text-gray-700">{product.category_name}</span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">${product.price.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-gray-500">${product.cost.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`badge ${
                    product.stock_quantity <= 0 ? 'bg-red-100 text-red-700' :
                    product.stock_quantity <= product.min_stock ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>{product.stock_quantity}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setStockAdjust({ product, delta: '' })} className="btn-ghost text-xs py-1 px-2">Adjust</button>
                    <button onClick={() => { setEditProduct(product); setShowForm(true) }} className="btn-ghost text-xs py-1 px-2">Edit</button>
                    <button onClick={() => setDeleteId(product.id)} className="btn-ghost text-xs py-1 px-2 text-red-500 hover:text-red-600">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">📦</div>
            <p>No products found</p>
          </div>
        )}
      </div>

      {showForm && (
        <ProductForm
          product={editProduct}
          categories={categories}
          onClose={() => { setShowForm(false); setEditProduct(null) }}
          onSave={() => { setShowForm(false); setEditProduct(null); load(); toast(editProduct ? 'Product updated' : 'Product created', 'success') }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Product"
        message="This product will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {stockAdjust && (
        <Modal open title={`Adjust Stock: ${stockAdjust.product.name}`} onClose={() => setStockAdjust(null)} size="sm">
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-4">Current stock: <strong>{stockAdjust.product.stock_quantity}</strong></p>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-1">Adjustment (use negative to decrease)</label>
              <input
                autoFocus type="number" placeholder="e.g. 10 or -5" className="input"
                value={stockAdjust.delta}
                onChange={e => setStockAdjust({ ...stockAdjust, delta: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleStockAdjust()}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setStockAdjust(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleStockAdjust} className="btn-primary">Update Stock</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ProductForm({ product, categories, onClose, onSave }: {
  product: Product | null; categories: Category[]
  onClose: () => void; onSave: () => void
}) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    price: product?.price ?? 0,
    cost: product?.cost ?? 0,
    category_id: product?.category_id ?? '',
    stock_quantity: product?.stock_quantity ?? 0,
    min_stock: product?.min_stock ?? 0,
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.sku.trim()) e.sku = 'SKU is required'
    if (form.price < 0) e.price = 'Price must be positive'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    const data = { ...form, category_id: form.category_id || null, barcode: form.barcode || null }
    const res = product ? await api.products.update(product.id, data) : await api.products.create(data)
    setLoading(false)
    if (res.success) onSave()
    else toast(res.error ?? 'Save failed', 'error')
  }

  const f = (field: string, value: unknown) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <Modal open title={product ? 'Edit Product' : 'New Product'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">Product Name *</label>
            <input className={`input ${errors.name ? 'border-red-400' : ''}`} value={form.name} onChange={e => f('name', e.target.value)} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">SKU *</label>
            <input className={`input ${errors.sku ? 'border-red-400' : ''}`} value={form.sku} onChange={e => f('sku', e.target.value)} />
            {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Barcode</label>
            <input className="input" value={form.barcode} onChange={e => f('barcode', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Selling Price *</label>
            <input type="number" min="0" step="0.01" className="input" value={form.price} onChange={e => f('price', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Cost Price</label>
            <input type="number" min="0" step="0.01" className="input" value={form.cost} onChange={e => f('cost', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
            <select className="input" value={form.category_id} onChange={e => f('category_id', e.target.value)}>
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Stock Quantity</label>
            <input type="number" min="0" step="0.001" className="input" value={form.stock_quantity} onChange={e => f('stock_quantity', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Minimum Stock Alert</label>
            <input type="number" min="0" step="0.001" className="input" value={form.min_stock} onChange={e => f('min_stock', parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Product'}</button>
        </div>
      </form>
    </Modal>
  )
}
