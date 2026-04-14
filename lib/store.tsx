'use client'

/**
 * Single Zustand store replacing the previous three React Contexts
 * (AuthContext / SiteContext / OutlineContext).
 *
 * SSR safety: the store is created per-request via the StoreProvider
 * (React ref), not as a module-level singleton, so concurrent Next.js
 * SSR requests don't share client state.
 */

import { createStore, useStore as useZustandStore } from 'zustand'
import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from 'react'
import type { User } from '@/lib/schemas'
import type { SiteData } from '@/lib/types'
import { getUserInfoByToken } from '@/lib/api/users'
import { clearTokenClient } from '@/lib/utils'

export interface OutlineItem {
  id: string
  title: string
  level: number
}

export interface AppState {
  // --- auth ---
  user: User | null
  loginVisible: boolean
  drawerUserId: number | null

  // --- outline (per-article TOC) ---
  outlineItems: OutlineItem[]

  // --- header scroll state ---
  // Mirrors blog-ssr's `headerHeight` var: 0 when header is at its natural
  // top position or hidden, = header.height when user scrolled back up.
  // Drives the sticky outline module's `top` offset so it slides up with
  // the header instead of leaving a visible blank below.
  headerOffset: number

  // --- site (server-fetched, treated as read-only after init) ---
  site: SiteData

  // --- actions ---
  setUser: (user: User | null) => void
  refreshUser: () => Promise<void>
  logout: () => void
  showLogin: () => void
  hideLogin: () => void
  showUserDrawer: (userId: number) => void
  hideUserDrawer: () => void
  setOutlineItems: (items: OutlineItem[]) => void
  setHeaderOffset: (offset: number) => void
}

type AppStore = ReturnType<typeof createAppStore>

interface InitialState {
  user: User | null
  site: SiteData
}

export function createAppStore(initial: InitialState) {
  return createStore<AppState>((set) => ({
    user: initial.user,
    loginVisible: false,
    drawerUserId: null,
    outlineItems: [],
    headerOffset: 0,
    site: initial.site,

    setUser: (user) => set({ user }),
    refreshUser: async () => {
      try {
        const user = await getUserInfoByToken()
        set({ user })
      } catch {
        clearTokenClient()
        set({ user: null })
      }
    },
    logout: () => {
      clearTokenClient()
      set({ user: null })
    },
    showLogin: () => set({ loginVisible: true }),
    hideLogin: () => set({ loginVisible: false }),
    showUserDrawer: (drawerUserId) => set({ drawerUserId }),
    hideUserDrawer: () => set({ drawerUserId: null }),
    setOutlineItems: (outlineItems) => set({ outlineItems }),
    setHeaderOffset: (headerOffset) => set({ headerOffset }),
  }))
}

const StoreContext = createContext<AppStore | null>(null)

export function StoreProvider({
  initial,
  children,
}: {
  initial: InitialState
  children: ReactNode
}) {
  const storeRef = useRef<AppStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = createAppStore(initial)
  }
  return (
    <StoreContext.Provider value={storeRef.current}>
      {children}
    </StoreContext.Provider>
  )
}

// ─── generic selector hook ───────────────────────────────────────
export function useAppStore<T>(selector: (state: AppState) => T): T {
  const store = useContext(StoreContext)
  if (!store) {
    throw new Error('useAppStore must be used within <StoreProvider>')
  }
  return useZustandStore(store, selector)
}

// ─── convenience hooks ───────────────────────────────────────────
// auth
export const useUser = () => useAppStore((s) => s.user)
export const useRefreshUser = () => useAppStore((s) => s.refreshUser)
export const useLogout = () => useAppStore((s) => s.logout)

// login modal
export const useLoginVisible = () => useAppStore((s) => s.loginVisible)
export const useShowLogin = () => useAppStore((s) => s.showLogin)
export const useHideLogin = () => useAppStore((s) => s.hideLogin)

// user drawer
export const useDrawerUserId = () => useAppStore((s) => s.drawerUserId)
export const useShowUserDrawer = () => useAppStore((s) => s.showUserDrawer)
export const useHideUserDrawer = () => useAppStore((s) => s.hideUserDrawer)

// outline
export const useOutlineItems = () => useAppStore((s) => s.outlineItems)
export const useSetOutlineItems = () => useAppStore((s) => s.setOutlineItems)

// header scroll state
export const useHeaderOffset = () => useAppStore((s) => s.headerOffset)
export const useSetHeaderOffset = () => useAppStore((s) => s.setHeaderOffset)

// site (stable snapshot)
export const useSite = () => useAppStore((s) => s.site)
