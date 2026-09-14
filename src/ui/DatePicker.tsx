import { CalendarBlankIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { formatDate, formatDateLong, fromISODate, isoFromParts, monthLabel, toISODate, todayISO } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { BottomSheet } from '@/overlays/BottomSheet'
import { IconButton } from './Button'
import { FieldMessage } from './Form'
import { FadeSwitch } from './Selection'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface CalendarProps {
  /** Selected date, "YYYY-MM-DD". */
  value: string | null
  onSelect: (iso: string) => void
  /** Earliest / latest selectable dates (inclusive). */
  min?: string | null
  max?: string | null
}

/** Month calendar. Dates outside min/max are shown but can't be picked. */
export function Calendar({ value, onSelect, min, max }: CalendarProps) {
  const start = fromISODate(value ?? (min && min > todayISO() ? min : todayISO()))
  const [view, setView] = useState({ year: start.getFullYear(), month: start.getMonth(), dir: 0 })
  const today = todayISO()

  const firstWeekday = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  // Always 6 rows so the sheet doesn't change height between months.
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstWeekday + 1
    return day >= 1 && day <= daysInMonth ? day : null
  })

  const lastOfPrev = toISODate(new Date(view.year, view.month, 0))
  const firstOfNext = toISODate(new Date(view.year, view.month + 1, 1))
  const canPrev = !min || lastOfPrev >= min
  const canNext = !max || firstOfNext <= max

  const go = (dir: number) => {
    const d = new Date(view.year, view.month + dir, 1)
    setView({ year: d.getFullYear(), month: d.getMonth(), dir })
  }

  const key = `${view.year}-${view.month}`
  return (
    <div className="select-none">
      <div className="flex items-center justify-between pb-2">
        <IconButton
          icon={CaretLeftIcon}
          label="Previous month"
          size="sm"
          disabled={!canPrev}
          onClick={() => go(-1)}
          className="disabled:pointer-events-none disabled:opacity-30"
        />
        <FadeSwitch id={key} dir={view.dir}>
          <p className="font-display text-base font-bold text-fg">{monthLabel(view.year, view.month)}</p>
        </FadeSwitch>
        <IconButton
          icon={CaretRightIcon}
          label="Next month"
          size="sm"
          disabled={!canNext}
          onClick={() => go(1)}
          className="disabled:pointer-events-none disabled:opacity-30"
        />
      </div>
      <div className="grid grid-cols-7 pb-1 text-center text-2xs font-bold uppercase tracking-wide text-subtle">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <FadeSwitch id={key} dir={view.dir}>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (day === null) return <span key={i} className="h-10" />
            const iso = isoFromParts(view.year, view.month, day)
            const disabled = (!!min && iso < min) || (!!max && iso > max)
            const selected = iso === value
            const isToday = iso === today
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={formatDateLong(iso)}
                onClick={() => {
                  haptic()
                  onSelect(iso)
                }}
                className={cn(
                  'mx-auto grid size-10 place-items-center rounded-full text-sm tabular-nums transition-colors duration-150',
                  selected
                    ? 'bg-accent font-bold text-accent-fg shadow-card'
                    : isToday
                      ? 'font-bold text-accent ring-1 ring-inset ring-accent/50'
                      : 'font-medium text-fg hover:bg-surface-2 active:bg-surface-3',
                  disabled && 'pointer-events-none text-subtle/45 ring-0',
                )}
              >
                {day}
              </button>
            )
          })}
        </div>
      </FadeSwitch>
    </div>
  )
}

interface DateFieldProps {
  label: string
  value: string | null
  onChange: (iso: string) => void
  min?: string | null
  max?: string | null
  error?: string
  hint?: string
  disabled?: boolean
  /** long: "Fri, 18 Sept 2026" · short: "18 Sept 2026" (for side-by-side fields). */
  format?: 'long' | 'short'
  sheetTitle?: string
  className?: string
}

/** Looks like a text field; opens a calendar sheet. */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  error,
  hint,
  disabled,
  format = 'long',
  sheetTitle,
  className,
}: DateFieldProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'relative flex h-14 w-full items-center rounded-2xl border bg-surface pl-11 pr-3 text-left transition-colors duration-200 disabled:opacity-50',
          error ? 'border-danger' : open ? 'border-accent' : 'border-line-strong',
        )}
      >
        <CalendarBlankIcon
          size={20}
          className={cn('absolute left-3.5 top-1/2 -translate-y-1/2', value ? 'text-accent' : 'text-muted')}
        />
        <span
          className={cn(
            'pointer-events-none absolute left-11 top-4 origin-left truncate text-base text-muted transition-transform duration-200 ease-out-quint',
            value && '-translate-y-2.5 scale-75',
          )}
        >
          {label}
        </span>
        {value && (
          <span className="truncate pt-4 text-base text-fg">{format === 'long' ? formatDateLong(value) : formatDate(value)}</span>
        )}
      </button>
      <FieldMessage error={error} hint={hint} />
      <BottomSheet open={open} onClose={() => setOpen(false)} title={sheetTitle ?? label}>
        <Calendar
          value={value}
          min={min}
          max={max}
          onSelect={(iso) => {
            onChange(iso)
            setOpen(false)
          }}
        />
      </BottomSheet>
    </div>
  )
}
