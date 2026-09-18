import { ArrowRightIcon, ChatCircleDotsIcon, CheckCircleIcon, ClockCountdownIcon, PackageIcon, PhoneIcon, ReceiptIcon, ShieldCheckIcon, TruckIcon, XCircleIcon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { DeclineSheet } from '@/components/owner/DeclineSheet'
import { DueTag, ListingThumb } from '@/components/owner/OwnerUI'
import { PLATFORM } from '@/data/owner'
import { cn } from '@/lib/cn'
import { addDays, daysInclusive, formatDateRangeShort, formatDayShort, todayISO, toISODate } from '@/lib/dates'
import { formatINR, formatPhone } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { ANSWER_WINDOW, inRepair, lateFee, orderMoney, piecesBooked, type Listing, type Order } from '@/lib/owner'
import type { Tone } from '@/lib/tones'
import { nav, useParams } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useFeeRate, useOwner } from '@/store/owner'
import { AppBar, Avatar, Button, Card, EmptyState, Screen, Tag, TextArea, TextField } from '@/ui'

const STATUS: Record<Order['status'], { label: string; tone: Tone }> = {
  request: { label: 'Waiting for you', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'brand' },
  out: { label: 'With production', tone: 'info' },
  returned: { label: 'Back · deposit to release', tone: 'warning' },
  closed: { label: 'Closed', tone: 'success' },
  declined: { label: 'Declined', tone: 'neutral' },
}

export default function OrderDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const order = useOwner((s) => s.orders.find((o) => o.id === id))
  const listing = useOwner((s) => s.listings.find((l) => l.id === order?.listingId))
  if (!order || !listing) {
    return (
      <Screen header={<AppBar title="Order" />}>
        <EmptyState icon={ReceiptIcon} title="Order not found" action={<Button onClick={() => nav.pop()}>Go back</Button>} />
      </Screen>
    )
  }
  return <OrderDetail o={order} l={listing} />
}

/** ORDER DETAIL: accept or decline a request, follow it out and back, release or claim the deposit. */
function OrderDetail({ o, l }: { o: Order; l: Listing }) {
  const popup = usePopup()
  const orders = useOwner((s) => s.orders)
  const accept = useOwner((s) => s.acceptOrder)
  const decline = useOwner((s) => s.declineOrder)
  const settle = useOwner((s) => s.settleDeposit)
  const fee = useFeeRate()
  const [declining, setDeclining] = useState({ key: 0, open: false })
  const [claiming, setClaiming] = useState({ key: 0, open: false })
  const m = orderMoney(o, l, fee)
  const today = todayISO()
  const late = o.status === 'out' && o.to < today ? lateFee(o, l, today) : null
  const pieces = l.pieces.filter((p) => o.pieceIds.includes(p.id))

  const doAccept = async () => {
    // Would this overbook any day?
    const usable = l.pieces.length - inRepair(l)
    const days = Array.from({ length: daysInclusive(o.from, o.to) }, (_, i) => addDays(o.from, i))
    const tight = days.find((d) => piecesBooked(l.id, orders, d) + o.qty > usable)
    if (tight) {
      const ok = await popup.confirm({
        title: 'Not enough pieces free',
        message: `On ${formatDayShort(tight)} only ${Math.max(0, usable - piecesBooked(l.id, orders, tight))} of ${usable} are free. Accept anyway?`,
        confirmText: 'Accept anyway',
        tone: 'danger',
      })
      if (!ok) return
    }
    const hide = popup.loading('Confirming with the renter…')
    await sleep(800)
    hide()
    accept(o.id)
    haptic('success')
    popup.toast(`Accepted · ${o.renter.company} has been told`, { tone: 'success' })
  }

  const release = async () => {
    const ok = await popup.confirm({ title: `Release ${formatINR(m.deposit)}?`, message: `The full deposit goes back to ${o.renter.company}.`, confirmText: 'Release', icon: ShieldCheckIcon })
    if (!ok) return
    settle(o.id, 0)
    haptic('success')
    popup.toast('Deposit released · order closed', { tone: 'success' })
  }

  const footer =
    o.status === 'request' ? (
      <div className="flex gap-2.5">
        <Button size="lg" variant="secondary" className="flex-1" onClick={() => setDeclining((s) => ({ key: s.key + 1, open: true }))}>
          Decline
        </Button>
        <Button size="lg" icon={CheckCircleIcon} className="flex-[2]" onClick={doAccept}>
          Accept
        </Button>
      </div>
    ) : o.status === 'confirmed' ? (
      <Button size="lg" block icon={TruckIcon} onClick={() => nav.push(`/renter/handover/${o.id}`)}>
        {o.from <= today ? 'Pack and hand over' : `Pack list · goes out ${formatDayShort(o.from)}`}
      </Button>
    ) : o.status === 'out' ? (
      <Button size="lg" block icon={PackageIcon} onClick={() => nav.push(`/renter/handover/${o.id}`)}>
        Check it back in
      </Button>
    ) : o.status === 'returned' ? (
      <div className="flex gap-2.5">
        <Button size="lg" variant="secondary" className="flex-1" onClick={() => setClaiming((s) => ({ key: s.key + 1, open: true }))}>
          Claim
        </Button>
        <Button size="lg" icon={ShieldCheckIcon} className="flex-[2]" onClick={release}>
          Release deposit
        </Button>
      </div>
    ) : undefined

  return (
    <Screen header={<AppBar title={`Order ${o.id}`} subtitle={o.project} />} footer={footer ? <div className="@medium:mx-auto @medium:max-w-md">{footer}</div> : undefined}>
      <div className="space-y-3 px-4 pb-10 pt-1 @medium:mx-auto @medium:max-w-2xl">
        {/* Status */}
        <div className={cn('flex items-center gap-3 rounded-2xl p-3.5', o.status === 'declined' ? 'bg-surface-2' : o.status === 'closed' ? 'bg-success-soft' : o.status === 'request' || o.status === 'returned' ? 'bg-warning-soft' : 'bg-info-soft')}>
          <StatusIcon status={o.status} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-fg">{STATUS[o.status].label}</p>
            <p className="text-[13px] text-fg-2">
              {o.status === 'request' && 'Accept or decline within 24 hours, or it lapses.'}
              {o.status === 'confirmed' && `Goes out ${formatDayShort(o.from)}${o.delivery ? ' · you deliver' : ' · they collect'}.`}
              {o.status === 'out' && (late ? `${late.days} day${late.days === 1 ? '' : 's'} late · late fee ${formatINR(late.amount)} so far.` : `Due back ${formatDayShort(o.to)}.`)}
              {o.status === 'returned' && 'Back and checked. Release the deposit or claim for damage.'}
              {o.status === 'closed' && (o.deposit === 'claimed' ? `Deposit claimed: ${formatINR(o.claim)} kept.` : 'Deposit released in full.')}
              {o.status === 'declined' && `Declined: ${o.declineReason ?? 'no reason'}.`}
            </p>
          </div>
          {o.status === 'request' && <DueTag due={o.requestedAt + ANSWER_WINDOW} />}
          {o.status === 'returned' && o.returnedAt && <DueTag due={o.returnedAt + ANSWER_WINDOW} />}
        </div>

        {/* Renter */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Avatar name={o.renter.company} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-fg">{o.renter.company}</p>
              <p className="truncate text-[13px] text-muted">
                {o.renter.person} · {formatPhone(o.renter.phone)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2.5">
            <Button
              size="sm"
              variant="secondary"
              icon={PhoneIcon}
              className="flex-1"
              onClick={() => {
                window.location.href = `tel:+91${o.renter.phone}`
              }}
            >
              Call
            </Button>
            <Button size="sm" variant="secondary" icon={ChatCircleDotsIcon} className="flex-1" onClick={() => window.open(`https://wa.me/91${o.renter.phone}`, '_blank', 'noopener')}>
              WhatsApp
            </Button>
          </div>
        </Card>

        {/* Item and dates */}
        <Card className="overflow-hidden">
          <button type="button" onClick={() => nav.push(`/renter/stock/${l.id}`)} className="flex w-full items-center gap-3 p-3.5 text-left transition-colors active:bg-surface-2">
            <ListingThumb listing={l} className="size-14 shrink-0 rounded-xl" iconSize={22} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-fg">
                {l.name} × {o.qty}
              </span>
              <span className="flex items-center gap-1.5 text-[13px] text-muted">
                {formatDayShort(o.from)} <ArrowRightIcon size={12} /> {formatDayShort(o.to)} · {m.days} day{m.days === 1 ? '' : 's'}
              </span>
            </span>
          </button>
          {pieces.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-line px-3.5 py-2.5">
              {pieces.map((p) => (
                <span key={p.id} className="rounded-lg bg-surface-2 px-2 py-0.5 font-mono text-xs font-semibold text-fg-2">
                  {p.code}
                </span>
              ))}
              {o.outPhotos > 0 && <span className="text-xs text-muted">· {o.outPhotos} out photos</span>}
            </div>
          )}
        </Card>

        {/* Money: Hire · Discount · Fee · Net */}
        <Card className="px-4 py-1.5">
          <dl className="divide-y divide-line">
            <Line label={`Hire · ${formatINR(m.hire / m.days / o.qty)}/day × ${m.days} × ${o.qty}`} value={formatINR(m.hire)} />
            {m.discount > 0 && <Line label="Discount you gave" value={`−${formatINR(m.discount)}`} />}
            <Line label={`${PLATFORM} fee (${Math.round(fee * 100)}%)`} value={`−${formatINR(m.fee)}`} />
            {o.claim > 0 && <Line label="Kept from deposit" value={`+${formatINR(o.claim)}`} />}
            <Line label="You get" value={formatINR(m.net + o.claim)} strong />
            <Line label="Deposit" value={`${formatINR(m.deposit)} · ${o.deposit ?? 'not taken yet'}`} />
          </dl>
        </Card>
        <p className="px-1 text-xs text-muted">
          Requested {formatDayShort(toISODate(new Date(o.requestedAt)))} · {formatDateRangeShort(o.from, o.to)}
        </p>
      </div>

      <DeclineSheet
        key={`decline-${declining.key}`}
        open={declining.open}
        onClose={() => setDeclining((s) => ({ ...s, open: false }))}
        onDecline={(reason) => {
          decline(o.id, reason)
          setDeclining((s) => ({ ...s, open: false }))
          popup.toast(`Declined · ${o.renter.company} has been told`)
        }}
      />
      <ClaimSheet
        key={`claim-${claiming.key}`}
        open={claiming.open}
        max={m.deposit}
        onClose={() => setClaiming((s) => ({ ...s, open: false }))}
        onClaim={(amount) => {
          settle(o.id, amount)
          setClaiming((s) => ({ ...s, open: false }))
          haptic('success')
          popup.toast(`${formatINR(amount)} kept · ${formatINR(m.deposit - amount)} returned`, { tone: 'success' })
        }}
      />
    </Screen>
  )
}

function StatusIcon({ status }: { status: Order['status'] }) {
  const cls = 'size-6 shrink-0'
  if (status === 'closed') return <CheckCircleIcon weight="fill" className={cn(cls, 'text-success')} />
  if (status === 'declined') return <XCircleIcon weight="fill" className={cn(cls, 'text-muted')} />
  if (status === 'out') return <TruckIcon weight="fill" className={cn(cls, 'text-info')} />
  if (status === 'confirmed') return <PackageIcon weight="fill" className={cn(cls, 'text-info')} />
  return <ClockCountdownIcon weight="fill" className={cn(cls, 'text-warning')} />
}

function Line({ label, value, strong }: { label: ReactNode; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className={cn('min-w-0 text-sm', strong ? 'font-semibold text-fg' : 'text-fg-2')}>{label}</dt>
      <dd className={cn('shrink-0 text-right text-sm tabular-nums', strong ? 'font-bold text-fg' : 'font-semibold text-fg')}>{value}</dd>
    </div>
  )
}

function ClaimSheet({ open, max, onClose, onClaim }: { open: boolean; max: number; onClose: () => void; onClaim: (amount: number) => void }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Claim from the deposit"
      description={`Up to ${formatINR(max)}. The rest goes back to the renter.`}
      footer={
        <Button
          size="lg"
          block
          onClick={() => {
            const n = Number(amount)
            if (!n || n > max) return setError(`Enter an amount up to ${formatINR(max)}`)
            if (reason.trim().length < 5) return setError('Say what the claim is for')
            onClaim(n)
          }}
        >
          Claim {amount ? formatINR(Number(amount)) : ''}
        </Button>
      }
    >
      <div className="space-y-4">
        <TextField
          label="Amount"
          prefix="₹"
          inputMode="numeric"
          value={amount}
          error={error}
          onChange={(e) => {
            setAmount(e.target.value.replace(/\D/g, '').slice(0, 7))
            setError(undefined)
          }}
        />
        <TextArea label="What for?" rows={3} value={reason} hint="Photos from the return check are attached automatically" onChange={(e) => setReason(e.target.value)} />
      </div>
      <Tag tone="info" className="mt-3">
        Renters can dispute a claim within 48 hours
      </Tag>
    </BottomSheet>
  )
}
