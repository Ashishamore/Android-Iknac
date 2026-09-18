import { CATEGORIES, ERAS, PROPS, type Category, type Vendor } from '@/data/props'
import { VENDOR_REVIEW_POOL } from '@/data/vendors'

const hashOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** A vendor's catalogue plus stable mock stats for the profile screen. */
export function vendorFacts(v: Vendor) {
  const props = PROPS.filter((p) => p.vendorId === v.id).sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
  const h = hashOf(v.id)
  const categories = CATEGORIES.map((c) => c.id).filter((c) => props.some((p) => p.category === c)) as Category[]
  const eras = ERAS.map((e) => e.id).filter((e) => props.some((p) => p.era === e))
  const start = h % VENDOR_REVIEW_POOL.length
  return {
    props,
    categories,
    eras,
    ratings: props.reduce((n, p) => n + p.reviews, 0),
    replyMins: [10, 15, 20, 30][h % 4],
    onTime: 94 + (h % 6),
    since: 2014 + (h % 8),
    reviews: [0, 1, 2].map((i) => VENDOR_REVIEW_POOL[(start + i) % VENDOR_REVIEW_POOL.length]),
  }
}
