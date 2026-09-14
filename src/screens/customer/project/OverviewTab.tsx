import {
  ArrowUUpLeftIcon,
  CalendarBlankIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  CurrencyInrIcon,
  KanbanIcon,
  LockSimpleIcon,
  PackageIcon,
  ShoppingCartIcon,
  WarningCircleIcon,
  type Icon,
} from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { daysInclusive, formatDate, formatDateRange, fromISODate, todayISO } from '@/lib/dates'
import { formatINR, formatINRCompact } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { EASE_OUT } from '@/lib/motion'
import { budgetUse, locationName, shootDays, whatsNext, type NextKind } from '@/lib/ops'
import type { Tone } from '@/lib/tones'
import { nav } from '@/navigation'
import { useProjectOps } from '@/store/projectOps'
import { projectStatus, type Project } from '@/store/projects'
import { Card, IconTile, SectionHeader, Tag } from '@/ui'

const NEXT_ICON: Record<NextKind, { icon: Icon; tone: Tone }> = {
  conflict: { icon: WarningCircleIcon, tone: 'danger' },
  hold: { icon: ClockCountdownIcon, tone: 'warning' },
  reserve: { icon: LockSimpleIcon, tone: 'info' },
  book: { icon: ShoppingCartIcon, tone: 'brand' },
  check: { icon: CheckCircleIcon, tone: 'warning' },
  delivery: { icon: PackageIcon, tone: 'brand' },
  return: { icon: ArrowUUpLeftIcon, tone: 'neutral' },
  pay: { icon: CurrencyInrIcon, tone: 'warning' },
  board: { icon: KanbanIcon, tone: 'brand' },
}

/** "Starts in 5 days" / "Day 2 of 4" / "Wrapped on 24 Sept 2026" */
function timingLine(p: Project) {
  const today = todayISO()
  if (p.wrapped || today > p.endDate) return `Wrapped on ${formatDate(p.endDate)}`
  if (today < p.startDate) {
    const days = daysInclusive(today, p.startDate) - 1
    return days === 1 ? 'Starts tomorrow' : `Starts in ${days} days`
  }
  return `Day ${daysInclusive(p.startDate, today)} of ${daysInclusive(p.startDate, p.endDate)}`
}

/** OVERVIEW → Dates · What's next · Budget bar */
export function OverviewTab({ project, onTab }: { project: Project; onTab: (tab: string) => void }) {
  const now = useNow(60_000).getTime()
  const allBoards = useProjectOps((s) => s.boards)
  const allBookings = useProjectOps((s) => s.bookings)
  const allRuns = useProjectOps((s) => s.runs)
  const boards = useMemo(() => allBoards.filter((b) => b.projectId === project.id), [allBoards, project.id])
  const bookings = useMemo(() => allBookings.filter((b) => b.projectId === project.id), [allBookings, project.id])
  const runs = useMemo(() => allRuns.filter((r) => r.projectId === project.id), [allRuns, project.id])
  const steps = useMemo(
    () => whatsNext(project.id, boards, bookings, runs, (id) => locationName(project, id), now),
    [project, boards, bookings, runs, now],
  )
  const use = budgetUse(boards, bookings, now)
  const [showAll, setShowAll] = useState(false)
  const status = projectStatus(project)
  const days = shootDays(project)
  const today = todayISO()

  const open = (to: string) => {
    const tab = to.split('?tab=')[1]
    if (tab && to.startsWith(`/customer/projects/${project.id}?`)) onTab(tab)
    else nav.push(to)
  }

  return (
    <div className="pb-8 @medium:mx-auto @medium:max-w-2xl">
      {/* Dates */}
      <Card className="mx-4 mt-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <Tag tone={status.tone} dot>
            {status.label}
          </Tag>
          <span className="text-sm font-semibold text-fg">{timingLine(project)}</span>
        </div>
        <p className="mt-2.5 flex items-center gap-1.5 text-[15px] font-semibold text-fg">
          <CalendarBlankIcon size={18} className="shrink-0 text-muted" />
          {formatDateRange(project.startDate, project.endDate)}
        </p>
        <p className="mt-0.5 pl-6 text-[13px] text-muted">
          {days.length} shoot day{days.length === 1 ? '' : 's'} · {project.locations.length} location{project.locations.length === 1 ? '' : 's'}
        </p>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {days.map((d, i) => {
            const loc = project.locations.find((l) => l.date === d)
            return (
              <button
                key={d}
                type="button"
                onClick={() => onTab('schedule')}
                className={cn(
                  'pressable flex w-[72px] shrink-0 flex-col items-center rounded-2xl border px-2 py-2 text-center',
                  d === today ? 'border-accent bg-accent-soft' : 'border-line bg-surface-2/60',
                )}
              >
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Day {i + 1}</span>
                <span className="font-display text-lg font-bold leading-tight text-fg">{fromISODate(d).getDate()}</span>
                <span className={cn('mt-0.5 size-1.5 rounded-full', loc ? 'bg-accent' : 'bg-line-strong')} />
              </button>
            )
          })}
        </div>
      </Card>

      {/* What's next */}
      <SectionHeader title="What’s next" subtitle={steps.length ? `${steps.length} thing${steps.length === 1 ? '' : 's'} to do` : 'You’re all set'} className="pt-6" />
      {steps.length === 0 ? (
        <Card className="mx-4 flex items-center gap-3 p-4">
          <IconTile icon={CheckCircleIcon} tone="success" />
          <p className="text-sm text-fg-2">Nothing needs you right now. Deliveries and returns will show up here.</p>
        </Card>
      ) : (
        <Card className="mx-4 overflow-hidden">
          {(showAll ? steps : steps.slice(0, 5)).map((s, i) => {
            const meta = NEXT_ICON[s.kind]
            return (
              <motion.button
                key={s.id}
                type="button"
                onClick={() => open(s.to)}
                className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.04 }}
              >
                <IconTile icon={meta.icon} tone={meta.tone} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-fg">{s.title}</span>
                  <span className="block truncate text-[13px] text-muted">{s.detail}</span>
                </span>
                <CaretRightIcon size={15} weight="bold" className="shrink-0 text-subtle" />
                <span aria-hidden className="absolute bottom-0 left-[66px] right-0 h-px bg-line group-last:hidden" />
              </motion.button>
            )
          })}
          {steps.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full border-t border-line py-2.5 text-sm font-semibold text-accent active:bg-surface-2"
            >
              {showAll ? 'Show less' : `Show all ${steps.length}`}
            </button>
          )}
        </Card>
      )}

      {/* Budget bar */}
      <SectionHeader title="Budget" subtitle="Booked, reserved and planned props" className="pt-6" />
      <BudgetCard budget={project.budget} {...use} onMoney={() => onTab('money')} />
    </div>
  )
}

function BudgetCard({ budget, booked, reserved, planned, onMoney }: { budget: number; booked: number; reserved: number; planned: number; onMoney: () => void }) {
  const used = booked + reserved + planned
  const over = used - budget
  const pct = (n: number) => `${Math.min(100, (n / Math.max(budget, used)) * 100)}%`
  const rows = [
    { label: 'Booked', value: booked, className: 'bg-accent' },
    { label: 'Reserved', value: reserved, className: 'bg-accent/55' },
    { label: 'Planned', value: planned, className: 'bg-accent/25' },
  ]
  return (
    <Card onClick={onMoney} className="mx-4 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-2xl font-extrabold tabular-nums text-fg">
          {formatINRCompact(used)} <span className="text-sm font-semibold text-muted">of {formatINRCompact(budget)}</span>
        </p>
        <p className={cn('text-[13px] font-semibold', over > 0 ? 'text-danger' : 'text-success')}>
          {over > 0 ? `${formatINR(over)} over` : `${formatINR(-over)} left`}
        </p>
      </div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`Booked ${formatINR(booked)}, reserved ${formatINR(reserved)}, planned ${formatINR(planned)}`}>
        {rows.map((r) => (
          <motion.span
            key={r.label}
            className={cn('h-full', r.className)}
            initial={{ width: 0 }}
            animate={{ width: pct(r.value) }}
            transition={{ duration: 0.8, ease: EASE_OUT }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {rows.map((r) => (
          <div key={r.label}>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <span className={cn('size-2 rounded-full', r.className)} />
              {r.label}
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-fg">{formatINRCompact(r.value)}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
