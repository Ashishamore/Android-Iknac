import { ArrowRightIcon, CalendarBlankIcon, KanbanIcon, ReceiptIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useMemo, useState, type ReactNode } from 'react'
import { InvoiceSheet } from '@/components/ops/InvoiceSheet'
import { RunRow } from '@/components/ops/RunRow'
import { propById } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatDayShort } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { EASE_OUT } from '@/lib/motion'
import { bookingStatus, byVendor, type Booking } from '@/lib/ops'
import { nav } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { useProjectOps } from '@/store/projectOps'
import { useProjects } from '@/store/projects'
import { AppBar, AvatarStack, Button, Card, Chip, ChipRow, EmptyState, IconTile, Screen, Tag } from '@/ui'

type Filter = 'all' | 'upcoming' | 'active' | 'completed'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
]
const GROUP_RANK = { active: 0, upcoming: 1, completed: 2 }
const PAY_LABEL = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', po: 'Company PO' } as const

const bookingTotal = (b: Booking) => b.amounts.total + b.extras.reduce((n, e) => n + e.amount, 0)
const bookingPaid = (b: Booking) => b.paid + b.extras.filter((e) => e.paid).reduce((n, e) => n + e.amount, 0)

/** All bookings across projects, with runs, invoice and board. */
export default function BookingsScreen() {
  const bookings = useProjectOps((s) => s.bookings)
  const runs = useProjectOps((s) => s.runs)
  const boards = useProjectOps((s) => s.boards)
  const projects = useProjects((s) => s.projects)
  const [filter, setFilter] = useState<Filter>('all')
  const [sheet, setSheet] = useState<{ key: number; open: boolean; id: string | null }>({ key: 0, open: false, id: null })
  const [invoice, setInvoice] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })

  const rows = useMemo(
    () =>
      bookings
        .map((b) => ({ booking: b, status: bookingStatus(b, runs) }))
        .sort((a, b) => GROUP_RANK[a.status.group] - GROUP_RANK[b.status.group] || (a.status.group === 'completed' ? b.booking.deliveryDate.localeCompare(a.booking.deliveryDate) : a.booking.deliveryDate.localeCompare(b.booking.deliveryDate))),
    [bookings, runs],
  )
  const count = (f: Filter) => (f === 'all' ? rows.length : rows.filter((r) => r.status.group === f).length)
  const shown = filter === 'all' ? rows : rows.filter((r) => r.status.group === filter)

  const linesOf = (b: Booking) => (boards.find((x) => x.id === b.boardId)?.lines ?? []).filter((l) => b.lineIds.includes(l.id))
  const projectOf = (b: Booking) => projects.find((p) => p.id === b.projectId)
  const current = bookings.find((b) => b.id === sheet.id) ?? null
  const invoiceBooking = bookings.find((b) => b.id === invoice.id) ?? null

  return (
    <Screen
      resetScrollOn={filter}
      header={
        <AppBar title="All bookings" subtitle={`${bookings.length} booking${bookings.length === 1 ? '' : 's'} across ${new Set(bookings.map((b) => b.projectId)).size} projects`}>
          <ChipRow className="pb-3">
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
          icon={ReceiptIcon}
          title={filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
          description="Book the items on a project board and they show up here with deliveries and invoices."
          action={filter === 'all' ? <Button onClick={() => nav.switchTab('projects')}>Go to projects</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 px-4 pb-8 pt-4 @medium:mx-auto @medium:max-w-2xl">
          {shown.map(({ booking: b, status }, i) => {
            const lines = linesOf(b)
            const board = boards.find((x) => x.id === b.boardId)
            const vendors = byVendor(lines).map((g) => g.vendor.name)
            const total = bookingTotal(b)
            const paid = bookingPaid(b)
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT, delay: Math.min(i, 6) * 0.04 }}
              >
                <Card onClick={() => setSheet((s) => ({ key: s.key + 1, open: true, id: b.id }))} className="p-3.5">
                  <div className="flex items-start gap-3">
                    <IconTile icon={ReceiptIcon} tone={status.group === 'completed' ? 'neutral' : 'brand'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold text-fg">{projectOf(b)?.name ?? 'Project'}</span>
                        <Tag tone={status.tone} dot className="ml-auto shrink-0">
                          {status.label}
                        </Tag>
                      </p>
                      <p className="truncate text-[13px] text-muted">
                        {b.id} · {board?.name ?? 'Board'} · {b.lineIds.length} item{b.lineIds.length === 1 ? '' : 's'}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-fg-2">
                        <CalendarBlankIcon size={14} className="shrink-0 text-subtle" />
                        {formatDayShort(b.deliveryDate)}
                        <ArrowRightIcon size={12} className="text-subtle" />
                        {formatDayShort(b.returnDate)}
                      </p>
                    </div>
                  </div>
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

      <BookingSheet
        key={sheet.key}
        open={sheet.open}
        booking={current}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onInvoice={() => {
          setSheet((s) => ({ ...s, open: false }))
          setInvoice({ open: true, id: sheet.id })
        }}
      />
      <InvoiceSheet
        open={invoice.open}
        onClose={() => setInvoice((s) => ({ ...s, open: false }))}
        booking={invoiceBooking}
        lines={invoiceBooking ? linesOf(invoiceBooking) : []}
        projectName={invoiceBooking ? (projectOf(invoiceBooking)?.name ?? '') : ''}
      />
    </Screen>
  )
}

function BookingSheet({ open, booking, onClose, onInvoice }: { open: boolean; booking: Booking | null; onClose: () => void; onInvoice: () => void }) {
  const runs = useProjectOps((s) => s.runs)
  const board = useProjectOps((s) => s.boards.find((b) => b.id === booking?.boardId))
  const project = useProjects((s) => s.projects.find((p) => p.id === booking?.projectId))
  if (!booking || !project) return <BottomSheet open={false} onClose={onClose} />

  const status = bookingStatus(booking, runs)
  const mine = runs.filter((r) => r.bookingId === booking.id)
  const lines = (board?.lines ?? []).filter((l) => booking.lineIds.includes(l.id))
  const total = bookingTotal(booking)
  const paid = bookingPaid(booking)
  const go = (path: string) => {
    onClose()
    nav.push(path)
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Booking ${booking.id}`}
      description={`${project.name} · ${board?.name ?? 'Board'}`}
      footer={
        <div className="flex gap-2.5">
          <Button size="lg" variant="secondary" icon={ReceiptIcon} className="flex-1" onClick={onInvoice}>
            Invoice
          </Button>
          <Button size="lg" icon={KanbanIcon} className="flex-1" onClick={() => go(`/customer/projects/${project.id}/boards/${booking.boardId}`)}>
            Open board
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-3 text-center">
        <Stat label="Status">
          <Tag tone={status.tone} dot>
            {status.label}
          </Tag>
        </Stat>
        <Stat label="Delivery">{formatDayShort(booking.deliveryDate)}</Stat>
        <Stat label="Return">{formatDayShort(booking.returnDate)}</Stat>
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-[0.07em] text-muted">Items</p>
      <ul className="mt-2 space-y-3">
        {byVendor(lines).map(({ vendor, items }) => (
          <li key={vendor.id}>
            <p className="text-[13px] font-semibold text-fg-2">{vendor.name}</p>
            <ul className="mt-1 space-y-0.5">
              {items.map((l) => (
                <li key={l.id} className="flex justify-between gap-3 text-sm text-fg">
                  <span className="truncate">
                    {propById(l.propId)?.name}
                    {l.qty > 1 && <span className="text-muted"> × {l.qty}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {mine.length > 0 && (
        <>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.07em] text-muted">Deliveries & returns</p>
          <div className="mt-2 overflow-hidden rounded-2xl border border-line">
            {mine.map((r) => (
              <RunRow key={r.id} run={r} project={project} showDate onClick={() => go(`/customer/projects/${project.id}/runs/${r.id}`)} />
            ))}
          </div>
        </>
      )}

      <dl className="mt-4 divide-y divide-line rounded-2xl border border-line px-3.5">
        <Row label="Total" value={formatINR(total)} strong />
        <Row label="Paid" value={formatINR(paid)} tone={paid >= total ? 'text-success' : undefined} />
        {paid < total && <Row label="Due" value={formatINR(total - paid)} tone="text-warning" />}
        <Row label="Deposit (refundable)" value={`${formatINR(booking.amounts.deposit)} · ${status.group === 'completed' ? 'refunded' : 'held'}`} />
        <Row label="Paid by" value={PAY_LABEL[booking.payment.method]} />
      </dl>
    </BottomSheet>
  )
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <span className="truncate text-[13px] font-semibold text-fg">{children}</span>
    </div>
  )
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-sm text-fg-2">{label}</dt>
      <dd className={cn('text-right text-sm tabular-nums', strong ? 'font-bold text-fg' : 'font-semibold text-fg', tone)}>{value}</dd>
    </div>
  )
}
