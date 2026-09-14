/**
 * Discover search: filters (URL-serialisable), matching, sorting, search
 * scope ("where to look") and availability against the shoot dates.
 */
import {
  CATEGORIES,
  COLLECTIONS,
  ERAS,
  HOME_CITY,
  HOME_STATE,
  MATERIALS,
  NEARBY_KM,
  PROPS,
  TRENDING_PROPS,
  VENDORS,
  collectionById,
  propById,
  vendorById,
  type Category,
  type Era,
  type Material,
  type RentalProp,
  type Vendor,
} from '@/data/props'
import { addDays, daysInclusive, todayISO } from './dates'
import { formatDistance } from './format'

/* ── Options ─────────────────────────────────────────────────────────────── */

export type Scope = 'nearby' | 'city' | 'state' | 'india'
export const SCOPES: Scope[] = ['nearby', 'city', 'state', 'india']
export const DEFAULT_SCOPE: Scope = 'city'

/** Segmented-control labels. */
export const SCOPE_LABEL: Record<Scope, string> = { nearby: 'Nearby', city: 'This city', state: 'This state', india: 'All India' }
/** Chip labels. */
export const SCOPE_SHORT: Record<Scope, string> = { nearby: 'Nearby', city: HOME_CITY, state: HOME_STATE, india: 'All India' }
/** "12 results in Mumbai" */
export const SCOPE_PLACE: Record<Scope, string> = {
  nearby: 'near you',
  city: `in ${HOME_CITY}`,
  state: `in ${HOME_STATE}`,
  india: 'across India',
}
/** "4 more in Maharashtra" — the extra results each wider scope adds. */
export const SCOPE_MORE: Record<Scope, string> = {
  nearby: 'near you',
  city: `in ${HOME_CITY}`,
  state: `in ${HOME_STATE}`,
  india: 'in rest of India',
}
export const SCOPE_HINT: Record<Scope, string> = {
  nearby: `Vendors within ${NEARBY_KM} km of Andheri`,
  city: `Anywhere in ${HOME_CITY}`,
  state: `${HOME_STATE}, including Thane and Pune`,
  india: 'Other cities too, delivered by road freight',
}

export type SortKey = 'nearest' | 'price' | 'availability' | 'rating' | 'newest'
export const SORT_OPTIONS: { value: SortKey; label: string; description: string }[] = [
  { value: 'nearest', label: 'Nearest', description: 'Closest vendors first' },
  { value: 'price', label: 'Price', description: 'Lowest rent per day first' },
  { value: 'availability', label: 'Availability', description: 'Free on your dates first' },
  { value: 'rating', label: 'Rating', description: 'Highest rated first' },
  { value: 'newest', label: 'Newest', description: 'Recently listed first' },
]
export const sortLabel = (s: SortKey) => SORT_OPTIONS.find((o) => o.value === s)?.label ?? 'Nearest'

export type ViewMode = 'grid' | 'list' | 'map'

export type PriceBand = 'lt500' | '500-2k' | '2k-5k' | '5k+'
export const PRICE_BANDS: { id: PriceBand; label: string; min: number; max: number }[] = [
  { id: 'lt500', label: 'Under ₹500', min: 0, max: 500 },
  { id: '500-2k', label: '₹500–2,000', min: 500, max: 2000 },
  { id: '2k-5k', label: '₹2,000–5,000', min: 2000, max: 5000 },
  { id: '5k+', label: '₹5,000+', min: 5000, max: Infinity },
]
const inBand = (price: number, id: PriceBand) => {
  const b = PRICE_BANDS.find((x) => x.id === id)
  return !!b && price >= b.min && price < b.max
}

/* ── Filters ─────────────────────────────────────────────────────────────── */

export interface Filters {
  q: string
  categories: Category[]
  eras: Era[]
  materials: Material[]
  prices: PriceBand[]
  scope: Scope
  /** Shoot dates to check availability against ("YYYY-MM-DD"). */
  from: string | null
  to: string | null
  /** The project the dates came from. */
  projectId: string | null
  freeOnly: boolean
  modifiable: boolean
  delivery: boolean
  verified: boolean
  vendorId: string | null
  collectionId: string | null
  /** Photo search: the prop the photo matched. */
  similarTo: string | null
}

export const EMPTY_FILTERS: Filters = {
  q: '',
  categories: [],
  eras: [],
  materials: [],
  prices: [],
  scope: DEFAULT_SCOPE,
  from: null,
  to: null,
  projectId: null,
  freeOnly: false,
  modifiable: false,
  delivery: false,
  verified: false,
  vendorId: null,
  collectionId: null,
  similarTo: null,
}

const CATEGORY_IDS = CATEGORIES.map((c) => c.id)
const ERA_IDS = ERAS.map((e) => e.id)
const PRICE_IDS = PRICE_BANDS.map((p) => p.id)
const isoRe = /^\d{4}-\d{2}-\d{2}$/

/** Comma list from the URL, keeping only known values (in taxonomy order). */
function listParam<T extends string>(query: URLSearchParams, key: string, known: readonly T[]): T[] {
  const raw = (query.get(key) ?? '').split(',').map((s) => s.trim().toLowerCase())
  return known.filter((k) => raw.includes(k.toLowerCase()))
}

export function parseFilters(query: URLSearchParams): Filters {
  const scope = query.get('scope') as Scope
  const from = query.get('from')
  const to = query.get('to')
  const vendor = query.get('vendor')
  const collection = query.get('collection')
  const similar = query.get('similar')
  return {
    q: query.get('q') ?? '',
    categories: listParam(query, 'cat', CATEGORY_IDS),
    eras: listParam(query, 'era', ERA_IDS),
    materials: listParam(query, 'mat', MATERIALS),
    prices: listParam(query, 'price', PRICE_IDS),
    scope: SCOPES.includes(scope) ? scope : DEFAULT_SCOPE,
    from: from && isoRe.test(from) ? from : null,
    to: to && isoRe.test(to) ? to : null,
    projectId: query.get('project'),
    freeOnly: query.get('free') === '1',
    modifiable: query.get('mod') === '1',
    delivery: query.get('del') === '1',
    verified: query.get('ver') === '1',
    vendorId: vendor && vendorById(vendor) ? vendor : null,
    collectionId: collection && collectionById(collection) ? collection : null,
    similarTo: similar && propById(similar) ? similar : null,
  }
}

export const parseSort = (query: URLSearchParams): SortKey => {
  const s = query.get('sort') as SortKey
  return SORT_OPTIONS.some((o) => o.value === s) ? s : 'nearest'
}

export const parseView = (query: URLSearchParams): ViewMode => {
  const v = query.get('view')
  return v === 'list' || v === 'map' ? v : 'grid'
}

/**
 * Filters → query string (stable key and value order, so equal filters give
 * equal strings). `dates: false` leaves the shoot dates out (saved searches).
 */
export function toQuery(
  f: Partial<Filters>,
  extra: { sort?: SortKey; view?: ViewMode; dates?: boolean; openFilters?: boolean } = {},
): string {
  const p = new URLSearchParams()
  if (f.q?.trim()) p.set('q', f.q.trim())
  if (f.categories?.length) p.set('cat', CATEGORY_IDS.filter((c) => f.categories!.includes(c)).join(','))
  if (f.eras?.length) p.set('era', ERA_IDS.filter((e) => f.eras!.includes(e)).join(','))
  if (f.materials?.length) p.set('mat', MATERIALS.filter((m) => f.materials!.includes(m)).join(','))
  if (f.prices?.length) p.set('price', PRICE_IDS.filter((x) => f.prices!.includes(x)).join(','))
  if (f.scope && f.scope !== DEFAULT_SCOPE) p.set('scope', f.scope)
  if (extra.dates !== false) {
    if (f.projectId) p.set('project', f.projectId)
    else if (f.from && f.to) {
      p.set('from', f.from)
      p.set('to', f.to)
    }
  }
  if (f.freeOnly) p.set('free', '1')
  if (f.modifiable) p.set('mod', '1')
  if (f.delivery) p.set('del', '1')
  if (f.verified) p.set('ver', '1')
  if (f.vendorId) p.set('vendor', f.vendorId)
  if (f.collectionId) p.set('collection', f.collectionId)
  if (f.similarTo) p.set('similar', f.similarTo)
  if (extra.sort && extra.sort !== 'nearest') p.set('sort', extra.sort)
  if (extra.view && extra.view !== 'grid') p.set('view', extra.view)
  if (extra.openFilters) p.set('filters', 'open')
  return p.toString()
}

export const resultsPath = (f: Partial<Filters>, extra?: Parameters<typeof toQuery>[1]) => {
  const q = toQuery(f, extra)
  return `/customer/discover/results${q ? `?${q}` : ''}`
}

/** Identity of a search for "Save this search" (dates, sort and view left out). */
export const searchKey = (f: Filters) => toQuery(f, { dates: false })

/** Refinements set in the Filters sheet (for the badge on the Filters button). */
export const filterCount = (f: Filters) =>
  f.categories.length +
  f.eras.length +
  f.materials.length +
  f.prices.length +
  (f.scope !== DEFAULT_SCOPE ? 1 : 0) +
  [f.freeOnly, f.modifiable, f.delivery, f.verified].filter(Boolean).length

/** Everything cleared except the search text, dates and context (vendor, collection, photo). */
export const clearRefinements = (f: Filters): Filters => ({
  ...EMPTY_FILTERS,
  q: f.q,
  from: f.from,
  to: f.to,
  projectId: f.projectId,
  vendorId: f.vendorId,
  collectionId: f.collectionId,
  similarTo: f.similarTo,
})

/** Short human summary, e.g. "“sofa” · Furniture · Colonial · Mumbai". */
export function describeFilters(f: Filters) {
  const parts: string[] = []
  if (f.q.trim()) parts.push(`“${f.q.trim()}”`)
  if (f.similarTo) parts.push(`Like ${propById(f.similarTo)?.name ?? 'your photo'}`)
  if (f.collectionId) parts.push(collectionById(f.collectionId)?.name ?? '')
  if (f.vendorId) parts.push(vendorById(f.vendorId)?.name ?? '')
  parts.push(...f.categories, ...f.eras, ...f.materials)
  parts.push(...f.prices.map((id) => PRICE_BANDS.find((b) => b.id === id)?.label ?? ''))
  if (f.freeOnly) parts.push('Free on your dates')
  if (f.modifiable) parts.push('Can be modified')
  if (f.delivery) parts.push('Delivery')
  if (f.verified) parts.push('Verified only')
  parts.push(SCOPE_SHORT[f.scope])
  return parts.filter(Boolean).join(' · ')
}

/** A default name for a saved search. */
export function suggestName(f: Filters) {
  const q = f.q.trim()
  if (q) return q.charAt(0).toUpperCase() + q.slice(1)
  const bits = [
    f.collectionId && collectionById(f.collectionId)?.name,
    f.vendorId && vendorById(f.vendorId)?.name,
    f.similarTo && `Like ${propById(f.similarTo)?.name}`,
    ...f.eras,
    ...f.categories,
  ].filter(Boolean)
  return bits.length ? bits.slice(0, 3).join(' · ') : `Props ${SCOPE_PLACE[f.scope]}`
}

/* ── Matching ────────────────────────────────────────────────────────────── */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')

const STOP = new Set(['a', 'an', 'the', 'for', 'in', 'on', 'of', 'and', 'with', 'near', 'me', 'prop', 'rent', 'rental', 'hire'])
const stem = (t: string) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t)

export const tokensOf = (q: string) =>
  norm(q)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(stem)
    .filter((t) => !STOP.has(t))

/** A prop's searchable words (name, tags, era, vendor…) as " word word …". */
const hayCache = new Map<string, string>()
function haystack(p: RentalProp) {
  let h = hayCache.get(p.id)
  if (!h) {
    const v = vendorById(p.vendorId)
    const words = norm([p.name, p.category, p.era, p.material, ...(p.tags ?? []), v.name, v.area, v.city].join(' '))
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
    h = ` ${words.join(' ')}`
    hayCache.set(p.id, h)
  }
  return h
}

/** A token matches the start of a word: "van" finds "vanity", but "table" doesn't find "inflatable". */
const hasWord = (h: string, token: string) => h.includes(` ${token}`)

/** How many words of `text` appear in the prop's name, tags, era, vendor… */
export const textScore = (p: RentalProp, text: string) => {
  const h = haystack(p)
  return tokensOf(text).filter((t) => hasWord(h, t)).length
}

export function inScope(v: Vendor, scope: Scope) {
  if (scope === 'nearby') return v.city === HOME_CITY && v.distanceKm <= NEARBY_KM
  if (scope === 'city') return v.city === HOME_CITY
  if (scope === 'state') return v.state === HOME_STATE
  return true
}

/** 0–6: how alike two props are (category 3, era 2, material 1). */
export function similarity(a: RentalProp, b: RentalProp) {
  return (a.category === b.category ? 3 : 0) + (a.era === b.era ? 2 : 0) + (a.material && a.material === b.material ? 1 : 0)
}

/** "2.4 km · Andheri West", or "150 km · Pune" outside the home city. */
export function distanceLabel(p: RentalProp) {
  const v = vendorById(p.vendorId)
  return `${formatDistance(v.distanceKm)} · ${v.city === HOME_CITY ? v.area : v.city}`
}

/** No booking overlaps the dates. */
export const isFreeOn = (p: RentalProp, from: string, to: string) => !p.booked.some(([s, e]) => s <= to && e >= from)

/** The first booking that clashes with the dates, if any. */
export const clashOn = (p: RentalProp, from: string, to: string) => p.booked.find(([s, e]) => s <= to && e >= from)

function bookedDays(p: RentalProp, from: string, to: string) {
  return p.booked.reduce((n, [s, e]) => {
    const a = s > from ? s : from
    const b = e < to ? e : to
    return a <= b ? n + daysInclusive(a, b) : n
  }, 0)
}

function matches(p: RentalProp, f: Filters, tokens: string[], ignoreScope = false) {
  const v = vendorById(p.vendorId)
  if (f.similarTo) {
    const target = propById(f.similarTo)
    if (target && similarity(p, target) < 3) return false
  }
  if (f.collectionId && !collectionById(f.collectionId)?.propIds.includes(p.id)) return false
  if (f.vendorId && p.vendorId !== f.vendorId) return false
  if (f.categories.length && !f.categories.includes(p.category)) return false
  if (f.eras.length && !f.eras.includes(p.era)) return false
  if (f.materials.length && !(p.material && f.materials.includes(p.material))) return false
  if (f.prices.length && !f.prices.some((b) => inBand(p.pricePerDay, b))) return false
  if (f.freeOnly && f.from && f.to && !isFreeOn(p, f.from, f.to)) return false
  if (f.modifiable && !p.modifiable) return false
  if (f.delivery && !v.delivery) return false
  if (f.verified && !v.verified) return false
  if (tokens.length && !tokens.every((t) => hasWord(haystack(p), t))) return false
  if (!ignoreScope && !inScope(v, f.scope)) return false
  return true
}

export function searchProps(f: Filters, sort: SortKey = 'nearest') {
  const tokens = tokensOf(f.q)
  return sortResults(
    PROPS.filter((p) => matches(p, f, tokens)),
    sort,
    f,
  )
}

export function sortResults(list: RentalProp[], sort: SortKey, f: Pick<Filters, 'from' | 'to' | 'similarTo'>) {
  const dist = (p: RentalProp) => vendorById(p.vendorId).distanceKm
  const from = f.from ?? todayISO()
  const to = f.to ?? addDays(from, 30)
  const target = f.similarTo ? propById(f.similarTo) : undefined
  const by: Record<SortKey, (a: RentalProp, b: RentalProp) => number> = {
    nearest: (a, b) => dist(a) - dist(b) || b.rating - a.rating,
    price: (a, b) => a.pricePerDay - b.pricePerDay,
    availability: (a, b) => bookedDays(a, from, to) - bookedDays(b, from, to) || dist(a) - dist(b),
    rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    newest: (a, b) => a.addedDaysAgo - b.addedDaysAgo,
  }
  return [...list].sort((a, b) => {
    // Photo search: the matched prop, then the closest matches, then the chosen order.
    if (target) {
      if (a.id === target.id || b.id === target.id) return a.id === target.id ? -1 : 1
      const d = similarity(b, target) - similarity(a, target)
      if (d) return d
    }
    return by[sort](a, b)
  })
}

/**
 * Results the wider scopes would add, e.g. scope "city" →
 * [{ scope: 'state', count: 4 }, { scope: 'india', count: 3 }].
 */
export function widerCounts(f: Filters) {
  const tokens = tokensOf(f.q)
  const all = PROPS.filter((p) => matches(p, f, tokens, true))
  const count = (s: Scope) => all.filter((p) => inScope(vendorById(p.vendorId), s)).length
  const out: { scope: Scope; count: number }[] = []
  let prev = count(f.scope)
  for (const s of SCOPES.slice(SCOPES.indexOf(f.scope) + 1)) {
    const n = count(s)
    if (n > prev) out.push({ scope: s, count: n - prev })
    prev = n
  }
  return out
}

/** Close-but-not-exact props for "Nothing exact". */
export function similarItems(f: Filters, limit = 6): RentalProp[] {
  const tokens = tokensOf(f.q)
  const target = f.similarTo ? propById(f.similarTo) : undefined
  const collection = f.collectionId ? collectionById(f.collectionId) : undefined
  const scored = PROPS.map((p) => {
    let s = tokens.filter((t) => hasWord(haystack(p), t)).length * 2
    if (f.categories.includes(p.category)) s += 2
    if (f.eras.includes(p.era)) s += 2
    if (p.material && f.materials.includes(p.material)) s += 1
    if (collection?.propIds.includes(p.id)) s += 1
    if (f.vendorId === p.vendorId) s += 1
    if (target) s += similarity(p, target)
    return { p, s }
  })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.p.rating - a.p.rating)
  const list = scored.slice(0, limit).map((x) => x.p)
  return list.length ? list : TRENDING_PROPS.slice(0, limit)
}

/* ── Search suggestions ──────────────────────────────────────────────────── */

export interface Suggestion {
  kind: 'category' | 'era' | 'collection' | 'vendor' | 'prop'
  label: string
  detail: string
  /** Filters to apply when picked. */
  patch: Partial<Filters>
}

/** Type-ahead for the search screen. */
export function suggest(q: string, limit = 8): Suggestion[] {
  const t = norm(q.trim())
  if (!t) return []
  const has = (s: string) => norm(s).includes(t)
  const out: Suggestion[] = []
  for (const c of CATEGORIES) if (has(c.id)) out.push({ kind: 'category', label: c.id, detail: 'Category', patch: { categories: [c.id] } })
  for (const e of ERAS) if (has(e.id)) out.push({ kind: 'era', label: e.id, detail: 'Era & style', patch: { eras: [e.id] } })
  for (const c of COLLECTIONS) if (has(c.name)) out.push({ kind: 'collection', label: c.name, detail: 'Collection', patch: { collectionId: c.id } })
  for (const v of VENDORS)
    if (has(v.name) || has(v.area))
      out.push({ kind: 'vendor', label: v.name, detail: `Vendor · ${v.area}, ${v.city}`, patch: { vendorId: v.id, scope: 'india' } })
  for (const p of PROPS)
    if (has(p.name) || (p.tags ?? []).some(has))
      out.push({ kind: 'prop', label: p.name, detail: p.category, patch: { q: p.name } })
  return out.slice(0, limit)
}
