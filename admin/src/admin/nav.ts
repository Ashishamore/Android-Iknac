import {
  BroadcastIcon,
  ClockCounterClockwiseIcon,
  CreditCardIcon,
  CurrencyInrIcon,
  GaugeIcon,
  MegaphoneIcon,
  PackageIcon,
  ScalesIcon,
  SealCheckIcon,
  ShieldCheckIcon,
  TicketIcon,
  ToggleLeftIcon,
  UsersThreeIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { Area } from '@/lib/platform'

export const ADMIN_ROOT = '/admin'

export interface AreaDef {
  id: Area
  label: string
  /** One line of intent, under the page title. */
  intent: string
  path: string
  icon: Icon
}

export const AREA: Record<Area, AreaDef> = {
  overview: { id: 'overview', label: 'Overview', intent: 'The market at a glance, and what is waiting for a person.', path: '/admin', icon: GaugeIcon },
  people: { id: 'people', label: 'People', intent: 'Everyone on PropKart — the ones renting and the ones providing — in one table.', path: '/admin/people', icon: UsersThreeIcon },
  verification: { id: 'verification', label: 'Verification', intent: 'One document at a time. Approving grants the tick both apps print.', path: '/admin/verification', icon: SealCheckIcon },
  listings: { id: 'listings', label: 'Listings', intent: 'What renters can find, and what has been reported.', path: '/admin/listings', icon: PackageIcon },
  orders: { id: 'orders', label: 'Orders & disputes', intent: 'Settle what two sides cannot, and read any order behind it.', path: '/admin/orders', icon: ScalesIcon },
  money: { id: 'money', label: 'Money', intent: 'What the market turns over, what PropKart keeps, and who is owed.', path: '/admin/money', icon: CurrencyInrIcon },
  coupons: { id: 'coupons', label: 'Coupons', intent: 'Codes, who they are for and what they take off.', path: '/admin/coupons', icon: TicketIcon },
  ads: { id: 'ads', label: 'Advertising', intent: 'Paid and house campaigns, in the two slots the apps actually have.', path: '/admin/ads', icon: MegaphoneIcon },
  subscriptions: { id: 'subscriptions', label: 'Subscriptions', intent: 'The plans on either side of the market, and who is on what.', path: '/admin/subscriptions', icon: CreditCardIcon },
  broadcast: { id: 'broadcast', label: 'Broadcast', intent: 'A strip at the top of an app, to everyone using it.', path: '/admin/broadcast', icon: BroadcastIcon },
  flags: { id: 'flags', label: 'Feature flags', intent: 'Switches that change what the apps show, right now.', path: '/admin/flags', icon: ToggleLeftIcon },
  audit: { id: 'audit', label: 'Audit log', intent: 'Every change anyone made, in the button’s own words. Nothing here can be edited.', path: '/admin/audit', icon: ClockCounterClockwiseIcon },
  team: { id: 'team', label: 'Admin team', intent: 'Who gets in, and how far.', path: '/admin/team', icon: ShieldCheckIcon },
}

export const GROUPS: { label: string; areas: Area[] }[] = [
  { label: 'Market', areas: ['overview', 'people', 'verification'] },
  { label: 'Trade', areas: ['listings', 'orders', 'money'] },
  { label: 'Growth', areas: ['coupons', 'ads', 'subscriptions'] },
  { label: 'Platform', areas: ['broadcast', 'flags', 'audit', 'team'] },
]

/** The area a Control Centre path belongs to (for the rail and the role check). */
export function areaOf(path: string): Area {
  const match = Object.values(AREA)
    .filter((a) => path === a.path || path.startsWith(`${a.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]
  return match?.id ?? 'overview'
}
