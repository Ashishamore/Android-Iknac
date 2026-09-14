import { CaretRightIcon, CurrencyInrIcon, ReceiptIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { InvoiceSheet } from '@/components/ops/InvoiceSheet'
import { cn } from '@/lib/cn'
import { formatDate, toISODate } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { moneySummary } from '@/lib/ops'
import { useProjectOps } from '@/store/projectOps'
import type { Project } from '@/store/projects'
import { Button, Card, EmptyState, IconTile, ProgressBar, SectionHeader, Tag } from '@/ui'

/** MONEY → Items · Transport · Discount · GST · Paid/Pending · Deposit · Invoices */
export function MoneyTab({ project, onTab }: { project: Project; onTab: (tab: string) => void }) {
  const allBookings = useProjectOps((s) => s.bookings)
  const allRuns = useProjectOps((s) => s.runs)
  const allBoards = useProjectOps((s) => s.boards)
  const bookings = useMemo(() => allBookings.filter((b) => b.projectId === project.id), [allBookings, project.id])
  const m = moneySummary(bookings)
  const [invoice, setInvoice] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const booking = bookings.find((b) => b.id === invoice.id) ?? null
  const lines = booking ? (allBoards.find((b) => b.id === booking.boardId)?.lines ?? []).filter((l) => booking.lineIds.includes(l.id)) : []

  /** The deposit comes back once every return for the booking is done. */
  const depositReleased = (bookingId: string) => {
    const returns = allRuns.filter((r) => r.bookingId === bookingId && r.kind === 'return')
    return returns.length > 0 && returns.every((r) => r.stage >= 5)
  }
  const held = bookings.filter((b) => !depositReleased(b.id)).reduce((n, b) => n + b.amounts.deposit, 0)

  if (!bookings.length) {
    return (
      <EmptyState
        icon={CurrencyInrIcon}
        title="Nothing spent yet"
        description="Rent, transport, GST, deposits and invoices show up here once you book."
        action={<Button onClick={() => onTab('boards')}>Go to boards</Button>}
      />
    )
  }

  const rows: { label: string; value: number; note?: string }[] = [
    { label: 'Items (rent)', value: m.items },
    { label: 'Transport', value: m.transport },
    ...(m.discount ? [{ label: 'Discount', value: -m.discount, note: '5% off 3+ day rentals' }] : []),
    { label: 'GST (18%)', value: m.gst },
    { label: 'Deposit (refundable)', value: m.deposit },
    ...(m.extras ? [{ label: 'Extensions', value: m.extras }] : []),
  ]

  return (
    <div className="pb-8 @medium:mx-auto @medium:max-w-2xl">
      <Card className="mx-4 mt-4 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">Total</p>
        <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-fg">{formatINR(m.total)}</p>
        <ProgressBar value={(m.paid / Math.max(1, m.total)) * 100} tone="success" className="mt-3 h-2" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-muted">Paid</p>
            <p className="text-[15px] font-bold tabular-nums text-success">{formatINR(m.paid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Pending</p>
            <p className={cn('text-[15px] font-bold tabular-nums', m.pending > 0 ? 'text-warning' : 'text-fg')}>{formatINR(m.pending)}</p>
          </div>
        </div>
      </Card>

      <SectionHeader title="Breakdown" subtitle={`Against a ${formatINR(project.budget)} budget`} className="pt-6" />
      <Card className="mx-4 px-4 py-1.5">
        <dl className="divide-y divide-line">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 py-2.5">
              <dt className="min-w-0">
                <span className="block text-sm text-fg-2">{r.label}</span>
                {r.note && <span className="block text-xs text-subtle">{r.note}</span>}
              </dt>
              <dd className={cn('shrink-0 text-sm font-semibold tabular-nums', r.value < 0 ? 'text-success' : 'text-fg')}>
                {r.value < 0 ? `−${formatINR(-r.value)}` : formatINR(r.value)}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <SectionHeader title="Deposit" className="pt-6" />
      <Card className="mx-4 flex items-center gap-3 p-4">
        <IconTile icon={ShieldCheckIcon} tone={held ? 'info' : 'success'} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-fg">{held ? `${formatINR(held)} held` : 'All deposits released'}</p>
          <p className="text-[13px] leading-snug text-muted">
            {held ? 'Refunded to your account once the props are back with the vendor and checked.' : `${formatINR(m.deposit)} refunded.`}
          </p>
        </div>
      </Card>

      <SectionHeader title="Invoices" subtitle={`${bookings.length} booking${bookings.length === 1 ? '' : 's'}`} className="pt-6" />
      <Card className="mx-4 overflow-hidden">
        {bookings.map((b) => {
          const total = b.amounts.total + b.extras.reduce((n, e) => n + e.amount, 0)
          const paid = b.paid + b.extras.filter((e) => e.paid).reduce((n, e) => n + e.amount, 0)
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setInvoice({ open: true, id: b.id })}
              className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2"
            >
              <IconTile icon={ReceiptIcon} tone="neutral" size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-fg">{b.invoiceNo}</span>
                <span className="block truncate text-[13px] text-muted">
                  {formatDate(toISODate(new Date(b.createdAt)))} · {b.lineIds.length} item{b.lineIds.length === 1 ? '' : 's'} · {b.id}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-bold tabular-nums text-fg">{formatINR(total)}</span>
                <Tag tone={paid >= total ? 'success' : 'warning'}>{paid >= total ? 'Paid' : b.payment.method === 'po' ? 'PO · pending' : 'Pending'}</Tag>
              </span>
              <CaretRightIcon size={15} weight="bold" className="shrink-0 text-subtle" />
              <span aria-hidden className="absolute bottom-0 left-[66px] right-0 h-px bg-line group-last:hidden" />
            </button>
          )
        })}
      </Card>

      <InvoiceSheet
        open={invoice.open}
        onClose={() => setInvoice((s) => ({ ...s, open: false }))}
        booking={booking}
        lines={lines}
        projectName={project.name}
      />
    </div>
  )
}
