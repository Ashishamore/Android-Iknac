import {
  ArrowRightIcon,
  ChatCircleDotsIcon,
  CheckCircleIcon,
  PackageIcon,
  PaperPlaneRightIcon,
  PhoneIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  SwapIcon,
  TruckIcon,
  WarningIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { DECLINE_REASONS, PLATFORM } from '@/data/owner'
import { cn } from '@/lib/cn'
import { addDays, daysInclusive, formatDateRangeShort, formatDayShort, timeAgo, todayISO, toISODate } from '@/lib/dates'
import { formatINR, formatPhone } from '@/lib/format'
import { ANSWER_WINDOW, inRepair, lateFee, orderMoney, piecesBooked, rateFor, type Listing, type Order, type OwnerRequest, type Renter } from '@/lib/owner'
import { useFeeRate, useOwner } from '@/store/owner'
import { KIND_TITLE, ORDER_STATUS, plural } from '~/lib/data'
import { linkProps, navigate } from '~/router'
import { Button, Chip, TextArea, TextField } from '~/ui/controls'
import { Avatar, Banner, Card, CardHeader, DueTag, KV, Tag, Thumb } from '~/ui/display'
import { busy, confirm, sleep, toast } from '~/ui/feedback'
import { Dialog } from '~/ui/overlays'

/* ── Shared bits ─────────────────────────────────────────────────────────── */

function PaneHeader({ title, subtitle, meta, actions }: { title: ReactNode; subtitle?: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-line bg-surface px-5 py-4">
      <div className="min-w-0 flex-1 basis-60">
        <h2 className="font-display text-xl font-extrabold leading-tight text-fg">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

function RenterCard({ renter }: { renter: Renter }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Avatar name={renter.company} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{renter.company}</p>
          <p className="truncate text-[13px] text-muted">
            {renter.person} · {formatPhone(renter.phone)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="secondary" icon={PhoneIcon} className="flex-1" onClick={() => (window.location.href = `tel:+91${renter.phone}`)}>
          Call
        </Button>
        <Button size="sm" variant="secondary" icon={ChatCircleDotsIcon} className="flex-1" onClick={() => window.open(`https://wa.me/91${renter.phone}`, '_blank', 'noopener')}>
          WhatsApp
        </Button>
      </div>
    </Card>
  )
}

/* ── Order detail ────────────────────────────────────────────────────────── */

const STEPS: { status: Order['status']; label: string }[] = [
  { status: 'request', label: 'Requested' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'out', label: 'With production' },
  { status: 'returned', label: 'Back & checked' },
  { status: 'closed', label: 'Closed' },
]

/** ORDER DETAIL: accept or decline a request, follow it out and back, release or claim the deposit. */
export function OrderPane({ o, l }: { o: Order; l: Listing }) {
  const orders = useOwner((s) => s.orders)
  const requests = useOwner((s) => s.requests)
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
  const related = requests.filter((r) => r.orderId === o.id)
  const stepIndex = STEPS.findIndex((s) => s.status === o.status)

  const doAccept = async () => {
    const usable = l.pieces.length - inRepair(l)
    const days = Array.from({ length: daysInclusive(o.from, o.to) }, (_, i) => addDays(o.from, i))
    const tight = days.find((d) => piecesBooked(l.id, orders, d) + o.qty > usable)
    if (tight) {
      const ok = await confirm({
        title: 'Not enough pieces free',
        message: `On ${formatDayShort(tight)} only ${Math.max(0, usable - piecesBooked(l.id, orders, tight))} of ${usable} are free. Accept anyway?`,
        confirmText: 'Accept anyway',
        tone: 'danger',
      })
      if (!ok) return
    }
    const hide = busy('Confirming with the renter…')
    await sleep(800)
    hide()
    accept(o.id)
    toast(`Accepted · ${o.renter.company} has been told`, { tone: 'success' })
  }

  const release = async () => {
    if (!(await confirm({ title: `Release ${formatINR(m.deposit)}?`, message: `The full deposit goes back to ${o.renter.company}.`, confirmText: 'Release', icon: ShieldCheckIcon }))) return
    settle(o.id, 0)
    toast('Deposit released · order closed', { tone: 'success' })
  }

  const actions =
    o.status === 'request' ? (
      <>
        <Button variant="secondary" icon={XCircleIcon} onClick={() => setDeclining((s) => ({ key: s.key + 1, open: true }))}>
          Decline
        </Button>
        <Button icon={CheckCircleIcon} onClick={doAccept}>
          Accept
        </Button>
      </>
    ) : o.status === 'confirmed' ? (
      <Button icon={TruckIcon} onClick={() => navigate(`/handover/${o.id}`)}>
        {o.from <= today ? 'Pack and hand over' : `Pack list · out ${formatDayShort(o.from)}`}
      </Button>
    ) : o.status === 'out' ? (
      <Button icon={PackageIcon} onClick={() => navigate(`/handover/${o.id}`)}>
        Check it back in
      </Button>
    ) : o.status === 'returned' ? (
      <>
        <Button variant="secondary" onClick={() => setClaiming((s) => ({ key: s.key + 1, open: true }))}>
          Claim
        </Button>
        <Button icon={ShieldCheckIcon} onClick={release}>
          Release deposit
        </Button>
      </>
    ) : undefined

  return (
    <div className="flex min-h-full flex-col">
      <PaneHeader
        title={`Order ${o.id}`}
        subtitle={`${o.project} · requested ${timeAgo(o.requestedAt)}`}
        meta={
          <>
            <Tag tone={ORDER_STATUS[o.status].tone} dot>
              {ORDER_STATUS[o.status].label}
            </Tag>
            {o.status === 'request' && <DueTag due={o.requestedAt + ANSWER_WINDOW} />}
            {o.status === 'returned' && o.returnedAt && <DueTag due={o.returnedAt + ANSWER_WINDOW} />}
          </>
        }
        actions={actions}
      />

      <div className="flex flex-col gap-4 p-5">
        <Banner tone={o.status === 'declined' ? 'neutral' : o.status === 'closed' ? 'success' : o.status === 'request' || o.status === 'returned' || late ? 'warning' : 'info'} icon={o.status === 'closed' ? CheckCircleIcon : o.status === 'declined' ? XCircleIcon : o.status === 'out' ? TruckIcon : PackageIcon}>
          {o.status === 'request' && 'Accept or decline within 24 hours, or it lapses.'}
          {o.status === 'confirmed' && `Goes out ${formatDayShort(o.from)}${o.delivery ? ' · you deliver' : ' · they collect'}.`}
          {o.status === 'out' && (late ? `${plural(late.days, 'day')} late · late fee ${formatINR(late.amount)} so far.` : `Due back ${formatDayShort(o.to)}.`)}
          {o.status === 'returned' && 'Back and checked. Release the deposit or claim for damage.'}
          {o.status === 'closed' && (o.deposit === 'claimed' ? `Deposit claimed: ${formatINR(o.claim)} kept.` : 'Deposit released in full.')}
          {o.status === 'declined' && `Declined: ${o.declineReason ?? 'no reason'}.`}
        </Banner>

        {/* Progress */}
        {o.status !== 'declined' && (
          <ol className="grid grid-cols-5 gap-1">
            {STEPS.map((s, i) => (
              <li key={s.status} className="min-w-0">
                <span className={cn('block h-1.5 rounded-full', i <= stepIndex ? (i === stepIndex && o.status !== 'closed' ? 'bg-accent' : 'bg-success') : 'bg-surface-3')} />
                <span className={cn('mt-1.5 block truncate text-[11px] font-semibold', i === stepIndex ? 'text-fg' : i < stepIndex ? 'text-fg-2' : 'text-subtle')}>{s.label}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <RenterCard renter={o.renter} />
          <Card className="overflow-hidden">
            <a {...linkProps(`/stock/${l.id}`)} className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2/70">
              <Thumb listing={l} className="size-14 rounded-lg" iconSize={22} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">
                  {l.name} × {o.qty}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
                  {formatDayShort(o.from)} <ArrowRightIcon size={12} /> {formatDayShort(o.to)} · {plural(m.days, 'day')}
                </span>
                <span className="block text-xs text-muted">{o.delivery ? 'You deliver' : 'They collect'}</span>
              </span>
            </a>
            {pieces.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-4 py-2.5">
                {pieces.map((p) => (
                  <span key={p.id} className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-semibold text-fg-2">
                    {p.code}
                  </span>
                ))}
                {o.outPhotos > 0 && <span className="text-xs text-muted">· {o.outPhotos} out photos</span>}
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="Money" subtitle="Hire · discount · fee · net" icon={ReceiptIcon} />
          <dl className="divide-y divide-line px-4">
            <KV label={`Hire · ${formatINR(m.hire / m.days / o.qty)}/day × ${m.days} × ${o.qty}`} value={formatINR(m.hire)} />
            {m.discount > 0 && <KV label="Discount you gave" value={`−${formatINR(m.discount)}`} />}
            <KV label={`${PLATFORM} fee (${Math.round(fee * 100)}%)`} value={`−${formatINR(m.fee)}`} />
            {o.claim > 0 && <KV label="Kept from deposit" value={`+${formatINR(o.claim)}`} />}
            {late && <KV label="Late fee so far" note="Added to their bill" value={`+${formatINR(late.amount)}`} />}
            <KV label="You get" value={formatINR(m.net + o.claim)} strong />
            <KV label="Deposit" value={`${formatINR(m.deposit)} · ${o.deposit ?? 'not taken yet'}`} />
          </dl>
        </Card>

        {related.length > 0 && (
          <Card>
            <CardHeader title="Messages about this order" />
            <ul className="divide-y divide-line">
              {related.map((r) => (
                <li key={r.id}>
                  <a {...linkProps(`/requests/${r.id}`)} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/70">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-fg">{KIND_TITLE[r.kind]}</span>
                      <span className="block truncate text-xs text-muted">{r.text}</span>
                    </span>
                    <Tag tone={r.status === 'open' ? 'warning' : 'success'}>{r.status === 'open' ? 'Open' : 'Answered'}</Tag>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <p className="text-xs text-muted">
          Requested {formatDayShort(toISODate(new Date(o.requestedAt)))} · {formatDateRangeShort(o.from, o.to)}
        </p>
      </div>

      <DeclineDialog
        key={`decline-${declining.key}`}
        open={declining.open}
        onClose={() => setDeclining((s) => ({ ...s, open: false }))}
        onDecline={(reason) => {
          decline(o.id, reason)
          setDeclining((s) => ({ ...s, open: false }))
          toast(`Declined · ${o.renter.company} has been told`)
        }}
      />
      <ClaimDialog
        key={`claim-${claiming.key}`}
        open={claiming.open}
        max={m.deposit}
        onClose={() => setClaiming((s) => ({ ...s, open: false }))}
        onClaim={(amount) => {
          settle(o.id, amount)
          setClaiming((s) => ({ ...s, open: false }))
          toast(`${formatINR(amount)} kept · ${formatINR(m.deposit - amount)} returned`, { tone: 'success' })
        }}
      />
    </div>
  )
}

/** Decline a booking request with a reason the renter sees. */
export function DeclineDialog({ open, onClose, onDecline }: { open: boolean; onClose: () => void; onDecline: (reason: string) => void }) {
  const [reason, setReason] = useState(DECLINE_REASONS[0])
  const [note, setNote] = useState('')
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Decline with a reason"
      description="The renter sees it, so they can look elsewhere quickly"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => onDecline(reason === 'Other' ? note.trim() || 'Other' : reason)}>
            Decline booking
          </Button>
        </>
      }
    >
      <div role="radiogroup" className="flex flex-col gap-1">
        {DECLINE_REASONS.map((r) => (
          <button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors', reason === r ? 'border-accent bg-accent-soft font-semibold text-accent-soft-fg' : 'border-line hover:bg-surface-2')}>
            <span className={cn('grid size-4 shrink-0 place-items-center rounded-full border-2', reason === r ? 'border-accent' : 'border-line-strong')}>{reason === r && <span className="size-1.5 rounded-full bg-accent" />}</span>
            {r}
          </button>
        ))}
      </div>
      {reason === 'Other' && <TextArea className="mt-4" label="Tell them why" rows={2} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />}
    </Dialog>
  )
}

function ClaimDialog({ open, max, onClose, onClaim }: { open: boolean; max: number; onClose: () => void; onClaim: (amount: number) => void }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Claim from the deposit"
      description={`Up to ${formatINR(max)}. The rest goes back to the renter.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const n = Number(amount)
              if (!n || n > max) return setError(`Enter an amount up to ${formatINR(max)}`)
              if (reason.trim().length < 5) return setError('Say what the claim is for')
              onClaim(n)
            }}
          >
            Claim {amount ? formatINR(Number(amount)) : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField
          label="Amount"
          prefix="₹"
          inputMode="numeric"
          autoFocus
          value={amount}
          error={error}
          onChange={(e) => {
            setAmount(e.target.value.replace(/\D/g, '').slice(0, 7))
            setError(undefined)
          }}
        />
        <TextArea label="What for?" rows={3} value={reason} hint="Photos from the return check are attached automatically" onChange={(e) => setReason(e.target.value)} />
        <Tag tone="info">Renters can dispute a claim within 48 hours</Tag>
      </div>
    </Dialog>
  )
}

/* ── Request detail ──────────────────────────────────────────────────────── */

const QUICK = ['Yes, it works.', 'Let me check and get back to you.', 'Sure, that’s fine.', 'Sorry, not possible this time.']

/** REQUEST DETAIL: answer a question, accept or decline a change, settle reported damage. */
export function RequestPane({ r, l, onDone }: { r: OwnerRequest; l: Listing; onDone?: () => void }) {
  const orders = useOwner((s) => s.orders)
  const answerRequest = useOwner((s) => s.answerRequest)
  const resolveChange = useOwner((s) => s.resolveChange)
  const resolveDamage = useOwner((s) => s.resolveDamage)
  const order = orders.find((o) => o.id === r.orderId)
  const [text, setText] = useState('')
  const [claim, setClaim] = useState(String(r.amount ?? ''))
  const [error, setError] = useState<string>()
  const open = r.status === 'open'

  const done = (msg: string) => {
    toast(msg, { tone: 'success' })
    onDone?.()
  }

  const extraDays = order && r.newTo ? daysInclusive(order.to, r.newTo) - 1 : 0
  const extraRent = order ? rateFor(l.dayRate, extraDays + daysInclusive(order.from, order.to)) * extraDays * order.qty : 0
  const clash = order && r.newTo ? Array.from({ length: extraDays }, (_, i) => addDays(order.to, i + 1)).find((d) => piecesBooked(l.id, orders, d) + order.qty > l.pieces.length - inRepair(l)) : undefined
  const depositHeld = order ? l.deposit * order.qty : 0

  const actions = !open ? undefined : r.kind === 'question' ? (
    <Button
      icon={PaperPlaneRightIcon}
      onClick={() => {
        if (text.trim().length < 2) return setError('Write an answer')
        answerRequest(r.id, text.trim())
        done('Answer sent')
      }}
    >
      Send answer
    </Button>
  ) : r.kind === 'change' ? (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          resolveChange(r.id, false, text.trim() || 'Sorry, the pieces aren’t free then.')
          done('Change declined')
        }}
      >
        Decline
      </Button>
      <Button
        icon={CheckCircleIcon}
        onClick={() => {
          resolveChange(r.id, true, text.trim() || 'Done, enjoy the extra day.')
          done(`Return moved to ${formatDayShort(r.newTo!)}`)
        }}
      >
        Accept · +{formatINR(extraRent)}
      </Button>
    </>
  ) : (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          resolveDamage(r.id, 0, 'No charge, thanks for telling us.')
          done('Waived · no charge')
        }}
      >
        Waive it
      </Button>
      <Button
        onClick={() => {
          const n = Number(claim)
          if (!n || n > depositHeld) return setError(`Enter an amount up to ${formatINR(depositHeld)}`)
          resolveDamage(r.id, n, text.trim() || `Repair cost ${formatINR(n)} from the deposit.`)
          done(`${formatINR(n)} claimed from the deposit`)
        }}
      >
        Claim {claim ? formatINR(Number(claim)) : ''}
      </Button>
    </>
  )

  return (
    <div className="flex min-h-full flex-col">
      <PaneHeader
        title={KIND_TITLE[r.kind]}
        subtitle={`${r.renter.company} · ${l.name}`}
        meta={open ? <DueTag due={r.at + ANSWER_WINDOW} /> : <Tag tone="success">Answered</Tag>}
      />
      <div className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <RenterCard renter={r.renter} />
          <Card className="overflow-hidden">
            <a {...linkProps(`/stock/${l.id}`)} className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2/70">
              <Thumb listing={l} className="size-12 rounded-lg" iconSize={20} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{l.name}</span>
                <span className="block text-[13px] text-muted">{order ? `${order.id} · ${plural(order.qty, 'piece')}` : 'Asked before booking'}</span>
              </span>
            </a>
            {order && (
              <a {...linkProps(`/orders/${order.id}`)} className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-[13px] font-semibold text-accent hover:bg-surface-2/70">
                <ReceiptIcon size={16} /> Open order
              </a>
            )}
          </Card>
        </div>

        {/* Conversation */}
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2/40 p-4">
          <div className="flex max-w-[85%] items-end gap-2">
            <Avatar name={r.renter.person} size="sm" />
            <div className="rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2.5 shadow-card">
              <p className="text-sm leading-relaxed text-fg">{r.text}</p>
              <p className="mt-1 text-[11px] text-subtle">
                {r.renter.person} · {timeAgo(r.at)}
              </p>
            </div>
          </div>
          {r.answer && (
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-accent-fg">
              <p className="text-sm leading-relaxed">{r.answer}</p>
              <p className="mt-1 text-[11px] opacity-75">You</p>
            </div>
          )}
        </div>

        {open && r.kind === 'change' && order && r.newTo && (
          <Card className="p-4">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
              <SwapIcon size={17} className="text-accent" /> Return moves {formatDayShort(order.to)} <ArrowRightIcon size={13} /> {formatDayShort(r.newTo)}
            </p>
            <p className="mt-1 text-[13px] text-muted">
              {plural(extraDays, 'extra day')} × {plural(order.qty, 'piece')} · you earn {formatINR(extraRent)} more before the fee
            </p>
            {clash ? (
              <Tag tone="danger" className="mt-2">
                <WarningIcon size={11} weight="fill" /> Pieces are booked on {formatDayShort(clash)}
              </Tag>
            ) : (
              <Tag tone="success" className="mt-2">
                Pieces are free on those days
              </Tag>
            )}
          </Card>
        )}

        {open && r.kind === 'damage' && (
          <Card className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <p className="text-sm text-fg-2">
              They estimate <span className="font-semibold text-fg">{formatINR(r.amount ?? 0)}</span> to fix. You hold a {formatINR(depositHeld)} deposit for this order.
            </p>
            <TextField
              label="Claim from the deposit"
              prefix="₹"
              inputMode="numeric"
              value={claim}
              error={error}
              onChange={(e) => {
                setClaim(e.target.value.replace(/\D/g, '').slice(0, 7))
                setError(undefined)
              }}
            />
          </Card>
        )}

        {open && (
          <Card className="p-4">
            {r.kind === 'question' && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {QUICK.map((q) => (
                  <Chip key={q} onClick={() => setText(q)}>
                    {q}
                  </Chip>
                ))}
              </div>
            )}
            <TextArea
              label={r.kind === 'question' ? 'Your answer' : 'Note to the renter'}
              optional={r.kind !== 'question'}
              rows={3}
              value={text}
              error={r.kind === 'question' ? error : undefined}
              onChange={(e) => {
                setText(e.target.value)
                setError(undefined)
              }}
            />
            <div className="mt-3 flex flex-wrap justify-end gap-2">{actions}</div>
          </Card>
        )}
      </div>
    </div>
  )
}

