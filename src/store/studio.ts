import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SCENE_EXAMPLES, STUDIO_SAMPLE_PHOTO, TEAM, type VersionId } from '@/data/studio'
import { addDays, todayISO } from '@/lib/dates'
import { buildVersions, suggestSlots, type BoardVersion, type Limits, type SceneSource, type Slot } from '@/lib/studio'
import { newId } from './projects'

export interface BoardComment {
  id: string
  author: string
  role: string
  text: string
  at: number
  /** Written by the signed-in user. */
  mine?: boolean
}

export type HistoryKind = 'generate' | 'rebuild' | 'swap' | 'remove' | 'restore' | 'project'

/** A change to a board, with the versions as they were after it (for "Restore"). */
export interface HistoryEntry {
  id: string
  at: number
  kind: HistoryKind
  label: string
  versions: BoardVersion[]
}

/** An AI-generated prop board for one scene. */
export interface Board {
  id: string
  name: string
  source: SceneSource
  /** The brief, the script page, or a note on the photo. */
  prompt: string
  /** Reference photo (a path or a downscaled data URL). */
  photo: string | null
  limits: Limits
  slots: Slot[]
  /** Versions A, B and C. */
  versions: BoardVersion[]
  active: VersionId
  /** Bumped on each rebuild so the picks change. */
  seed: number
  comments: BoardComment[]
  /** Newest first. */
  history: HistoryEntry[]
  /** Project board that asked for this ("Ask AI"); "Add all to project" fills it. */
  projectBoardId?: string | null
  createdAt: number
  updatedAt: number
}

export type BoardInput = Pick<Board, 'name' | 'source' | 'prompt' | 'photo' | 'limits' | 'slots' | 'projectBoardId'>

export interface CreditEntry {
  id: string
  at: number
  label: string
  /** +10 for a top up, −1 for a generation. */
  delta: number
}

interface StudioState {
  credits: number
  /** Newest first. */
  log: CreditEntry[]
  boards: Board[]
  /** Uses one credit. Returns false when there are none left. */
  spend: (label: string) => boolean
  topUp: (credits: number, label: string) => void
  createBoard: (input: BoardInput) => string
  /** Merges `patch`; with `history`, records the change (and the versions after it). */
  updateBoard: (id: string, patch: Partial<Omit<Board, 'id'>>, history?: { kind: HistoryKind; label: string }) => void
  /** Puts a prop (or nothing) in one slot of one version. */
  setItem: (id: string, version: VersionId, slotId: string, propId: string | null, history: { kind: HistoryKind; label: string }) => void
  addComment: (id: string, text: string, author: string) => void
  /** Returns a function that puts it back (for "Undo"). */
  deleteBoard: (id: string) => () => void
}

const HOUR = 3_600_000

function makeBoard(input: BoardInput, at: number, seedExtras: Partial<Board> = {}): Board {
  const versions = buildVersions(input.slots, input.limits, 0)
  return {
    ...input,
    id: newId(),
    versions,
    active: 'A',
    seed: 0,
    comments: [],
    history: [{ id: newId(), at, kind: 'generate', label: 'Generated versions A, B and C', versions }],
    createdAt: at,
    updatedAt: at,
    ...seedExtras,
  }
}

/** Two sample boards so the studio isn't empty on first open. */
function sampleBoards(): Board[] {
  const now = Date.now()
  const start = addDays(todayISO(), 5)
  const cafeSlots = suggestSlots('describe', SCENE_EXAMPLES[0], null).map((s) =>
    s.name === 'Radio' ? { ...s, periodCorrect: true, note: 'Should sit on the counter' } : s,
  )
  const cafe = makeBoard(
    {
      name: 'Rainy Irani café morning',
      source: 'describe',
      prompt: SCENE_EXAMPLES[0],
      photo: null,
      limits: { projectId: 'monsoon-ad-shoot', from: start, to: addDays(start, 3), era: '1940s–60s', budget: 150000, scope: 'state' },
      slots: cafeSlots,
    },
    now - 26 * HOUR,
    {
      id: 'board-irani-cafe',
      active: 'B',
      comments: [
        { id: 'c1', ...TEAM.producer, text: 'Love version B. Can we check the café is free on day 2?', at: now - 5 * HOUR },
        { id: 'c2', ...TEAM.director, text: 'Radio should be on the counter, not on the wall.', at: now - 2 * HOUR },
      ],
    },
  )
  const street = makeBoard(
    {
      name: 'Monsoon street scene',
      source: 'photo',
      prompt: 'Same street, but in the rain, 1970s',
      photo: STUDIO_SAMPLE_PHOTO.url,
      limits: { projectId: null, from: null, to: null, era: '1970s', budget: 40000, scope: 'state' },
      slots: suggestSlots('photo', 'Same street, but in the rain, 1970s', STUDIO_SAMPLE_PHOTO.url),
    },
    now - 4 * 24 * HOUR,
    { id: 'board-monsoon-street' },
  )
  return [cafe, street]
}

/** AI Studio: credits and generated boards (kept until "Reset demo"). */
export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      credits: 5,
      log: [
        { id: 'l3', at: Date.now() - 26 * HOUR, label: 'Generated “Rainy Irani café morning”', delta: -1 },
        { id: 'l2', at: Date.now() - 96 * HOUR, label: 'Generated “Monsoon street scene”', delta: -1 },
        { id: 'l1', at: Date.now() - 168 * HOUR, label: 'Welcome credits', delta: 7 },
      ],
      boards: sampleBoards(),

      spend: (label) => {
        if (get().credits < 1) return false
        set((s) => ({ credits: s.credits - 1, log: [{ id: newId(), at: Date.now(), label, delta: -1 }, ...s.log].slice(0, 30) }))
        return true
      },
      topUp: (credits, label) =>
        set((s) => ({ credits: s.credits + credits, log: [{ id: newId(), at: Date.now(), label, delta: credits }, ...s.log].slice(0, 30) })),

      createBoard: (input) => {
        const board = makeBoard(input, Date.now())
        set((s) => ({ boards: [board, ...s.boards] }))
        return board.id
      },
      updateBoard: (id, patch, history) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== id) return b
            const next: Board = { ...b, ...patch, updatedAt: Date.now() }
            if (history) {
              next.history = [{ id: newId(), at: Date.now(), ...history, versions: next.versions }, ...b.history].slice(0, 40)
            }
            return next
          }),
        })),
      setItem: (id, version, slotId, propId, history) => {
        const board = get().boards.find((b) => b.id === id)
        if (!board) return
        const versions = board.versions.map((v) =>
          v.id !== version ? v : { ...v, items: v.items.map((it) => (it.slotId === slotId ? { ...it, propId } : it)) },
        )
        get().updateBoard(id, { versions }, history)
      },
      addComment: (id, text, author) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === id
              ? { ...b, comments: [...b.comments, { id: newId(), author, role: 'Art Director', text, at: Date.now(), mine: true }] }
              : b,
          ),
        })),
      deleteBoard: (id) => {
        const index = get().boards.findIndex((b) => b.id === id)
        const removed = get().boards[index]
        set((s) => ({ boards: s.boards.filter((b) => b.id !== id) }))
        return () => {
          if (!removed) return
          set((s) => {
            const boards = [...s.boards]
            boards.splice(index, 0, removed)
            return { boards }
          })
        }
      },
    }),
    { name: 'proto:studio', version: 1 },
  ),
)

export const useBoard = (id: string | undefined) => useStudio((s) => s.boards.find((b) => b.id === id))
