import { BellIcon, CaretLeftIcon, CaretRightIcon, ImageIcon, MegaphoneIcon, MinusIcon, PlusIcon, SealCheckIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { ANNOUNCEMENT } from '@/data/owner'
import { CATEGORY_ICON, propById } from '@/data/props'
import { cn } from '@/lib/cn'
import { isoFromParts, monthLabel, todayISO } from '@/lib/dates'
import { useNow } from '@/lib/hooks'
import { EASE_OUT } from '@/lib/motion'
import { dueLabel, type Listing } from '@/lib/owner'
import { nav } from '@/navigation'
import { useOwner } from '@/store/owner'
import { AppBar, IconButton } from '@/ui'

/** GLOBAL header: business name + verified tick, the bell, and the announcement strip. */
export function OwnerAppBar({ titleOnScroll }: { titleOnScroll?: boolean }) {
  const name = useOwner((s) => s.business.name)
  const v = useOwner((s) => s.verification)
  const unread = useOwner((s) => s.notifications.filter((n) => !n.read).length)
  const dismissed = useOwner((s) => s.announcementDismissed)
  const dismiss = useOwner((s) => s.dismissAnnouncement)
  const verified = v.phone === 'done' && v.identity === 'done' && v.warehouse === 'done' && v.bank === 'done'

  return (
    <AppBar
      titleOnScroll={titleOnScroll}
      title={
        <span className="inline-flex max-w-full items-center gap-1.5">
          <span className="truncate">{name}</span>
          {verified && <SealCheckIcon size={17} weight="fill" aria-label="Verified" className="shrink-0 text-accent" />}
        </span>
      }
      actions={<IconButton icon={BellIcon} label="Notifications" badge={unread} onClick={() => nav.push('/renter/notifications')} />}
    >
      <AnimatePresence initial={false}>
        {!dismissed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div role="status" className="flex items-center gap-2.5 bg-warning-soft py-2 pl-4 pr-1.5 text-[13px] font-medium text-fg">
              <MegaphoneIcon size={16} weight="fill" className="shrink-0 text-warning" />
              <span className="min-w-0 flex-1 leading-snug">{ANNOUNCEMENT}</span>
              <button type="button" aria-label="Dismiss announcement" onClick={dismiss} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2">
                <XIcon size={15} weight="bold" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppBar>
  )
}

/** A listing's first photo, or its category icon on a blank tile. */
export function ListingThumb({ listing, className, iconSize = 24 }: { listing: Pick<Listing, 'photos' | 'category' | 'catalogId'>; className?: string; iconSize?: number }) {
  const photo = listing.photos.find((p) => p.startsWith('data:') || p.startsWith('/'))
  if (photo) return <img src={photo} alt="" draggable={false} className={cn('object-cover', className)} />
  const TIcon = (listing.catalogId && propById(listing.catalogId)?.icon) || CATEGORY_ICON[listing.category]
  return (
    <span className={cn('grid place-items-center bg-surface-2', className)}>
      {TIcon ? <TIcon size={iconSize} weight="light" className="text-subtle" /> : <ImageIcon size={iconSize} className="text-subtle" />}
    </span>
  )
}

/** The 24-hour clock on things waiting for you. */
export function DueTag({ due, className }: { due: number; className?: string }) {
  const now = useNow(30_000).getTime()
  const d = dueLabel(due, now)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
        d.overdue ? 'bg-danger text-white' : d.urgent ? 'bg-warning-soft text-warning' : 'bg-surface-2 text-fg-2',
        className,
      )}
    >
      {d.text}
    </span>
  )
}

export function StatTile({ value, label, hint, onClick, tone }: { value: ReactNode; label: string; hint?: string; onClick?: () => void; tone?: string }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn('min-w-0 rounded-2xl bg-surface p-3 text-left shadow-card', onClick && 'pressable outline-none focus-visible:ring-4 focus-visible:ring-accent/25')}
    >
      <p className={cn('truncate font-display text-lg font-extrabold tabular-nums text-fg', tone)}>{value}</p>
      <p className="truncate text-xs font-medium text-muted">{label}</p>
      {hint && <p className="truncate text-[11px] text-subtle">{hint}</p>}
    </Tag>
  )
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export interface DayCell {
  className?: string
  content?: ReactNode
  label?: string
  disabled?: boolean
}

/** Month calendar with a custom cell per day (diary and listing availability). */
export function MonthGrid({
  view,
  onView,
  cell,
  onDay,
}: {
  view: { year: number; month: number }
  onView: (v: { year: number; month: number }) => void
  cell: (iso: string) => DayCell
  onDay?: (iso: string) => void
}) {
  const today = todayISO()
  const first = new Date(view.year, view.month, 1).getDay()
  const days = new Date(view.year, view.month + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, i) => i - first + 1)
  const go = (dir: number) => {
    const d = new Date(view.year, view.month + dir, 1)
    onView({ year: d.getFullYear(), month: d.getMonth() })
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between pb-2">
        <IconButton icon={CaretLeftIcon} label="Previous month" size="sm" onClick={() => go(-1)} />
        <p className="font-display text-[15px] font-bold text-fg">{monthLabel(view.year, view.month)}</p>
        <IconButton icon={CaretRightIcon} label="Next month" size="sm" onClick={() => go(1)} />
      </div>
      <div className="grid grid-cols-7 pb-1 text-center text-2xs font-bold uppercase tracking-wide text-subtle">
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((n, i) => {
          if (n < 1 || n > days) return <span key={i} />
          const iso = isoFromParts(view.year, view.month, n)
          const c = cell(iso)
          return (
            <button
              key={iso}
              type="button"
              disabled={c.disabled || !onDay}
              aria-label={c.label ?? iso}
              onClick={() => onDay?.(iso)}
              className={cn(
                'relative flex aspect-square min-h-10 flex-col items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition-colors disabled:cursor-default',
                iso === today && 'ring-2 ring-accent ring-offset-1 ring-offset-surface',
                c.className ?? 'text-fg-2',
              )}
            >
              <span className="leading-none">{n}</span>
              {c.content}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** − n + control. */
export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-xl bg-surface-2 p-1" role="group" aria-label={label}>
      <IconButton icon={MinusIcon} size="sm" label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="size-8 disabled:opacity-40" />
      <span className="w-6 text-center text-sm font-bold tabular-nums text-fg" aria-live="polite">
        {value}
      </span>
      <IconButton icon={PlusIcon} size="sm" label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="size-8 disabled:opacity-40" />
    </span>
  )
}
