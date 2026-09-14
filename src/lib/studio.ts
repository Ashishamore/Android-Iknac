/**
 * AI Studio "intelligence" (simulated): reads a scene brief into slots, picks
 * props for each slot in three versions, costs a version and lays items out on
 * the scene image.
 */
import { CATEGORY_ICON, PROPS, propById, vendorById, type Category, type Era, type RentalProp } from '@/data/props'
import {
  DEFAULT_SLOTS,
  PHOTO_SLOTS,
  SAMPLE_PHOTO_SLOTS,
  SLOT_RULES,
  STUDIO_SAMPLE_PHOTO,
  type SlotTemplate,
  type VersionId,
} from '@/data/studio'
import { daysInclusive, formatDate, todayISO } from './dates'
import { inScope, isFreeOn, textScore, type Scope } from './search'

export type SceneSource = 'describe' | 'photo' | 'script'

/** Something the scene needs, e.g. "Sofa" (Furniture). */
export interface Slot {
  id: string
  name: string
  category: Category
  note: string
  /** Only props from the chosen era. */
  periodCorrect: boolean
  /** "We already have this" — don't source it. */
  haveIt: boolean
  /** Words used to match props. */
  hint: string
}

export interface Limits {
  projectId: string | null
  from: string | null
  to: string | null
  era: Era | null
  /** Total props budget for the shoot, ₹. */
  budget: number
  scope: Scope
}

export interface BoardItem {
  slotId: string
  /** null = removed, or nothing matched. */
  propId: string | null
}

export interface BoardVersion {
  id: VersionId
  items: BoardItem[]
}

let slotSeq = 0
export const slotId = () => `slot-${Date.now().toString(36)}-${(slotSeq++).toString(36)}`

const fromTemplate = ([name, category, hint]: SlotTemplate): Slot => ({
  id: slotId(),
  name,
  category,
  hint,
  note: '',
  periodCorrect: false,
  haveIt: false,
})

/** Slots for a text brief or script page. */
function slotsFromText(text: string): SlotTemplate[] {
  const t = text.toLowerCase()
  return SLOT_RULES.filter((r) => r.re.test(t)).flatMap((r) => r.slots)
}

/**
 * The slots a scene needs (at most 8). Photos use a fixed "detected" set;
 * text is matched against keyword rules, topped up with defaults.
 */
export function suggestSlots(source: SceneSource, text: string, photo: string | null): Slot[] {
  let found: SlotTemplate[] = []
  if (source === 'photo') found = [...(photo === STUDIO_SAMPLE_PHOTO.url ? SAMPLE_PHOTO_SLOTS : PHOTO_SLOTS), ...slotsFromText(text)]
  else found = slotsFromText(text)

  const seen = new Set<string>()
  const unique = found.filter(([name]) => (seen.has(name) ? false : (seen.add(name), true)))
  // Too thin? Add defaults for categories not covered yet.
  for (const d of DEFAULT_SLOTS) {
    if (unique.length >= 4) break
    if (!unique.some(([, c]) => c === d[1])) unique.push(d)
  }
  return unique.slice(0, 8).map(fromTemplate)
}

/** Era mentioned in a brief, if any ("1968", "70s", "Raj era"…). */
export function detectEra(text: string): Era | null {
  const t = text.toLowerCase()
  if (/\by2k\b|\b200[0-5]s?\b|cyber|flip phone/.test(t)) return 'Y2K'
  if (/\b(19)?(8|9)0s\b|\b19(8|9)\ds?\b|eighties|nineties/.test(t)) return '1980s–90s'
  if (/\b(19)?70s\b|\b197\ds?\b|seventies|disco/.test(t)) return '1970s'
  if (/\b(19)?(4|5|6)0s\b|\b19(4|5|6)\ds?\b|forties|fifties|sixties|post-?war/.test(t)) return '1940s–60s'
  if (/colonial|\braj\b|british|victorian|\b18\d\d\b|\b19[0-3]\d\b/.test(t)) return 'Colonial'
  if (/modern|contemporary|present day|today/.test(t)) return 'Modern'
  return null
}

/** A short board name from the brief. */
export function boardName(source: SceneSource, text: string) {
  const clean = text.trim()
  if (source === 'script') {
    const heading = clean.split('\n')[0].replace(/^(INT|EXT|INT\/EXT)\.?\s*/i, '').replace(/\(.*?\)/g, '').trim()
    if (heading) return heading.charAt(0) + heading.slice(1).toLowerCase().replace(/\s+–\s+/g, ' · ')
  }
  if (source === 'photo' && !clean) return `Photo reference · ${formatDate(todayISO()).replace(/ \d{4}$/, '')}`
  const first = clean.split(/[.,;\n]/)[0].replace(/^(a|an|the)\s+/i, '')
  const words = first.split(/\s+/).slice(0, 6).join(' ')
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Untitled board'
}

/**
 * Props that could fill a slot, best first. `text` is how many of the slot's
 * words the prop matches (0 = only the category fits).
 */
export function candidatesFor(slot: Slot, limits: Limits): { prop: RentalProp; score: number; text: number }[] {
  const strictEra = slot.periodCorrect && limits.era
  return PROPS.filter(
    (p) =>
      p.category === slot.category &&
      inScope(vendorById(p.vendorId), limits.scope) &&
      (!strictEra || p.era === limits.era),
  )
    .map((p) => {
      const text = textScore(p, slot.hint) + textScore(p, slot.name)
      let score = textScore(p, slot.hint) * 3 + textScore(p, slot.name) * 2
      if (limits.era && p.era === limits.era) score += 3
      if (limits.from && limits.to) score += isFreeOn(p, limits.from, limits.to) ? 2 : -3
      if (vendorById(p.vendorId).verified) score += 0.5
      score += p.rating * 0.3
      return { prop: p, score, text }
    })
    .sort((a, b) => b.score - a.score)
}

type Strategy = 'best' | 'budget' | 'premium'
const STRATEGY: Record<VersionId, Strategy> = { A: 'best', B: 'budget', C: 'premium' }

/**
 * Versions A (best match), B (budget) and C (premium). `seed` varies the
 * picks, so a rebuild gives different results.
 */
export function buildVersions(slots: Slot[], limits: Limits, seed = 0): BoardVersion[] {
  /** Version A's pick per slot, so C can offer something different. */
  const bestPick: Record<string, RentalProp | undefined> = {}
  return (['A', 'B', 'C'] as VersionId[]).map((id) => {
    const used = new Set<string>()
    const items = slots.map((slot): BoardItem => {
      if (slot.haveIt) return { slotId: slot.id, propId: null }
      const fits = candidatesFor(slot, limits).filter((c) => !used.has(c.prop.id))
      if (!fits.length) return { slotId: slot.id, propId: null }
      // Props that match the slot's words beat ones that only share the category.
      const all = fits.some((c) => c.text > 0) ? fits.filter((c) => c.text > 0) : fits
      const strategy = STRATEGY[id]
      // Best match draws from the closest scores; budget and premium from a wider relevant pool.
      const pool = all.filter((c) => c.score >= all[0].score - (strategy === 'best' ? 3 : 6)).slice(0, 6)
      const ordered =
        strategy === 'best'
          ? pool
          : strategy === 'budget'
            ? [...pool].sort((a, b) => a.prop.pricePerDay - b.prop.pricePerDay)
            : [...pool].sort((a, b) => b.prop.pricePerDay * b.prop.rating - a.prop.pricePerDay * a.prop.rating)
      // A rebuild (seed) rotates through the shortlist; B and C stay near their extreme.
      let pick = ordered[seed % (strategy === 'best' ? ordered.length : Math.min(ordered.length, 2))]
      // Premium: prefer a pricier alternative to the best match, when there is one.
      const best = bestPick[slot.id]
      if (strategy === 'premium' && best && pick.prop.id === best.id) {
        pick = ordered.find((c) => c.prop.id !== best.id && c.prop.pricePerDay >= best.pricePerDay) ?? pick
      }
      if (strategy === 'best') bestPick[slot.id] = pick.prop
      used.add(pick.prop.id)
      return { slotId: slot.id, propId: pick.prop.id }
    })
    return { id, items }
  })
}

/** Shoot days covered by the limits (1 when no dates are set). */
export const limitDays = (l: Pick<Limits, 'from' | 'to'>) => (l.from && l.to ? daysInclusive(l.from, l.to) : 1)

/** Cost of a version: ₹ per day, days and total. */
export function versionCost(version: BoardVersion, limits: Limits) {
  const perDay = version.items.reduce((sum, it) => sum + (it.propId ? (propById(it.propId)?.pricePerDay ?? 0) : 0), 0)
  const days = limitDays(limits)
  return { perDay, days, total: perDay * days, count: version.items.filter((it) => it.propId).length }
}

/* ── Scene layout ────────────────────────────────────────────────────────── */

type Row = 'ceiling' | 'wall' | 'floor' | 'place'
const ROW_OF: Record<Category, Row> = {
  Lighting: 'ceiling',
  Decor: 'wall',
  Costume: 'wall',
  Furniture: 'floor',
  Plants: 'floor',
  Catering: 'floor',
  Animals: 'floor',
  Vehicles: 'floor',
  'Vanity vans': 'floor',
  Locations: 'place',
}
const ROW_Y: Record<Row, number> = { ceiling: 20, wall: 44, floor: 72, place: 0 }
const ROW_SIZE: Record<Row, number> = { ceiling: 11, wall: 11, floor: 15, place: 0 }

export interface Placement {
  x: number
  y: number
  /** Icon width, % of the scene width. */
  size: number
  /** Locations are the setting itself, shown as a label. */
  place: boolean
}

/** Where each slot sits on the scene image (% of width / height). */
export function placeItems(slots: Pick<Slot, 'id' | 'category'>[]): Record<string, Placement> {
  const rows = new Map<Row, string[]>()
  for (const s of slots) {
    const row = ROW_OF[s.category]
    rows.set(row, [...(rows.get(row) ?? []), s.id])
  }
  const out: Record<string, Placement> = {}
  for (const [row, ids] of rows) {
    ids.forEach((id, i) => {
      if (row === 'place') {
        out[id] = { x: 4, y: 6 + i * 11, size: 0, place: true }
        return
      }
      const x = 16 + ((i + 0.5) / ids.length) * 68
      const wobble = ids.length > 1 ? (i % 2 ? 4 : -3) : 0
      out[id] = { x, y: ROW_Y[row] + wobble, size: ROW_SIZE[row], place: false }
    })
  }
  return out
}

/** A slot as it appears on a version: its prop (if any) and marker number. */
export interface SceneItem {
  slot: Slot
  prop: RentalProp | null
  /** Marker number, 1-based, in slot order. */
  n: number
}

/** Slots of a version that show on the scene: sourced props and things "we already have". */
export function sceneItems(slots: Slot[], version: BoardVersion): SceneItem[] {
  return slots
    .map((slot, i) => {
      const id = version.items.find((it) => it.slotId === slot.id)?.propId
      return { slot, prop: id ? (propById(id) ?? null) : null, n: i + 1 }
    })
    .filter((x) => x.prop || x.slot.haveIt)
}

/** The category's icon, for slots without a prop. */
export const categoryIcon = (c: Category) => CATEGORY_ICON[c]
