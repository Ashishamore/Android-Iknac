/**
 * Calendar dates are stored as "YYYY-MM-DD" strings (local time, no timezone
 * surprises) and compared as strings.
 */

const pad = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const isoFromParts = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`

export function fromISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toISODate(new Date())

export function addDays(iso: string, days: number) {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Number of calendar days from a to b, counting both ends. */
export const daysInclusive = (a: string, b: string) =>
  Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86_400_000) + 1

const fmt = (iso: string, options: Intl.DateTimeFormatOptions) => fromISODate(iso).toLocaleDateString('en-IN', options)

/** "18 Sept 2026" */
export const formatDate = (iso: string) => fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' })

/** "Fri, 18 Sept 2026" */
export const formatDateLong = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

/** "Fri, 18 Sept" */
export const formatDayShort = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' })

/** "SEPT" */
export const monthShort = (iso: string) => fmt(iso, { month: 'short' }).toUpperCase()

/** "September 2026" */
export const monthLabel = (year: number, month: number) =>
  new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

/** "18–24 Sept 2026", "28 Sept – 3 Oct 2026", "28 Dec 2026 – 2 Jan 2027" */
export function formatDateRange(start: string, end: string) {
  const a = fromISODate(start)
  const b = fromISODate(end)
  if (start === end) return formatDate(start)
  const sameYear = a.getFullYear() === b.getFullYear()
  if (sameYear && a.getMonth() === b.getMonth()) return `${a.getDate()}–${formatDate(end)}`
  if (sameYear) return `${fmt(start, { day: 'numeric', month: 'short' })} – ${formatDate(end)}`
  return `${formatDate(start)} – ${formatDate(end)}`
}

/** "Just now", "5 min ago", "3h ago", "Yesterday", "4 days ago", then a date. */
export function timeAgo(timestamp: number, now = Date.now()) {
  const min = Math.floor((now - timestamp) / 60_000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  return formatDate(toISODate(new Date(timestamp)))
}

/** formatDateRange without the year when both dates are this year: "18–24 Sept". */
export function formatDateRangeShort(start: string, end: string) {
  const year = String(new Date().getFullYear())
  const full = formatDateRange(start, end)
  return start.startsWith(year) && end.startsWith(year) ? full.replace(` ${year}`, '') : full
}
