/**
 * CONTROL CENTRE: the types and pure helpers behind the admin panel.
 *
 * They live in src/ because both sides read them: the panel (admin/) writes
 * the state, and the phone apps read the parts that change what they show —
 * verification ticks, suspensions, campaigns, broadcasts, commission and flags.
 */
import type { Category } from '@/data/props'

/* ── Roles ───────────────────────────────────────────────────────────────── */

export const AREAS = ['overview', 'people', 'verification', 'listings', 'orders', 'money', 'coupons', 'ads', 'subscriptions', 'broadcast', 'flags', 'audit', 'team'] as const
export type Area = (typeof AREAS)[number]

export type Role = 'super' | 'ops' | 'finance' | 'support'

export const ROLE_META: Record<Role, { label: string; blurb: string }> = {
  super: { label: 'Superadmin', blurb: 'Everything, including the flags that change the apps and who else gets in.' },
  ops: { label: 'Operations', blurb: 'The day to day: people, documents, listings, orders, advertising and broadcasts.' },
  finance: { label: 'Finance', blurb: 'Money, subscriptions and coupons — and the orders behind the numbers.' },
  support: { label: 'Support', blurb: 'People and orders, so questions can be answered, plus broadcasts.' },
}

const EVERYONE: Area[] = ['overview', 'audit']

/** What each role reaches. The rail hides the rest, and the route refuses it. */
export const ROLE_AREAS: Record<Role, Area[]> = {
  super: [...AREAS],
  ops: [...EVERYONE, 'people', 'verification', 'listings', 'orders', 'ads', 'broadcast'],
  finance: [...EVERYONE, 'money', 'subscriptions', 'coupons', 'orders'],
  support: [...EVERYONE, 'people', 'orders', 'broadcast'],
}

export const roleCan = (role: Role, area: Area) => ROLE_AREAS[role].includes(area)

/* ── People ──────────────────────────────────────────────────────────────── */

export type Side = 'renter' | 'provider'
export type AccountState = 'active' | 'pending' | 'suspended'

export type CheckKind = 'identity' | 'gst' | 'address' | 'bank' | 'insurance'

export const CHECKS: { id: CheckKind; label: string; note: string }[] = [
  { id: 'identity', label: 'Identity', note: 'PAN or Aadhaar of the person who signed up' },
  { id: 'gst', label: 'GST', note: 'GSTIN, for tax invoices to production houses' },
  { id: 'address', label: 'Address', note: 'Warehouse or office, where pickups happen' },
  { id: 'bank', label: 'Bank', note: 'Where payouts land' },
  { id: 'insurance', label: 'Insurance', note: 'Cover for high-value stock' },
]

export interface Account {
  id: string
  name: string
  business: string
  email: string
  phone: string
  city: string
  side: Side
  /** The catalogue vendor this provider is, so the renter app can hide their shelf. */
  vendorId?: string
  planId: string
  subscription: boolean
  verified: boolean
  checks: Record<CheckKind, boolean>
  state: AccountState
  joined: number
  lastSeen: number
  gross: number
  orders: number
  reports: number
}

export const ACCOUNT_STATE: Record<AccountState, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  active: { label: 'Active', tone: 'success' },
  pending: { label: 'Waiting to be let in', tone: 'warning' },
  suspended: { label: 'Suspended', tone: 'danger' },
}

export const activeRecently = (a: Account, now: number) => now - a.lastSeen < 48 * 3_600_000

/* ── Verification ────────────────────────────────────────────────────────── */

export interface VerifyDoc {
  id: string
  accountId: string
  kind: CheckKind
  file: string
  submitted: number
  decision?: { ok: boolean; by: string; at: number; reason?: string }
}

export const REJECT_REASONS = ['The file is unreadable', 'The name does not match the account', 'It has expired', 'Wrong document for this check', 'It looks altered']

/* ── Listings ────────────────────────────────────────────────────────────── */

export type ListingState = 'live' | 'waiting' | 'down' | 'owner-suspended'

export const LISTING_STATE: Record<ListingState, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  live: { label: 'Live', tone: 'success' },
  waiting: { label: 'Waiting', tone: 'warning' },
  down: { label: 'Taken down', tone: 'danger' },
  'owner-suspended': { label: 'Owner suspended', tone: 'neutral' },
}

/** Only what an admin changed is stored. Everything else is live. */
export type ListingOverride = 'waiting' | 'down'

export interface ListingReport {
  id: string
  propId: string
  reason: string
  detail: string
  byAccountId: string
  at: number
  closed: boolean
}

export const REPORT_REASONS = ['The photos are not the item', 'The price looks wrong', 'Shows free, but it is not', 'Duplicate listing', 'Offensive or unsafe', 'Something else']

/* ── Orders & disputes ───────────────────────────────────────────────────── */

export type OrderState = 'dispute' | 'waiting' | 'declined' | 'accepted'

export const ORDER_STATE: Record<OrderState, { label: string; tone: 'danger' | 'warning' | 'neutral' | 'success' }> = {
  dispute: { label: 'In dispute', tone: 'danger' },
  waiting: { label: 'Waiting on the provider', tone: 'warning' },
  declined: { label: 'Declined', tone: 'neutral' },
  accepted: { label: 'Accepted', tone: 'success' },
}

export interface PlatformOrder {
  id: string
  renterId: string
  providerId: string
  production: string
  items: { name: string; qty: number }[]
  days: number
  hire: number
  transport: number
  deposit: number
  placed: number
  from: string
  to: string
  state: OrderState
  legs: { label: string; when: string; where: string }[]
}

export type DisputeOutcome = 'deposit' | 'refund' | 'split' | 'none'

export const OUTCOMES: { id: DisputeOutcome; label: string; note: string }[] = [
  { id: 'deposit', label: 'Charge it to the deposit', note: 'The provider is paid the amount in contention out of the deposit.' },
  { id: 'refund', label: 'Refund the renter', note: 'The whole deposit goes back to the production.' },
  { id: 'split', label: 'Split it', note: 'Half each, when both sides carry some of it.' },
  { id: 'none', label: 'No case to answer', note: 'Nothing changes hands, and the order closes as it stands.' },
]

export interface Dispute {
  id: string
  subject: string
  kind: string
  byAccountId: string
  orderId: string
  amount: number
  raisedAt: number
  detail: string
  state: 'open' | 'settled'
  outcome?: DisputeOutcome
  message?: string
  settledAt?: number
  settledBy?: string
}

/** The sentence both sides read, written from the outcome. */
export function outcomeSentence(outcome: DisputeOutcome, amount: number, inr: (n: number) => string) {
  const opening = 'We have read both accounts and looked at the photos on the order.'
  switch (outcome) {
    case 'deposit':
      return `${opening} ${inr(amount)} is charged to the deposit and paid to the provider, and the rest is released to the production.`
    case 'refund':
      return `${opening} The claim is not supported, so the deposit is released to the production in full and nothing is charged.`
    case 'split':
      return `${opening} Both sides carry some of this, so ${inr(Math.round(amount / 2))} is charged to the deposit and the rest is released to the production.`
    case 'none':
      return `${opening} There is no case to answer. The deposit is released in full and the order closes as it stands.`
  }
}

/* ── Money ───────────────────────────────────────────────────────────────── */

export interface Payout {
  id: string
  providerId: string
  periodTo: string
  amount: number
  paid?: { at: number; ref: string }
}

export const COMMISSION_MAX = 0.4

/* ── Coupons ─────────────────────────────────────────────────────────────── */

export type CouponAudience = 'renters' | 'providers' | 'both'
export type CouponScope = 'any' | 'first' | 'category'

export const COUPON_AUDIENCE: Record<CouponAudience, string> = { renters: 'Renters', providers: 'Providers', both: 'Both' }
export const COUPON_SCOPE: Record<CouponScope, string> = { any: 'Anything', first: 'First order', category: 'One category' }

export interface Coupon {
  id: string
  code: string
  kind: 'percent' | 'flat'
  value: number
  ceiling: number | null
  minOrder: number
  audience: CouponAudience
  scope: CouponScope
  category: Category | null
  starts: string
  ends: string
  totalUses: number
  perAccount: number
  used: number
  note: string
  live: boolean
}

export type CouponState = 'running' | 'later' | 'finished' | 'used' | 'off'

export const COUPON_STATE: Record<CouponState, { label: string; tone: 'success' | 'info' | 'neutral' | 'warning' }> = {
  running: { label: 'Running', tone: 'success' },
  later: { label: 'Starts later', tone: 'info' },
  finished: { label: 'Finished', tone: 'neutral' },
  used: { label: 'All used', tone: 'warning' },
  off: { label: 'Switched off', tone: 'neutral' },
}

export function couponState(c: Coupon, today: string): CouponState {
  if (!c.live) return 'off'
  if (c.used >= c.totalUses) return 'used'
  if (c.starts > today) return 'later'
  if (c.ends < today) return 'finished'
  return 'running'
}

/** The line a renter would read at checkout. */
export function couponSentence(c: Pick<Coupon, 'kind' | 'value' | 'ceiling' | 'minOrder' | 'scope' | 'category'>, inr: (n: number) => string) {
  const off = c.kind === 'percent' ? `${c.value}% off` : `${inr(c.value)} off`
  const cap = c.kind === 'percent' && c.ceiling ? `, up to ${inr(c.ceiling)}` : ''
  const min = c.minOrder ? ` on orders over ${inr(c.minOrder)}` : ''
  const on = c.scope === 'first' ? ', first order only' : c.scope === 'category' && c.category ? ` on ${c.category.toLowerCase()}` : ''
  return `${off}${cap}${min}${on}.`
}

/* ── Advertising ─────────────────────────────────────────────────────────── */

export type Slot = 'renter-home' | 'provider-today'

export const SLOTS: { id: Slot; label: string; where: string }[] = [
  { id: 'renter-home', label: 'Renter Home', where: 'The card under the greeting, above the banners' },
  { id: 'provider-today', label: 'Provider Today', where: 'The strip under the earnings card' },
]

export interface Campaign {
  id: string
  name: string
  slot: Slot
  headline: string
  sub: string
  button: string
  /** A listing whose plate is used as the picture. */
  propId: string | null
  to: string
  starts: string
  ends: string
  priority: number
  sponsored: boolean
  ratePerDay: number
  shown: number
  taps: number
  live: boolean
}

export type CampaignState = 'running' | 'later' | 'finished' | 'off'

export const CAMPAIGN_STATE: Record<CampaignState, { label: string; tone: 'success' | 'info' | 'neutral' }> = {
  running: { label: 'Live now', tone: 'success' },
  later: { label: 'Starts later', tone: 'info' },
  finished: { label: 'Finished', tone: 'neutral' },
  off: { label: 'Switched off', tone: 'neutral' },
}

export function campaignState(c: Campaign, today: string): CampaignState {
  if (!c.live) return 'off'
  if (c.starts > today) return 'later'
  if (c.ends < today) return 'finished'
  return 'running'
}

/** What a slot is showing right now: live, in date, highest priority. */
export function campaignFor(campaigns: Campaign[], slot: Slot, today: string) {
  return campaigns.filter((c) => c.slot === slot && campaignState(c, today) === 'running').sort((a, b) => b.priority - a.priority)[0]
}

export const tapRate = (c: Pick<Campaign, 'shown' | 'taps'>) => (c.shown ? (c.taps / c.shown) * 100 : 0)

/* ── Subscriptions ───────────────────────────────────────────────────────── */

export interface SubPlan {
  id: string
  name: string
  price: number
  audience: Side
  blurb: string
  unlocks: string[]
  /** Off closes it to new sign-ups. The accounts already on it stay. */
  open: boolean
}

/* ── Broadcast ───────────────────────────────────────────────────────────── */

export type BroadcastApp = 'renter' | 'provider' | 'both'
export type BroadcastTone = 'notice' | 'warning'

export interface Broadcast {
  id: string
  app: BroadcastApp
  tone: BroadcastTone
  headline: string
  body: string
  button: { label: string; to: string } | null
  audience: number
  reached: number
  sentAt: number
  up: boolean
}

export const APP_LABEL: Record<BroadcastApp, string> = { renter: 'The renter app', provider: 'The provider app', both: 'Both apps' }

/* ── Feature flags ───────────────────────────────────────────────────────── */

export interface Flags {
  aiStudio: boolean
  transport: boolean
  instantBooking: boolean
  signups: boolean
  maintenance: boolean
}

export type FlagKey = keyof Flags

export const FLAG_META: { id: FlagKey; label: string; on: string; off: string }[] = [
  { id: 'aiStudio', label: 'AI Studio', on: 'Renters get the AI Studio tab.', off: 'The tab leaves the renter bar, and nothing links to it.' },
  { id: 'transport', label: 'Transport', on: 'A project shows its Transport section.', off: 'A project loses its Transport section, and the tab beside it.' },
  { id: 'instantBooking', label: 'Instant booking', on: 'Bookings confirm outright instead of waiting on the provider.', off: 'A booking waits for the provider to accept it.' },
  { id: 'signups', label: 'New sign-ups', on: 'Anyone can open an account.', off: 'The sign-in screen says new accounts are paused.' },
  { id: 'maintenance', label: 'Maintenance notice', on: 'A strip sits at the top of both apps, and here.', off: 'No strip anywhere.' },
]

/* ── Audit ───────────────────────────────────────────────────────────────── */

export interface AuditEntry {
  id: string
  at: number
  adminId: string
  /** The button's own words, e.g. "Approve and publish". */
  action: string
  target: string
  detail?: string
  area: Area
}

export const AUDIT_CAP = 300

/* ── Admin team ──────────────────────────────────────────────────────────── */

export interface Admin {
  id: string
  name: string
  email: string
  role: Role
  actions: number
  lastSeen: number
  active: boolean
}
