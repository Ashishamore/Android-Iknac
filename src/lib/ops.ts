/**
 * Running a project: boards of items, holds, bookings, transport runs,
 * money and "what's next". Pure helpers + the types the ops store keeps.
 */
import { HOME_CITY, propById, vendorById, type Vendor } from '@/data/props'
import { DRIVERS, type RunKind, type TransportMode } from '@/data/ops'
import { addDays, daysInclusive, formatDayShort, todayISO } from './dates'
import { formatINR } from './format'
import { clashOn } from './search'
import type { Tone } from './tones'

export const HOUR = 3_600_000

/* ── Types ───────────────────────────────────────────────────────────────── */

export type LineStatus = 'unavailable' | 'not-reserved' | 'reserved' | 'booked'

/** One prop on a project board. */
export interface BoardLine {
  id: string
  propId: string
  from: string
  to: string
  qty: number
  /** Continuity: the identical piece every day. */
  samePiece: boolean
  /** Reserved until (ms), or null. */
  holdUntil: number | null
  vendorNote: string
  /** "Ask to paint" request. */
  paint: { colour: string; hex: string; note: string } | null
  bookingId: string | null
  addedAt: number
}

/** "What this board is for": a block in the shoot schedule. */
export interface ScheduleBlock {
  date: string | null
  locationId: string | null
  time: string
  scene: string
}

export interface ProjectBoard {
  id: string
  projectId: string
  name: string
  block: ScheduleBlock
  lines: BoardLine[]
  /** Board created from an AI Studio board. */
  aiBoardId: string | null
  createdAt: number
}

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'po'

export interface Amounts {
  items: number
  transport: number
  discount: number
  gst: number
  /** Refundable security deposit. */
  deposit: number
  total: number
}

export interface Booking {
  id: string
  projectId: string
  boardId: string
  lineIds: string[]
  createdAt: number
  deliverTo: string | null
  deliveryDate: string
  deliveryWindow: string
  returnDate: string
  returnWindow: string
  contact: { name: string; phone: string }
  /** Mode per vendor id. */
  transport: Record<string, TransportMode>
  move: { from: string; to: string; date: string } | null
  payment: { method: PaymentMethod; ref: string }
  amounts: Amounts
  /** Amount paid so far (PO bookings start at 0). */
  paid: number
  invoiceNo: string
  /** Charges added later (e.g. extensions). */
  extras: { id: string; label: string; amount: number; paid: boolean }[]
}

export interface PhotoCheck {
  scanned: string[]
  photos: Record<string, string[]>
  damage: Record<string, { type: string; note: string }>
  signature: string | null
  signedBy: string | null
  lockedAt: number | null
}

/** A delivery, return or move between locations. */
export interface Run {
  id: string
  projectId: string
  bookingId: string
  kind: RunKind
  /** null for moves (partner vehicle). */
  vendorId: string | null
  mode: TransportMode
  date: string
  window: string
  /** Delivery: drop-off. Return: pickup. Move: from. */
  locationId: string | null
  /** Move: destination. */
  toLocationId: string | null
  lineIds: string[]
  cost: number
  stage: number
  /** When each stage was reached. */
  stageTimes: (number | null)[]
  driver: (typeof DRIVERS)[number]
  arrivedAt: number | null
  check: PhotoCheck
  confirmedAt: number | null
  requests: { at: number; text: string }[]
}

export interface Member {
  id: string
  projectId: string
  name: string
  phone: string
  role: string
  admin: boolean
  you?: boolean
}

export interface ChatMessage {
  id: string
  projectId: string
  author: string
  role: string
  text: string
  at: number
  mine?: boolean
}

export type DeliveryTiming = 'day-before' | 'same-day'

export interface ProjectSettings {
  timing: DeliveryTiming
  /** Call time on shoot days, e.g. "7:00 AM". */
  callTime: string
}

export const DEFAULT_SETTINGS: ProjectSettings = { timing: 'day-before', callTime: '7:00 AM' }

/* ── Items ───────────────────────────────────────────────────────────────── */

export const STATUS_META: Record<LineStatus, { label: string; tone: Tone }> = {
  unavailable: { label: 'Unavailable', tone: 'danger' },
  'not-reserved': { label: 'Not reserved', tone: 'neutral' },
  reserved: { label: 'Reserved', tone: 'info' },
  booked: { label: 'Booked', tone: 'success' },
}
/** Filter chip order (as in the IA). */
export const FILTER_ORDER: LineStatus[] = ['reserved', 'not-reserved', 'booked', 'unavailable']
/** Group order when grouping by status: what needs attention first. */
export const STATUS_ORDER: LineStatus[] = ['unavailable', 'not-reserved', 'reserved', 'booked']

export function lineStatus(line: BoardLine, now = Date.now()): LineStatus {
  if (line.bookingId) return 'booked'
  if (clashOn(propById(line.propId), line.from, line.to)) return 'unavailable'
  if (line.holdUntil && line.holdUntil > now) return 'reserved'
  return 'not-reserved'
}

export const lineDays = (l: Pick<BoardLine, 'from' | 'to'>) => daysInclusive(l.from, l.to)
export const lineCost = (l: BoardLine) => (propById(l.propId)?.pricePerDay ?? 0) * l.qty * lineDays(l)

/** "19h left", "45 min left" for a hold. */
export function holdLeft(holdUntil: number, now = Date.now()) {
  const min = Math.max(0, Math.round((holdUntil - now) / 60_000))
  return min >= 60 ? `${Math.floor(min / 60)}h left` : `${min} min left`
}

export function boardStats(board: ProjectBoard, now = Date.now()) {
  const counts: Record<LineStatus, number> = { unavailable: 0, 'not-reserved': 0, reserved: 0, booked: 0 }
  let cost = 0
  let open = 0
  for (const l of board.lines) {
    const s = lineStatus(l, now)
    counts[s]++
    cost += lineCost(l)
    if (s !== 'booked') open += lineCost(l)
  }
  return { counts, cost, open, items: board.lines.reduce((n, l) => n + l.qty, 0) }
}

/** Every date from start to end. */
export function shootDays(p: { startDate: string; endDate: string }) {
  return Array.from({ length: daysInclusive(p.startDate, p.endDate) }, (_, i) => addDays(p.startDate, i))
}

/** "Day 2 · Mon, 21 Sept" */
export const dayLabel = (startDate: string, iso: string) => `Day ${daysInclusive(startDate, iso)} · ${formatDayShort(iso)}`

/** "Day 1 · Film City – Stage 4 · 7 AM – 7 PM" */
export function blockSummary(
  block: ScheduleBlock,
  project: { startDate: string; locations: { id: string; name: string }[] },
) {
  const loc = project.locations.find((l) => l.id === block.locationId)?.name
  const day = block.date ? `Day ${daysInclusive(project.startDate, block.date)}` : 'Whole shoot'
  return [day, loc, block.time !== 'All day' ? block.time : null].filter(Boolean).join(' · ')
}

/* ── Runs ────────────────────────────────────────────────────────────────── */

/** Tag tone for a tracking stage: done, needs attention (arrived / on set), or in progress. */
export function stageTone(run: Run): Tone {
  if (run.stage >= 5) return 'success'
  if (run.stage === 4 || (run.kind === 'return' && run.stage === 1)) return 'warning'
  return run.stage === 0 ? 'neutral' : 'info'
}

export function runTitle(run: Run) {
  if (run.kind === 'move') return 'Move between locations'
  const vendor = run.vendorId ? vendorById(run.vendorId)?.name : ''
  return `${run.kind === 'delivery' ? 'Delivery' : 'Return'} · ${vendor}`
}

export const locationName = (project: { locations: { id: string; name: string }[] }, id: string | null) =>
  project.locations.find((l) => l.id === id)?.name ?? 'Location not set'

export function runPlace(run: Run, project: { locations: { id: string; name: string }[] }) {
  if (run.kind === 'move') return `${locationName(project, run.locationId)} → ${locationName(project, run.toLocationId)}`
  return `${run.kind === 'delivery' ? 'To' : 'From'} ${locationName(project, run.locationId)}`
}

/* ── Transport & money ───────────────────────────────────────────────────── */

export const MOVE_COST = 1500
export const GST_RATE = 0.18

/** Cost of one run (a delivery or a return) for a vendor and mode. */
export function runCost(vendor: Vendor, mode: TransportMode) {
  if (mode === 'self') return 0
  if (vendor.city !== HOME_CITY) return Math.round((vendor.distanceKm * 16 + 1500) / 100) * 100
  if (mode === 'vendor') return vendor.distanceKm <= 10 ? 0 : 800
  if (mode === 'tempo') return Math.round((1200 + vendor.distanceKm * 45) / 100) * 100
  return Math.round((2800 + vendor.distanceKm * 70) / 100) * 100
}

export const defaultMode = (v: Vendor): TransportMode => (v.delivery ? 'vendor' : 'tempo')

/** Rent, transport, a 5% discount on 3+ day rentals, 18% GST and a 30% refundable deposit. */
export function computeAmounts(lines: BoardLine[], transport: number): Amounts {
  const items = lines.reduce((sum, l) => sum + lineCost(l), 0)
  const discount = lines.some((l) => lineDays(l) >= 3) ? Math.round(items * 0.05) : 0
  const gst = Math.round((items - discount + transport) * GST_RATE)
  const deposit = Math.round((items * 0.3) / 100) * 100
  return { items, transport, discount, gst, deposit, total: items - discount + transport + gst + deposit }
}

/** Lines grouped by vendor id, in first-seen order. */
export function byVendor<T extends { propId: string }>(lines: T[]) {
  const map = new Map<string, T[]>()
  for (const l of lines) {
    const v = propById(l.propId).vendorId
    map.set(v, [...(map.get(v) ?? []), l])
  }
  return [...map.entries()].map(([vendorId, items]) => ({ vendor: vendorById(vendorId), items }))
}

const emptyCheck = (): PhotoCheck => ({ scanned: [], photos: {}, damage: {}, signature: null, signedBy: null, lockedAt: null })

let runSeq = 0
const runId = () => `run-${Date.now().toString(36)}${(runSeq++).toString(36)}`

/** Deliveries and returns per vendor, plus one move between locations if asked for. */
export function makeRuns(booking: Booking, lines: BoardLine[]): Run[] {
  const base = (kind: RunKind, i: number) => ({
    id: runId(),
    projectId: booking.projectId,
    bookingId: booking.id,
    kind,
    stage: 0,
    stageTimes: [booking.createdAt, null, null, null, null, null],
    driver: DRIVERS[(booking.createdAt / 1000 + i) % DRIVERS.length | 0],
    arrivedAt: null,
    check: emptyCheck(),
    confirmedAt: null,
    requests: [],
  })
  const runs: Run[] = []
  byVendor(lines).forEach(({ vendor, items }, i) => {
    const mode = booking.transport[vendor.id] ?? defaultMode(vendor)
    const ids = items.map((l) => l.id)
    runs.push({
      ...base('delivery', i),
      vendorId: vendor.id,
      mode,
      date: booking.deliveryDate,
      window: booking.deliveryWindow,
      locationId: booking.deliverTo,
      toLocationId: null,
      lineIds: ids,
      cost: runCost(vendor, mode),
    })
    runs.push({
      ...base('return', i + 1),
      vendorId: vendor.id,
      mode,
      date: booking.returnDate,
      window: booking.returnWindow,
      locationId: booking.move ? booking.move.to : booking.deliverTo,
      toLocationId: null,
      lineIds: ids,
      cost: runCost(vendor, mode),
    })
  })
  if (booking.move) {
    runs.push({
      ...base('move', 7),
      vendorId: null,
      mode: 'tempo',
      date: booking.move.date,
      window: '6–8 AM',
      locationId: booking.move.from,
      toLocationId: booking.move.to,
      lineIds: lines.map((l) => l.id),
      cost: MOVE_COST,
    })
  }
  return runs
}

/** Totals across bookings (extras included). */
export function moneySummary(bookings: Booking[]) {
  const s = { items: 0, transport: 0, discount: 0, gst: 0, deposit: 0, extras: 0, total: 0, paid: 0, pending: 0 }
  for (const b of bookings) {
    s.items += b.amounts.items
    s.transport += b.amounts.transport
    s.discount += b.amounts.discount
    s.gst += b.amounts.gst
    s.deposit += b.amounts.deposit
    const extras = b.extras.reduce((n, e) => n + e.amount, 0)
    const extrasPaid = b.extras.filter((e) => e.paid).reduce((n, e) => n + e.amount, 0)
    s.extras += extras
    s.total += b.amounts.total + extras
    s.paid += b.paid + extrasPaid
  }
  s.pending = s.total - s.paid
  return s
}

/** Spend against the budget: booked (excl. deposit), reserved and planned items. */
export function budgetUse(boards: ProjectBoard[], bookings: Booking[], now = Date.now()) {
  const booked = bookings.reduce((n, b) => n + b.amounts.total - b.amounts.deposit + b.extras.reduce((m, e) => m + e.amount, 0), 0)
  let reserved = 0
  let planned = 0
  for (const board of boards)
    for (const l of board.lines) {
      const s = lineStatus(l, now)
      if (s === 'reserved') reserved += lineCost(l)
      else if (s !== 'booked') planned += lineCost(l)
    }
  return { booked, reserved, planned }
}

/** Where a booking is: Upcoming → In transit → On set → Returning → Completed. */
export function bookingStatus(booking: Booking, runs: Run[]): { label: string; tone: Tone; group: 'upcoming' | 'active' | 'completed' } {
  const mine = runs.filter((r) => r.bookingId === booking.id)
  const deliveries = mine.filter((r) => r.kind === 'delivery')
  const returns = mine.filter((r) => r.kind === 'return')
  if (returns.length && returns.every((r) => r.stage >= 5)) return { label: 'Completed', tone: 'success', group: 'completed' }
  if (returns.some((r) => r.stage >= 2)) return { label: 'Returning', tone: 'info', group: 'active' }
  if (deliveries.length && deliveries.every((r) => r.stage >= 5)) return { label: 'On set', tone: 'success', group: 'active' }
  if (deliveries.some((r) => r.stage >= 1)) return { label: 'In transit', tone: 'info', group: 'active' }
  return { label: 'Upcoming', tone: 'neutral', group: 'upcoming' }
}

/** Vendors of completed bookings that haven't been reviewed yet. */
export function pendingReviews(bookings: Booking[], runs: Run[], boards: ProjectBoard[], reviewed: { vendorId: string; bookingId: string | null }[]) {
  const out: { booking: Booking; vendorId: string; items: number }[] = []
  for (const b of bookings) {
    if (bookingStatus(b, runs).group !== 'completed') continue
    const lines = (boards.find((x) => x.id === b.boardId)?.lines ?? []).filter((l) => b.lineIds.includes(l.id))
    for (const { vendor, items } of byVendor(lines)) {
      if (!reviewed.some((r) => r.vendorId === vendor.id && r.bookingId === b.id)) out.push({ booking: b, vendorId: vendor.id, items: items.length })
    }
  }
  return out
}

/* ── What's next ─────────────────────────────────────────────────────────── */

export type NextKind = 'conflict' | 'hold' | 'reserve' | 'book' | 'check' | 'delivery' | 'return' | 'pay' | 'board'

export interface NextStep {
  id: string
  kind: NextKind
  title: string
  detail: string
  /** Path to open. */
  to: string
}

export function whatsNext(
  projectId: string,
  boards: ProjectBoard[],
  bookings: Booking[],
  runs: Run[],
  labelOf: (locationId: string | null) => string,
  now = Date.now(),
): NextStep[] {
  const out: NextStep[] = []
  const base = `/customer/projects/${projectId}`
  const today = todayISO()

  for (const r of runs) {
    if (r.kind === 'delivery' && r.stage === 4 && !r.confirmedAt)
      out.push({ id: `check-${r.id}`, kind: 'check', title: 'Check the delivered items', detail: `${vendorById(r.vendorId!)?.name} · 30-minute window`, to: `${base}/runs/${r.id}` })
  }
  for (const b of boards) {
    const st = boardStats(b, now)
    const bookable = st.counts['not-reserved'] + st.counts.reserved
    if (st.counts.unavailable)
      out.push({ id: `conflict-${b.id}`, kind: 'conflict', title: `${st.counts.unavailable} item${st.counts.unavailable === 1 ? ' clashes' : 's clash'} with your dates`, detail: `${b.name} · see alternatives`, to: `${base}/boards/${b.id}` })
    const expiring = b.lines.filter((l) => !l.bookingId && l.holdUntil && l.holdUntil > now && l.holdUntil - now < 12 * HOUR)
    if (expiring.length)
      out.push({ id: `hold-${b.id}`, kind: 'hold', title: `Hold ends soon on ${expiring.length} item${expiring.length === 1 ? '' : 's'}`, detail: `${b.name} · ${holdLeft(Math.min(...expiring.map((l) => l.holdUntil!)), now)}`, to: `${base}/boards/${b.id}` })
    if (st.counts['not-reserved'])
      out.push({ id: `reserve-${b.id}`, kind: 'reserve', title: `Reserve ${st.counts['not-reserved']} item${st.counts['not-reserved'] === 1 ? '' : 's'} before they go`, detail: b.name, to: `${base}/boards/${b.id}` })
    if (bookable)
      out.push({ id: `book-${b.id}`, kind: 'book', title: `Book ${bookable} item${bookable === 1 ? '' : 's'}`, detail: `${b.name} · ${formatINR(st.open)}`, to: `${base}/boards/${b.id}/book` })
  }
  for (const r of [...runs].sort((a, b) => a.date.localeCompare(b.date))) {
    if (r.stage >= 5 || r.date < today || r.kind === 'move') continue
    if (r.date <= addDays(today, 7)) {
      const who = r.vendorId ? vendorById(r.vendorId).name : 'Partner tempo'
      out.push({
        id: `run-${r.id}`,
        kind: r.kind === 'return' ? 'return' : 'delivery',
        title: `${r.kind === 'return' ? 'Return pickup' : 'Delivery'} ${r.date === today ? 'today' : `on ${formatDayShort(r.date)}`}`,
        detail: `${who} · ${r.window} · ${labelOf(r.locationId)}`,
        to: `${base}/runs/${r.id}`,
      })
    }
  }
  const pending = bookings.filter((b) => b.paid < b.amounts.total)
  if (pending.length) {
    const due = pending.reduce((n, b) => n + b.amounts.total - b.paid, 0)
    out.push({ id: 'pay', kind: 'pay', title: `${formatINR(due)} to pay`, detail: `${pending.length} invoice${pending.length === 1 ? '' : 's'} on company PO`, to: `${base}?tab=money` })
  }
  if (!boards.length) out.push({ id: 'board', kind: 'board', title: 'Create your first board', detail: 'Group props by scene or location', to: `${base}?tab=boards` })
  // Most urgent first.
  const rank: Record<NextKind, number> = { check: 0, conflict: 1, hold: 2, pay: 3, delivery: 4, return: 5, book: 6, reserve: 7, board: 8 }
  return out.sort((a, b) => rank[a.kind] - rank[b.kind])
}
