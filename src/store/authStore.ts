import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserTier } from '@/types'

const DEV_BACKUP_KEY = 'madrasah-dev-original-tier'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  devModeActive: boolean
  setUser: (user: User | null) => void
  logout: () => void
  setDevTier: (tier: UserTier) => void
  exitDevMode: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      devModeActive: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      logout: () => {
        localStorage.removeItem(DEV_BACKUP_KEY)
        set({ user: null, isAuthenticated: false, devModeActive: false })
      },

      setDevTier: (tier: UserTier) => {
        const { user } = get()
        if (!user) return
        // Save original tier if not already in dev mode
        if (!localStorage.getItem(DEV_BACKUP_KEY)) {
          localStorage.setItem(DEV_BACKUP_KEY, user.tier)
        }
        set({ user: { ...user, tier }, devModeActive: true })
      },

      exitDevMode: () => {
        const { user } = get()
        if (!user) return
        const originalTier = localStorage.getItem(DEV_BACKUP_KEY) as UserTier | null
        localStorage.removeItem(DEV_BACKUP_KEY)
        set({
          user: { ...user, tier: originalTier ?? 'free' },
          devModeActive: false,
        })
      },
    }),
    { name: 'madrasah-auth' }
  )
)
