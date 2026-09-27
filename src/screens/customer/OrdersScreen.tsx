import { ArrowRightIcon, CalendarBlankIcon, FilmSlateIcon, ShoppingBagIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { formatDayShort } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { EASE_OUT } from '@/lib/motion'
import { ORDER_STEPS, bookingLines, bookingSource, bookingStatus, byVendor, orderProgress, orderTodos } from '@/lib/ops'
import { nav } from '@/navigation'
import { useProjectOps } from '@/store/projectOps'
import { useProjects } from '@/store/projects'
import { AppBar, AvatarStack, Button, Card, Chip, ChipRow, EmptyState, IconTile, Screen, Tabs, Tag } from '@/ui'

type Kind = 'all' | 'direct' | 'projects'
type Filter = 'all' | 'upcoming' | 'active' | 'completed'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
]
const GROUP_RANK = { active: 0, upcoming: 1, completed: 2 }
const PAY_LABEL = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', po: 'Company PO' } as const

/**
 * My orders: everything you've rented. Direct orders (cart / Rent now, no project)
 * and bookings made from project boards. Each opens its tracking screen, /customer/orders/:id.
 */
export default function OrdersScreen() {
  const bookings = useProjectOps((s) => s.bookings)
  const runs = useProjectOps((s) => s.runs)
  const boards = useProjectOps((s) => s.boards)
  const projects = useProjects((s) => s.projects)
  const [kind, setKind] = useState<Kind>('all')
  const [filter, setFilter] = useState<Filter>('all')

  const rows = useMemo(
    () =>
      bookings
        .map((b) => ({ booking: b, status: bookingStatus(b, runs) }))
        .sort(
          (a, b) =>
            GROUP_RANK[a.status.group] - GROUP_RANK[b.status.group] ||
            (a.status.group === 'completed' ? b.booking.deliveryDate.localeCompare(a.booking.deliveryDate) : a.booking.deliveryDate.localeCompare(b.booking.deliveryDate)),
        ),
    [bookings, runs],
  )
  const direct = rows.filter((r) => !r.booking.projectId).length
  const ofKind = kind === 'all' ? rows : rows.filter((r) => (kind === 'direct') === !r.booking.projectId)
  const count = (f: Filter) => (f === 'all' ? ofKind.length : ofKind.filter((r) => r.status.group === f).length)
  const shown = filter === 'all' ? ofKind : ofKind.filter((r) => r.status.group === filter)

  return (
    <Screen
      resetScrollOn={`${kind}-${filter}`}
      header={
        <AppBar title="My orders" subtitle={`${direct} direct · ${rows.length - direct} from projects`}>
          <Tabs
            tabs={[
              { value: 'all', label: 'All', count: rows.length },
              { value: 'direct', label: 'Direct', count: direct },
              { value: 'projects', label: 'Projects', count: rows.length - direct },
            ]}
            value={kind}
            onChange={setKind}
          />
          <ChipRow className="pb-3 pt-2.5">
            {FILTERS.map((f) => (
              <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label} · {count(f.id)}
              </Chip>
            ))}
          </ChipRow>
        </AppBar>
      }
    >
      {shown.length === 0 ? (
        <EmptyState
          icon={kind === 'projects' ? FilmSlateIcon : ShoppingBagIcon}
          title={filter === 'all' ? (kind === 'projects' ? 'No project bookings yet' : 'No orders yet') : `No ${filter} orders`}
          description={
            kind === 'projects'
              ? 'Book the items on a project board and they show up here with deliveries and invoices.'
              : 'Tap Rent now on any prop, or check out your cart. No project needed.'
          }
          action={
            filter === 'all' ? (
              kind === 'projects' ? (
                <Button onClick={() => nav.switchTab('projects')}>Go to projects</Button>
              ) : (
                <Button onClick={() => nav.switchTab('discover')}>Browse props</Button>
              )
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 px-4 pb-8 pt-4 @medium:mx-auto @medium:max-w-2xl">
          {shown.map(({ booking: b, status }, i) => {
            const lines = bookingLines(b, boards)
            const board = boards.find((x) => x.id === b.boardId)
            const vendors = byVendor(lines).map((g) => g.vendor.name)
            const total = b.amounts.total + b.extras.reduce((n, e) => n + e.amount, 0)
            const paid = b.paid + b.extras.filter((e) => e.paid).reduce((n, e) => n + e.amount, 0)
            const isDirect = !b.projectId
            const { step } = orderProgress(b, runs)
            const todo = orderTodos(b, runs)[0]
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT, delay: Math.min(i, 6) * 0.04 }}
              >
                <Card onClick={() => nav.push(`/customer/orders/${b.id}`)} className="p-3.5">
                  <div className="flex items-start gap-3">
                    <IconTile icon={isDirect ? ShoppingBagIcon : FilmSlateIcon} tone={status.group === 'completed' ? 'neutral' : isDirect ? 'info' : 'brand'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold text-fg">{bookingSource(b, projects)}</span>
                        <Tag tone={status.tone} dot className="ml-auto shrink-0">
                          {status.label}
                        </Tag>
                      </p>
                      <p className="truncate text-[13px] text-muted">
                        {b.id} · {isDirect ? (b.place?.name ?? 'Delivery') : (board?.name ?? 'Board')} · {b.lineIds.length} item{b.lineIds.length === 1 ? '' : 's'}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-fg-2">
                        <CalendarBlankIcon size={14} className="shrink-0 text-subtle" />
                        {formatDayShort(b.deliveryDate)}
                        <ArrowRightIcon size={12} className="text-subtle" />
                        {formatDayShort(b.returnDate)}
                      </p>
                    </div>
                  </div>
                  {/* Tracking at a glance */}
                  {status.group !== 'completed' && (
                    <div className="mt-3">
                      <div className="flex gap-1" aria-hidden>
                        {ORDER_STEPS.map((s, k) => (
                          <span key={s} className={cn('h-1 flex-1 rounded-full', k <= step ? 'bg-success' : 'bg-surface-3')} />
                        ))}
                      </div>
                      <p className={cn('mt-1.5 truncate text-xs font-semibold', todo ? 'text-warning' : 'text-fg-2')}>
                        {todo ? todo.title : ORDER_STEPS[step]}
                        <span className="font-medium text-muted"> · tap to track</span>
                      </p>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2 border-t border-line pt-2.5">
                    <AvatarStack names={vendors} />
                    <span className="min-w-0 flex-1 truncate text-xs text-muted">{vendors.join(', ')}</span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold tabular-nums text-fg">{formatINR(total)}</span>
                      <span className={cn('block text-[11px] font-semibold', paid >= total ? 'text-success' : 'text-warning')}>
                        {paid >= total ? `Paid · ${PAY_LABEL[b.payment.method]}` : `${formatINR(total - paid)} due`}
                      </span>
                    </span>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </Screen>
  )
}
