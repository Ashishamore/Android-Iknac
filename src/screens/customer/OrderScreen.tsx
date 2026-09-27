import {
  ArrowClockwiseIcon,
  CameraIcon,
  CaretRightIcon,
  CheckIcon,
  FilmSlateIcon,
  KanbanIcon,
  LifebuoyIcon,
  MapPinIcon,
  NavigationArrowIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  WalletIcon,
} from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { InvoiceSheet } from '@/components/ops/InvoiceSheet'
import { RunRow } from '@/components/ops/RunRow'
import { PropThumb } from '@/components/PropCard'
import { STAGES } from '@/data/ops'
import { propById } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatDateRangeShort, formatDayShort, todayISO, toISODate } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useNow } from '@/lib/hooks'
import { EASE_OUT } from '@/lib/motion'
import {
  ORDER_STEPS,
  bookingLines,
  bookingPlaces,
  bookingSource,
  bookingStatus,
  byVendor,
  lineCost,
  liveRuns,
  orderProgress,
  orderTodos,
  runPath,
  type Booking,
  type Run,
} from '@/lib/ops'
import { nav, useParams } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { nextRentDates, useCart } from '@/store/cart'
import { useProjectOps } from '@/store/projectOps'
import { useProjects } from '@/store/projects'
import { AppBar, Button, Card, EmptyState, Screen, SectionHeader, Tag } from '@/ui'

const PAY_LABEL = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', po: 'Company PO' } as const

/**
 * ORDER · track everything you rented in one place: where the order is, what needs
 * you, each vendor's delivery and return (tap for live tracking), items and money.
 * Direct orders (no project) and project bookings both open here.
 */
export default function OrderScreen() {
  const { id } = useParams<{ id: string }>()
  const booking = useProjectOps((s) => s.bookings.find((b) => b.id === id))
  if (!booking) {
    return (
      <Screen header={<AppBar title="Order" />}>
        <EmptyState icon={ShoppingBagIcon} title="Order not found" action={<Button onClick={() => nav.pop()}>Go back</Button>} />
      </Screen>
    )
  }
  return <Order booking={booking} />
}

function Order({ booking }: { booking: Booking }) {
  const popup = usePopup()
  const allRuns = useProjectOps((s) => s.runs)
  const boards = useProjectOps((s) => s.boards)
  const projects = useProjects((s) => s.projects)
  const addMany = useCart((s) => s.addMany)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  useNow(60_000) // keep "today" and the headline fresh

  const direct = !booking.projectId
  const runs = allRuns.filter((r) => r.bookingId === booking.id)
  const deliveries = runs.filter((r) => r.kind === 'delivery')
  const returns = runs.filter((r) => r.kind === 'return')
  const status = bookingStatus(booking, allRuns)
  const { step, times } = orderProgress(booking, allRuns)
  const todos = orderTodos(booking, allRuns)
  const next = liveRuns(runs)[0]
  const lines = bookingLines(booking, boards)
  const places = bookingPlaces(booking, projects)
  const place = places.find((p) => p.id === booking.deliverTo) ?? booking.place ?? null
  const board = boards.find((b) => b.id === booking.boardId)
  const total = booking.amounts.total + booking.extras.reduce((n, e) => n + e.amount, 0)
  const paid = booking.paid + booking.extras.filter((e) => e.paid).reduce((n, e) => n + e.amount, 0)
  const head = headline(booking, deliveries, returns, step)

  const rentAgain = () => {
    const added = addMany(
      lines.map((l) => l.propId),
      nextRentDates(useCart.getState().dates),
    )
    haptic('success')
    popup.toast(added ? `${added} prop${added === 1 ? '' : 's'} added to your cart` : 'Already in your cart', { tone: 'success' })
    nav.push('/customer/cart')
  }

  // The footer's main action follows the order: a check that's due, the next run, then rent again.
  const todoRun = todos.find((t) => t.run)?.run
  const primary = todoRun ? (
    <Button size="lg" icon={CameraIcon} className="flex-1 whitespace-nowrap px-4" onClick={() => nav.push(runPath(todoRun))}>
      Start the check
    </Button>
  ) : next ? (
    <Button size="lg" className="flex-1 whitespace-nowrap px-4" onClick={() => nav.push(runPath(next))}>
      Track {next.kind === 'return' ? 'return' : next.kind === 'move' ? 'move' : 'delivery'}
    </Button>
  ) : !direct ? (
    <Button size="lg" icon={KanbanIcon} className="flex-1 px-4" onClick={() => nav.push(`/customer/projects/${booking.projectId}/boards/${booking.boardId}`)}>
      Open board
    </Button>
  ) : (
    <Button size="lg" icon={ArrowClockwiseIcon} className="flex-1 px-4" onClick={rentAgain}>
      Rent again
    </Button>
  )

  return (
    <Screen
      header={
        <AppBar
          title={`${direct ? 'Order' : 'Booking'} ${booking.id}`}
          subtitle={direct ? `Direct order · placed ${formatDayShort(toISODate(new Date(booking.createdAt)))}` : `${bookingSource(booking, projects)} · ${board?.name ?? 'Board'}`}
        />
      }
      footer={
        <div className="flex gap-2.5 @medium:mx-auto @medium:max-w-xl">
          <Button size="lg" variant="secondary" icon={ReceiptIcon} className="flex-1 px-4" onClick={() => setInvoiceOpen(true)}>
            Invoice
          </Button>
          {primary}
        </div>
      }
    >
      <div className="space-y-3 px-4 pb-8 pt-3 @medium:mx-auto @medium:max-w-xl">
        {/* Where the order is */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">Tracking</p>
            <Tag tone={status.tone} dot>
              {status.label}
            </Tag>
          </div>
          <h2 className="mt-2 font-display text-xl font-extrabold tracking-[-0.01em] text-fg">{head.title}</h2>
          <p className="text-sm text-fg-2">{head.detail}</p>
          <ol className="mt-4">
            {ORDER_STEPS.map((label, i) => {
              const done = i <= step
              const current = i === step && step < ORDER_STEPS.length - 1
              const t = times[i]
              return (
                <li key={label} className="relative flex gap-3 pb-3.5 last:pb-0">
                  {i < ORDER_STEPS.length - 1 && <span aria-hidden className={cn('absolute left-[9px] top-5 h-full w-0.5', i < step ? 'bg-success' : 'bg-line')} />}
                  <span
                    className={cn(
                      'relative z-10 grid size-5 shrink-0 place-items-center rounded-full',
                      done ? 'bg-success text-white' : 'border-2 border-line-strong bg-surface',
                      current && 'ring-4 ring-success/20',
                    )}
                  >
                    {done && <CheckIcon size={11} weight="bold" />}
                  </span>
                  <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                    <span className={cn('text-[15px]', done ? 'font-semibold text-fg' : 'text-muted')}>{label}</span>
                    {t && <span className="shrink-0 text-xs tabular-nums text-muted">{when(t)}</span>}
                  </span>
                </li>
              )
            })}
          </ol>
        </Card>

        {/* Needs you */}
        {todos.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.04 }}>
            <Card
              onClick={() => (t.run ? nav.push(runPath(t.run)) : setInvoiceOpen(true))}
              className="flex items-center gap-3 bg-warning-soft p-3.5 shadow-none"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-warning">
                {t.run ? <CameraIcon size={20} weight="fill" /> : <WalletIcon size={20} weight="fill" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-fg">{t.title}</span>
                <span className="block truncate text-[13px] text-fg-2">{t.detail}</span>
              </span>
              <CaretRightIcon size={15} weight="bold" className="shrink-0 text-warning" />
            </Card>
          </motion.div>
        ))}

        {/* Each vendor's delivery and return */}
        <SectionHeader title="Deliveries & returns" subtitle="Tap one for live tracking, the driver and the photo check" className="px-0 pb-2 pt-3" />
        <Card className="overflow-hidden">
          {runs.length ? (
            [...runs]
              .sort((a, b) => a.date.localeCompare(b.date) || Number(a.kind === 'return') - Number(b.kind === 'return'))
              .map((r) => <RunRow key={r.id} run={r} project={{ locations: places }} showDate showCost onClick={() => nav.push(runPath(r))} />)
          ) : (
            <p className="p-4 text-sm text-muted">No deliveries scheduled.</p>
          )}
        </Card>

        {/* Where it goes */}
        <SectionHeader title={direct ? 'Delivering to' : 'Project'} className="px-0 pb-2 pt-3" />
        <Card className="p-4">
          {direct ? (
            <>
              <p className="flex items-center gap-1.5 text-[15px] font-semibold text-fg">
                <MapPinIcon size={16} weight="fill" className="shrink-0 text-accent" />
                {place?.name ?? 'Address not set'}
              </p>
              {place && <p className="mt-0.5 text-[13px] leading-snug text-muted">{place.address}</p>}
              <p className="mt-1.5 text-[13px] text-fg-2">
                Call {booking.contact.name} · +91 {booking.contact.phone}
              </p>
              {place && (
                <button
                  type="button"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`, '_blank', 'noopener')}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
                >
                  <NavigationArrowIcon size={15} weight="fill" /> Directions
                </button>
              )}
            </>
          ) : (
            <button type="button" onClick={() => nav.push(`/customer/projects/${booking.projectId}?tab=deliveries`)} className="flex w-full items-center gap-3 text-left">
              <FilmSlateIcon size={22} weight="duotone" className="shrink-0 text-accent" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-fg">{bookingSource(booking, projects)}</span>
                <span className="block truncate text-[13px] text-muted">To {place?.name ?? 'the shoot location'} · all the project’s deliveries</span>
              </span>
              <CaretRightIcon size={15} weight="bold" className="shrink-0 text-subtle" />
            </button>
          )}
        </Card>

        {/* Items */}
        <SectionHeader title="Items" subtitle={`${lines.length} prop${lines.length === 1 ? '' : 's'} from ${byVendor(lines).length} vendor${byVendor(lines).length === 1 ? '' : 's'}`} className="px-0 pb-2 pt-3" />
        {byVendor(lines).map(({ vendor, items }) => (
          <Card key={vendor.id} className="overflow-hidden">
            <p className="border-b border-line px-4 py-2.5 text-sm font-semibold text-fg">{vendor.name}</p>
            {items.map((l) => {
              const prop = propById(l.propId)
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => nav.push(`/customer/props/${prop.id}`)}
                  className="group relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-surface-2"
                >
                  <PropThumb item={prop} iconSize={16} className="size-10 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{prop.name}</span>
                    <span className="block text-xs text-muted">
                      {l.qty > 1 && `${l.qty} × `}
                      {formatDateRangeShort(l.from, l.to)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">{formatINR(lineCost(l))}</span>
                  <span aria-hidden className="absolute bottom-0 left-[68px] right-0 h-px bg-line group-last:hidden" />
                </button>
              )
            })}
          </Card>
        ))}

        {/* Money */}
        <SectionHeader title="Money" className="px-0 pb-2 pt-3" />
        <Card className="px-4">
          <dl className="divide-y divide-line">
            <Row label="Total" value={formatINR(total)} strong />
            <Row label="Paid" value={formatINR(paid)} tone={paid >= total ? 'text-success' : undefined} />
            {paid < total && <Row label="Due" value={formatINR(total - paid)} tone="text-warning" />}
            <Row label="Deposit (refundable)" value={`${formatINR(booking.amounts.deposit)} · ${status.group === 'completed' ? 'refunded' : 'held'}`} />
            <Row label="Paid by" value={`${PAY_LABEL[booking.payment.method]}${booking.payment.ref ? ` · ${booking.payment.ref}` : ''}`} />
          </dl>
        </Card>

        <button
          type="button"
          onClick={() => nav.push('/customer/profile/help')}
          className="flex w-full items-center justify-center gap-1.5 pt-3 text-sm font-semibold text-accent"
        >
          <LifebuoyIcon size={16} weight="bold" /> Something wrong? Get help with {booking.id}
        </button>
      </div>

      <InvoiceSheet open={invoiceOpen} onClose={() => setInvoiceOpen(false)} booking={booking} lines={lines} projectName={bookingSource(booking, projects)} />
    </Screen>
  )
}

/** The big line at the top: what's happening now, and what's next. */
function headline(booking: Booking, deliveries: Run[], returns: Run[], step: number): { title: string; detail: ReactNode } {
  const firstDelivery = [...deliveries].sort((a, b) => a.date.localeCompare(b.date))[0]
  const lastReturn = [...returns].sort((a, b) => b.date.localeCompare(a.date))[0]
  const deliveryDay = firstDelivery?.date ?? booking.deliveryDate
  const returnDay = lastReturn?.date ?? booking.returnDate
  const day = (iso: string) => (iso === todayISO() ? 'today' : formatDayShort(iso))
  if (step === 0) {
    const collect = deliveries.length > 0 && deliveries.every((r) => r.mode === 'self')
    return { title: `${collect ? 'Collect' : 'Arrives'} ${day(deliveryDay)}`, detail: `${firstDelivery?.window ?? booking.deliveryWindow} · packing starts before then` }
  }
  if (step === 1) {
    const arrived = deliveries.find((r) => r.stage === 4 && !r.confirmedAt)
    if (arrived) return { title: 'Arrived', detail: 'Check the items within 30 minutes to keep your deposit safe' }
    const furthest = Math.max(...deliveries.filter((r) => r.stage < 5).map((r) => r.stage))
    return { title: 'On its way', detail: `${STAGES.delivery[furthest]} · due ${day(deliveryDay)}, ${firstDelivery?.window ?? booking.deliveryWindow}` }
  }
  if (step === 2) return { title: 'Delivered', detail: `Return pickup ${day(returnDay)} · ${lastReturn?.window ?? booking.returnWindow}` }
  if (step === 3) return { title: 'Going back', detail: 'Your deposit is released once the vendors check it in' }
  return { title: 'Returned', detail: `${formatINR(booking.amounts.deposit)} deposit refunded` }
}

/** "4:10 pm" today, otherwise "Thu, 17 Sept". */
function when(t: number) {
  const d = new Date(t)
  return toISODate(d) === todayISO() ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : formatDayShort(toISODate(d))
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-sm text-fg-2">{label}</dt>
      <dd className={cn('truncate text-right text-sm tabular-nums', strong ? 'font-bold text-fg' : 'font-semibold text-fg', tone)}>{value}</dd>
    </div>
  )
}
