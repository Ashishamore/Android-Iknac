import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { newId } from './projects'

export interface SavedSearch {
  id: string
  name: string
  /** Filters as a query string (see searchKey in lib/search). */
  query: string
  /** Notify when new props match. */
  alerts: boolean
  /** New matches since it was last run (demo). */
  newCount: number
  createdAt: number
}

interface DiscoverState {
  /** Latest first. */
  recent: string[]
  saved: SavedSearch[]
  addRecent: (term: string) => void
  removeRecent: (term: string) => void
  clearRecent: () => void
  saveSearch: (name: string, query: string, alerts: boolean) => string
  setAlerts: (id: string, alerts: boolean) => void
  /** Clears the "new" count. */
  markSeen: (id: string) => void
  /** Returns a function that puts it back (for "Undo"). */
  deleteSearch: (id: string) => () => void
}

const MAX_RECENT = 8

/** Recent and saved searches on Discover (kept until "Reset demo"). */
export const useDiscover = create<DiscoverState>()(
  persist(
    (set, get) => ({
      recent: ['Rotary phone', 'Chesterfield sofa', 'Vanity van'],
      saved: [
        {
          id: 'saved-vintage-vehicles',
          name: 'Vintage vehicles',
          query: 'cat=Vehicles&era=1970s,1980s–90s',
          alerts: true,
          newCount: 2,
          createdAt: Date.now() - 6 * 86_400_000,
        },
        {
          id: 'saved-colonial-furniture',
          name: 'Colonial furniture',
          query: 'cat=Furniture&era=Colonial&scope=state',
          alerts: false,
          newCount: 0,
          createdAt: Date.now() - 12 * 86_400_000,
        },
      ],
      addRecent: (term) => {
        const t = term.trim()
        if (!t) return
        set((s) => ({
          recent: [t, ...s.recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT),
        }))
      },
      removeRecent: (term) => set((s) => ({ recent: s.recent.filter((r) => r !== term) })),
      clearRecent: () => set({ recent: [] }),
      saveSearch: (name, query, alerts) => {
        const id = newId()
        set((s) => ({ saved: [{ id, name, query, alerts, newCount: 0, createdAt: Date.now() }, ...s.saved] }))
        return id
      },
      setAlerts: (id, alerts) => set((s) => ({ saved: s.saved.map((x) => (x.id === id ? { ...x, alerts } : x)) })),
      markSeen: (id) => set((s) => ({ saved: s.saved.map((x) => (x.id === id ? { ...x, newCount: 0 } : x)) })),
      deleteSearch: (id) => {
        const index = get().saved.findIndex((x) => x.id === id)
        const removed = get().saved[index]
        set((s) => ({ saved: s.saved.filter((x) => x.id !== id) }))
        return () => {
          if (!removed) return
          set((s) => {
            const saved = [...s.saved]
            saved.splice(index, 0, removed)
            return { saved }
          })
        }
      },
    }),
    { name: 'proto:discover', version: 1 },
  ),
)
