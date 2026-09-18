/**
 * The Control Centre's sample market: the people on PropKart, the documents
 * waiting, reported listings, orders, disputes, payouts, coupons, campaigns,
 * plans, broadcasts and the admin team.
 *
 * The 12 catalogue vendors are real provider accounts, so suspending one in
 * the panel takes their shelf out of the renter app's Discover.
 */
import { addDays, todayISO } from '@/lib/dates'
import type { Account, Admin, AuditEntry, Broadcast, Campaign, Coupon, Dispute, Flags, ListingOverride, ListingReport, Payout, PlatformOrder, SubPlan, VerifyDoc } from '@/lib/platform'
import { PROPS, VENDORS } from './props'

const DAY = 86_400_000
const now = Date.now()
const today = todayISO()
const ago = (days: number, hours = 0) => now - days * DAY - hours * 3_600_000

/** Small deterministic PRNG, so the sample market is the same every load. */
function rand(seed: number) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/* ── Plans ───────────────────────────────────────────────────────────────── */

export const SUB_PLANS: SubPlan[] = [
  { id: 'r-free', name: 'Starter', price: 0, audience: 'renter', blurb: 'Enough to plan one shoot.', unlocks: ['1 active project', '2 team members', '3 AI credits a month'], open: true },
  { id: 'r-pro', name: 'Pro', price: 1499, audience: 'renter', blurb: 'For an art department running back-to-back jobs.', unlocks: ['Unlimited projects', '10 team members', '30 AI credits a month', 'Company PO invoicing'], open: true },
  { id: 'r-studio', name: 'Studio', price: 4999, audience: 'renter', blurb: 'For a production house with several units out.', unlocks: ['Everything in Pro', '40 team members', '120 AI credits a month', 'A named account manager'], open: true },
  { id: 'p-standard', name: 'Standard', price: 0, audience: 'provider', blurb: 'List stock and get paid every Friday.', unlocks: ['Unlimited listings', 'Deposit protection', '12% of each order'], open: true },
  { id: 'p-pro', name: 'Pro', price: 1499, audience: 'provider', blurb: 'A lower cut, for providers doing volume.', unlocks: ['8% of each order instead of 12%', 'One free boost a month', 'Priority support'], open: true },
]

/** The plan a phone app shows maps onto the platform plan, and back. */
export const RENTER_PLAN_OF: Record<string, string> = { free: 'r-free', pro: 'r-pro', studio: 'r-studio' }
export const PROVIDER_PLAN_OF: Record<string, string> = { standard: 'p-standard', pro: 'p-pro' }

/* ── People ──────────────────────────────────────────────────────────────── */

const FIRST = ['Aarav', 'Ananya', 'Rohit', 'Meera', 'Kabir', 'Isha', 'Devansh', 'Tara', 'Nikhil', 'Sana', 'Arjun', 'Priya', 'Raghav', 'Neha', 'Imran', 'Diya', 'Vikram', 'Kavya', 'Siddharth', 'Rhea', 'Manav', 'Aditi', 'Farhan', 'Juhi', 'Om', 'Sneha', 'Yash', 'Ira', 'Zoya', 'Harsh']
const LAST = ['Shah', 'Iyer', 'Kulkarni', 'Nair', 'Banerjee', 'Desai', 'Rao', 'Menon', 'Chopra', 'Joshi', 'Sethi', 'Pillai', 'Gokhale', 'Bhatt', 'Qureshi', 'Reddy', 'Fernandes', 'Sinha', 'Malhotra', 'Deshmukh']
const CITIES = ['Mumbai', 'Mumbai', 'Mumbai', 'Pune', 'Delhi', 'Hyderabad', 'Chennai', 'Bengaluru', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Thane', 'Nagpur', 'Kochi', 'Goa']
const HOUSE_A = ['Saffron', 'Lightbox', 'Monsoon', 'Nine Yards', 'Blue Kite', 'Chalchitra', 'Paper Boat', 'Redwood', 'Salt', 'Marigold', 'Third Eye', 'Banyan', 'Kite', 'Anchor', 'Bombay', 'Cinnamon', 'Tanpura', 'North Star']
const HOUSE_B = ['Films', 'Pictures', 'Studios', 'Motion', 'Productions', 'Media', 'Creative', 'Works']
const SHOP_A = ['Sunrise', 'Heritage', 'Zenith', 'Sagar', 'Om', 'Crescent', 'Anand', 'Metro', 'Royal', 'Nova', 'Shanti', 'Prime', 'Trident', 'Lotus', 'Ashoka', 'Vintage']
const SHOP_B = ['Props', 'Rentals', 'Set Supplies', 'Prop House', 'Stores', 'Studio Hire', 'Furnishings', 'Costumiers']

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 14)

const emptyChecks = { identity: false, gst: false, address: false, bank: false, insurance: false }

function person(r: () => number) {
  return `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`
}

/** Keeps two generated businesses from reading as the same row. */
function unique(name: string, taken: Set<string>) {
  let out = name
  for (let n = 2; taken.has(out); n++) out = `${name} ${n}`
  taken.add(out)
  return out
}

function build(): Account[] {
  const r = rand(20260918)
  const taken = new Set<string>()
  const list: Account[] = []
  const push = (a: Partial<Account> & Pick<Account, 'id' | 'name' | 'business' | 'city' | 'side'>) => {
    const joined = a.joined ?? ago(30 + Math.floor(r() * 900))
    list.push({
      email: `${slug(a.name)}@${slug(a.business)}.in`,
      phone: `9${Math.floor(700000000 + r() * 299999999)}`,
      planId: a.side === 'renter' ? 'r-free' : 'p-standard',
      subscription: false,
      verified: false,
      checks: { ...emptyChecks },
      state: 'active',
      joined,
      lastSeen: ago(Math.floor(r() * 26), Math.floor(r() * 24)),
      gross: 0,
      orders: 0,
      reports: 0,
      ...a,
    } as Account)
  }

  // The 12 catalogue vendors, as provider accounts.
  for (const v of VENDORS) {
    const stock = PROPS.filter((p) => p.vendorId === v.id).length
    push({
      id: `a-v-${v.id}`,
      name: v.id === 'kapoor' ? 'Rajat Kapoor' : person(r),
      business: v.name,
      city: v.city,
      side: 'provider',
      vendorId: v.id,
      verified: v.verified,
      checks: { identity: true, gst: v.verified, address: true, bank: true, insurance: v.verified && stock > 4 },
      planId: v.rating >= 4.7 ? 'p-pro' : 'p-standard',
      subscription: v.rating >= 4.7,
      joined: ago(200 + Math.floor(r() * 700)),
      lastSeen: ago(Math.floor(r() * 3), Math.floor(r() * 20)),
      gross: Math.round((40000 + r() * 900000) / 1000) * 1000,
      orders: 8 + Math.floor(r() * 90),
      reports: 0,
    })
  }

  // Named production houses, for the orders and disputes below.
  const houses: [string, string, string, string][] = [
    ['a-rohan', 'Rohan Mehta', 'Saffron Films', 'Mumbai'],
    ['a-lightbox', 'Anaya Bose', 'Lightbox Pictures', 'Mumbai'],
    ['a-monsoon', 'Vikrant Rane', 'Monsoon Media', 'Pune'],
    ['a-karma', 'Simran Kaur', 'Karma Pictures', 'Delhi'],
    ['a-nineyards', 'Dev Acharya', 'Nine Yards Ads', 'Mumbai'],
    ['a-bluekite', 'Farida Sheikh', 'Blue Kite Films', 'Hyderabad'],
  ]
  houses.forEach(([id, name, business, city], i) => {
    push({
      id,
      name,
      business,
      city,
      side: 'renter',
      verified: true,
      checks: { identity: true, gst: true, address: true, bank: i < 4, insurance: false },
      planId: i === 0 ? 'r-pro' : i < 2 ? 'r-studio' : 'r-pro',
      subscription: true,
      joined: ago(120 + i * 60),
      lastSeen: ago(0, i * 3),
      gross: 180000 + i * 96000,
      orders: 9 + i * 4,
    })
  })

  // The rest of the market.
  const wantRenters = 120 - houses.length
  const wantProviders = 69 - VENDORS.length
  for (let i = 0; i < wantRenters; i++) {
    const business = `${HOUSE_A[Math.floor(r() * HOUSE_A.length)]} ${HOUSE_B[Math.floor(r() * HOUSE_B.length)]}`
    const verified = r() > 0.42
    push({
      id: `a-r${i}`,
      name: person(r),
      business: unique(business, taken),
      city: CITIES[Math.floor(r() * CITIES.length)],
      side: 'renter',
      verified,
      checks: { identity: verified, gst: verified && r() > 0.4, address: r() > 0.5, bank: r() > 0.7, insurance: false },
      planId: r() > 0.72 ? 'r-pro' : r() > 0.94 ? 'r-studio' : 'r-free',
      subscription: r() > 0.72,
      gross: Math.round((r() * 260000) / 500) * 500,
      orders: Math.floor(r() * 14),
      reports: r() > 0.94 ? 1 : 0,
    })
  }
  for (let i = 0; i < wantProviders; i++) {
    const business = `${SHOP_A[Math.floor(r() * SHOP_A.length)]} ${SHOP_B[Math.floor(r() * SHOP_B.length)]}`
    const verified = r() > 0.35
    push({
      id: `a-p${i}`,
      name: person(r),
      business: unique(`${business}${i % 4 === 0 ? ' Co.' : ''}`, taken),
      city: CITIES[Math.floor(r() * CITIES.length)],
      side: 'provider',
      verified,
      checks: { identity: verified, gst: verified && r() > 0.3, address: verified, bank: r() > 0.35, insurance: r() > 0.8 },
      planId: r() > 0.78 ? 'p-pro' : 'p-standard',
      subscription: r() > 0.78,
      gross: Math.round((r() * 420000) / 500) * 500,
      orders: Math.floor(r() * 40),
      reports: r() > 0.9 ? 1 : 0,
    })
  }

  // Four accounts waiting to be let in, and three suspended (no catalogue vendors,
  // so the renter app's shelves look normal until an admin suspends someone).
  const set = (id: string, patch: Partial<Account>) => Object.assign(list.find((a) => a.id === id)!, patch)
  ;['a-r3', 'a-r17', 'a-p5', 'a-p22'].forEach((id) => set(id, { state: 'pending', verified: false, orders: 0, gross: 0, joined: ago(1), lastSeen: ago(0, 6) }))
  set('a-p11', { state: 'suspended', reports: 3, verified: false })
  set('a-p31', { state: 'suspended', reports: 2 })
  set('a-r41', { state: 'suspended', reports: 2 })
  set('a-r9', { reports: 2 })
  set('a-p8', { reports: 1 })
  return list
}

export const SEED_ACCOUNTS: Account[] = build()

/* ── Verification: nine documents waiting ────────────────────────────────── */

export const SEED_DOCS: VerifyDoc[] = [
  { id: 'doc-1', accountId: 'a-v-parel-lights', kind: 'gst', file: 'gst-certificate.pdf', submitted: ago(2, 3) },
  { id: 'doc-2', accountId: 'a-v-chandni-props', kind: 'identity', file: 'pan-card.jpg', submitted: ago(1, 20) },
  { id: 'doc-3', accountId: 'a-v-chandni-props', kind: 'address', file: 'warehouse-lease.pdf', submitted: ago(1, 19) },
  { id: 'doc-4', accountId: 'a-p5', kind: 'identity', file: 'aadhaar-front-back.pdf', submitted: ago(1, 4) },
  { id: 'doc-5', accountId: 'a-p5', kind: 'bank', file: 'cancelled-cheque.jpg', submitted: ago(1, 4) },
  { id: 'doc-6', accountId: 'a-p22', kind: 'identity', file: 'pan-card.pdf', submitted: ago(0, 22) },
  { id: 'doc-7', accountId: 'a-r3', kind: 'gst', file: 'gst-registration.pdf', submitted: ago(0, 9) },
  { id: 'doc-8', accountId: 'a-v-powai-greens', kind: 'insurance', file: 'stock-cover-2026.pdf', submitted: ago(0, 6) },
  { id: 'doc-9', accountId: 'a-r17', kind: 'identity', file: 'pan-card.jpg', submitted: ago(0, 2) },
  { id: 'doc-10', accountId: 'a-v-kapoor', kind: 'insurance', file: 'stock-cover-2026.pdf', submitted: ago(9), decision: { ok: true, by: 'ad-priya', at: ago(8), reason: undefined } },
  { id: 'doc-11', accountId: 'a-v-starvans', kind: 'gst', file: 'gst-certificate.pdf', submitted: ago(14), decision: { ok: true, by: 'ad-priya', at: ago(13) } },
  { id: 'doc-12', accountId: 'a-p11', kind: 'identity', file: 'photo-of-a-photo.jpg', submitted: ago(21), decision: { ok: false, by: 'ad-nikhil', at: ago(20), reason: 'The file is unreadable' } },
  { id: 'doc-13', accountId: 'a-lightbox', kind: 'gst', file: 'gst-certificate.pdf', submitted: ago(30), decision: { ok: true, by: 'ad-nikhil', at: ago(29) } },
  { id: 'doc-14', accountId: 'a-v-bandra-vintage', kind: 'bank', file: 'bank-letter.pdf', submitted: ago(44), decision: { ok: true, by: 'ad-asha', at: ago(43) } },
]

/* ── Listings: three reported, three waiting to go live ──────────────────── */

export const SEED_LISTING_STATE: Record<string, ListingOverride> = {
  'inflatable-chair': 'waiting',
  'chai-counter': 'waiting',
  'flip-phones': 'waiting',
}

export const SEED_REPORTS: ListingReport[] = [
  { id: 'rep-1', propId: 'neon-sign', reason: 'The photos are not the item', detail: 'Booked it for a bar scene and the sign that arrived was half the size in the pictures, with a different font.', byAccountId: 'a-monsoon', at: ago(1, 6), closed: false },
  { id: 'rep-2', propId: 'crew-lunch', reason: 'The price looks wrong', detail: 'Listed at a day rate but they invoiced per head on top. The listing does not say that anywhere.', byAccountId: 'a-nineyards', at: ago(2, 2), closed: false },
  { id: 'rep-3', propId: 'heritage-bungalow', reason: 'Shows free, but it is not', detail: 'Calendar shows the 12th open. Owner says it has been booked for a month.', byAccountId: 'a-karma', at: ago(0, 5), closed: false },
  { id: 'rep-4', propId: 'disco-ball', reason: 'Duplicate listing', detail: 'Same ball listed twice by the same provider.', byAccountId: 'a-bluekite', at: ago(26), closed: true },
  { id: 'rep-5', propId: 'police-uniform', reason: 'Something else', detail: 'Asked whether a real police uniform can be hired out at all.', byAccountId: 'a-rohan', at: ago(40), closed: true },
]

/* ── Orders ──────────────────────────────────────────────────────────────── */

const order = (
  id: string,
  renterId: string,
  providerId: string,
  production: string,
  items: { name: string; qty: number }[],
  days: number,
  hire: number,
  placedDaysAgo: number,
  state: PlatformOrder['state'],
  fromIn: number,
): PlatformOrder => ({
  id,
  renterId,
  providerId,
  production,
  items,
  days,
  hire,
  transport: Math.round(hire * 0.08),
  deposit: Math.round(hire * 0.3),
  placed: ago(placedDaysAgo),
  from: addDays(today, fromIn),
  to: addDays(today, fromIn + days - 1),
  state,
  legs: [
    { label: 'Out to set', when: addDays(today, fromIn), where: production },
    { label: 'Back to the warehouse', when: addDays(today, fromIn + days), where: 'Provider warehouse' },
  ],
})

export const SEED_ORDERS: PlatformOrder[] = [
  order('OD-4102', 'a-monsoon', 'a-v-parel-lights', 'Monsoon Media · Chai TVC', [{ name: 'Custom Neon Sign', qty: 1 }, { name: 'Mirror Disco Ball', qty: 2 }], 3, 12400, 9, 'dispute', -6),
  order('OD-4098', 'a-rohan', 'a-v-kapoor', 'Saffron Films · Monsoon Ad', [{ name: 'Irani Café Set', qty: 1 }], 2, 60000, 12, 'dispute', -9),
  order('OD-4081', 'a-karma', 'a-v-classic-wheels', 'Karma Pictures · Period Feature', [{ name: 'Classic 1970s Sedan', qty: 1 }, { name: 'Vintage 150cc Scooter', qty: 2 }], 4, 58000, 20, 'dispute', -15),
  order('OD-4131', 'a-nineyards', 'a-v-filmy', 'Nine Yards Ads · Bank Film', [{ name: 'Fresnel Film Light 2K', qty: 4 }], 5, 32000, 0, 'waiting', 4),
  order('OD-4130', 'a-bluekite', 'a-v-juhu-costume', 'Blue Kite Films · Wedding Spot', [{ name: 'Red Bridal Lehenga', qty: 1 }], 2, 7000, 0, 'waiting', 6),
  order('OD-4129', 'a-lightbox', 'a-v-starvans', 'Lightbox Pictures · Web Series', [{ name: 'Luxury Vanity Van · 2 rooms', qty: 2 }], 6, 168000, 1, 'waiting', 8),
  order('OD-4126', 'a-rohan', 'a-v-powai-greens', 'Saffron Films · Monsoon Ad', [{ name: 'Bougainvillea Arch', qty: 2 }], 2, 9600, 2, 'declined', 3),
  order('OD-4120', 'a-monsoon', 'a-v-deccan-animals', 'Monsoon Media · Rural Film', [{ name: 'White Horse with Handler', qty: 1 }], 1, 18000, 4, 'declined', 5),
  order('OD-4128', 'a-karma', 'a-v-bandra-vintage', 'Karma Pictures · Period Feature', [{ name: 'Chesterfield Leather Sofa', qty: 1 }, { name: 'Brass Gramophone', qty: 1 }], 5, 22000, 2, 'accepted', 5),
  order('OD-4127', 'a-lightbox', 'a-v-kapoor', 'Lightbox Pictures · Web Series', [{ name: 'Velvet Wingback Armchair', qty: 4 }], 7, 50400, 3, 'accepted', 2),
  order('OD-4124', 'a-nineyards', 'a-v-pune-antiques', 'Nine Yards Ads · Bank Film', [{ name: 'Teak Planter’s Chair', qty: 3 }], 3, 13500, 5, 'accepted', 1),
  order('OD-4121', 'a-bluekite', 'a-v-thane-caterers', 'Blue Kite Films · Wedding Spot', [{ name: 'Crew Lunch · 25 people', qty: 1 }], 2, 13000, 6, 'accepted', 0),
  order('OD-4118', 'a-rohan', 'a-v-classic-wheels', 'Saffron Films · Monsoon Ad', [{ name: 'Black & Yellow Taxi', qty: 1 }], 2, 14000, 8, 'accepted', -2),
  order('OD-4115', 'a-monsoon', 'a-v-filmy', 'Monsoon Media · Chai TVC', [{ name: 'Retro Film Camera Kit', qty: 1 }], 3, 3600, 10, 'accepted', -4),
  order('OD-4109', 'a-karma', 'a-v-juhu-costume', 'Karma Pictures · Period Feature', [{ name: 'British Raj Officer Uniform', qty: 6 }], 4, 31200, 13, 'accepted', -7),
  order('OD-4104', 'a-lightbox', 'a-v-chandni-props', 'Lightbox Pictures · Web Series', [{ name: 'Cane Jhoola Swing', qty: 1 }], 3, 7800, 16, 'accepted', -10),
  order('OD-4099', 'a-nineyards', 'a-v-parel-lights', 'Nine Yards Ads · Diwali Spot', [{ name: 'Crystal Chandelier', qty: 2 }], 2, 11200, 18, 'accepted', -12),
  order('OD-4094', 'a-bluekite', 'a-v-powai-greens', 'Blue Kite Films · Garden Film', [{ name: 'Monstera Plant · 6 ft', qty: 8 }], 3, 10800, 22, 'accepted', -16),
  order('OD-4090', 'a-rohan', 'a-v-bandra-vintage', 'Saffron Films · Diwali Sweets TVC', [{ name: 'Heritage Bungalow, Bandra', qty: 1 }], 2, 90000, 26, 'accepted', -20),
  order('OD-4086', 'a-monsoon', 'a-v-starvans', 'Monsoon Media · Chai TVC', [{ name: 'Compact Vanity Van', qty: 1 }], 4, 34000, 29, 'accepted', -24),
]

export const SEED_DISPUTES: Dispute[] = [
  {
    id: 'dp-1',
    subject: 'Neon sign came back cracked',
    kind: 'Damage',
    byAccountId: 'a-v-parel-lights',
    orderId: 'OD-4102',
    amount: 4800,
    raisedAt: ago(1, 5),
    detail: 'The provider says the tube was cracked on return and has sent the out and back photos. The production says it was packed the way it arrived and points at the transport leg.',
    state: 'open',
  },
  {
    id: 'dp-2',
    subject: 'Café set handed over a day late',
    kind: 'Late handover',
    byAccountId: 'a-rohan',
    orderId: 'OD-4098',
    amount: 18000,
    raisedAt: ago(2, 2),
    detail: 'The production lost a half day on set and wants a day of hire back. The provider says the unit was not ready to receive it on the first morning.',
    state: 'open',
  },
  {
    id: 'dp-3',
    subject: 'Sedan returned with a scraped wing',
    kind: 'Damage',
    byAccountId: 'a-v-classic-wheels',
    orderId: 'OD-4081',
    amount: 26000,
    raisedAt: ago(3, 7),
    detail: 'A body shop quote is attached. The production accepts the scrape but says the quote is for a full respray, not the panel.',
    state: 'open',
  },
  {
    id: 'dp-4',
    subject: 'Chandelier missing two drops',
    kind: 'Damage',
    byAccountId: 'a-v-parel-lights',
    orderId: 'OD-4099',
    amount: 3200,
    raisedAt: ago(17),
    detail: 'Two crystal drops were missing on return.',
    state: 'settled',
    outcome: 'split',
    message: 'We have read both accounts and looked at the photos on the order. Both sides carry some of this, so ₹1,600 is charged to the deposit and the rest is released to the production.',
    settledAt: ago(16),
    settledBy: 'ad-asha',
  },
  {
    id: 'dp-5',
    subject: 'Plants delivered to the wrong unit',
    kind: 'Delivery',
    byAccountId: 'a-bluekite',
    orderId: 'OD-4094',
    amount: 2400,
    raisedAt: ago(21),
    detail: 'Delivered to the second unit, two hours away from the set that booked them.',
    state: 'settled',
    outcome: 'refund',
    message: 'We have read both accounts and looked at the photos on the order. The claim is not supported, so the deposit is released to the production in full and nothing is charged.',
    settledAt: ago(20),
    settledBy: 'ad-priya',
  },
]

/* ── Money ───────────────────────────────────────────────────────────────── */

export const SEED_COMMISSION = 0.12

export const SEED_PAYOUTS: Payout[] = [
  { id: 'po-1', providerId: 'a-v-kapoor', periodTo: addDays(today, -1), amount: 84600 },
  { id: 'po-2', providerId: 'a-v-classic-wheels', periodTo: addDays(today, -1), amount: 61300 },
  { id: 'po-3', providerId: 'a-v-starvans', periodTo: addDays(today, -1), amount: 148500 },
  { id: 'po-4', providerId: 'a-v-bandra-vintage', periodTo: addDays(today, -1), amount: 39200 },
  { id: 'po-5', providerId: 'a-v-juhu-costume', periodTo: addDays(today, -1), amount: 22750 },
  { id: 'po-6', providerId: 'a-v-kapoor', periodTo: addDays(today, -8), amount: 71400, paid: { at: ago(7), ref: 'NEFT-4471209' } },
  { id: 'po-7', providerId: 'a-v-filmy', periodTo: addDays(today, -8), amount: 28900, paid: { at: ago(7), ref: 'NEFT-4471210' } },
  { id: 'po-8', providerId: 'a-v-parel-lights', periodTo: addDays(today, -8), amount: 33450, paid: { at: ago(7), ref: 'NEFT-4471211' } },
  { id: 'po-9', providerId: 'a-v-powai-greens', periodTo: addDays(today, -15), amount: 18600, paid: { at: ago(14), ref: 'NEFT-4468815' } },
  { id: 'po-10', providerId: 'a-v-pune-antiques', periodTo: addDays(today, -15), amount: 24100, paid: { at: ago(14), ref: 'NEFT-4468816' } },
]

/* ── Coupons ─────────────────────────────────────────────────────────────── */

export const SEED_COUPONS: Coupon[] = [
  { id: 'cp-1', code: 'FIRSTSET', kind: 'percent', value: 15, ceiling: 3000, minOrder: 5000, audience: 'renters', scope: 'first', category: null, starts: addDays(today, -40), ends: addDays(today, 50), totalUses: 500, perAccount: 1, used: 214, note: 'Sign-up push, running all quarter.', live: true },
  { id: 'cp-2', code: 'DIWALI26', kind: 'percent', value: 10, ceiling: 5000, minOrder: 10000, audience: 'renters', scope: 'category', category: 'Lighting', starts: addDays(today, -6), ends: addDays(today, 24), totalUses: 300, perAccount: 2, used: 68, note: 'Festive lighting, with Parel Lights.', live: true },
  { id: 'cp-3', code: 'NEWYEAR', kind: 'flat', value: 2000, ceiling: null, minOrder: 15000, audience: 'both', scope: 'any', category: null, starts: addDays(today, 30), ends: addDays(today, 75), totalUses: 400, perAccount: 1, used: 0, note: 'Queued for the January push.', live: true },
  { id: 'cp-4', code: 'MONSOON', kind: 'percent', value: 12, ceiling: 4000, minOrder: 8000, audience: 'renters', scope: 'any', category: null, starts: addDays(today, -120), ends: addDays(today, -35), totalUses: 250, perAccount: 1, used: 187, note: 'Last monsoon. Kept for the numbers.', live: true },
  { id: 'cp-5', code: 'LISTFREE', kind: 'flat', value: 1499, ceiling: null, minOrder: 0, audience: 'providers', scope: 'any', category: null, starts: addDays(today, -60), ends: addDays(today, 20), totalUses: 120, perAccount: 1, used: 120, note: 'A month of Pro, free, for new providers.', live: true },
  { id: 'cp-6', code: 'VANITY20', kind: 'percent', value: 20, ceiling: 12000, minOrder: 40000, audience: 'renters', scope: 'category', category: 'Vanity vans', starts: addDays(today, -15), ends: addDays(today, 15), totalUses: 80, perAccount: 1, used: 9, note: 'Paused: the margin was too thin.', live: false },
]

/* ── Advertising ─────────────────────────────────────────────────────────── */

export const SEED_CAMPAIGNS: Campaign[] = [
  {
    id: 'cm-1',
    name: 'Classic Wheels · festive',
    slot: 'renter-home',
    headline: 'Hero cars, booked by the day',
    sub: 'Kaali-peelis, 70s sedans and vintage bikes, delivered to set across Mumbai.',
    button: 'See the cars',
    propId: 'kaali-peeli',
    to: '/customer/vendors/classic-wheels',
    starts: addDays(today, -8),
    ends: addDays(today, 22),
    priority: 8,
    sponsored: true,
    ratePerDay: 1800,
    shown: 12480,
    taps: 936,
    live: true,
  },
  {
    id: 'cm-2',
    name: 'Provider Pro · fee drop',
    slot: 'provider-today',
    headline: 'Festive searches are up 38%',
    sub: 'Boost your lamps, lanterns and brass for Diwali shoots.',
    button: 'Boost a listing',
    propId: 'brass-lantern',
    to: '/renter/profile/promote',
    starts: addDays(today, -4),
    ends: addDays(today, 26),
    priority: 6,
    sponsored: false,
    ratePerDay: 0,
    shown: 3120,
    taps: 402,
    live: true,
  },
  {
    id: 'cm-3',
    name: 'StarVans · vanity vans',
    slot: 'renter-home',
    headline: 'Vanity vans, on set by 6am',
    sub: 'Two-room and compact vans with a driver, across Mumbai and Pune.',
    button: 'Check the dates',
    propId: 'vanity-luxe',
    to: '/customer/vendors/starvans',
    starts: addDays(today, -8),
    ends: addDays(today, 12),
    priority: 5,
    sponsored: true,
    ratePerDay: 1200,
    shown: 9860,
    taps: 512,
    live: true,
  },
  {
    id: 'cm-4',
    name: 'Powai Greens · wedding season',
    slot: 'renter-home',
    headline: 'Arches, garlands and six-foot greens',
    sub: 'Delivered and dressed the morning of the shoot.',
    button: 'Browse plants',
    propId: 'bougainvillea-arch',
    to: '/customer/vendors/powai-greens',
    starts: addDays(today, 14),
    ends: addDays(today, 44),
    priority: 4,
    sponsored: true,
    ratePerDay: 900,
    shown: 0,
    taps: 0,
    live: true,
  },
  {
    id: 'cm-5',
    name: 'Juhu Costume · monsoon',
    slot: 'renter-home',
    headline: 'Period costume, fitted on set',
    sub: 'Raj uniforms, 70s outfits and bridal, with a dresser.',
    button: 'See costume',
    propId: 'nehru-jacket',
    to: '/customer/vendors/juhu-costume',
    starts: addDays(today, -70),
    ends: addDays(today, -20),
    priority: 3,
    sponsored: true,
    ratePerDay: 700,
    shown: 15200,
    taps: 608,
    live: true,
  },
]

/* ── Broadcast ───────────────────────────────────────────────────────────── */

export const SEED_BROADCASTS: Broadcast[] = [
  {
    id: 'bc-1',
    app: 'provider',
    tone: 'notice',
    headline: 'Payouts move to Thursdays',
    body: 'From next week, payouts land on Thursday instead of Friday. Nothing else changes.',
    button: { label: 'See payouts', to: '/renter/profile/payouts' },
    audience: 69,
    reached: 61,
    sentAt: ago(3),
    // The provider app already carries its own announcement strip, so this one
    // has been pulled; the renter app's is the one still up.
    up: false,
  },
  {
    id: 'bc-2',
    app: 'renter',
    tone: 'notice',
    headline: 'Festive slots are filling',
    body: 'Lighting and vehicles for Diwali week are going fast. Book the dates you know about.',
    button: { label: 'Open Discover', to: '/customer/discover' },
    audience: 120,
    reached: 104,
    sentAt: ago(11),
    up: true,
  },
  {
    id: 'bc-3',
    app: 'both',
    tone: 'warning',
    headline: 'Delivery delays across the Western line',
    body: 'Road closures in Andheri are adding an hour to most deliveries today. Plan the call sheet around it.',
    button: null,
    audience: 189,
    reached: 172,
    sentAt: ago(25),
    up: false,
  },
]

/* ── Flags ───────────────────────────────────────────────────────────────── */

export const SEED_FLAGS: Flags = { aiStudio: true, transport: true, instantBooking: false, signups: true, maintenance: false }

export const DEFAULT_MAINTENANCE = 'PropKart is being worked on between 2am and 4am on Sunday. Bookings already made are unaffected.'

/* ── Admin team ──────────────────────────────────────────────────────────── */

export const SEED_ADMINS: Admin[] = [
  { id: 'ad-asha', name: 'Asha Menon', email: 'asha@propkart.in', role: 'super', actions: 412, lastSeen: ago(0, 1), active: true },
  { id: 'ad-priya', name: 'Priya Nair', email: 'priya@propkart.in', role: 'ops', actions: 1268, lastSeen: ago(0, 3), active: true },
  { id: 'ad-nikhil', name: 'Nikhil Deshmukh', email: 'nikhil@propkart.in', role: 'ops', actions: 934, lastSeen: ago(1, 2), active: true },
  { id: 'ad-imran', name: 'Imran Qureshi', email: 'imran@propkart.in', role: 'finance', actions: 287, lastSeen: ago(0, 7), active: true },
  { id: 'ad-tara', name: 'Tara Sethi', email: 'tara@propkart.in', role: 'support', actions: 1731, lastSeen: ago(0, 2), active: true },
  { id: 'ad-om', name: 'Om Bhatt', email: 'om@propkart.in', role: 'support', actions: 96, lastSeen: ago(34), active: false },
]

export const SEED_AUDIT: AuditEntry[] = [
  { id: 'au-1', at: ago(0, 2), adminId: 'ad-priya', action: 'Approve', target: 'StarVans Vanity', detail: 'GST checked', area: 'verification' },
  { id: 'au-2', at: ago(0, 5), adminId: 'ad-tara', action: 'Send it', target: 'The provider app', detail: 'Payouts move to Thursdays · 69 accounts', area: 'broadcast' },
  { id: 'au-3', at: ago(0, 9), adminId: 'ad-imran', action: 'Confirm sent', target: 'Filmy Props Co.', detail: '₹28,900 · NEFT-4471210', area: 'money' },
  { id: 'au-4', at: ago(1, 1), adminId: 'ad-priya', action: 'Take it down', target: 'Mirror Disco Ball', detail: 'Duplicate listing', area: 'listings' },
  { id: 'au-5', at: ago(1, 4), adminId: 'ad-nikhil', action: 'Reject and tell them', target: 'Sunrise Props Co.', detail: 'The file is unreadable', area: 'verification' },
  { id: 'au-6', at: ago(1, 8), adminId: 'ad-asha', action: 'Switch on', target: 'Instant booking', detail: 'Bookings confirm outright', area: 'flags' },
  { id: 'au-7', at: ago(2, 2), adminId: 'ad-imran', action: 'Save the rate', target: 'Commission', detail: '11% → 12%', area: 'money' },
  { id: 'au-8', at: ago(2, 6), adminId: 'ad-priya', action: 'Put it back', target: 'Police uniform', detail: 'Nothing to answer', area: 'listings' },
  { id: 'au-9', at: ago(3, 3), adminId: 'ad-asha', action: 'Settle and tell both sides', target: 'Plants delivered to the wrong unit', detail: 'Refund the renter · ₹2,400', area: 'orders' },
  { id: 'au-10', at: ago(4, 1), adminId: 'ad-tara', action: 'Suspend', target: 'Zenith Rentals', detail: '3 reports', area: 'people' },
  { id: 'au-11', at: ago(5, 5), adminId: 'ad-imran', action: 'Switch off', target: 'VANITY20', detail: 'The margin was too thin', area: 'coupons' },
  { id: 'au-12', at: ago(6, 2), adminId: 'ad-priya', action: 'Save the campaign', target: 'Classic Wheels · festive', detail: 'Renter Home · priority 8', area: 'ads' },
  { id: 'au-13', at: ago(8, 3), adminId: 'ad-asha', action: 'Change the role', target: 'Om Bhatt', detail: 'Operations → Support', area: 'team' },
  { id: 'au-14', at: ago(9, 6), adminId: 'ad-imran', action: 'Close it to new sign-ups', target: 'Studio', detail: 'Renting · ₹4,999 a month', area: 'subscriptions' },
]

/** The account rows the phone apps are signed in as. */
export const DEMO_RENTER = 'a-rohan'
export const DEMO_PROVIDER = 'a-v-kapoor'
