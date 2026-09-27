import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, todayISO } from '@/lib/dates'
import type { BoardLine } from '@/lib/ops'
import { newId } from './projects'

/** A prop waiting in the cart: rented straight away, without a project. */
export interface CartItem {
  id: string
  propId: string
  from: string
  to: string
  qty: number
  addedAt: number
}

export interface RentDates {
  from: string
  to: string
}

interface CartState {
  items: CartItem[]
  /** The dates picked last; the next prop starts on them. */
  dates: RentDates | null
  /** Adds a prop, or updates its dates and quantity if it's already in the cart. */
  add: (propId: string, input: RentDates & { qty: number }) => 'added' | 'updated'
  /** Adds several props on the same dates (skipping ones already there); returns how many were added. */
  addMany: (propIds: string[], dates: RentDates) => number
  update: (id: string, patch: Partial<Pick<CartItem, 'from' | 'to' | 'qty'>>) => void
  /** Puts every item on the same dates. */
  setAllDates: (dates: RentDates) => void
  /** Returns a function that puts it back (for "Undo"). */
  remove: (id: string) => () => void
  /** Takes out props that were just ordered. */
  removeProps: (propIds: string[]) => void
}

/** Tomorrow, for one day: the first dates a new cart suggests. */
export const defaultRentDates = (): RentDates => {
  const from = addDays(todayISO(), 1)
  return { from, to: from }
}

/** Dates to start a new item on: the last ones picked, unless they've passed. */
export function nextRentDates(dates: RentDates | null): RentDates {
  return dates && dates.from >= todayISO() ? dates : defaultRentDates()
}

/** Cart items as board lines, so pricing, availability and booking treat them alike. */
export function cartLines(items: CartItem[]): BoardLine[] {
  return items.map((it) => ({
    id: `ln-${it.id}`,
    propId: it.propId,
    from: it.from,
    to: it.to,
    qty: it.qty,
    samePiece: true,
    holdUntil: null,
    vendorNote: '',
    paint: null,
    bookingId: null,
    addedAt: it.addedAt,
  }))
}

/** The cart for renting props directly (kept until "Reset demo"). */
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      dates: null,

      add: (propId, { from, to, qty }) => {
        const existing = get().items.find((it) => it.propId === propId)
        set((s) => ({
          dates: { from, to },
          items: existing
            ? s.items.map((it) => (it.id === existing.id ? { ...it, from, to, qty } : it))
            : [...s.items, { id: `ci-${newId()}`, propId, from, to, qty, addedAt: Date.now() }],
        }))
        return existing ? 'updated' : 'added'
      },
      addMany: (propIds, dates) => {
        const fresh = [...new Set(propIds)].filter((id) => !get().items.some((it) => it.propId === id))
        set((s) => ({
          dates,
          items: [...s.items, ...fresh.map((propId) => ({ id: `ci-${newId()}${propId.slice(0, 3)}`, propId, ...dates, qty: 1, addedAt: Date.now() }))],
        }))
        return fresh.length
      },
      update: (id, patch) =>
        set((s) => {
          const items = s.items.map((it) => (it.id === id ? { ...it, ...patch } : it))
          const changed = items.find((it) => it.id === id)
          return { items, dates: changed && (patch.from || patch.to) ? { from: changed.from, to: changed.to } : s.dates }
        }),
      setAllDates: (dates) => set((s) => ({ dates, items: s.items.map((it) => ({ ...it, ...dates })) })),
      remove: (id) => {
        const before = get().items
        set((s) => ({ items: s.items.filter((it) => it.id !== id) }))
        return () => set({ items: before })
      },
      removeProps: (propIds) => set((s) => ({ items: s.items.filter((it) => !propIds.includes(it.propId)) })),
    }),
    { name: 'proto:cart', version: 1 },
  ),
)

/** Number of props in the cart, for the cart button's badge. */
export const useCartCount = () => useCart((s) => s.items.length)
