const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

/** 3500 → "₹3,500" (Indian digit grouping). */
export const formatINR = (amount: number) => inr.format(amount)

const trim = (n: number) => String(Number(n.toFixed(2)))

/** 450000 → "4.5 lakh", 12000000 → "1.2 crore", 25000 → "25 thousand". */
export function amountInWords(amount: number) {
  if (amount >= 1e7) return `${trim(amount / 1e7)} crore`
  if (amount >= 1e5) return `${trim(amount / 1e5)} lakh`
  if (amount >= 1e3) return `${trim(amount / 1e3)} thousand`
  return ''
}

/** 450000 → "₹4.5L", 12000000 → "₹1.2Cr" — for tight spaces. */
export function formatINRCompact(amount: number) {
  if (amount >= 1e7) return `₹${trim(amount / 1e7)}Cr`
  if (amount >= 1e5) return `₹${trim(amount / 1e5)}L`
  return formatINR(amount)
}

/* Units (Profile → Settings). The prefs store keeps these in sync. */
export type DistanceUnit = 'km' | 'mi'
export type SizeUnit = 'cm' | 'in'
let distanceUnit: DistanceUnit = 'km'
let sizeUnit: SizeUnit = 'cm'
export const setUnits = (u: { distance: DistanceUnit; size: SizeUnit }) => {
  distanceUnit = u.distance
  sizeUnit = u.size
}

/** 2.4 → "2.4 km", or "1.5 mi" when miles are chosen. */
export function formatDistance(km: number) {
  if (distanceUnit === 'mi') {
    const mi = km * 0.621371
    return `${mi < 10 ? mi.toFixed(1) : Math.round(mi).toLocaleString('en-IN')} mi`
  }
  return `${km.toLocaleString('en-IN')} km`
}

/** [180, 80, 85] cm → "180 × 80 × 85 cm" or "71 × 31 × 33 in". */
export function formatSize([w, d, h]: [number, number, number]) {
  if (sizeUnit === 'in') return `${[w, d, h].map((n) => Math.round(n / 2.54)).join(' × ')} in`
  return `${w} × ${d} × ${h} cm`
}

/** "9876543210" → "+91 98765 43210" */
export function formatPhone(digits: string | null | undefined) {
  if (!digits) return ''
  const d = digits.replace(/\D/g, '').slice(-10)
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : `+91 ${d}`
}
