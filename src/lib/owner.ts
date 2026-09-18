/**
 * Prop Owner app: stock, pieces, orders, holds, requests and the diary.
 * Types plus pure helpers; the state lives in store/owner.ts.
 */
import type { Category, Era, Material } from '@/data/props'
import { addDays, daysInclusive, todayISO } from './dates'
import type { Tone } from './tones'

export const HOUR = 3_600_000
export const DAY_MS = 24 * HOUR
/** Time to answer a request, accept a booking or release a deposit. */
export const ANSWER_WINDOW = 24 * HOUR

/* ── Types ───────────────────────────────────────────────────────────────── */

export type Condition = 'Excellent' | 'Good' | 'Fair' | 'Worn'

export interface Piece {
  id: string
  /** Tag code printed on the piece, e.g. KP-RP-01. */
  code: string
  condition: Condition
  /** In the workshop; `until` null = no return date yet. */
  repair: { until: string | null } | null
}

export interface Block {
  id: string
  from: string
  to: string
  note: string
}

export interface Listing {
  id: string
  name: string
  category: Category
  era: Era
  material: Material | null
  description: string
  /** Data URLs, or 'sample' for a simulated capture. */
  photos: string[]
  dayRate: number
  deposit: number
  pieces: Piece[]
  /** Live (true) or paused (false). */
  listed: boolean
  /** Submitted and waiting for verification. */
  review: boolean
  /** Centimetres, width × depth × height. */
  size: [number, number, number] | null
  /** Kilograms. */
  weight: number | null
  condition: Condition
  /** Days kept free before and after each booking. */
  bufferDays: number
  modifiable: boolean
  blocks: Block[]
  saves: number
  addedAt: number
  /** Same prop in the renter catalogue (for its icon), if any. */
  catalogId: string | null
  /** Paid boost running until (ms). */
  boostedUntil: number | null
}

export interface Renter {
  company: string
  person: string
  phone: string
}

export type OrderStatus = 'request' | 'confirmed' | 'out' | 'returned' | 'closed' | 'declined'

export interface Order {
  id: string
  listingId: string
  qty: number
  renter: Renter
  project: string
  from: string
  to: string
  status: OrderStatus
  requestedAt: number
  /** Pieces that went out (set at handover). */
  pieceIds: string[]
  /** Photos taken when it went out. */
  outPhotos: number
  returnedAt: number | null
  deposit: 'held' | 'released' | 'claimed' | null
  /** Amount kept from the deposit for damage. */
  claim: number
  declineReason: string | null
  /** You deliver (charged per trip). */
  delivery: boolean
  discount: number
  /** Paid out to you. */
  settled: boolean
}

/** A renter holding pieces for 24 hours. */
export interface Hold {
  id: string
  listingId: string
  qty: number
  renter: Renter
  until: number
}

export type RequestKind = 'question' | 'change' | 'damage'

export interface OwnerRequest {
  id: string
  kind: RequestKind
  listingId: string
  orderId: string | null
  renter: Renter
  text: string
  at: number
  status: 'open' | 'done'
  answer: string | null
  /** Change requests: the new return date asked for. */
  newTo?: string
  /** Damage: the repair cost the renter was told about. */
  amount?: number
}

export interface OwnerReview {
  id: string
  renter: string
  listingId: string
  rating: number
  text: string
  at: number
  reply: string | null
}

export type StaffRole = 'Owner' | 'Manager' | 'Warehouse'

export interface StaffMember {
  id: string
  name: string
  phone: string
  role: StaffRole
}

export interface OwnerNotification {
  id: string
  title: string
  body: string
  at: number
  read: boolean
  /** Path to open. */
  to: string
}

/** Captured but not yet listed. */
export interface Draft {
  id: string
  source: 'rapid' | 'one' | 'list' | 'copy'
  photos: string[]
  name: string
  category: Category | null
  era: Era | null
  material: Material | null
  size: [number, number, number] | null
  weight: number | null
  pieces: number
  condition: Condition
  dayRate: number | null
  deposit: number | null
  description: string
  /** Fields the AI filled from the photos. */
  aiFilled: string[]
  createdAt: number
}

/** Required fields a draft still needs before it can be submitted. */
export function draftMissing(d: Draft) {
  const out: string[] = []
  if (!d.name.trim()) out.push('name')
  if (!d.category) out.push('category')
  if (!d.era) out.push('era')
  if (isPhysical(d.category) && !d.size) out.push('size')
  if (isPhysical(d.category) && !d.weight) out.push('weight')
  if (!d.dayRate) out.push('day rate')
  if (!d.photos.length) out.push('photos')
  return out
}

/** The fields of the listing form (drafts and "Edit details"). */
export type FormValues = Pick<Draft, 'photos' | 'name' | 'category' | 'era' | 'material' | 'size' | 'weight' | 'pieces' | 'condition' | 'dayRate' | 'deposit' | 'description'>

/** Returns the fields still missing (for "Submit for verification"). */
export function formMissing(v: FormValues, full: boolean) {
  const out: string[] = []
  if (!v.name.trim()) out.push('name')
  if (!v.category) out.push('category')
  if (!v.era) out.push('era')
  if (full) {
    if (isPhysical(v.category) && !v.size) out.push('size')
    if (isPhysical(v.category) && !v.weight) out.push('weight')
    if (!v.dayRate) out.push('dayRate')
    if (!v.photos.length) out.push('photos')
  }
  return out
}

/* ── Money ───────────────────────────────────────────────────────────────── */

const round10 = (n: number) => Math.round(n / 10) * 10

/** Day rate by rental length: 1–2 days, 3–6 days (10% off), 7+ days (20% off). */
export const tierRates = (dayRate: number) => ({ short: dayRate, mid: round10(dayRate * 0.9), long: round10(dayRate * 0.8) })

export const rateFor = (dayRate: number, days: number) => {
  const t = tierRates(dayRate)
  return days >= 7 ? t.long : days >= 3 ? t.mid : t.short
}

export const orderDays = (o: Pick<Order, 'from' | 'to'>) => daysInclusive(o.from, o.to)

/** Hire, discount, the platform fee and what you keep. */
export function orderMoney(o: Order, l: Pick<Listing, 'dayRate' | 'deposit'>, feeRate: number) {
  const days = orderDays(o)
  const hire = rateFor(l.dayRate, days) * days * o.qty
  const fee = Math.round((hire - o.discount) * feeRate)
  return { days, hire, discount: o.discount, fee, net: hire - o.discount - fee, deposit: l.deposit * o.qty }
}

/** What you keep per day after the fee. */
export const youKeep = (dayRate: number, feeRate: number) => Math.round(dayRate * (1 - feeRate))

/* ── Stock ───────────────────────────────────────────────────────────────── */

const covers = (o: Pick<Order, 'from' | 'to'>, date: string) => o.from <= date && date <= o.to
/** Orders that tie up pieces on a date (booked, or out and not back yet). */
const active = (o: Order) => o.status === 'confirmed' || o.status === 'out'

/** Pieces booked on a date (an overdue return still counts today). */
export function piecesBooked(listingId: string, orders: Order[], date: string, today = todayISO()) {
  return orders
    .filter((o) => o.listingId === listingId && active(o) && (covers(o, date) || (o.status === 'out' && date === today && o.to < today)))
    .reduce((n, o) => n + o.qty, 0)
}

export const activeHolds = (holds: Hold[], now = Date.now()) => holds.filter((h) => h.until > now)

export function piecesHeld(listingId: string, holds: Hold[], now = Date.now()) {
  return activeHolds(holds, now)
    .filter((h) => h.listingId === listingId)
    .reduce((n, h) => n + h.qty, 0)
}

export const inRepair = (l: Listing) => l.pieces.filter((p) => p.repair).length

/** Pieces free to book today. */
export function freeToday(l: Listing, orders: Order[], holds: Hold[], now = Date.now()) {
  return Math.max(0, l.pieces.length - inRepair(l) - piecesBooked(l.id, orders, todayISO()) - piecesHeld(l.id, holds, now))
}

export type ListingState = 'review' | 'paused' | 'out' | 'reserved' | 'live'

export const STATE_META: Record<ListingState, { label: string; tone: Tone }> = {
  review: { label: 'In review', tone: 'info' },
  paused: { label: 'Paused', tone: 'neutral' },
  out: { label: 'Out now', tone: 'warning' },
  reserved: { label: 'Reserved', tone: 'brand' },
  live: { label: 'Live', tone: 'success' },
}

export function listingState(l: Listing, orders: Order[], holds: Hold[], now = Date.now()): ListingState {
  if (l.review) return 'review'
  if (!l.listed) return 'paused'
  if (orders.some((o) => o.listingId === l.id && o.status === 'out')) return 'out'
  if (piecesHeld(l.id, holds, now) > 0) return 'reserved'
  return 'live'
}

/** Locations, catering and animals don't need a size or weight. */
export const isPhysical = (category: Category | null) => !category || !['Locations', 'Catering', 'Animals'].includes(category)

/** What a listing is missing before renters can trust it. */
export function needsInfo(l: Pick<Listing, 'size' | 'weight' | 'description' | 'photos' | 'category'>) {
  const out: string[] = []
  if (isPhysical(l.category) && !l.size) out.push('size')
  if (isPhysical(l.category) && !l.weight) out.push('weight')
  if (l.description.trim().length < 20) out.push('description')
  if (!l.photos.length) out.push('photos')
  return out
}

export const needsText = (missing: string[]) => (missing.length ? `Needs ${missing.slice(0, 2).join(', ')}${missing.length > 2 ? '…' : ''}` : '')

/** Past bookings and money earned per listing. */
export function listingStats(l: Listing, orders: Order[], holds: Hold[], feeRate: number, now = Date.now()) {
  const done = orders.filter((o) => o.listingId === l.id && ['confirmed', 'out', 'returned', 'closed'].includes(o.status))
  return {
    bookings: done.length,
    held: piecesHeld(l.id, holds, now),
    saves: l.saves,
    earned: done.reduce((n, o) => n + orderMoney(o, l, feeRate).net, 0),
    daysOut: done.filter((o) => o.status !== 'confirmed').reduce((n, o) => n + orderDays(o) * o.qty, 0),
  }
}

export type AttentionKind = 'paused-saved' | 'no-size' | 'no-return' | 'saved-never' | 'never'

export const ATTENTION_META: Record<AttentionKind, { title: string; hint: string }> = {
  'paused-saved': { title: 'Paused but saved by renters', hint: 'Renters are waiting for these' },
  'no-size': { title: 'No size or weight', hint: 'Renters skip props they can’t plan transport for' },
  'no-return': { title: 'Unavailable with no return date', hint: 'Set when they’re back, or pause them' },
  'saved-never': { title: 'Saved but never booked', hint: 'Try a lower 3–6 day rate' },
  never: { title: 'Never booked', hint: 'Add more photos or a better description' },
}

/** Stock that needs a look, grouped by reason. */
export function attention(listings: Listing[], orders: Order[]) {
  const booked = (l: Listing) => orders.some((o) => o.listingId === l.id && o.status !== 'request' && o.status !== 'declined')
  const groups: { kind: AttentionKind; listings: Listing[] }[] = [
    { kind: 'paused-saved', listings: listings.filter((l) => !l.listed && !l.review && l.saves > 0) },
    { kind: 'no-size', listings: listings.filter((l) => !l.review && isPhysical(l.category) && (!l.size || !l.weight)) },
    { kind: 'no-return', listings: listings.filter((l) => l.pieces.length > 0 && l.pieces.every((p) => p.repair) && l.pieces.some((p) => p.repair && !p.repair.until)) },
    { kind: 'saved-never', listings: listings.filter((l) => l.listed && !l.review && l.saves > 0 && !booked(l)) },
    { kind: 'never', listings: listings.filter((l) => l.listed && !l.review && l.saves === 0 && !booked(l)) },
  ]
  return groups.filter((g) => g.listings.length)
}

/* ── Today ───────────────────────────────────────────────────────────────── */

export type AnswerKind = 'booking' | 'question' | 'change' | 'damage' | 'deposit'

export interface AnswerItem {
  id: string
  kind: AnswerKind
  title: string
  detail: string
  /** Answer by (ms). */
  due: number
  to: string
}

export const ANSWER_META: Record<AnswerKind, { label: string }> = {
  booking: { label: 'Booking request' },
  question: { label: 'Question about an item' },
  change: { label: 'Change request' },
  damage: { label: 'Damage reported' },
  deposit: { label: 'Deposit to release' },
}

/** Everything waiting on you, on a 24-hour clock, most overdue first. */
export function answerNow(orders: Order[], requests: OwnerRequest[], listingName: (id: string) => string): AnswerItem[] {
  const out: AnswerItem[] = []
  for (const o of orders) {
    if (o.status === 'request')
      out.push({ id: `b-${o.id}`, kind: 'booking', title: `${o.renter.company} · ${listingName(o.listingId)}`, detail: `${o.qty} piece${o.qty === 1 ? '' : 's'} · ${o.project}`, due: o.requestedAt + ANSWER_WINDOW, to: `/renter/orders/${o.id}` })
    if (o.status === 'returned' && o.deposit === 'held' && o.returnedAt)
      out.push({ id: `d-${o.id}`, kind: 'deposit', title: `${o.renter.company} · ${listingName(o.listingId)}`, detail: 'Back and checked · release or claim', due: o.returnedAt + ANSWER_WINDOW, to: `/renter/orders/${o.id}` })
  }
  for (const r of requests) {
    if (r.status !== 'open') continue
    out.push({ id: `r-${r.id}`, kind: r.kind, title: `${r.renter.company} · ${listingName(r.listingId)}`, detail: r.text, due: r.at + ANSWER_WINDOW, to: `/renter/requests/${r.id}` })
  }
  return out.sort((a, b) => a.due - b.due)
}

/** "5h 20m left" or "Overdue 2h". */
export function dueLabel(due: number, now = Date.now()) {
  const ms = due - now
  const abs = Math.abs(ms)
  const h = Math.floor(abs / HOUR)
  const m = Math.floor((abs % HOUR) / 60_000)
  const span = h ? `${h}h ${m}m` : `${m}m`
  return { text: ms >= 0 ? `${span} left` : `Overdue ${h ? `${h}h` : `${m}m`}`, overdue: ms < 0, urgent: ms >= 0 && ms < 4 * HOUR }
}

/** Handovers today: overdue returns, going out and coming back. */
export function movingToday(orders: Order[], today = todayISO()) {
  return {
    overdue: orders.filter((o) => o.status === 'out' && o.to < today),
    out: orders.filter((o) => o.status === 'confirmed' && o.from <= today),
    back: orders.filter((o) => o.status === 'out' && o.to === today),
  }
}

/** Late fee so far: the day rate per piece for every day past the return date, plus 10%. */
export function lateFee(o: Order, l: Pick<Listing, 'dayRate'>, today = todayISO()) {
  const late = Math.max(0, daysInclusive(o.to, today) - 1)
  return { days: late, amount: Math.round(late * l.dayRate * o.qty * 1.1) }
}

/* ── Diary ───────────────────────────────────────────────────────────────── */

export type Layer = 'booked' | 'reserved' | 'buffer' | 'blocked'

export const LAYER_META: Record<Layer, { label: string; tone: Tone }> = {
  booked: { label: 'Booked', tone: 'brand' },
  reserved: { label: 'Reserved', tone: 'info' },
  buffer: { label: 'Buffer', tone: 'warning' },
  blocked: { label: 'Blocked', tone: 'neutral' },
}

/** Everything on one listing on one day, per layer. */
export function dayLayers(l: Listing, orders: Order[], holds: Hold[], date: string, now = Date.now()) {
  const today = todayISO()
  const mine = orders.filter((o) => o.listingId === l.id && (o.status === 'confirmed' || o.status === 'out'))
  const booked = mine.filter((o) => covers(o, date) || (o.status === 'out' && o.to < today && date >= o.from && date <= today))
  const buffer =
    l.bufferDays > 0 && !booked.length
      ? mine.filter((o) => (date < o.from && date >= addDays(o.from, -l.bufferDays)) || (date > o.to && date <= addDays(o.to, l.bufferDays)))
      : []
  const reserved = date === today ? activeHolds(holds, now).filter((h) => h.listingId === l.id) : []
  const blocked = l.blocks.filter((b) => covers(b, date))
  return { booked, buffer, reserved, blocked }
}

/** Blocks that sit on top of a booking. */
export function conflicts(listings: Listing[], orders: Order[]) {
  const out: { listing: Listing; block: Block; order: Order }[] = []
  for (const l of listings)
    for (const b of l.blocks)
      for (const o of orders)
        if (o.listingId === l.id && (o.status === 'confirmed' || o.status === 'out') && b.from <= o.to && o.from <= b.to) out.push({ listing: l, block: b, order: o })
  return out
}

/** "KP-RP-03" style tag codes. */
export const pieceCode = (prefix: string, i: number) => `${prefix}-${String(i + 1).padStart(2, '0')}`

export const codePrefix = (name: string) =>
  `KP-${name
    .replace(/[^A-Za-z ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')}`

/* ── Payouts ─────────────────────────────────────────────────────────────── */

/** Payouts go out every Friday. */
export function nextPayoutDate(today = todayISO()) {
  const d = new Date(`${today}T00:00:00`)
  const add = (5 - d.getDay() + 7) % 7 || 7
  return addDays(today, add)
}

/** Coming to you, settled so far, deposits you hold, and what the next payout carries. */
export function payoutSummary(orders: Order[], listingOf: (id: string) => Listing | undefined, feeRate: number) {
  const s = { coming: 0, next: 0, settled: 0, deposits: 0 }
  for (const o of orders) {
    const l = listingOf(o.listingId)
    if (!l) continue
    const m = orderMoney(o, l, feeRate)
    if (o.status === 'closed' && o.settled) s.settled += m.net + o.claim
    else if (o.status === 'confirmed' || o.status === 'out' || o.status === 'returned' || o.status === 'closed') s.coming += m.net + o.claim
    if (o.status === 'returned' || (o.status === 'closed' && !o.settled)) s.next += m.net + o.claim
    if (o.deposit === 'held' && o.status !== 'request') s.deposits += m.deposit
  }
  return s
}

/** Average rating and count per star. */
export function ratingSummary(reviews: OwnerReview[]) {
  const counts = [5, 4, 3, 2, 1].map((star) => ({ star, n: reviews.filter((r) => r.rating === star).length }))
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0
  return { avg, counts, unreplied: reviews.filter((r) => !r.reply).length }
}
