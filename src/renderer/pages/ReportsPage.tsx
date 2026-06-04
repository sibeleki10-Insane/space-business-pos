import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { formatCurrency, formatDate } from '../lib/utils'
import type { SalesReport, TopProduct } from '../../../shared/types'

type Range = '7d' | '30d' | '90d' | 'custom'

function getRange(range: Range, customFrom: string, customTo: string): { from: string; to: string } {
  const to = new Date()
  if (range === 'custom') return { from: new Date(customFrom).toISOString(), to: new Date(customTo + 'T23:59:59').toISOString() }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const from = new Date(Date.now() - days * 86400_000)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function ReportsPage() {
  const [range, setRange] = useState<Range>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [salesData, setSalesData] = useState<SalesReport[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [summary, setSummary] = useState<{
    total_transactions: number; total_revenue: number; total_tax: number
    total_discounts: number; avg_transaction: number; total_items: number
  } | null>(null)
  const [byPayment, setByPayment] = useState<{ payment_method: string; count: number; total: number }[]>([])
  const [tab, setTab] = useState<'overview' | 'sales' | 'products' | 'transactions'>('overview')
  const [transactions, setTransactions] = useState<import('../../../shared/types').Transaction[]>([])
  const { settings } = useAuthStore()
  const currencySymbol = settings.currency_symbol ?? '$'

  const load = useCallback(async () => {
    const { from, to } = getRange(range, customFrom, customTo)
    const groupBy = range === '7d' ? 'day' : range === '30d' ? 'day' : 'week'
    const [sRes, tpRes, sumRes, txnRes] = await Promise.all([
      api.reports.sales({ from, to, groupBy }),
      api.reports.topProducts({ from, to, limit: 10 }),
      api.reports.summary({ from, to }),
      api.transactions.list({ from, to, status: 'completed' }),
    ])
    if (sRes.success && sRes.data) setSalesData(sRes.data)
    if (tpRes.success && tpRes.data) setTopProducts(tpRes.data)
    if (sumRes.success && sumRes.data) {
      const d = sumRes.data as { summary: typeof summary; byPayment: typeof byPayment }
      setSummary(d.summary)
      setByPayment(d.byPayment)
    }
    if (txnRes.success && txnRes.data) setTransactions(txnRes.data)
  }, [range, customFrom, customTo])

  useEffect(() => { load() }, [load])

  const maxSales = Math.max(...salesData.map(d => d.total_sales), 1)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <div className="flex items-center gap-3">
            {(['7d', '30d', '90d', 'custom'] as Range[]).map(r => (
              <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${range === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {r === '7d' ? '7 days' : r === '30d' ? '30 days' : r === '90d' ? '90 days' : 'Custom'}
              </button>
            ))}
            {range === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" className="input text-sm py-1" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                <span className="text-gray-400">to</span>
                <input type="date" className="input text-sm py-1" value={customTo} onChange={e => setCustomTo(e.target.value)} />
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {(['overview', 'sales', 'products', 'transactions'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium rounded-t-lg capitalize transition-colors ${tab === t ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total Revenue', value: formatCurrency(summary?.total_revenue ?? 0, currencySymbol), color: 'blue' },
                { label: 'Transactions', value: String(summary?.total_transactions ?? 0), color: 'green' },
                { label: 'Avg. Order', value: formatCurrency(summary?.avg_transaction ?? 0, currencySymbol), color: 'purple' },
                { label: 'Items Sold', value: String(Math.round(summary?.total_items ?? 0)), color: 'orange' },
              ].map(card => (
                <div key={card.label} className="card p-4">
                  <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              ))}
            </div>

            {/* Sales chart */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Sales Over Time</h3>
              <div className="flex items-end gap-1 h-40">
                {salesData.map(d => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full bg-blue-100 rounded-t transition-all hover:bg-blue-200"
                      style={{ height: `${(d.total_sales / maxSales) * 140}px`, minHeight: '2px' }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {formatCurrency(d.total_sales, currencySymbol)}
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 rotate-45 origin-left whitespace-nowrap">{d.date.slice(5)}</span>
                  </div>
                ))}
                {salesData.length === 0 && <p className="text-gray-400 text-sm w-full text-center">No data for this period</p>}
              </div>
            </div>

            {/* Payment breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Payment Methods</h3>
                <div className="space-y-2">
                  {byPayment.map(p => (
                    <div key={p.payment_method} className="flex justify-between items-center">
                      <span className="text-sm capitalize text-gray-600">{p.payment_method}</span>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(p.total, currencySymbol)}</div>
                        <div className="text-xs text-gray-400">{p.count} txns</div>
                      </div>
                    </div>
                  ))}
                  {byPayment.length === 0 && <p className="text-gray-400 text-sm">No data</p>}
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Tax Collected</span><span className="font-medium">{formatCurrency(summary?.total_tax ?? 0, currencySymbol)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Discounts Given</span><span className="font-medium text-red-600">-{formatCurrency(summary?.total_discounts ?? 0, currencySymbol)}</span></div>
                  <div className="flex justify-between border-t pt-2"><span className="font-medium text-gray-700">Net Revenue</span><span className="font-bold text-gray-900">{formatCurrency((summary?.total_revenue ?? 0) - (summary?.total_discounts ?? 0), currencySymbol)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'products' && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Top Products by Revenue</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Product</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Units Sold</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Revenue</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topProducts.map((p, i) => {
                  const totalRev = topProducts.reduce((s, x) => s + x.total_revenue, 0)
                  const share = totalRev > 0 ? (p.total_revenue / totalRev) * 100 : 0
                  return (
                    <tr key={p.product_id} className="bg-white hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                          <div>
                            <div className="font-medium text-gray-900">{p.product_name}</div>
                            <div className="text-xs text-gray-400">{p.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{p.total_quantity}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(p.total_revenue, currencySymbol)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{share.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {topProducts.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-2">📊</div>
                <p>No sales data for this period</p>
              </div>
            )}
          </div>
        )}

        {tab === 'sales' && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Sales by Period</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Date</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Transactions</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Items Sold</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Avg. Order</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {salesData.map(d => (
                  <tr key={d.date} className="bg-white hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{d.date}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{d.total_transactions}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{Math.round(d.total_items ?? 0)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(d.avg_transaction, currencySymbol)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(d.total_sales, currencySymbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'transactions' && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Number</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Method</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Total</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map(txn => (
                  <tr key={txn.id} className="bg-white hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-blue-600">{txn.transaction_number}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(txn.created_at)}</td>
                    <td className="px-4 py-3 text-gray-700">{txn.customer_name ?? '—'}</td>
                    <td className="px-4 py-3 capitalize text-gray-500">{txn.payment_method}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(txn.total, currencySymbol)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`badge ${txn.status === 'completed' ? 'bg-green-100 text-green-700' : txn.status === 'void' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{txn.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
