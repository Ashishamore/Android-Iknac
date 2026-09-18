import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type BoardKind = 'project' | 'ai'

interface RecentState {
  /** Prop ids opened on their listing, latest first. */
  props: string[]
  /** The board opened most recently ("Continue where you left off"). */
  lastBoard: { kind: BoardKind; id: string; at: number } | null
  viewProp: (id: string) => void
  /** Clears recently viewed; returns a function that puts them back (for "Undo"). */
  clearProps: () => () => void
  openBoard: (kind: BoardKind, id: string) => void
}

const MAX_PROPS = 12

/** What the art director looked at last, for Home (kept until "Reset demo"). */
export const useRecent = create<RecentState>()(
  persist(
    (set, get) => ({
      props: ['vintage-scooter', 'kaali-peeli', 'neon-sign', 'planter-chair'],
      lastBoard: null,
      viewProp: (id) => set((s) => ({ props: [id, ...s.props.filter((p) => p !== id)].slice(0, MAX_PROPS) })),
      clearProps: () => {
        const before = get().props
        set({ props: [] })
        return () => set({ props: before })
      },
      openBoard: (kind, id) => set({ lastBoard: { kind, id, at: Date.now() } }),
    }),
    { name: 'proto:recent', version: 1 },
  ),
)

/** Records a board as "last opened" while its screen is shown. */
export function useTrackBoard(kind: BoardKind, id: string) {
  useEffect(() => {
    useRecent.getState().openBoard(kind, id)
  }, [kind, id])
}

/** Records a prop listing as recently viewed. */
export function useTrackProp(id: string) {
  useEffect(() => {
    useRecent.getState().viewProp(id)
  }, [id])
}
