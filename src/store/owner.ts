import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type OwnerPlanId } from '@/data/owner'
import { propById } from '@/data/props'
import { addDays, todayISO } from '@/lib/dates'
import {
  codePrefix,
  conflicts,
  HOUR,
  pieceCode,
  type Block,
  type Condition,
  type Draft,
  type Hold,
  type Listing,
  type Order,
  type OwnerNotification,
  type OwnerRequest,
  type OwnerReview,
  type Piece,
  type Renter,
  type StaffMember,
} from '@/lib/owner'
import { newId } from './projects'
import { usePlatform } from './platform'

export type VerifyState = 'done' | 'pending' | 'todo'
export type VerifyKey = 'phone' | 'identity' | 'warehouse' | 'bank' | 'gst'

export interface Business {
  type: string
  name: string
  owner: string
  phone: string
  pincode: string
  email: string
  address: string
  gst: string
}

interface OwnerState {
  business: Business
  verification: Record<VerifyKey, VerifyState>
  bank: { name: string; last4: string; ifsc: string; holder: string }
  policies: { depositMultiple: number; turnaround: number; modifyDefault: boolean }
  delivery: { enabled: boolean; radiusKm: number; perTrip: number; perKm: number }
  plan: OwnerPlanId
  followers: number
  listings: Listing[]
  orders: Order[]
  holds: Hold[]
  requests: OwnerRequest[]
  reviews: OwnerReview[]
  staff: StaffMember[]
  drafts: Draft[]
  notifications: OwnerNotification[]
  announcementDismissed: boolean
  seq: number

  // Stock
  updateListing: (id: string, patch: Partial<Listing>) => void
  setListed: (ids: string[], listed: boolean) => void
  /** Changes day rates by a percentage (e.g. -10). */
  bulkPrice: (ids: string[], pct: number) => void
  setRepair: (listingId: string, pieceId: string, until: string | null | false) => void
  addBlock: (listingId: string, block: Omit<Block, 'id'>) => void
  removeBlock: (listingId: string, blockId: string) => () => void
  approveListing: (id: string) => void
  duplicateListing: (id: string) => string
  // Orders & requests
  acceptOrder: (id: string) => void
  declineOrder: (id: string, reason: string) => void
  dispatchOrder: (id: string, pieceIds: string[], photos: number) => void
  returnOrder: (id: string, damage: { amount: number; note: string } | null) => void
  settleDeposit: (id: string, claim: number) => void
  answerRequest: (id: string, answer: string) => void
  resolveChange: (id: string, accept: boolean, note: string) => void
  resolveDamage: (id: string, claim: number, note: string) => void
  // Add
  addDrafts: (drafts: Omit<Draft, 'id' | 'createdAt'>[]) => string[]
  updateDraft: (id: string, patch: Partial<Draft>) => void
  removeDraft: (id: string) => () => void
  submitDraft: (id: string) => string | null
  // Profile
  setBusiness: (patch: Partial<Business>) => void
  setVerification: (key: VerifyKey, state: VerifyState) => void
  setBank: (bank: OwnerState['bank']) => void
  setPolicies: (patch: Partial<OwnerState['policies']>) => void
  setDelivery: (patch: Partial<OwnerState['delivery']>) => void
  setPlan: (plan: OwnerPlanId) => void
  replyReview: (id: string, reply: string) => void
  addStaff: (m: Omit<StaffMember, 'id'>) => void
  updateStaff: (id: string, patch: Partial<StaffMember>) => void
  removeStaff: (id: string) => () => void
  boost: (listingId: string, days: number) => void
  tellFollowers: (text: string) => void
  markRead: (id?: string) => void
  dismissAnnouncement: () => void
}

const day = (n: number) => addDays(todayISO(), n)

const RENTERS: Record<string, Renter> = {
  fable: { company: 'Frame & Fable Films', person: 'Rohan Mehta', phone: '9876543210' },
  chilli: { company: 'Red Chilli Ads', person: 'Neha Sharma', phone: '9819012345' },
  mango: { company: 'Mango Pictures', person: 'Arvind Rao', phone: '9833344556' },
  bluedoor: { company: 'Blue Door Films', person: 'Sana Khan', phone: '9920012345' },
  nukkad: { company: 'Nukkad Productions', person: 'Imran Sheikh', phone: '9867000111' },
  pixel: { company: 'Pixel Tree Studio', person: 'Meera Pillai', phone: '9004455667' },
  tales: { company: 'Tall Tales Films', person: 'Kabir Malhotra', phone: '9821122334' },
  gems: { company: 'Screen Gems', person: 'Ritu Desai', phone: '9892233445' },
}

function makePieces(listingId: string, name: string, n: number, condition: Condition = 'Good'): Piece[] {
  const prefix = codePrefix(name)
  return Array.from({ length: n }, (_, i) => ({ id: `${listingId}-p${i + 1}`, code: pieceCode(prefix, i), condition, repair: null }))
}

/** A listing built from a renter-catalogue prop (same name, rate and icon). */
function fromCatalog(id: string, catalogId: string, over: Partial<Listing> & { count: number }, now: number): Listing {
  const p = propById(catalogId)
  const { count, ...rest } = over
  return {
    id,
    name: p.name,
    category: p.category,
    era: p.era,
    material: p.material ?? null,
    description: '',
    photos: ['sample', 'sample', 'sample'],
    dayRate: p.pricePerDay,
    deposit: p.pricePerDay * 2,
    pieces: makePieces(id, p.name, count),
    listed: true,
    review: false,
    size: null,
    weight: null,
    condition: 'Good',
    bufferDays: 1,
    modifiable: p.modifiable,
    blocks: [],
    saves: 0,
    addedAt: now - 60 * 24 * HOUR,
    catalogId,
    boostedUntil: null,
    ...rest,
  }
}

function ownListing(id: string, name: string, over: Partial<Listing> & Pick<Listing, 'category' | 'era' | 'dayRate'> & { count: number }, now: number): Listing {
  const { count, ...rest } = over
  return {
    id,
    name,
    material: null,
    description: '',
    photos: ['sample', 'sample'],
    deposit: over.dayRate * 2,
    pieces: makePieces(id, name, count),
    listed: true,
    review: false,
    size: null,
    weight: null,
    condition: 'Good',
    bufferDays: 1,
    modifiable: false,
    blocks: [],
    saves: 0,
    addedAt: now - 20 * 24 * HOUR,
    catalogId: null,
    boostedUntil: null,
    ...rest,
  }
}

const order = (o: Partial<Order> & Pick<Order, 'id' | 'listingId' | 'qty' | 'renter' | 'project' | 'from' | 'to' | 'status' | 'requestedAt'>): Order => ({
  pieceIds: [],
  outPhotos: 0,
  returnedAt: null,
  deposit: null,
  claim: 0,
  declineReason: null,
  delivery: true,
  discount: 0,
  settled: false,
  ...o,
})

function seed() {
  const now = Date.now()
  const H = HOUR
  const D = 24 * H
  const listings: Listing[] = [
    fromCatalog('l-rotary', 'rotary-phone', { count: 6, size: [22, 18, 14], weight: 1.8, saves: 42, addedAt: now - 120 * D, description: 'Black rotary phone with a working dial and bell. Great for 70s homes, offices and police stations.' }, now),
    fromCatalog('l-radio', 'transistor-radio', { count: 4, size: [28, 10, 18], weight: 1.2, saves: 27, addedAt: now - 90 * D, description: 'Leather-cased transistor radio with a chrome dial. Lights up and plays through its speaker.' }, now),
    fromCatalog('l-crt', 'crt-computer', { count: 3, size: [45, 45, 40], saves: 11, addedAt: now - 30 * D, description: 'Beige tower, 15-inch CRT monitor, keyboard and ball mouse. Powers on to a boot screen.' }, now),
    fromCatalog(
      'l-wingback',
      'wingback-armchair',
      {
        count: 2,
        size: [80, 85, 110],
        weight: 22,
        saves: 19,
        addedAt: now - 75 * D,
        description: 'Deep green velvet wingback with turned wooden legs. Comfortable for long takes.',
        blocks: [{ id: 'blk-1', from: day(1), to: day(1), note: 'Upholstery clean' }],
      },
      now,
    ),
    fromCatalog('l-formica', 'formica-dining', { count: 1, size: [120, 75, 76], weight: 38, saves: 9, addedAt: now - 50 * D, description: 'Mint Formica table with chrome edging and four vinyl chairs. Tabletop has light wear.' }, now),
    fromCatalog('l-inflatable', 'inflatable-chair', { count: 4, size: [95, 90, 80], weight: 1.1, saves: 14, listed: false, addedAt: now - 25 * D, description: 'Clear inflatable lounge chairs. Pumped up on delivery, pump included.' }, now),
    fromCatalog('l-irani', 'irani-cafe', { count: 1, saves: 33, addedAt: now - 100 * D, description: 'A full Irani café set: bentwood chairs, marble-top tables, glass jars, a counter and a wall clock.' }, now),
    ownListing('l-tiffin', 'Brass Tiffin Carriers', { category: 'Decor', era: 'Colonial', material: 'Brass', dayRate: 150, count: 12, description: 'Stacked tiffins.', addedAt: now - 12 * D }, now),
    ownListing(
      'l-typewriter',
      'Olympia Portable Typewriter',
      {
        category: 'Decor',
        era: '1970s',
        material: 'Metal',
        dayRate: 550,
        deposit: 1500,
        count: 3,
        size: [32, 30, 12],
        weight: 5.5,
        saves: 9,
        description: 'Cream portable typewriter in its carry case. Keys and carriage work; ribbon replaced.',
        addedAt: now - 40 * D,
      },
      now,
    ),
    ownListing(
      'l-cinema',
      'Cinema Hall Seats (row of 4)',
      { category: 'Furniture', era: '1970s', material: 'Metal', dayRate: 1200, deposit: 3000, count: 2, size: [210, 70, 95], weight: 60, saves: 4, description: 'Row of four red folding cinema seats on a steel frame, from a single-screen theatre.', addedAt: now - 150 * D },
      now,
    ),
    ownListing('l-petromax', 'Petromax Pressure Lamp', { category: 'Lighting', era: 'Colonial', material: 'Brass', dayRate: 300, count: 8, size: [20, 20, 50], weight: 2.2, description: 'Brass pressure lamps with glass mantles. Fitted with an LED for safe use on set.', addedAt: now - 5 * D }, now),
    ownListing(
      'l-bench',
      'Railway Waiting Bench',
      { category: 'Furniture', era: 'Colonial', material: 'Wood', dayRate: 1500, count: 2, size: [180, 55, 85], weight: 40, review: true, description: 'Teak slatted bench with cast-iron legs, from a station waiting room.', addedAt: now - H },
      now,
    ),
  ]
  // One typewriter is being serviced; both cinema seat rows are out for repair with no date yet.
  const typewriter = listings.find((l) => l.id === 'l-typewriter')!
  typewriter.pieces[2] = { ...typewriter.pieces[2], condition: 'Fair', repair: { until: day(4) } }
  const cinema = listings.find((l) => l.id === 'l-cinema')!
  cinema.pieces = cinema.pieces.map((p) => ({ ...p, condition: 'Worn', repair: { until: null } }))

  const orders: Order[] = [
    order({ id: 'OR-2052', listingId: 'l-formica', qty: 1, renter: RENTERS.chilli, project: 'Chai brand TVC', from: day(3), to: day(4), status: 'request', requestedAt: now - 26 * H }),
    order({ id: 'OR-2051', listingId: 'l-rotary', qty: 2, renter: RENTERS.fable, project: 'Monsoon Ad Shoot', from: day(5), to: day(8), status: 'request', requestedAt: now - 5 * H }),
    order({ id: 'OR-2049', listingId: 'l-wingback', qty: 2, renter: RENTERS.mango, project: 'Web series · Ep 4', from: day(0), to: day(2), status: 'confirmed', requestedAt: now - 4 * D, deposit: 'held' }),
    order({ id: 'OR-2047', listingId: 'l-rotary', qty: 2, renter: RENTERS.tales, project: 'Period drama · Ep 5', from: day(2), to: day(4), status: 'confirmed', requestedAt: now - 3 * D, deposit: 'held' }),
    order({ id: 'OR-2044', listingId: 'l-irani', qty: 1, renter: RENTERS.mango, project: 'Web series · Ep 6', from: day(6), to: day(7), status: 'confirmed', requestedAt: now - 2 * D, deposit: 'held', discount: 3000 }),
    order({ id: 'OR-2046', listingId: 'l-radio', qty: 2, renter: RENTERS.bluedoor, project: 'Retro café music video', from: day(-3), to: day(0), status: 'out', requestedAt: now - 7 * D, pieceIds: ['l-radio-p1', 'l-radio-p2'], outPhotos: 6, deposit: 'held' }),
    order({ id: 'OR-2043', listingId: 'l-crt', qty: 1, renter: RENTERS.nukkad, project: 'Cyber café short film', from: day(-6), to: day(-1), status: 'out', requestedAt: now - 10 * D, pieceIds: ['l-crt-p1'], outPhotos: 3, deposit: 'held' }),
    order({ id: 'OR-2040', listingId: 'l-rotary', qty: 1, renter: RENTERS.pixel, project: 'Bank ad', from: day(-9), to: day(-4), status: 'returned', requestedAt: now - 14 * D, pieceIds: ['l-rotary-p3'], outPhotos: 3, returnedAt: now - 30 * H, deposit: 'held' }),
    order({ id: 'OR-2038', listingId: 'l-irani', qty: 1, renter: RENTERS.tales, project: 'Period drama · Ep 2', from: day(-20), to: day(-18), status: 'closed', requestedAt: now - 26 * D, deposit: 'released', settled: true }),
    order({ id: 'OR-2031', listingId: 'l-radio', qty: 3, renter: RENTERS.chilli, project: 'Radio station promo', from: day(-14), to: day(-12), status: 'closed', requestedAt: now - 18 * D, deposit: 'released', settled: true }),
    order({ id: 'OR-2035', listingId: 'l-wingback', qty: 1, renter: RENTERS.fable, project: 'Coffee brand ad', from: day(-31), to: day(-29), status: 'closed', requestedAt: now - 36 * D, deposit: 'released', settled: true }),
    order({ id: 'OR-2020', listingId: 'l-cinema', qty: 2, renter: RENTERS.gems, project: 'Single-screen nostalgia film', from: day(-60), to: day(-57), status: 'closed', requestedAt: now - 66 * D, deposit: 'released', settled: true }),
    order({ id: 'OR-2039', listingId: 'l-formica', qty: 1, renter: RENTERS.nukkad, project: 'Kitchen short', from: day(-8), to: day(-8), status: 'declined', requestedAt: now - 12 * D, declineReason: 'Dates too short to turn around' }),
  ]

  const holds: Hold[] = [
    { id: 'h-1', listingId: 'l-rotary', qty: 2, renter: RENTERS.fable, until: now + 5 * H },
    { id: 'h-2', listingId: 'l-irani', qty: 1, renter: RENTERS.chilli, until: now + 20 * H },
    { id: 'h-3', listingId: 'l-radio', qty: 1, renter: RENTERS.mango, until: now + 2 * H },
  ]

  const requests: OwnerRequest[] = [
    { id: 'rq-1', kind: 'question', listingId: 'l-rotary', orderId: null, renter: RENTERS.fable, text: 'Does the bell actually ring? We want to record it live on set.', at: now - 3 * H, status: 'open', answer: null },
    { id: 'rq-2', kind: 'change', listingId: 'l-wingback', orderId: 'OR-2049', renter: RENTERS.mango, text: 'Can we keep both armchairs one more day, till Thursday?', at: now - 10 * H, status: 'open', answer: null, newTo: day(3) },
    { id: 'rq-3', kind: 'damage', listingId: 'l-radio', orderId: 'OR-2046', renter: RENTERS.bluedoor, text: 'The tuning knob on one radio came off during the shoot. We kept the knob.', at: now - 20 * H, status: 'open', answer: null, amount: 400 },
    { id: 'rq-4', kind: 'question', listingId: 'l-irani', orderId: null, renter: RENTERS.chilli, text: 'Can the café set be dressed with our own branded cups?', at: now - 3 * D, status: 'done', answer: 'Yes, as long as nothing is stuck to the tables.' },
  ]

  const reviews: OwnerReview[] = [
    { id: 'rv-1', renter: 'Frame & Fable Films', listingId: 'l-rotary', rating: 5, text: 'Rotary phones and radios arrived spotless and working. Easy pickup too.', at: now - 40 * D, reply: 'Thank you Rohan! See you on the next shoot.' },
    { id: 'rv-2', renter: 'Tall Tales Films', listingId: 'l-irani', rating: 5, text: 'The Irani café set was exactly as photographed. The crew loved it.', at: now - 16 * D, reply: null },
    { id: 'rv-3', renter: 'Red Chilli Ads', listingId: 'l-radio', rating: 4, text: 'Good radios. One had a weak battery, but they sent a spare quickly.', at: now - 10 * D, reply: null },
    { id: 'rv-4', renter: 'Frame & Fable Films', listingId: 'l-wingback', rating: 5, text: 'Armchairs were clean and on time.', at: now - 27 * D, reply: 'Thanks! Glad the colour worked.' },
    { id: 'rv-5', renter: 'Screen Gems', listingId: 'l-cinema', rating: 5, text: 'Those cinema seats made the scene.', at: now - 55 * D, reply: 'Thanks Ritu!' },
    { id: 'rv-6', renter: 'Pixel Tree Studio', listingId: 'l-rotary', rating: 4, text: 'Phone was great; the pickup slot changed twice.', at: now - 2 * D, reply: null },
  ]

  const notifications: OwnerNotification[] = [
    { id: 'n-1', title: 'New booking request', body: 'Frame & Fable Films wants 2 rotary phones for the Monsoon Ad Shoot.', at: now - 5 * H, read: false, to: '/renter/orders/OR-2051' },
    { id: 'n-2', title: 'Damage reported', body: 'Blue Door Films says a radio knob came off.', at: now - 20 * H, read: false, to: '/renter/requests/rq-3' },
    { id: 'n-3', title: 'Listing in review', body: 'Railway Waiting Bench is being checked. Usually within 2 hours.', at: now - H, read: false, to: '/renter/stock/l-bench' },
    { id: 'n-4', title: 'Payout sent', body: '₹18,640 landed in HDFC Bank •••• 4821.', at: now - 3 * D, read: true, to: '/renter/profile/payouts' },
    { id: 'n-5', title: 'New review ★★★★☆', body: 'Pixel Tree Studio reviewed the rotary phone.', at: now - 2 * D, read: true, to: '/renter/profile/reviews' },
  ]

  const drafts: Draft[] = [
    { id: 'dr-1', source: 'rapid', photos: ['sample', 'sample', 'sample'], name: '', category: null, era: null, material: null, size: null, weight: null, pieces: 1, condition: 'Good', dayRate: null, deposit: null, description: '', aiFilled: [], createdAt: now - 26 * H },
    {
      id: 'dr-2',
      source: 'one',
      photos: ['sample', 'sample', 'sample', 'sample'],
      name: 'Brass Table Lamp with Fabric Shade',
      category: 'Lighting',
      era: '1940s–60s',
      material: 'Brass',
      size: [30, 30, 55],
      weight: null,
      pieces: 4,
      condition: 'Good',
      dayRate: 450,
      deposit: 900,
      description: 'Solid brass base with a pleated cream shade. Wired and working, warm bulb included.',
      aiFilled: ['name', 'category', 'era', 'material', 'size', 'description', 'dayRate'],
      createdAt: now - 4 * H,
    },
  ]

  return { listings, orders, holds, requests, reviews, notifications, drafts }
}

const draftToListing = (d: Draft, id: string, modifiable: boolean): Listing => ({
  id,
  name: d.name.trim(),
  category: d.category!,
  era: d.era!,
  material: d.material,
  description: d.description.trim(),
  photos: d.photos,
  dayRate: d.dayRate!,
  deposit: d.deposit ?? d.dayRate! * 2,
  pieces: makePieces(id, d.name, Math.max(1, d.pieces), d.condition),
  listed: true,
  review: true,
  size: d.size,
  weight: d.weight,
  condition: d.condition,
  bufferDays: 1,
  modifiable,
  blocks: [],
  saves: 0,
  addedAt: Date.now(),
  catalogId: null,
  boostedUntil: null,
})

/** The prop owner's business, stock and bookings (kept until "Reset demo"). */
export const useOwner = create<OwnerState>()(
  persist(
    (set, get) => ({
      business: {
        type: 'Prop house',
        name: 'Kapoor Props',
        owner: 'Vikram Kapoor',
        phone: '9820011223',
        pincode: '400053',
        email: 'hello@kapoorprops.in',
        address: 'Unit 4, Veera Industrial Estate, Andheri West, Mumbai',
        gst: '27AAKFK1234M1Z8',
      },
      verification: { phone: 'done', identity: 'done', warehouse: 'done', bank: 'done', gst: 'pending' },
      bank: { name: 'HDFC Bank', last4: '4821', ifsc: 'HDFC0001234', holder: 'Kapoor Props' },
      policies: { depositMultiple: 2, turnaround: 1, modifyDefault: false },
      delivery: { enabled: true, radiusKm: 25, perTrip: 800, perKm: 30 },
      plan: 'standard',
      followers: 1240,
      ...seed(),
      staff: [
        { id: 'st-1', name: 'Vikram Kapoor', phone: '9820011223', role: 'Owner' },
        { id: 'st-2', name: 'Farah Kapoor', phone: '9820044556', role: 'Manager' },
        { id: 'st-3', name: 'Ramesh Yadav', phone: '9867012345', role: 'Warehouse' },
      ],
      announcementDismissed: false,
      seq: 2053,

      updateListing: (id, patch) => set((s) => ({ listings: s.listings.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      setListed: (ids, listed) => set((s) => ({ listings: s.listings.map((l) => (ids.includes(l.id) ? { ...l, listed } : l)) })),
      bulkPrice: (ids, pct) =>
        set((s) => ({
          listings: s.listings.map((l) => {
            if (!ids.includes(l.id)) return l
            const dayRate = Math.max(50, Math.round((l.dayRate * (1 + pct / 100)) / 10) * 10)
            return { ...l, dayRate }
          }),
        })),
      setRepair: (listingId, pieceId, until) =>
        set((s) => ({
          listings: s.listings.map((l) =>
            l.id === listingId ? { ...l, pieces: l.pieces.map((p) => (p.id === pieceId ? { ...p, repair: until === false ? null : { until } } : p)) } : l,
          ),
        })),
      addBlock: (listingId, block) =>
        set((s) => ({ listings: s.listings.map((l) => (l.id === listingId ? { ...l, blocks: [...l.blocks, { ...block, id: `blk-${newId()}` }] } : l)) })),
      removeBlock: (listingId, blockId) => {
        const listing = get().listings.find((l) => l.id === listingId)
        const block = listing?.blocks.find((b) => b.id === blockId)
        set((s) => ({ listings: s.listings.map((l) => (l.id === listingId ? { ...l, blocks: l.blocks.filter((b) => b.id !== blockId) } : l)) }))
        return () => {
          if (block) set((s) => ({ listings: s.listings.map((l) => (l.id === listingId ? { ...l, blocks: [...l.blocks, block] } : l)) }))
        }
      },
      approveListing: (id) => set((s) => ({ listings: s.listings.map((l) => (l.id === id ? { ...l, review: false } : l)) })),
      duplicateListing: (id) => {
        const l = get().listings.find((x) => x.id === id)!
        const draftId = `dr-${newId()}`
        const copy: Draft = {
          id: draftId,
          source: 'copy',
          photos: [],
          name: `${l.name} (copy)`,
          category: l.category,
          era: l.era,
          material: l.material,
          size: l.size,
          weight: l.weight,
          pieces: 1,
          condition: l.condition,
          dayRate: l.dayRate,
          deposit: l.deposit,
          description: l.description,
          aiFilled: [],
          createdAt: Date.now(),
        }
        set((s) => ({ drafts: [copy, ...s.drafts] }))
        return draftId
      },

      acceptOrder: (id) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'confirmed', deposit: 'held' } : o)) })),
      declineOrder: (id, reason) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'declined', declineReason: reason } : o)) })),
      dispatchOrder: (id, pieceIds, photos) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'out', pieceIds, outPhotos: photos, deposit: o.deposit ?? 'held' } : o)) })),
      returnOrder: (id, damage) =>
        set((s) => {
          const o = s.orders.find((x) => x.id === id)!
          const requests = damage
            ? [
                {
                  id: `rq-${newId()}`,
                  kind: 'damage' as const,
                  listingId: o.listingId,
                  orderId: o.id,
                  renter: o.renter,
                  text: `Found at the return check: ${damage.note}`,
                  at: Date.now(),
                  status: 'open' as const,
                  answer: null,
                  amount: damage.amount,
                },
                ...s.requests,
              ]
            : s.requests
          return { orders: s.orders.map((x) => (x.id === id ? { ...x, status: 'returned', returnedAt: Date.now() } : x)), requests }
        }),
      settleDeposit: (id, claim) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'closed', deposit: claim > 0 ? 'claimed' : 'released', claim } : o)) })),
      answerRequest: (id, answer) => set((s) => ({ requests: s.requests.map((r) => (r.id === id ? { ...r, status: 'done', answer } : r)) })),
      resolveChange: (id, accept, note) =>
        set((s) => {
          const r = s.requests.find((x) => x.id === id)!
          return {
            requests: s.requests.map((x) => (x.id === id ? { ...x, status: 'done', answer: note } : x)),
            orders: accept && r.orderId && r.newTo ? s.orders.map((o) => (o.id === r.orderId ? { ...o, to: r.newTo! } : o)) : s.orders,
          }
        }),
      resolveDamage: (id, claim, note) =>
        set((s) => {
          const r = s.requests.find((x) => x.id === id)!
          return {
            requests: s.requests.map((x) => (x.id === id ? { ...x, status: 'done', answer: note } : x)),
            orders: r.orderId ? s.orders.map((o) => (o.id === r.orderId ? { ...o, claim: o.claim + claim } : o)) : s.orders,
          }
        }),

      addDrafts: (drafts) => {
        const made = drafts.map((d) => ({ ...d, id: `dr-${newId()}${Math.random().toString(36).slice(2, 5)}`, createdAt: Date.now() }))
        set((s) => ({ drafts: [...made, ...s.drafts] }))
        return made.map((d) => d.id)
      },
      updateDraft: (id, patch) => set((s) => ({ drafts: s.drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      removeDraft: (id) => {
        const before = get().drafts
        set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) }))
        return () => set({ drafts: before })
      },
      submitDraft: (id) => {
        const d = get().drafts.find((x) => x.id === id)
        if (!d || !d.category || !d.era || !d.dayRate || !d.name.trim()) return null
        const listingId = `l-${newId()}`
        set((s) => ({ drafts: s.drafts.filter((x) => x.id !== id), listings: [draftToListing(d, listingId, s.policies.modifyDefault), ...s.listings] }))
        return listingId
      },

      setBusiness: (patch) => set((s) => ({ business: { ...s.business, ...patch } })),
      setVerification: (key, state) => set((s) => ({ verification: { ...s.verification, [key]: state } })),
      setBank: (bank) => set({ bank }),
      setPolicies: (patch) => set((s) => ({ policies: { ...s.policies, ...patch } })),
      setDelivery: (patch) => set((s) => ({ delivery: { ...s.delivery, ...patch } })),
      setPlan: (plan) => set({ plan }),
      replyReview: (id, reply) => set((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? { ...r, reply } : r)) })),
      addStaff: (m) => set((s) => ({ staff: [...s.staff, { ...m, id: `st-${newId()}` }] })),
      updateStaff: (id, patch) => set((s) => ({ staff: s.staff.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeStaff: (id) => {
        const before = get().staff
        set((s) => ({ staff: s.staff.filter((m) => m.id !== id) }))
        return () => set({ staff: before })
      },
      boost: (listingId, days) =>
        set((s) => ({ listings: s.listings.map((l) => (l.id === listingId ? { ...l, boostedUntil: Math.max(Date.now(), l.boostedUntil ?? 0) + days * 24 * HOUR } : l)) })),
      tellFollowers: (text) =>
        set((s) => ({
          notifications: [{ id: `n-${newId()}`, title: 'Update sent', body: `“${text.slice(0, 60)}${text.length > 60 ? '…' : ''}” went to ${s.followers.toLocaleString('en-IN')} followers.`, at: Date.now(), read: true, to: '/renter/profile/promote' }, ...s.notifications],
        })),
      markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (!id || n.id === id ? { ...n, read: true } : n)) })),
      dismissAnnouncement: () => set({ announcementDismissed: true }),
    }),
    { name: 'proto:owner', version: 1 },
  ),
)

/** Diary tab badge: calendar conflicts + unanswered booking requests. */
export const useDiaryBadge = () => useOwner((s) => conflicts(s.listings, s.orders).length + s.orders.filter((o) => o.status === 'request').length)

/** The fee on the current plan (0.12 = 12%). */
/**
 * What PropKart keeps of an order. The Control Centre sets the platform rate
 * (Money → Commission); Pro takes four points off it, as 12% → 8% does.
 */
export const PRO_DISCOUNT = 0.04
export const feeFor = (plan: OwnerPlanId, commission: number) => Math.max(0, plan === 'pro' ? commission - PRO_DISCOUNT : commission)

export function useFeeRate() {
  const plan = useOwner((s) => s.plan)
  const commission = usePlatform((s) => s.commission)
  return feeFor(plan, commission)
}
export const useListing = (id: string | undefined) => useOwner((s) => s.listings.find((l) => l.id === id))

/** Screen-to-screen hints that don't need saving (e.g. "open the block-dates picker"). */
export const useOwnerUi = create<{ blockPicker: boolean; setBlockPicker: (open: boolean) => void }>()((set) => ({
  blockPicker: false,
  setBlockPicker: (blockPicker) => set({ blockPicker }),
}))
