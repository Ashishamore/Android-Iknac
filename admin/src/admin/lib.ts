/** Derived data the Control Centre pages share: counts, money, lookups. */
import { PROPS, vendorById } from '@/data/props'
import { todayISO } from '@/lib/dates'
import { useNow } from '@/lib/hooks'
import { campaignState, couponState, roleCan, type Account, type Area, type ListingState } from '@/lib/platform'
import { listingStateOf, usePlatform } from '@/store/platform'

export const useMe = () => usePlatform((s) => s.admins.find((a) => a.id === s.currentAdminId) ?? s.admins[0])

/** The rail hides what a role cannot reach, and the route refuses it. */
export function useCan() {
  const me = useMe()
  return (area: Area) => roleCan(me.role, area)
}

export const useAccount = (id: string | undefined) => usePlatform((s) => s.accounts.find((a) => a.id === id))

export const nameOf = (accounts: Account[], id: string) => accounts.find((a) => a.id === id)?.business ?? 'Unknown'

/** What the rail badges, and the "N waiting" on the fork. */
export function useCounts() {
  const accounts = usePlatform((s) => s.accounts)
  const docs = usePlatform((s) => s.docs)
  const reports = usePlatform((s) => s.reports)
  const listingState = usePlatform((s) => s.listingState)
  const disputes = usePlatform((s) => s.disputes)
  const payouts = usePlatform((s) => s.payouts)

  const docsWaiting = docs.filter((d) => !d.decision).length
  const reported = reports.filter((r) => !r.closed).length
  const listingsWaiting = Object.values(listingState).filter((v) => v === 'waiting').length
  const open = disputes.filter((d) => d.state === 'open').length
  const due = payouts.filter((p) => !p.paid)

  return {
    people: accounts.length,
    renters: accounts.filter((a) => a.side === 'renter').length,
    providers: accounts.filter((a) => a.side === 'provider').length,
    verified: accounts.filter((a) => a.verified).length,
    suspended: accounts.filter((a) => a.state === 'suspended').length,
    pending: accounts.filter((a) => a.state === 'pending').length,
    reportedAccounts: accounts.filter((a) => a.reports > 0).length,
    docs: docsWaiting,
    reported,
    listingsWaiting,
    listings: reported + listingsWaiting,
    disputes: open,
    payouts: due.length,
    payoutTotal: due.reduce((n, p) => n + p.amount, 0),
    /** What is on a clock: documents, disputes and payouts owed. */
    waiting: docsWaiting + open + due.length,
  }
}

/** Every number on the Money page, and the four on Overview. */
export function useMoney() {
  const accounts = usePlatform((s) => s.accounts)
  const commission = usePlatform((s) => s.commission)
  const plans = usePlatform((s) => s.plans)
  const campaigns = usePlatform((s) => s.campaigns)
  const coupons = usePlatform((s) => s.coupons)
  const today = todayISO()

  const gross = accounts.filter((a) => a.side === 'provider').reduce((n, a) => n + a.gross, 0)
  const priceOf = (id: string) => plans.find((p) => p.id === id)?.price ?? 0
  const subscriptions = accounts.filter((a) => a.subscription).reduce((n, a) => n + priceOf(a.planId), 0)
  const advertising = campaigns.filter((c) => c.sponsored && campaignState(c, today) === 'running').reduce((n, c) => n + c.ratePerDay, 0)
  const earned = Math.round(gross * commission)
  return {
    gross,
    commission,
    earned,
    subscriptions,
    advertising,
    paying: accounts.filter((a) => a.subscription).length,
    lapsed: accounts.filter((a) => !a.subscription && priceOf(a.planId) > 0).length,
    couponsRunning: coupons.filter((c) => couponState(c, today) === 'running').length,
    campaignsLive: campaigns.filter((c) => campaignState(c, today) === 'running').length,
    /** A year of commission plus subscriptions and advertising, monthly. */
    recurring: subscriptions + advertising * 30,
  }
}

export interface ListingRow {
  id: string
  name: string
  vendorId: string
  vendor: string
  providerId: string
  category: string
  era: string
  rate: number
  free: boolean
  state: ListingState
  reports: number
}

/** The catalogue as the panel reads it: every item, with its provider and state. */
export function useListingRows(): ListingRow[] {
  const accounts = usePlatform((s) => s.accounts)
  const listingState = usePlatform((s) => s.listingState)
  const reports = usePlatform((s) => s.reports)
  const today = todayISO()
  return PROPS.map((p) => {
    const v = vendorById(p.vendorId)
    const owner = accounts.find((a) => a.vendorId === p.vendorId)
    return {
      id: p.id,
      name: p.name,
      vendorId: p.vendorId,
      vendor: v?.name ?? p.vendorId,
      providerId: owner?.id ?? '',
      category: p.category,
      era: p.era,
      rate: p.pricePerDay,
      free: !p.booked.some(([s, e]) => s <= today && e >= today),
      state: listingStateOf(p.id, listingState, accounts),
      reports: reports.filter((r) => r.propId === p.id && !r.closed).length,
    }
  })
}

/** Twelve weekly buckets of sign-ups, newest last. */
export function useJoinSeries() {
  const accounts = usePlatform((s) => s.accounts)
  const now = useNow(300_000).getTime()
  const week = 7 * 86_400_000
  const weeks = Array.from({ length: 12 }, () => 0)
  for (const a of accounts) {
    const i = 11 - Math.floor((now - a.joined) / week)
    if (i >= 0 && i < 12) weeks[i]++
  }
  return { weeks, last30: accounts.filter((a) => now - a.joined < 30 * 86_400_000).length }
}
