import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SAMPLE_TEAM, STAGES } from '@/data/ops'
import { addDays, fromISODate, todayISO } from '@/lib/dates'
import {
  DEFAULT_SETTINGS,
  HOUR,
  computeAmounts,
  makeRuns,
  type BoardLine,
  type Booking,
  type ChatMessage,
  type Member,
  type ProjectBoard,
  type ProjectSettings,
  type Run,
  type ScheduleBlock,
} from '@/lib/ops'
import { DEMO_NAME } from './session'
import { newId, useProjects } from './projects'

type BookingInput = Omit<Booking, 'id' | 'invoiceNo' | 'createdAt' | 'extras'>

interface OpsState {
  boards: ProjectBoard[]
  bookings: Booking[]
  runs: Run[]
  members: Member[]
  messages: ChatMessage[]
  settings: Record<string, ProjectSettings>
  /** Booking / invoice number sequence. */
  seq: number

  createBoard: (projectId: string, input: { name: string; block: ScheduleBlock; aiBoardId?: string | null }) => string
  updateBoard: (id: string, patch: Partial<Pick<ProjectBoard, 'name' | 'block' | 'aiBoardId'>>) => void
  deleteBoard: (id: string) => () => void
  /** Adds props (skipping ones already there); returns how many were added. */
  addLines: (boardId: string, propIds: string[]) => number
  updateLine: (boardId: string, lineId: string, patch: Partial<BoardLine>) => void
  /** Returns a function that puts them back. */
  removeLines: (boardId: string, lineIds: string[]) => () => void
  moveLine: (fromBoardId: string, lineId: string, toBoardId: string) => void
  /** The project board fed by an AI Studio board (created if needed). */
  ensureAiBoard: (projectId: string, ai: { id: string; name: string; date: string | null }) => string
  book: (input: BookingInput, lines: BoardLine[]) => Booking
  payBooking: (bookingId: string, ref: string) => void
  updateRun: (runId: string, patch: Partial<Run>) => void
  /** Moves a run to its next tracking stage (demo). */
  advanceRun: (runId: string) => void
  /** Plans a move of booked props between two locations; returns the run id (null if nothing is booked). */
  planMove: (projectId: string, move: { from: string; to: string; date: string; mode: 'tempo' | 'truck' }) => string | null
  /** Extends the rental for a booking by `days`, moving its returns and adding a charge. */
  extendBooking: (bookingId: string, days: number, amount: number) => void
  addMember: (m: Omit<Member, 'id'>) => void
  updateMember: (id: string, patch: Partial<Member>) => void
  removeMember: (id: string) => () => void
  sendMessage: (m: Omit<ChatMessage, 'id' | 'at'>) => void
  setSettings: (projectId: string, patch: Partial<ProjectSettings>) => void
  /** Copies boards (without bookings or holds) into another project. */
  copyBoards: (fromProjectId: string, toProjectId: string) => void
}

const PROJECT = 'monsoon-ad-shoot'

const line = (propId: string, from: string, to: string, patch: Partial<BoardLine> = {}): BoardLine => ({
  id: `ln-${newId()}${propId.slice(0, 3)}`,
  propId,
  from,
  to,
  qty: 1,
  samePiece: true,
  holdUntil: null,
  vendorNote: '',
  paint: null,
  bookingId: null,
  addedAt: Date.now(),
  ...patch,
})

/**
 * A lived-in sample for "Monsoon Ad Shoot": two boards, two bookings, runs,
 * team and chat. Ids are fixed so deep links work before anything is saved.
 */
function sample() {
  const now = Date.now()
  let n = 0
  const seedLine = (propId: string, from: string, to: string, patch: Partial<BoardLine> = {}) =>
    line(propId, from, to, { id: `ln-seed-${n++}`, ...patch })
  const start = addDays(todayISO(), 5)
  const day3 = addDays(start, 2)
  const end = addDays(start, 3)

  const clock = seedLine('wall-clock', start, start, { bookingId: 'BK-1001', vendorNote: 'Please wind it before delivery.' })
  const cafe: ProjectBoard = {
    id: 'pb-cafe',
    projectId: PROJECT,
    name: 'Irani café interior',
    block: { date: start, locationId: 'loc-film-city', time: '7 AM – 7 PM', scene: 'Ravi waits out the rain over chai' },
    aiBoardId: 'board-irani-cafe',
    createdAt: now - 30 * HOUR,
    lines: [
      seedLine('irani-cafe', start, start, { holdUntil: now + 19 * HOUR }),
      clock,
      seedLine('transistor-radio', start, start),
      seedLine('formica-dining', start, start, { qty: 2 }),
      seedLine('chai-counter', start, start),
    ],
  }
  const taxi = seedLine('kaali-peeli', day3, day3, { bookingId: 'BK-1002' })
  const scooter = seedLine('vintage-scooter', day3, day3, { bookingId: 'BK-1002', paint: { colour: 'Teal', hex: '#1f6f6b', note: 'Match the café shutters' } })
  const street: ProjectBoard = {
    id: 'pb-street',
    projectId: PROJECT,
    name: 'Marine Drive street',
    block: { date: day3, locationId: 'loc-marine-drive', time: '5 – 11 AM', scene: 'A taxi and a scooter splash past in the rain' },
    aiBoardId: null,
    createdAt: now - 20 * HOUR,
    lines: [
      taxi,
      scooter,
      seedLine('roadster-bicycle', day3, day3, { holdUntil: now + 40 * HOUR }),
      seedLine('vanity-luxe', start, end),
      seedLine('crew-lunch', start, end),
    ],
  }

  const b1: Booking = {
    id: 'BK-1001',
    projectId: PROJECT,
    boardId: cafe.id,
    lineIds: [clock.id],
    createdAt: now - 26 * HOUR,
    deliverTo: 'loc-film-city',
    deliveryDate: addDays(start, -1),
    deliveryWindow: '5–7 PM',
    returnDate: addDays(start, 1),
    returnWindow: '8–10 AM',
    contact: { name: DEMO_NAME.customer, phone: '9876543210' },
    transport: { 'pune-antiques': 'vendor' },
    move: null,
    payment: { method: 'upi', ref: 'rohan@okicici' },
    amounts: { items: 350, transport: 7800, discount: 0, gst: 1467, deposit: 100, total: 9717 },
    paid: 9717,
    invoiceNo: 'INV-26-1001',
    extras: [],
  }
  const b2: Booking = {
    id: 'BK-1002',
    projectId: PROJECT,
    boardId: street.id,
    lineIds: [taxi.id, scooter.id],
    createdAt: now - 8 * HOUR,
    deliverTo: 'loc-marine-drive',
    deliveryDate: addDays(day3, -1),
    deliveryWindow: '5–7 PM',
    returnDate: day3,
    returnWindow: '2–4 PM',
    contact: { name: DEMO_NAME.customer, phone: '9876543210' },
    transport: { 'classic-wheels': 'vendor' },
    move: null,
    payment: { method: 'po', ref: 'PO-ADX-2231' },
    amounts: { items: 10000, transport: 0, discount: 0, gst: 1800, deposit: 3000, total: 14800 },
    paid: 0,
    invoiceNo: 'INV-26-1002',
    extras: [],
  }
  const runs = [...makeRuns(b1, [clock]), ...makeRuns(b2, [taxi, scooter])].map((r, i) => ({ ...r, id: `run-seed-${i}` }))
  // The café clock is already packed at the vendor.
  runs[0] = { ...runs[0], stage: 1, stageTimes: [b1.createdAt, now - 3 * HOUR, null, null, null, null] }

  // Last month's wrapped shoot: delivered, checked, returned and paid.
  const PAST = 'diwali-tvc'
  const pastStart = addDays(todayISO(), -40)
  const pastEnd = addDays(pastStart, 2)
  const pastLines = [
    seedLine('brass-lantern', pastStart, pastEnd, { qty: 6, bookingId: 'BK-0998' }),
    seedLine('cane-swing', pastStart, pastEnd, { bookingId: 'BK-0998' }),
    seedLine('bridal-lehenga', pastStart, pastEnd, { bookingId: 'BK-0998' }),
  ]
  const haveli: ProjectBoard = {
    id: 'pb-haveli',
    projectId: PAST,
    name: 'Haveli courtyard',
    block: { date: pastStart, locationId: 'loc-kamalistan', time: 'All day', scene: 'The family lights the first diya' },
    aiBoardId: null,
    createdAt: now - 52 * 24 * HOUR,
    lines: pastLines,
  }
  const b0Base: Booking = {
    id: 'BK-0998',
    projectId: PAST,
    boardId: haveli.id,
    lineIds: pastLines.map((l) => l.id),
    createdAt: now - 50 * 24 * HOUR,
    deliverTo: 'loc-kamalistan',
    deliveryDate: addDays(pastStart, -1),
    deliveryWindow: '5–7 PM',
    returnDate: pastEnd,
    returnWindow: '8–10 PM',
    contact: { name: DEMO_NAME.customer, phone: '9876543210' },
    transport: { 'pune-antiques': 'vendor', 'chandni-props': 'vendor' },
    move: null,
    payment: { method: 'card', ref: 'HDFC •••• 4242' },
    amounts: { items: 0, transport: 0, discount: 0, gst: 0, deposit: 0, total: 0 },
    paid: 0,
    invoiceNo: 'INV-26-0998',
    extras: [],
  }
  const pastRuns = makeRuns(b0Base, pastLines)
  const pastAmounts = computeAmounts(pastLines, pastRuns.reduce((n, r) => n + r.cost, 0))
  const b0: Booking = { ...b0Base, amounts: pastAmounts, paid: pastAmounts.total }
  const doneAt = (date: string) => fromISODate(date).getTime() + 19 * HOUR
  const donePastRuns: Run[] = pastRuns.map((r, i) => {
    const t = doneAt(r.date)
    return {
      ...r,
      id: `run-past-${i}`,
      stage: 5,
      stageTimes: [b0.createdAt, t - 5 * HOUR, t - 3 * HOUR, t - HOUR, t, t + 20 * 60_000],
      arrivedAt: t,
      confirmedAt: t + 20 * 60_000,
      check: { scanned: r.lineIds, photos: {}, damage: {}, signature: null, signedBy: DEMO_NAME.customer, lockedAt: t + 18 * 60_000 },
    }
  })

  const members: Member[] = [
    { id: 'm-you', projectId: PROJECT, name: DEMO_NAME.customer, phone: '9876543210', role: 'Art Director', admin: true, you: true },
    ...SAMPLE_TEAM.map((t, i) => ({ id: `m-${i}`, projectId: PROJECT, ...t })),
    { id: 'm-you-past', projectId: PAST, name: DEMO_NAME.customer, phone: '9876543210', role: 'Art Director', admin: true, you: true },
    { id: 'm-past-0', projectId: PAST, ...SAMPLE_TEAM[0] },
  ]
  const messages: ChatMessage[] = [
    { id: 'msg-1', projectId: PROJECT, author: 'Priya Nair', role: 'Producer', text: 'Props budget is ₹4.5L including transport. Let’s keep a 10% buffer.', at: now - 50 * HOUR },
    { id: 'msg-2', projectId: PROJECT, author: 'Arjun Shah', role: 'Director', text: 'The café should feel lived-in. Steam, an old radio, rain on the glass.', at: now - 26 * HOUR },
    { id: 'msg-3', projectId: PROJECT, author: 'Kavya Rao', role: 'Set decorator', text: 'The transistor radio is booked on day 1. Looking for options.', at: now - 5 * HOUR },
    { id: 'msg-4', projectId: PROJECT, author: DEMO_NAME.customer, role: 'Art Director', text: 'I’ll check alternatives on the board.', at: now - 4 * HOUR, mine: true },
  ]
  return { boards: [cafe, street, haveli], bookings: [b0, b1, b2], runs: [...donePastRuns, ...runs], members, messages }
}

const seed = sample()

/** Boards, bookings, deliveries, team and chat for every project (kept until "Reset demo"). */
export const useProjectOps = create<OpsState>()(
  persist(
    (set, get) => ({
      ...seed,
      settings: { [PROJECT]: DEFAULT_SETTINGS },
      seq: 1002,

      createBoard: (projectId, input) => {
        const id = `pb-${newId()}`
        set((s) => ({
          boards: [...s.boards, { id, projectId, name: input.name, block: input.block, aiBoardId: input.aiBoardId ?? null, lines: [], createdAt: Date.now() }],
        }))
        return id
      },
      updateBoard: (id, patch) => set((s) => ({ boards: s.boards.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
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
      addLines: (boardId, propIds) => {
        const board = get().boards.find((b) => b.id === boardId)
        if (!board) return 0
        const project = useProjects.getState().projects.find((p) => p.id === board.projectId)
        const from = board.block.date ?? project?.startDate ?? todayISO()
        const to = board.block.date ?? project?.endDate ?? from
        const fresh = propIds.filter((id) => !board.lines.some((l) => l.propId === id))
        if (fresh.length) {
          set((s) => ({
            boards: s.boards.map((b) => (b.id === boardId ? { ...b, lines: [...b.lines, ...fresh.map((id) => line(id, from, to))] } : b)),
          }))
        }
        return fresh.length
      },
      updateLine: (boardId, lineId, patch) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId ? { ...b, lines: b.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) } : b,
          ),
        })),
      removeLines: (boardId, lineIds) => {
        const before = get().boards.find((b) => b.id === boardId)?.lines ?? []
        set((s) => ({ boards: s.boards.map((b) => (b.id === boardId ? { ...b, lines: b.lines.filter((l) => !lineIds.includes(l.id)) } : b)) }))
        return () => set((s) => ({ boards: s.boards.map((b) => (b.id === boardId ? { ...b, lines: before } : b)) }))
      },
      moveLine: (fromBoardId, lineId, toBoardId) => {
        const moving = get().boards.find((b) => b.id === fromBoardId)?.lines.find((l) => l.id === lineId)
        if (!moving) return
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === fromBoardId
              ? { ...b, lines: b.lines.filter((l) => l.id !== lineId) }
              : b.id === toBoardId
                ? { ...b, lines: [...b.lines, moving] }
                : b,
          ),
        }))
      },
      ensureAiBoard: (projectId, ai) => {
        const existing = get().boards.find((b) => b.projectId === projectId && b.aiBoardId === ai.id)
        if (existing) return existing.id
        const project = useProjects.getState().projects.find((p) => p.id === projectId)
        const date = ai.date && project && ai.date >= project.startDate && ai.date <= project.endDate ? ai.date : null
        return get().createBoard(projectId, {
          name: ai.name,
          aiBoardId: ai.id,
          block: { date, locationId: project?.locations.find((l) => l.date === date)?.id ?? null, time: 'All day', scene: ai.name },
        })
      },
      book: (input, lines) => {
        const seq = get().seq + 1
        const booking: Booking = { ...input, id: `BK-${seq}`, invoiceNo: `INV-26-${seq}`, createdAt: Date.now(), extras: [] }
        const runs = makeRuns(booking, lines)
        set((s) => ({
          seq,
          bookings: [...s.bookings, booking],
          runs: [...s.runs, ...runs],
          boards: s.boards.map((b) =>
            b.id === input.boardId
              ? { ...b, lines: b.lines.map((l) => (input.lineIds.includes(l.id) ? { ...l, bookingId: booking.id, holdUntil: null } : l)) }
              : b,
          ),
        }))
        return booking
      },
      payBooking: (bookingId, ref) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === bookingId
              ? { ...b, paid: b.amounts.total, payment: { ...b.payment, ref: b.payment.ref || ref }, extras: b.extras.map((e) => ({ ...e, paid: true })) }
              : b,
          ),
        })),
      updateRun: (runId, patch) => set((s) => ({ runs: s.runs.map((r) => (r.id === runId ? { ...r, ...patch } : r)) })),
      advanceRun: (runId) =>
        set((s) => ({
          runs: s.runs.map((r) => {
            if (r.id !== runId || r.stage >= STAGES[r.kind].length - 1) return r
            const stage = r.stage + 1
            const stageTimes = [...r.stageTimes]
            stageTimes[stage] = Date.now()
            return { ...r, stage, stageTimes, arrivedAt: stage === 4 ? Date.now() : r.arrivedAt, confirmedAt: stage === 5 ? Date.now() : r.confirmedAt }
          }),
        })),
      planMove: (projectId, move) => {
        const { boards, bookings } = get()
        const booked = boards.filter((b) => b.projectId === projectId).flatMap((b) => b.lines.filter((l) => l.bookingId))
        const booking = bookings.find((b) => b.projectId === projectId)
        if (!booked.length || !booking) return null
        const [run] = makeRuns(
          { ...booking, createdAt: Date.now(), move: { from: move.from, to: move.to, date: move.date }, transport: {} },
          [],
        ).filter((r) => r.kind === 'move')
        const planned = { ...run, lineIds: booked.map((l) => l.id), mode: move.mode, cost: move.mode === 'truck' ? 2800 : 1500 }
        set((s) => ({ runs: [...s.runs, planned] }))
        return planned.id
      },
      extendBooking: (bookingId, days, amount) => {
        const booking = get().bookings.find((b) => b.id === bookingId)
        if (!booking) return
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  returnDate: addDays(b.returnDate, days),
                  extras: [...b.extras, { id: newId(), label: `Extended ${days} day${days === 1 ? '' : 's'}`, amount, paid: false }],
                }
              : b,
          ),
          runs: s.runs.map((r) => (r.bookingId === bookingId && r.kind === 'return' ? { ...r, date: addDays(r.date, days) } : r)),
          boards: s.boards.map((b) =>
            b.id === booking.boardId
              ? { ...b, lines: b.lines.map((l) => (booking.lineIds.includes(l.id) ? { ...l, to: addDays(l.to, days) } : l)) }
              : b,
          ),
        }))
      },
      addMember: (m) => set((s) => ({ members: [...s.members, { ...m, id: newId() }] })),
      updateMember: (id, patch) => set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMember: (id) => {
        const index = get().members.findIndex((m) => m.id === id)
        const removed = get().members[index]
        set((s) => ({ members: s.members.filter((m) => m.id !== id) }))
        return () => {
          if (!removed) return
          set((s) => {
            const members = [...s.members]
            members.splice(index, 0, removed)
            return { members }
          })
        }
      },
      sendMessage: (m) => set((s) => ({ messages: [...s.messages, { ...m, id: newId(), at: Date.now() }] })),
      setSettings: (projectId, patch) =>
        set((s) => ({ settings: { ...s.settings, [projectId]: { ...(s.settings[projectId] ?? DEFAULT_SETTINGS), ...patch } } })),
      copyBoards: (fromProjectId, toProjectId) =>
        set((s) => ({
          boards: [
            ...s.boards,
            ...s.boards
              .filter((b) => b.projectId === fromProjectId)
              .map((b) => ({
                ...b,
                id: `pb-${newId()}`,
                projectId: toProjectId,
                aiBoardId: null,
                block: { ...b.block, date: null, locationId: null },
                lines: b.lines.map((l) => ({ ...l, id: newId() + l.propId.slice(0, 3), bookingId: null, holdUntil: null })),
                createdAt: Date.now(),
              })),
          ],
        })),
    }),
    { name: 'proto:project-ops', version: 1 },
  ),
)

/* ── Selectors ───────────────────────────────────────────────────────────── */

export const useProjectBoards = (projectId: string) =>
  useProjectOps((s) => s.boards).filter((b) => b.projectId === projectId)
export const useProjectBookings = (projectId: string) =>
  useProjectOps((s) => s.bookings).filter((b) => b.projectId === projectId)
export const useProjectRuns = (projectId: string) => useProjectOps((s) => s.runs).filter((r) => r.projectId === projectId)
export const useProjectMembers = (projectId: string) =>
  useProjectOps((s) => s.members).filter((m) => m.projectId === projectId)
export const useProjectSettings = (projectId: string) => useProjectOps((s) => s.settings[projectId]) ?? DEFAULT_SETTINGS
export const useBoardById = (id: string | undefined) => useProjectOps((s) => s.boards.find((b) => b.id === id))
export const useRunById = (id: string | undefined) => useProjectOps((s) => s.runs.find((r) => r.id === id))
export const useMessages = (projectId: string) =>
  useProjectOps((s) => s.messages).filter((m) => m.projectId === projectId)

/* One-time migration: the old flat project "shortlist" becomes a board. */
;(() => {
  const { projects } = useProjects.getState()
  const withList = projects.filter((p) => p.shortlist?.length)
  if (!withList.length) return
  for (const p of withList) {
    const id = useProjectOps.getState().createBoard(p.id, { name: 'Shortlist', block: { date: null, locationId: null, time: 'All day', scene: '' } })
    useProjectOps.getState().addLines(id, p.shortlist!)
  }
  useProjects.setState((s) => ({ projects: s.projects.map((p) => ({ ...p, shortlist: undefined })) }))
})()
