import { create } from 'zustand'
import type { CartItem, Product, Customer } from '../../../shared/types'

interface CartState {
  items: CartItem[]
  customer: Customer | null
  discount: number
  notes: string
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, qty: number) => void
  setItemDiscount: (productId: string, discount: number) => void
  setCustomer: (customer: Customer | null) => void
  setDiscount: (discount: number) => void
  setNotes: (notes: string) => void
  clearCart: () => void
}

function calcItemTotal(item: CartItem): number {
  return Math.max(0, item.quantity * item.unit_price - item.discount_amount)
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  customer: null,
  discount: 0,
  notes: '',

  addItem: (product) => set((state) => {
    const existing = state.items.find(i => i.product.id === product.id)
    if (existing) {
      return {
        items: state.items.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1, total: calcItemTotal({ ...i, quantity: i.quantity + 1 }) }
            : i
        ),
      }
    }
    const item: CartItem = {
      product,
      quantity: 1,
      unit_price: product.price,
      discount_amount: 0,
      total: product.price,
    }
    return { items: [...state.items, item] }
  }),

  removeItem: (productId) => set((state) => ({
    items: state.items.filter(i => i.product.id !== productId),
  })),

  updateQuantity: (productId, qty) => set((state) => ({
    items: qty <= 0
      ? state.items.filter(i => i.product.id !== productId)
      : state.items.map(i =>
          i.product.id === productId
            ? { ...i, quantity: qty, total: calcItemTotal({ ...i, quantity: qty }) }
            : i
        ),
  })),

  setItemDiscount: (productId, discount) => set((state) => ({
    items: state.items.map(i =>
      i.product.id === productId
        ? { ...i, discount_amount: discount, total: calcItemTotal({ ...i, discount_amount: discount }) }
        : i
    ),
  })),

  setCustomer: (customer) => set({ customer }),
  setDiscount: (discount) => set({ discount }),
  setNotes: (notes) => set({ notes }),
  clearCart: () => set({ items: [], customer: null, discount: 0, notes: '' }),
}))
