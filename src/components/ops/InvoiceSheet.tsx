import { BankIcon, CreditCardIcon, DownloadSimpleIcon, QrCodeIcon } from '@phosphor-icons/react'
import { propById, vendorById } from '@/data/props'
import { formatDate, toISODate } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { lineCost, lineDays, type BoardLine, type Booking } from '@/lib/ops'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useProjectOps } from '@/store/projectOps'
import { Button, Tag } from '@/ui'

interface InvoiceSheetProps {
  open: boolean
  onClose: () => void
  booking: Booking | null
  lines: BoardLine[]
  projectName: string
}

const PAY_LABEL = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', po: 'Company PO' } as const

/** Invoice preview with Download (a real HTML file) and Pay now for PO invoices. */
export function InvoiceSheet({ open, onClose, booking, lines, projectName }: InvoiceSheetProps) {
  const popup = usePopup()
  const payBooking = useProjectOps((s) => s.payBooking)
  if (!booking) return <BottomSheet open={false} onClose={onClose} />

  const extras = booking.extras.reduce((n, e) => n + e.amount, 0)
  const total = booking.amounts.total + extras
  const paid = booking.paid + booking.extras.filter((e) => e.paid).reduce((n, e) => n + e.amount, 0)
  const due = total - paid
  const rows: [string, number][] = [
    ['Rent', booking.amounts.items],
    ['Transport', booking.amounts.transport],
    ...(booking.amounts.discount ? [['Long-shoot discount', -booking.amounts.discount] as [string, number]] : []),
    ['GST (18%)', booking.amounts.gst],
    ['Refundable deposit', booking.amounts.deposit],
    ...booking.extras.map((e) => [e.label, e.amount] as [string, number]),
  ]

  const download = () => {
    const html = `<!doctype html><meta charset="utf-8"><title>${booking.invoiceNo}</title>
<style>body{font:14px system-ui;margin:40px;color:#111}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}td:last-child,th:last-child{text-align:right}.t{font-weight:700}</style>
<h1>Tax invoice ${booking.invoiceNo}</h1><p>${projectName} · Booking ${booking.id} · ${formatDate(toISODate(new Date(booking.createdAt)))}</p>
<table><tr><th>Item</th><th>Vendor</th><th>Days × Qty</th><th>Amount</th></tr>
${lines.map((l) => `<tr><td>${propById(l.propId).name}</td><td>${vendorById(propById(l.propId).vendorId).name}</td><td>${lineDays(l)} × ${l.qty}</td><td>${formatINR(lineCost(l))}</td></tr>`).join('')}
${rows.map(([k, v]) => `<tr><td colspan="3">${k}</td><td>${formatINR(v)}</td></tr>`).join('')}
<tr class="t"><td colspan="3">Total</td><td>${formatINR(total)}</td></tr><tr><td colspan="3">Paid</td><td>${formatINR(paid)}</td></tr></table>`
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${booking.invoiceNo}.html`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    popup.toast(`${booking.invoiceNo} downloaded`, { tone: 'success' })
  }

  const payNow = async () => {
    const method = await popup.actionSheet({
      title: `Pay ${formatINR(due)}`,
      description: `${booking.invoiceNo} · ${projectName}`,
      options: [
        { id: 'upi', label: 'UPI', description: 'rohan@okicici', icon: QrCodeIcon },
        { id: 'card', label: 'Card', description: 'HDFC •••• 4242', icon: CreditCardIcon },
        { id: 'netbanking', label: 'Net banking', icon: BankIcon },
      ],
    })
    if (!method) return
    const hide = popup.loading('Processing payment…')
    await sleep(1300)
    hide()
    payBooking(booking.id, method)
    haptic('success')
    popup.toast(`${formatINR(due)} paid`, { tone: 'success' })
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={booking.invoiceNo}
      description={`Booking ${booking.id} · ${PAY_LABEL[booking.payment.method]}${booking.payment.ref ? ` · ${booking.payment.ref}` : ''}`}
      footer={
        <div className="flex gap-3">
          <Button size="lg" variant="secondary" icon={DownloadSimpleIcon} className="flex-1" onClick={download}>
            Download
          </Button>
          {due > 0 && (
            <Button size="lg" className="flex-1" onClick={payNow}>
              Pay {formatINR(due)}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex items-center justify-between">
        <Tag tone={due > 0 ? 'warning' : 'success'} dot>
          {due > 0 ? `Pending ${formatINR(due)}` : 'Paid'}
        </Tag>
        <span className="text-xs text-muted">{formatDate(toISODate(new Date(booking.createdAt)))}</span>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {lines.map((l) => {
          const p = propById(l.propId)
          return (
            <li key={l.id} className="flex items-start justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-fg">{p.name}</span>
                <span className="block text-xs text-muted">
                  {vendorById(p.vendorId).name} · {lineDays(l)} day{lineDays(l) === 1 ? '' : 's'} × {l.qty}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">{formatINR(lineCost(l))}</span>
            </li>
          )
        })}
      </ul>
      <dl className="mt-2 space-y-1.5 rounded-2xl bg-surface-2 p-3.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-muted">{k}</dt>
            <dd className={v < 0 ? 'font-medium text-success' : 'font-medium tabular-nums text-fg'}>
              {v < 0 ? `−${formatINR(-v)}` : formatINR(v)}
            </dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-line pt-2 text-[15px] font-bold text-fg">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatINR(total)}</dd>
        </div>
      </dl>
    </BottomSheet>
  )
}
