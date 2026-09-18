/** Month views for the calendars. */
export interface MonthView {
  year: number
  month: number
}

export const shiftMonth = (v: MonthView, dir: number): MonthView => {
  const d = new Date(v.year, v.month + dir, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export const thisMonth = (): MonthView => {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() }
}
