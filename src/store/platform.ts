/**
 * The Control Centre's state (`proto:platform`).
 *
 * The admin panel writes it; the phone apps read the parts that change what
 * they show. Both run on the same origin, so a change here reaches an open
 * renter or provider app as soon as it is made.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_MAINTENANCE,
  SEED_ACCOUNTS,
  SEED_ADMINS,
  SEED_AUDIT,
  SEED_BROADCASTS,
  SEED_CAMPAIGNS,
  SEED_COMMISSION,
  SEED_COUPONS,
  SEED_DISPUTES,
  SEED_DOCS,
  SEED_FLAGS,
  SEED_LISTING_STATE,
  SEED_ORDERS,
  SEED_PAYOUTS,
  SEED_REPORTS,
  SUB_PLANS,
  DEMO_PROVIDER,
  DEMO_RENTER,
} from '@/data/platform'
import { propById, VENDORS, vendorById, type Vendor } from '@/data/props'
import { todayISO } from '@/lib/dates'
import {
  AUDIT_CAP,
  campaignFor,
  type Account,
  type Admin,
  type Area,
  type AuditEntry,
  type Broadcast,
  type BroadcastApp,
  type Campaign,
  type CheckKind,
  type Coupon,
  type Dispute,
  type DisputeOutcome,
  type FlagKey,
  type Flags,
  type ListingOverride,
  type ListingReport,
  type ListingState,
  type Payout,
  type PlatformOrder,
  type Slot,
  type SubPlan,
  type VerifyDoc,
} from '@/lib/platform'

let seq = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}`

interface Logged {
  action: string
  target: string
  detail?: string
  area: Area
}

interface PlatformState {
  admins: Admin[]
  /** Who the panel is signed in as. The rail and the routes read this. */
  currentAdminId: string
  accounts: Account[]
  docs: VerifyDoc[]
  /** Only the listings an admin changed; everything else is live. */
  listingState: Record<string, ListingOverride>
  reports: ListingReport[]
  orders: PlatformOrder[]
  disputes: Dispute[]
  commission: number
  payouts: Payout[]
  coupons: Coupon[]
  campaigns: Campaign[]
  plans: SubPlan[]
  broadcasts: Broadcast[]
  flags: Flags
  maintenanceText: string
  audit: AuditEntry[]

  log: (e: Logged) => void
  signInAs: (adminId: string) => void

  /* People */
  setVerified: (id: string, on: boolean) => void
  setCheck: (id: string, kind: CheckKind, on: boolean) => void
  setAccountPlan: (id: string, planId: string) => void
  setSubscription: (id: string, on: boolean) => void
  setAccountState: (id: string, state: Account['state'], how: string) => void

  /* Verification */
  decideDoc: (docId: string, ok: boolean, reason?: string) => void

  /* Listings */
  setListing: (propId: string, state: ListingState, reason?: string) => void
  closeReport: (reportId: string) => void

  /* Orders & disputes */
  settleDispute: (id: string, outcome: DisputeOutcome, message: string) => void

  /* Money */
  setCommission: (rate: number) => void
  markPaid: (payoutId: string, ref: string) => void

  /* Coupons */
  saveCoupon: (c: Coupon) => void
  toggleCoupon: (id: string, on: boolean) => void
  deleteCoupon: (id: string) => void

  /* Advertising */
  saveCampaign: (c: Campaign) => void
  toggleCampaign: (id: string, on: boolean) => void
  deleteCampaign: (id: string) => void
  tapCampaign: (id: string) => void

  /* Subscriptions */
  savePlan: (p: SubPlan) => void
  togglePlan: (id: string, open: boolean) => void

  /* Broadcast */
  sendBroadcast: (b: Omit<Broadcast, 'id' | 'sentAt' | 'reached' | 'up'>) => void
  pullBroadcast: (id: string) => void
  deleteBroadcast: (id: string) => void

  /* Flags */
  setFlag: (key: FlagKey, on: boolean) => void
  setMaintenanceText: (text: string) => void

  /* Admin team */
  saveAdmin: (a: Admin) => void
  removeAdmin: (id: string) => void
}

export const usePlatform = create<PlatformState>()(
  persist(
    (set, get) => ({
      admins: SEED_ADMINS,
      currentAdminId: SEED_ADMINS[0].id,
      accounts: SEED_ACCOUNTS,
      docs: SEED_DOCS,
      listingState: { ...SEED_LISTING_STATE },
      reports: SEED_REPORTS,
      orders: SEED_ORDERS,
      disputes: SEED_DISPUTES,
      commission: SEED_COMMISSION,
      payouts: SEED_PAYOUTS,
      coupons: SEED_COUPONS,
      campaigns: SEED_CAMPAIGNS,
      plans: SUB_PLANS,
      broadcasts: SEED_BROADCASTS,
      flags: { ...SEED_FLAGS },
      maintenanceText: DEFAULT_MAINTENANCE,
      audit: SEED_AUDIT,

      /** Every change lands here, in the button's own words. */
      log: (e) =>
        set((s) => ({
          audit: [{ id: uid('au'), at: Date.now(), adminId: s.currentAdminId, ...e }, ...s.audit].slice(0, AUDIT_CAP),
          admins: s.admins.map((a) => (a.id === s.currentAdminId ? { ...a, actions: a.actions + 1, lastSeen: Date.now() } : a)),
        })),

      signInAs: (currentAdminId) => set({ currentAdminId }),

      setVerified: (id, on) => {
        const a = get().accounts.find((x) => x.id === id)
        set((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? { ...x, verified: on } : x)) }))
        get().log({ action: on ? 'Mark verified' : 'Remove the tick', target: a?.business ?? id, area: 'people' })
      },

      setCheck: (id, kind, on) => {
        const a = get().accounts.find((x) => x.id === id)
        set((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? { ...x, checks: { ...x.checks, [kind]: on } } : x)) }))
        get().log({ action: on ? 'Mark checked' : 'Unmark', target: a?.business ?? id, detail: kind, area: 'people' })
      },

      setAccountPlan: (id, planId) => {
        const a = get().accounts.find((x) => x.id === id)
        const plan = get().plans.find((p) => p.id === planId)
        set((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? { ...x, planId, subscription: plan ? plan.price > 0 : x.subscription } : x)) }))
        get().log({ action: 'Move to a plan', target: a?.business ?? id, detail: plan?.name, area: 'people' })
      },

      setSubscription: (id, on) => {
        const a = get().accounts.find((x) => x.id === id)
        set((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? { ...x, subscription: on } : x)) }))
        get().log({ action: on ? 'Start the subscription' : 'Stop the subscription', target: a?.business ?? id, detail: on ? undefined : 'Dropped to free limits, data kept', area: 'people' })
      },

      setAccountState: (id, state, how) => {
        const a = get().accounts.find((x) => x.id === id)
        set((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? { ...x, state } : x)) }))
        get().log({ action: how, target: a?.business ?? id, detail: a?.side === 'provider' && state === 'suspended' ? 'Their stock is out of Discover' : undefined, area: 'people' })
      },

      decideDoc: (docId, ok, reason) => {
        const d = get().docs.find((x) => x.id === docId)
        if (!d) return
        const account = get().accounts.find((a) => a.id === d.accountId)
        set((s) => ({
          docs: s.docs.map((x) => (x.id === docId ? { ...x, decision: { ok, by: s.currentAdminId, at: Date.now(), reason } } : x)),
          accounts: ok ? s.accounts.map((a) => (a.id === d.accountId ? { ...a, checks: { ...a.checks, [d.kind]: true }, verified: true } : a)) : s.accounts,
        }))
        get().log({ action: ok ? 'Approve' : 'Reject and tell them', target: account?.business ?? d.accountId, detail: ok ? `${d.kind} checked` : reason, area: 'verification' })
      },

      setListing: (propId, state, reason) => {
        const name = propById(propId)?.name ?? propId
        set((s) => {
          const next = { ...s.listingState }
          if (state === 'live') delete next[propId]
          else if (state === 'waiting' || state === 'down') next[propId] = state
          return { listingState: next }
        })
        const action = state === 'live' ? 'Approve and publish' : state === 'down' ? 'Take it down' : 'Send it back to waiting'
        get().log({ action, target: name, detail: reason, area: 'listings' })
      },

      closeReport: (reportId) => {
        const r = get().reports.find((x) => x.id === reportId)
        set((s) => ({ reports: s.reports.map((x) => (x.id === reportId ? { ...x, closed: true } : x)) }))
        get().log({ action: 'Close this report', target: r ? (propById(r.propId)?.name ?? r.propId) : reportId, detail: r?.reason, area: 'listings' })
      },

      settleDispute: (id, outcome, message) => {
        const d = get().disputes.find((x) => x.id === id)
        set((s) => ({
          disputes: s.disputes.map((x) => (x.id === id ? { ...x, state: 'settled', outcome, message, settledAt: Date.now(), settledBy: s.currentAdminId } : x)),
          orders: s.orders.map((o) => (o.id === d?.orderId ? { ...o, state: 'accepted' } : o)),
        }))
        get().log({ action: 'Settle and tell both sides', target: d?.subject ?? id, detail: outcome, area: 'orders' })
      },

      setCommission: (rate) => {
        const was = get().commission
        set({ commission: rate })
        get().log({ action: 'Save the rate', target: 'Commission', detail: `${Math.round(was * 100)}% → ${Math.round(rate * 100)}%`, area: 'money' })
      },

      markPaid: (payoutId, ref) => {
        const p = get().payouts.find((x) => x.id === payoutId)
        const name = get().accounts.find((a) => a.id === p?.providerId)?.business
        set((s) => ({ payouts: s.payouts.map((x) => (x.id === payoutId ? { ...x, paid: { at: Date.now(), ref } } : x)) }))
        get().log({ action: 'Confirm sent', target: name ?? payoutId, detail: ref, area: 'money' })
      },

      saveCoupon: (c) => {
        const exists = get().coupons.some((x) => x.id === c.id)
        set((s) => ({ coupons: exists ? s.coupons.map((x) => (x.id === c.id ? c : x)) : [c, ...s.coupons] }))
        get().log({ action: exists ? 'Save the coupon' : 'Create the coupon', target: c.code, area: 'coupons' })
      },

      toggleCoupon: (id, on) => {
        const c = get().coupons.find((x) => x.id === id)
        set((s) => ({ coupons: s.coupons.map((x) => (x.id === id ? { ...x, live: on } : x)) }))
        get().log({ action: on ? 'Switch on' : 'Switch off', target: c?.code ?? id, area: 'coupons' })
      },

      deleteCoupon: (id) => {
        const c = get().coupons.find((x) => x.id === id)
        set((s) => ({ coupons: s.coupons.filter((x) => x.id !== id) }))
        get().log({ action: 'Delete', target: c?.code ?? id, area: 'coupons' })
      },

      saveCampaign: (c) => {
        const exists = get().campaigns.some((x) => x.id === c.id)
        set((s) => ({ campaigns: exists ? s.campaigns.map((x) => (x.id === c.id ? c : x)) : [c, ...s.campaigns] }))
        get().log({ action: exists ? 'Save the campaign' : 'Create the campaign', target: c.name, detail: c.slot === 'renter-home' ? 'Renter Home' : 'Provider Today', area: 'ads' })
      },

      toggleCampaign: (id, on) => {
        const c = get().campaigns.find((x) => x.id === id)
        set((s) => ({ campaigns: s.campaigns.map((x) => (x.id === id ? { ...x, live: on } : x)) }))
        get().log({ action: on ? 'Switch on' : 'Switch off', target: c?.name ?? id, area: 'ads' })
      },

      deleteCampaign: (id) => {
        const c = get().campaigns.find((x) => x.id === id)
        set((s) => ({ campaigns: s.campaigns.filter((x) => x.id !== id) }))
        get().log({ action: 'Delete', target: c?.name ?? id, area: 'ads' })
      },

      /** The phone apps count a tap on the card they show. Not an admin action. */
      tapCampaign: (id) => set((s) => ({ campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, taps: c.taps + 1 } : c)) })),

      savePlan: (p) => {
        set((s) => ({ plans: s.plans.map((x) => (x.id === p.id ? p : x)) }))
        get().log({ action: 'Save the plan', target: p.name, detail: p.audience === 'renter' ? 'Renting' : 'Providing', area: 'subscriptions' })
      },

      togglePlan: (id, open) => {
        const p = get().plans.find((x) => x.id === id)
        set((s) => ({ plans: s.plans.map((x) => (x.id === id ? { ...x, open } : x)) }))
        get().log({ action: open ? 'Open it to new sign-ups' : 'Close it to new sign-ups', target: p?.name ?? id, detail: 'Accounts already on it stay', area: 'subscriptions' })
      },

      sendBroadcast: (b) => {
        const entry: Broadcast = { ...b, id: uid('bc'), sentAt: Date.now(), reached: Math.round(b.audience * 0.88), up: true }
        set((s) => ({ broadcasts: [entry, ...s.broadcasts.map((x) => (x.app === b.app || b.app === 'both' ? { ...x, up: false } : x))] }))
        get().log({ action: 'Send it', target: b.app === 'renter' ? 'The renter app' : b.app === 'provider' ? 'The provider app' : 'Both apps', detail: `${b.headline} · ${b.audience} accounts`, area: 'broadcast' })
      },

      pullBroadcast: (id) => {
        const b = get().broadcasts.find((x) => x.id === id)
        set((s) => ({ broadcasts: s.broadcasts.map((x) => (x.id === id ? { ...x, up: false } : x)) }))
        get().log({ action: 'Pull', target: b?.headline ?? id, area: 'broadcast' })
      },

      deleteBroadcast: (id) => {
        const b = get().broadcasts.find((x) => x.id === id)
        set((s) => ({ broadcasts: s.broadcasts.filter((x) => x.id !== id) }))
        get().log({ action: 'Delete', target: b?.headline ?? id, area: 'broadcast' })
      },

      setFlag: (key, on) => {
        set((s) => ({ flags: { ...s.flags, [key]: on } }))
        const label = { aiStudio: 'AI Studio', transport: 'Transport', instantBooking: 'Instant booking', signups: 'New sign-ups', maintenance: 'Maintenance notice' }[key]
        get().log({ action: on ? 'Switch on' : 'Switch off', target: label, area: 'flags' })
      },

      setMaintenanceText: (maintenanceText) => {
        set({ maintenanceText })
        get().log({ action: 'Save the wording', target: 'Maintenance notice', detail: maintenanceText.slice(0, 60), area: 'flags' })
      },

      saveAdmin: (a) => {
        const exists = get().admins.some((x) => x.id === a.id)
        set((s) => ({ admins: exists ? s.admins.map((x) => (x.id === a.id ? a : x)) : [...s.admins, a] }))
        get().log({ action: exists ? 'Save' : 'Add them', target: a.name, detail: a.role, area: 'team' })
      },

      removeAdmin: (id) => {
        const a = get().admins.find((x) => x.id === id)
        set((s) => ({ admins: s.admins.filter((x) => x.id !== id) }))
        get().log({ action: 'Remove access', target: a?.name ?? id, area: 'team' })
      },
    }),
    { name: 'proto:platform', version: 1 },
  ),
)

/**
 * The panel and the phone apps are separate tabs on one origin, so a change
 * made in one has to be picked up by the other.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'proto:platform') void usePlatform.persist.rehydrate()
  })
}

/* ── Reading it ──────────────────────────────────────────────────────────── */

export const newId = uid

/** A listing's state: what the admin set, or Live — unless its owner is suspended. */
export function listingStateOf(propId: string, listingState: Record<string, ListingOverride>, accounts: Account[]): ListingState {
  const vendorId = propById(propId)?.vendorId
  const owner = accounts.find((a) => a.vendorId === vendorId)
  if (owner?.state === 'suspended') return 'owner-suspended'
  return listingState[propId] ?? 'live'
}

/** Read outside React (search, catalogue filters), so the phone app stays in step. */
export const platformNow = () => usePlatform.getState()

/** Is this catalogue item still on the renter app's shelves? */
export function isPropLive(propId: string) {
  const s = usePlatform.getState()
  return listingStateOf(propId, s.listingState, s.accounts) === 'live'
}

/** Is this provider's shelf still in Discover? */
export const isVendorLive = (vendorId: string) => usePlatform.getState().accounts.find((a) => a.vendorId === vendorId)?.state !== 'suspended'

/** The vendors renters can still find. */
export const liveVendors = (list: Vendor[] = VENDORS) => list.filter((v) => isVendorLive(v.id))

/** The tick both apps print: the admin panel's answer, or the catalogue's. */
export const vendorVerified = (vendorId: string) => usePlatform.getState().accounts.find((a) => a.vendorId === vendorId)?.verified ?? vendorById(vendorId)?.verified ?? false

export const useVendorVerified = (vendorId: string) => usePlatform((s) => s.accounts.find((a) => a.vendorId === vendorId)?.verified) ?? vendorById(vendorId)?.verified ?? false

/**
 * Changes whenever moderation or a suspension changes what renters can see.
 * Screens that list props subscribe to it, so the catalogue updates live.
 */
export const useCatalogueVersion = () =>
  usePlatform(
    (s) =>
      `${Object.entries(s.listingState)
        .map(([k, v]) => `${k}:${v}`)
        .sort()
        .join(',')}|${s.accounts
        .filter((a) => a.state === 'suspended')
        .map((a) => a.vendorId ?? a.id)
        .sort()
        .join(',')}|${s.accounts.filter((a) => a.verified).length}`,
  )

/** The account each phone app is signed in as, in the panel's tables. */
export const useDemoAccount = (side: 'renter' | 'provider') => usePlatform((s) => s.accounts.find((a) => a.id === (side === 'renter' ? DEMO_RENTER : DEMO_PROVIDER)))

export const useFlags = () => usePlatform((s) => s.flags)
export const useFlag = (key: FlagKey) => usePlatform((s) => s.flags[key])
export const useCommission = () => usePlatform((s) => s.commission)

/** The provider account behind a catalogue vendor. */
export const useVendorAccount = (vendorId: string | undefined) => usePlatform((s) => s.accounts.find((a) => a.vendorId === vendorId))

/** The campaign a slot is showing right now. */
export function useSlotCampaign(slot: Slot) {
  const campaigns = usePlatform((s) => s.campaigns)
  return campaignFor(campaigns, slot, todayISO())
}

/** The broadcast strip an app is showing, if one is up. */
export function useBroadcast(app: Exclude<BroadcastApp, 'both'>) {
  return usePlatform((s) => s.broadcasts.find((b) => b.up && (b.app === app || b.app === 'both')))
}

export const useMaintenance = () => usePlatform((s) => (s.flags.maintenance ? s.maintenanceText : null))
