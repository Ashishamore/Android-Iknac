import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  CreditCardIcon,
  DotsThreeVerticalIcon,
  PlusIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { addDays, formatDate, formatDayShort, toISODate } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { bookingStatus } from '@/lib/ops'
import { BottomSheet } from '@/overlays/BottomSheet'
import { Menu } from '@/overlays/Menu'
import { usePopup } from '@/overlays/popupContext'
import { useProfile } from '@/store/profile'
import { useProjectOps } from '@/store/projectOps'
import { useProjects } from '@/store/projects'
import { AppBar, Button, Card, IconButton, IconTile, Screen, SectionHeader, Segmented, Tag, TextField } from '@/ui'

const PAY_LABEL = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', po: 'Company PO' } as const

/** Payments & deposits: saved methods, deposits held/refunded, recent payments. */
export default function PaymentsScreen() {
  const popup = usePopup()
  const payments = useProfile((s) => s.payments)
  const setDefaultPayment = useProfile((s) => s.setDefaultPayment)
  const removePayment = useProfile((s) => s.removePayment)
  const addPayment = useProfile((s) => s.addPayment)
  const bookings = useProjectOps((s) => s.bookings)
  const runs = useProjectOps((s) => s.runs)
  const projects = useProjects((s) => s.projects)
  const [adding, setAdding] = useState({ key: 0, open: false })

  const deposits = bookings.map((b) => {
    const done = bookingStatus(b, runs).group === 'completed'
    // Refunds land two days after the last return is checked in.
    const returned = Math.max(0, ...runs.filter((r) => r.bookingId === b.id && r.kind === 'return').map((r) => r.stageTimes[5] ?? 0))
    const refundedOn = done ? (returned ? toISODate(new Date(returned + 2 * 86_400_000)) : addDays(b.returnDate, 2)) : null
    return { booking: b, done, refundedOn }
  })
  const held = deposits.filter((d) => !d.done).reduce((n, d) => n + d.booking.amounts.deposit, 0)
  const refunded = deposits.filter((d) => d.done).reduce((n, d) => n + d.booking.amounts.deposit, 0)

  // Money out (bookings, extensions) and deposit refunds, latest first.
  const activity: { id: string; label: string; detail: string; amount: number; at: number; refund?: boolean }[] = []
  for (const b of bookings) {
    if (b.paid > 0) activity.push({ id: `${b.id}-pay`, label: `Booking ${b.id}`, detail: `${PAY_LABEL[b.payment.method]} · ${b.payment.ref}`, amount: b.paid, at: b.createdAt })
    for (const e of b.extras) if (e.paid) activity.push({ id: e.id, label: e.label, detail: `Booking ${b.id}`, amount: e.amount, at: b.createdAt + 1 })
  }
  for (const d of deposits)
    if (d.refundedOn)
      activity.push({ id: `${d.booking.id}-refund`, label: 'Deposit refunded', detail: `Booking ${d.booking.id}`, amount: d.booking.amounts.deposit, at: new Date(d.refundedOn).getTime(), refund: true })
  activity.sort((a, b) => b.at - a.at)

  return (
    <Screen header={<AppBar title="Payments & deposits" />}>
      <div className="px-4 pb-10 pt-2 @medium:mx-auto @medium:max-w-2xl">
        <Card className="grid grid-cols-2 divide-x divide-line p-0">
          <div className="p-4">
            <p className="text-xs font-semibold text-muted">Deposits held</p>
            <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-fg">{formatINR(held)}</p>
            <p className="text-xs text-muted">Refunded after returns</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold text-muted">Refunded</p>
            <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-success">{formatINR(refunded)}</p>
            <p className="text-xs text-muted">To your payment method</p>
          </div>
        </Card>

        {/* Payment methods */}
        <SectionHeader title="Payment methods" subtitle="The default is picked first at checkout" className="px-0 pt-6" />
        <Card className="overflow-hidden">
          {payments.map((p) => (
            <div key={p.id} className="group relative flex items-center gap-3 py-3 pl-4 pr-1.5">
              <IconTile icon={p.kind === 'upi' ? QrCodeIcon : CreditCardIcon} tone={p.isDefault ? 'brand' : 'neutral'} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
                  <span className="truncate">{p.label}</span>
                  {p.isDefault && (
                    <Tag tone="success" className="shrink-0">
                      Default
                    </Tag>
                  )}
                </p>
                <p className="truncate text-[13px] text-muted">{p.detail}</p>
              </div>
              <Menu
                items={[
                  ...(!p.isDefault
                    ? [
                        {
                          label: 'Make default',
                          icon: CheckCircleIcon,
                          onSelect: () => {
                            setDefaultPayment(p.id)
                            haptic()
                            popup.toast(`${p.label} is now your default`, { tone: 'success' })
                          },
                        },
                      ]
                    : []),
                  {
                    label: 'Remove',
                    icon: TrashIcon,
                    destructive: true,
                    onSelect: () => {
                      const undo = removePayment(p.id)
                      popup.toast(`${p.label} removed`, { action: { label: 'Undo', onClick: undo } })
                    },
                  },
                ]}
              >
                <IconButton icon={DotsThreeVerticalIcon} weight="bold" size="sm" label={`Options for ${p.label} ${p.detail}`} />
              </Menu>
              <span aria-hidden className="absolute bottom-0 left-[64px] right-0 h-px bg-line group-last:hidden" />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAdding((s) => ({ key: s.key + 1, open: true }))}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] font-semibold text-accent transition-colors active:bg-surface-2"
          >
            <span className="grid size-9 place-items-center rounded-xl border-2 border-dashed border-accent/40">
              <PlusIcon size={16} weight="bold" />
            </span>
            Add UPI or card
          </button>
        </Card>

        {/* Deposits */}
        <SectionHeader title="Deposits" subtitle="30% of the rent, refunded once the props are back and checked" className="px-0 pt-6" />
        <Card className="overflow-hidden">
          {deposits.map(({ booking: b, done, refundedOn }) => (
            <div key={b.id} className="group relative flex items-center gap-3 px-4 py-3">
              <IconTile icon={ShieldCheckIcon} tone={done ? 'success' : 'info'} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-fg">{projects.find((p) => p.id === b.projectId)?.name ?? 'Project'}</p>
                <p className="truncate text-[13px] text-muted">
                  {b.id} · {done ? `refunded ${refundedOn ? formatDayShort(refundedOn) : ''}` : `back by ${formatDayShort(addDays(b.returnDate, 2))}`}
                </p>
              </div>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-bold tabular-nums text-fg">{formatINR(b.amounts.deposit)}</span>
                <Tag tone={done ? 'success' : 'info'}>{done ? 'Refunded' : 'Held'}</Tag>
              </span>
              <span aria-hidden className="absolute bottom-0 left-[64px] right-0 h-px bg-line group-last:hidden" />
            </div>
          ))}
        </Card>

        {/* Recent payments */}
        <SectionHeader title="Recent payments" className="px-0 pt-6" />
        <Card className="overflow-hidden">
          {activity.slice(0, 8).map((a) => (
            <div key={a.id} className="group relative flex items-center gap-3 px-4 py-3">
              <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', a.refund ? 'bg-success-soft text-success' : 'bg-surface-2 text-fg-2')}>
                {a.refund ? <ArrowDownLeftIcon size={17} weight="bold" /> : <ArrowUpRightIcon size={17} weight="bold" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-fg">{a.label}</p>
                <p className="truncate text-[13px] text-muted">
                  {formatDate(toISODate(new Date(a.at)))} · {a.detail}
                </p>
              </div>
              <span className={cn('shrink-0 text-sm font-bold tabular-nums', a.refund ? 'text-success' : 'text-fg')}>
                {a.refund ? '+' : '−'}
                {formatINR(a.amount)}
              </span>
              <span aria-hidden className="absolute bottom-0 left-[64px] right-0 h-px bg-line group-last:hidden" />
            </div>
          ))}
        </Card>
      </div>

      <AddPaymentSheet
        key={adding.key}
        open={adding.open}
        onClose={() => setAdding((s) => ({ ...s, open: false }))}
        onAdd={(p) => {
          addPayment(p)
          setAdding((s) => ({ ...s, open: false }))
          haptic('success')
          popup.toast(p.kind === 'upi' ? 'UPI ID saved' : 'Card saved', { tone: 'success' })
        }}
      />
    </Screen>
  )
}

/** Luhn checksum for card numbers. */
function luhn(digits: string) {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

const cardBrand = (n: string) => (n.startsWith('4') ? 'Visa' : /^5[1-5]/.test(n) ? 'Mastercard' : /^3[47]/.test(n) ? 'Amex' : /^(60|65|81|82)/.test(n) ? 'RuPay' : 'Card')

function AddPaymentSheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (p: { kind: 'upi' | 'card'; label: string; detail: string }) => void
}) {
  const popup = usePopup()
  const [kind, setKind] = useState<'upi' | 'card'>('upi')
  const [upi, setUpi] = useState('')
  const [card, setCard] = useState('')
  const [expiry, setExpiry] = useState('')
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const digits = card.replace(/\D/g, '')

  const save = async () => {
    const next: Record<string, string> = {}
    if (kind === 'upi') {
      if (!/^[\w.-]{2,}@[a-z]{2,}$/i.test(upi.trim())) next.upi = 'Enter a UPI ID like name@okhdfc'
    } else {
      if (digits.length < 15 || !luhn(digits)) next.card = 'Check the card number'
      const [mm, yy] = expiry.split('/').map(Number)
      const now = new Date()
      const expired = !mm || mm > 12 || !yy || 2000 + yy < now.getFullYear() || (2000 + yy === now.getFullYear() && mm < now.getMonth() + 1)
      if (expired) next.expiry = 'Enter a valid expiry'
      if (name.trim().length < 2) next.name = 'Enter the name on the card'
    }
    setErrors(next)
    if (Object.keys(next).length) return haptic('warning')
    const hide = popup.loading(kind === 'upi' ? 'Verifying UPI ID…' : 'Securing your card…')
    await sleep(1000)
    hide()
    onAdd(kind === 'upi' ? { kind, label: 'UPI', detail: upi.trim().toLowerCase() } : { kind, label: `${cardBrand(digits)} card`, detail: `•••• ${digits.slice(-4)}` })
  }

  const clear = (key: string) => setErrors((e) => ({ ...e, [key]: '' }))

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Add payment method"
      description="Saved securely with the payment partner. We never store your CVV."
      footer={
        <Button size="lg" block onClick={save}>
          Save {kind === 'upi' ? 'UPI ID' : 'card'}
        </Button>
      }
    >
      <Segmented
        options={[
          { value: 'upi', label: 'UPI', icon: QrCodeIcon },
          { value: 'card', label: 'Card', icon: CreditCardIcon },
        ]}
        value={kind}
        onChange={(v) => {
          setKind(v)
          setErrors({})
        }}
      />
      <div className="mt-4 space-y-4">
        {kind === 'upi' ? (
          <TextField
            label="UPI ID"
            value={upi}
            autoComplete="off"
            inputMode="email"
            hint="e.g. rohan@okhdfc"
            error={errors.upi || undefined}
            onChange={(e) => {
              setUpi(e.target.value.replace(/\s/g, ''))
              clear('upi')
            }}
          />
        ) : (
          <>
            <TextField
              label="Card number"
              value={card}
              inputMode="numeric"
              autoComplete="cc-number"
              error={errors.card || undefined}
              onChange={(e) => {
                setCard(
                  e.target.value
                    .replace(/\D/g, '')
                    .slice(0, 16)
                    .replace(/(\d{4})(?=\d)/g, '$1 '),
                )
                clear('card')
              }}
            />
            <div className="flex gap-3">
              <TextField
                className="flex-1"
                label="Expiry (MM/YY)"
                value={expiry}
                inputMode="numeric"
                autoComplete="cc-exp"
                error={errors.expiry || undefined}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d)
                  clear('expiry')
                }}
              />
              <TextField className="flex-1" label="CVV" type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} hint="Not stored" />
            </div>
            <TextField
              label="Name on card"
              value={name}
              autoComplete="cc-name"
              error={errors.name || undefined}
              onChange={(e) => {
                setName(e.target.value)
                clear('name')
              }}
            />
          </>
        )}
      </div>
    </BottomSheet>
  )
}
