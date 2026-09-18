import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { isoFromParts, monthLabel, todayISO } from '@/lib/dates'
import { Button, IconButton } from './controls'
import { shiftMonth, thisMonth, type MonthView } from './month'

export interface CalendarCell {
  className?: string
  content?: ReactNode
  label?: string
  disabled?: boolean
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Month navigation: Today · ‹ › · "September 2026". */
export function MonthNav({ view, onView, className }: { view: MonthView; onView: (v: MonthView) => void; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button size="sm" variant="secondary" onClick={() => onView(thisMonth())}>
        Today
      </Button>
      <IconButton icon={CaretLeftIcon} label="Previous month" size="sm" onClick={() => onView(shiftMonth(view, -1))} />
      <IconButton icon={CaretRightIcon} label="Next month" size="sm" onClick={() => onView(shiftMonth(view, 1))} />
      <p className="ml-1 min-w-36 font-display text-[17px] font-bold text-fg">{monthLabel(view.year, view.month)}</p>
    </div>
  )
}

/**
 * Month grid with a custom cell per day.
 * `full` is the Outlook-style diary; `compact` fits a side card.
 */
export function MonthCalendar({
  view,
  cell,
  onDay,
  selected,
  variant = 'full',
}: {
  view: MonthView
  cell: (iso: string) => CalendarCell
  onDay?: (iso: string) => void
  selected?: string | null
  variant?: 'full' | 'compact'
}) {
  const today = todayISO()
  const first = new Date(view.year, view.month, 1).getDay()
  const days = new Date(view.year, view.month + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, i) => i - first + 1)
  const full = variant === 'full'

  return (
    <div className={cn('select-none', full && 'overflow-hidden rounded-xl border border-line bg-surface')}>
      <div className={cn('grid grid-cols-7 text-center font-semibold uppercase tracking-wide text-subtle', full ? 'border-b border-line bg-surface-2/60 py-2 text-[11px]' : 'pb-1.5 text-[10px]')}>
        {WEEKDAYS.map((d) => (
          <span key={d}>{full ? d : d.slice(0, 2)}</span>
        ))}
      </div>
      <div className={cn('grid grid-cols-7', full ? '' : 'gap-1')}>
        {cells.map((n, i) => {
          const edge = full ? cn('border-line', i % 7 !== 6 && 'border-r', i < cells.length - 7 && 'border-b') : ''
          if (n < 1 || n > days) return <span key={i} className={cn(edge, full && 'bg-surface-2/40')} />
          const iso = isoFromParts(view.year, view.month, n)
          const c = cell(iso)
          const isToday = iso === today
          const isSel = selected === iso
          return (
            <button
              key={iso}
              type="button"
              disabled={c.disabled || !onDay}
              aria-label={c.label ?? iso}
              aria-pressed={onDay ? isSel : undefined}
              onClick={() => onDay?.(iso)}
              className={cn(
                'relative min-w-0 text-left transition-colors disabled:cursor-default',
                full
                  ? cn('flex min-h-[64px] flex-col gap-1 p-1.5 outline-none sm:min-h-[104px] sm:p-2', edge, isSel ? 'bg-accent-soft/70' : 'hover:bg-surface-2/70', 'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent')
                  : cn('flex aspect-square flex-col items-center justify-center rounded-lg text-[13px] font-semibold tabular-nums', isToday && 'ring-2 ring-accent ring-offset-1 ring-offset-surface', isSel && 'outline-2 outline-accent'),
                c.className,
              )}
            >
              {full ? (
                <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums', isToday ? 'bg-accent text-accent-fg' : 'text-fg-2')}>{n}</span>
              ) : (
                <span className="leading-none">{n}</span>
              )}
              {c.content}
            </button>
          )
        })}
      </div>
    </div>
  )
}
