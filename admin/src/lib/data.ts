/** Shared derived data for the admin panel (counts, labels, links). */
import { todayISO } from '@/lib/dates'
import { activeHolds, answerNow, conflicts, movingToday, ratingSummary, type Order, type OwnerRequest } from '@/lib/owner'
import type { Tone } from '@/lib/tones'
import { useOwner } from '@/store/owner'

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`

/**
 * The phone prototype's renter app. It is the same origin when the panel is
 * opened at /Adminpannel on the app's own server; `npm run admin` runs the
 * panel on its own port (5175), where the app sits on 5173.
 */
export const renterAppUrl = () => (window.location.port === '5175' ? `${window.location.protocol}//${window.location.hostname}:5173/customer` : `${window.location.origin}/customer`)

export const ORDER_STATUS: Record<Order['status'], { label: string; tone: Tone }> = {
  request: { label: 'Waiting for you', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'brand' },
  out: { label: 'With production', tone: 'info' },
  returned: { label: 'Back · deposit to release', tone: 'warning' },
  closed: { label: 'Closed', tone: 'success' },
  declined: { label: 'Declined', tone: 'neutral' },
}

export const KIND_TITLE: Record<OwnerRequest['kind'], string> = { question: 'Question about an item', change: 'Change request', damage: 'Damage reported' }

/** Badge counts for the sidebar, title bar and workspace fork. */
export function useCounts() {
  const listings = useOwner((s) => s.listings)
  const orders = useOwner((s) => s.orders)
  const requests = useOwner((s) => s.requests)
  const reviews = useOwner((s) => s.reviews)
  const drafts = useOwner((s) => s.drafts)
  const holds = useOwner((s) => s.holds)
  const notifications = useOwner((s) => s.notifications)
  const today = todayISO()
  const nameOf = (id: string) => listings.find((l) => l.id === id)?.name ?? 'Listing'
  const moving = movingToday(orders, today)
  const bookingRequests = orders.filter((o) => o.status === 'request').length
  return {
    /** Everything on the 24-hour clock. */
    waiting: answerNow(orders, requests, nameOf).length,
    /** Diary badge: calendar conflicts + unanswered bookings. */
    diary: conflicts(listings, orders).length + bookingRequests,
    messages: bookingRequests + requests.filter((r) => r.status === 'open').length,
    moving: moving.overdue.length + moving.out.length + moving.back.length,
    overdue: moving.overdue.length,
    drafts: drafts.length,
    unread: notifications.filter((n) => !n.read).length,
    unreplied: ratingSummary(reviews).unreplied,
    held: activeHolds(holds).length,
    listings: listings.length,
  }
}

export function useListingOf() {
  const listings = useOwner((s) => s.listings)
  return (id: string) => listings.find((l) => l.id === id)
}

export const isVerified = (v: Record<string, string>) => v.phone === 'done' && v.identity === 'done' && v.warehouse === 'done' && v.bank === 'done'

/** Downloads text as a file (CSV template, statements). */
export function downloadText(name: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Clears everything saved in the admin panel (owner data), keeping UI preferences. */
export function resetDemo() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('proto:') && k !== 'proto:admin-ui')
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* storage unavailable */
  }
  window.location.reload()
}
