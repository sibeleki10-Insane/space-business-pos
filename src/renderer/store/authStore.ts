import { create } from 'zustand'
import type { User } from '../../../shared/types'

interface AuthState {
  user: User | null
  settings: Record<string, string>
  syncStatus: { isOnline: boolean; pendingCount: number }
  setUser: (user: User | null) => void
  setSettings: (s: Record<string, string>) => void
  setSyncStatus: (s: { isOnline: boolean; pendingCount: number }) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  settings: {},
  syncStatus: { isOnline: false, pendingCount: 0 },
  setUser: (user) => set({ user }),
  setSettings: (settings) => set({ settings }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
}))
