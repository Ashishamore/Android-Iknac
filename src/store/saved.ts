import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SavedState {
  /** Prop ids the user has saved (heart). */
  saved: Record<string, boolean>
  /** Vendor ids the user has saved. */
  vendors: Record<string, boolean>
  toggle: (id: string) => void
  toggleVendor: (id: string) => void
}

const flip = (map: Record<string, boolean>, id: string) => {
  const next = { ...map }
  if (next[id]) delete next[id]
  else next[id] = true
  return next
}

/** Saved props and vendors (kept until "Reset demo"). */
export const useSaved = create<SavedState>()(
  persist(
    (set) => ({
      saved: {},
      vendors: { 'bandra-vintage': true, 'classic-wheels': true },
      toggle: (id) => set((s) => ({ saved: flip(s.saved, id) })),
      toggleVendor: (id) => set((s) => ({ vendors: flip(s.vendors, id) })),
    }),
    { name: 'proto:saved', version: 1 },
  ),
)
