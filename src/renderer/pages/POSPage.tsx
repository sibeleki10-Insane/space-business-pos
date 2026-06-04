import React, { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../lib/api'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import { formatCurrency } from '../lib/utils'
import type { Product, Category, Customer } from '../../../shared/types'

export function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [search, setSearch] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user, settings } = useAuthStore()
  const { items, customer, discount, clearCart, addItem, removeItem, updateQuantity, setCustomer, setDiscount } = useCartStore()

  const taxRate = parseFloat(settings.tax_rate ?? '10')
  const currencySymbol = settings.currency_symbol ?? '$'
  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const taxAmount = (subtotal - discount) * (taxRate / 100)
  const total = subtotal - discount + taxAmount

  const loadProducts = useCallback(async () => {
    const res = await api.products.list({ search: search || undefined, category: selectedCategory || undefined })
    if (res.success && res.data) setProducts(res.data)
  }, [search, selectedCategory])

  useEffect(() => { loadProducts() }, [loadProducts])

  useEffect(() => {
    api.categories.list().then(res => {
      if (res.success && res.data) setCategories(res.data)
    })
    searchRef.current?.focus()
  }, [])

  const handleBarcodeSearch = async (value: string) => {
    if (value.length > 5 && !value.includes(' ')) {
      const res = await api.products.getByBarcode(value)
      if (res.success && res.data) {
        addItem(res.data)
        setSearch('')
        return
      }
    }
    setSearch(value)
  }

  return (
    <div className="flex h-full">
      {/* Product grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search + categories */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search products or scan barcode..."
            className="input"
            value={search}
            onChange={e => handleBarcodeSearch(e.target.value)}
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >All</button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
              >{cat.name}</button>
            ))}
          </div>
        </div>

        {/* Products */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => addItem(product)}
                disabled={product.stock_quantity <= 0}
                className={`card p-3 text-left hover:shadow-md transition-all active:scale-95 ${
                  product.stock_quantity <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{product.name}</div>
                <div className="text-xs text-gray-500 mb-2">{product.sku}</div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-600">{formatCurrency(product.price, currencySymbol)}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    product.stock_quantity <= 0 ? 'bg-red-100 text-red-600' :
                    product.stock_quantity <= product.min_stock ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>{product.stock_quantity <= 0 ? 'Out' : `${product.stock_quantity}`}</span>
                </div>
              </button>
            ))}
          </div>
          {products.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-2">🔍</div>
              <p>No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Customer */}
        <div className="px-4 py-3 border-b border-gray-100">
          {customer ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                <div className="text-xs text-gray-500">{customer.loyalty_points} pts</div>
              </div>
              <button onClick={() => setCustomer(null)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
            </div>
          ) : (
            <button onClick={() => setShowCustomerSearch(true)} className="w-full text-sm text-blue-600 hover:text-blue-700 text-left">
              + Add customer
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">🛒</div>
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map(item => (
                <div key={item.product.id} className="px-4 py-3">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 flex-1 pr-2 line-clamp-2">{item.product.name}</span>
                    <button onClick={() => removeItem(item.product.id)} className="text-gray-300 hover:text-red-500 text-sm shrink-0">✕</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-bold">-</button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-bold">+</button>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.total, currencySymbol)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>{formatCurrency(subtotal, currencySymbol)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Discount</span>
            <input
              type="number"
              min="0"
              value={discount || ''}
              onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-24 text-right border border-gray-200 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax ({taxRate}%)</span><span>{formatCurrency(taxAmount, currencySymbol)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span><span className="text-blue-600">{formatCurrency(total, currencySymbol)}</span>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={clearCart} className="btn-secondary flex-1 text-sm" disabled={items.length === 0}>Clear</button>
            <button onClick={() => setShowPayment(true)} className="btn-primary flex-1 text-sm" disabled={items.length === 0}>Charge</button>
          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          total={total}
          subtotal={subtotal}
          taxAmount={taxAmount}
          discount={discount}
          taxRate={taxRate}
          currencySymbol={currencySymbol}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false)
            clearCart()
            loadProducts()
            toast('Transaction complete!', 'success')
          }}
        />
      )}

      {showCustomerSearch && (
        <CustomerSearchModal
          onSelect={(c) => { setCustomer(c); setShowCustomerSearch(false) }}
          onClose={() => setShowCustomerSearch(false)}
        />
      )}
    </div>
  )
}

function PaymentModal({ total, subtotal, taxAmount, discount, taxRate, currencySymbol, onClose, onSuccess }: {
  total: number; subtotal: number; taxAmount: number; discount: number; taxRate: number; currencySymbol: string
  onClose: () => void; onSuccess: () => void
}) {
  const [method, setMethod] = useState<'cash' | 'card'>('cash')
  const [cashGiven, setCashGiven] = useState('')
  const [loading, setLoading] = useState(false)
  const { items, customer } = useCartStore()
  const { user, settings } = useAuthStore()
  const { toast } = useToast()

  const cash = parseFloat(cashGiven) || 0
  const change = method === 'cash' ? Math.max(0, cash - total) : 0

  const handleCharge = async () => {
    if (method === 'cash' && cash < total) {
      toast('Cash given is less than total', 'error')
      return
    }
    setLoading(true)
    const locationId = settings.location_id || 'default'
    const res = await api.transactions.create({
      cart: items,
      customer_id: customer?.id ?? null,
      payment_method: method,
      cash_given: method === 'cash' ? cash : total,
      discount_amount: discount,
      notes: null,
      cashier_id: user!.id,
      location_id: locationId,
      tax_rate: taxRate,
    })
    setLoading(false)
    if (res.success) onSuccess()
    else toast(res.error ?? 'Transaction failed', 'error')
  }

  const quickCash = [Math.ceil(total), Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, Math.ceil(total / 20) * 20]
    .filter((v, i, a) => v >= total && a.indexOf(v) === i).slice(0, 3)

  return (
    <Modal open title="Payment" onClose={onClose} size="sm">
      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          {(['cash', 'card'] as const).map(m => (
            <button key={m} onClick={() => setMethod(m)} className={`flex-1 py-2.5 rounded-lg font-medium capitalize transition-colors ${method === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{m}</button>
          ))}
        </div>

        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal, currencySymbol)}</span></div>
          {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(discount, currencySymbol)}</span></div>}
          <div className="flex justify-between text-gray-600"><span>Tax</span><span>{formatCurrency(taxAmount, currencySymbol)}</span></div>
          <div className="flex justify-between font-bold text-lg text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span className="text-blue-600">{formatCurrency(total, currencySymbol)}</span></div>
        </div>

        {method === 'cash' && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Cash Given</label>
              <input type="number" value={cashGiven} onChange={e => setCashGiven(e.target.value)} placeholder="0.00" className="input text-lg font-bold" autoFocus />
            </div>
            <div className="flex gap-2">
              {quickCash.map(v => (
                <button key={v} onClick={() => setCashGiven(String(v))} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">{formatCurrency(v, currencySymbol)}</button>
              ))}
            </div>
            {cash >= total && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <span className="text-sm text-green-700">Change: </span>
                <span className="text-lg font-bold text-green-700">{formatCurrency(change, currencySymbol)}</span>
              </div>
            )}
          </>
        )}

        <button onClick={handleCharge} disabled={loading || (method === 'cash' && cash < total)} className="btn-primary w-full text-base py-3">
          {loading ? 'Processing...' : `Charge ${formatCurrency(total, currencySymbol)}`}
        </button>
      </div>
    </Modal>
  )
}

function CustomerSearchModal({ onSelect, onClose }: { onSelect: (c: Customer) => void; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(() => {
    api.customers.list(search || undefined).then(res => {
      if (res.success && res.data) setCustomers(res.data)
    })
  }, [search])

  return (
    <Modal open title="Select Customer" onClose={onClose} size="sm">
      <div className="p-4">
        <input autoFocus type="text" placeholder="Search customers..." className="input mb-3" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {customers.map(c => (
            <button key={c.id} onClick={() => onSelect(c)} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors">
              <div className="text-sm font-medium text-gray-900">{c.name}</div>
              <div className="text-xs text-gray-500">{c.phone || c.email} · {c.loyalty_points} pts</div>
            </button>
          ))}
          {customers.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No customers found</p>}
        </div>
      </div>
    </Modal>
  )
}
