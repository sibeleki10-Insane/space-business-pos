export interface Category {
  id: string
  name: string
  color: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  synced: number
}

export interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  price: number
  cost: number
  category_id: string | null
  category_name?: string
  stock_quantity: number
  min_stock: number
  image_url: string | null
  is_active: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  synced: number
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  loyalty_points: number
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  synced: number
}

export interface Transaction {
  id: string
  transaction_number: string
  customer_id: string | null
  customer_name?: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total: number
  payment_method: 'cash' | 'card' | 'mixed'
  cash_given: number
  change_given: number
  status: 'completed' | 'refunded' | 'void'
  notes: string | null
  cashier_id: string
  cashier_name?: string
  location_id: string
  created_at: string
  updated_at: string
  synced: number
}

export interface TransactionItem {
  id: string
  transaction_id: string
  product_id: string
  product_name: string
  sku: string
  quantity: number
  unit_price: number
  discount_amount: number
  total: number
}

export interface CartItem {
  product: Product
  quantity: number
  unit_price: number
  discount_amount: number
  total: number
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'cashier'
  pin: string
  is_active: number
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  name: string
  address: string | null
  tax_rate: number
  currency: string
  created_at: string
  updated_at: string
}

export interface SyncQueueItem {
  id: number
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  table_name: string
  record_id: string
  data: string
  created_at: string
  attempts: number
  last_error: string | null
}

export interface AppSettings {
  supabase_url: string
  supabase_anon_key: string
  location_id: string
  location_name: string
  tax_rate: number
  currency: string
  currency_symbol: string
  receipt_header: string
  receipt_footer: string
  printer_name: string
  auto_print_receipt: boolean
  theme: 'light' | 'dark'
}

export interface SalesReport {
  date: string
  total_sales: number
  total_transactions: number
  total_items: number
  avg_transaction: number
}

export interface TopProduct {
  product_id: string
  product_name: string
  sku: string
  total_quantity: number
  total_revenue: number
}

export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
