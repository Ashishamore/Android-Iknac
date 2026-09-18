import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'
export type Accent = 'indigo' | 'blue' | 'violet' | 'teal' | 'orange' | 'rose'
export type Lang = 'en' | 'hi' | 'mr'

interface UiState {
  theme: Theme
  accent: Accent
  language: Lang
  sidebarCollapsed: boolean
  /** "Remember my choice" on the workspace fork. */
  rememberWorkspace: boolean
  setTheme: (theme: Theme) => void
  setAccent: (accent: Accent) => void
  setLanguage: (language: Lang) => void
  toggleSidebar: () => void
  setRememberWorkspace: (on: boolean) => void
}

/** Admin panel preferences (this browser only). */
export const useUi = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      accent: 'indigo',
      language: 'en',
      sidebarCollapsed: false,
      rememberWorkspace: true,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setLanguage: (language) => set({ language }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setRememberWorkspace: (rememberWorkspace) => set({ rememberWorkspace }),
    }),
    { name: 'proto:admin-ui', version: 1 },
  ),
)

/** Transient UI: command palette, notifications flyout, mobile nav drawer. */
export const useChromeUi = create<{
  palette: boolean
  notifications: boolean
  mobileNav: boolean
  set: (patch: Partial<{ palette: boolean; notifications: boolean; mobileNav: boolean }>) => void
}>()((set) => ({
  palette: false,
  notifications: false,
  mobileNav: false,
  set: (patch) => set(patch),
}))
