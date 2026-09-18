import { ArrowRightIcon, ChatCircleTextIcon, CheckCircleIcon, PaperPlaneRightIcon, ReceiptIcon, SwapIcon, WarningIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { DueTag, ListingThumb } from '@/components/owner/OwnerUI'
import { addDays, daysInclusive, formatDayShort, timeAgo } from '@/lib/dates'
import { formatINR, formatPhone } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { ANSWER_WINDOW, inRepair, piecesBooked, rateFor, type Listing, type OwnerRequest } from '@/lib/owner'
import { nav, useParams } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useOwner } from '@/store/owner'
import { AppBar, Avatar, Button, Card, Chip, EmptyState, Screen, Tag, TextArea, TextField } from '@/ui'

const TITLE: Record<OwnerRequest['kind'], string> = { question: 'Question about an item', change: 'Change request', damage: 'Damage reported' }
const QUICK = ['Yes, it works.', 'Let me check and get back to you.', 'Sure, that’s fine.', 'Sorry, not possible this time.']

export default function RequestDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const request = useOwner((s) => s.requests.find((r) => r.id === id))
  const listing = useOwner((s) => s.listings.find((l) => l.id === request?.listingId))
  if (!request || !listing) {
    return (
      <Screen header={<AppBar title="Request" />}>
        <EmptyState icon={ChatCircleTextIcon} title="Request not found" action={<Button onClick={() => nav.pop()}>Go back</Button>} />
      </Screen>
    )
  }
  return <RequestDetail r={request} l={listing} />
}

/** REQUEST DETAIL: answer a question, accept or decline a change, settle reported damage. */
function RequestDetail({ r, l }: { r: OwnerRequest; l: Listing }) {
  const popup = usePopup()
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
    haptic('success')
    popup.toast(msg, { tone: 'success' })
    nav.pop()
  }

  // Change request: extra days, the extra rent, and whether pieces are free.
  const extraDays = order && r.newTo ? daysInclusive(order.to, r.newTo) - 1 : 0
  const extraRent = order ? rateFor(l.dayRate, extraDays + daysInclusive(order.from, order.to)) * extraDays * order.qty : 0
  const clash =
    order && r.newTo
      ? Array.from({ length: extraDays }, (_, i) => addDays(order.to, i + 1)).find((d) => piecesBooked(l.id, orders, d) + order.qty > l.pieces.length - inRepair(l))
      : undefined
  const depositHeld = order ? l.deposit * order.qty : 0

  return (
    <Screen
      header={<AppBar title={TITLE[r.kind]} subtitle={r.renter.company} />}
      footer={
        open ? (
          <div className="@medium:mx-auto @medium:max-w-md">
            {r.kind === 'question' && (
              <Button
                size="lg"
                block
                icon={PaperPlaneRightIcon}
                onClick={() => {
                  if (text.trim().length < 2) return setError('Write an answer')
                  answerRequest(r.id, text.trim())
                  done('Answer sent')
                }}
              >
                Send answer
              </Button>
            )}
            {r.kind === 'change' && (
              <div className="flex gap-2.5">
                <Button
                  size="lg"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    resolveChange(r.id, false, text.trim() || 'Sorry, the pieces aren’t free then.')
                    done('Change declined')
                  }}
                >
                  Decline
                </Button>
                <Button
                  size="lg"
                  className="flex-[2]"
                  icon={CheckCircleIcon}
                  onClick={() => {
                    resolveChange(r.id, true, text.trim() || 'Done, enjoy the extra day.')
                    done(`Return moved to ${formatDayShort(r.newTo!)}`)
                  }}
                >
                  Accept · +{formatINR(extraRent)}
                </Button>
              </div>
            )}
            {r.kind === 'damage' && (
              <div className="flex gap-2.5">
                <Button
                  size="lg"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    resolveDamage(r.id, 0, 'No charge, thanks for telling us.')
                    done('Waived · no charge')
                  }}
                >
                  Waive it
                </Button>
                <Button
                  size="lg"
                  className="flex-[2]"
                  onClick={() => {
                    const n = Number(claim)
                    if (!n || n > depositHeld) return setError(`Enter an amount up to ${formatINR(depositHeld)}`)
                    resolveDamage(r.id, n, text.trim() || `Repair cost ${formatINR(n)} from the deposit.`)
                    done(`${formatINR(n)} claimed from the deposit`)
                  }}
                >
                  Claim {claim ? formatINR(Number(claim)) : ''}
                </Button>
              </div>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-3 px-4 pb-10 pt-1 @medium:mx-auto @medium:max-w-2xl">
        <Card className="flex items-center gap-3 p-3.5">
          <Avatar name={r.renter.company} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-fg">{r.renter.company}</p>
            <p className="truncate text-[13px] text-muted">
              {r.renter.person} · {formatPhone(r.renter.phone)}
            </p>
          </div>
          {open ? <DueTag due={r.at + ANSWER_WINDOW} /> : <Tag tone="success">Answered</Tag>}
        </Card>

        <Card className="overflow-hidden">
          <button type="button" onClick={() => nav.push(`/renter/stock/${l.id}`)} className="flex w-full items-center gap-3 p-3 text-left transition-colors active:bg-surface-2">
            <ListingThumb listing={l} className="size-12 shrink-0 rounded-xl" iconSize={20} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-fg">{l.name}</span>
              <span className="block text-[13px] text-muted">{order ? `${order.id} · ${order.qty} piece${order.qty === 1 ? '' : 's'}` : 'Asked before booking'}</span>
            </span>
          </button>
          {order && (
            <button type="button" onClick={() => nav.push(`/renter/orders/${order.id}`)} className="flex w-full items-center gap-2 border-t border-line px-3.5 py-2.5 text-left text-[13px] font-semibold text-accent">
              <ReceiptIcon size={16} /> Open order
            </button>
          )}
        </Card>

        {/* The conversation */}
        <div className="space-y-2 pt-1">
          <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-surface p-3.5 shadow-card">
            <p className="text-[15px] leading-relaxed text-fg">{r.text}</p>
            <p className="mt-1 text-[11px] text-subtle">
              {r.renter.person} · {timeAgo(r.at)}
            </p>
          </div>
          {r.answer && (
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-accent p-3.5 text-accent-fg">
              <p className="text-[15px] leading-relaxed">{r.answer}</p>
              <p className="mt-1 text-[11px] opacity-75">You</p>
            </div>
          )}
        </div>

        {open && r.kind === 'change' && order && r.newTo && (
          <Card className="p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-fg">
              <SwapIcon size={17} className="text-accent" /> Return moves {formatDayShort(order.to)} <ArrowRightIcon size={13} /> {formatDayShort(r.newTo)}
            </p>
            <p className="mt-1 text-[13px] text-muted">
              {extraDays} extra day{extraDays === 1 ? '' : 's'} × {order.qty} piece{order.qty === 1 ? '' : 's'} · you earn {formatINR(extraRent)} more before the fee
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
          <Card className="space-y-3 p-4">
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
          <div className="space-y-2.5">
            {r.kind === 'question' && (
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                {QUICK.map((q) => (
                  <Chip key={q} onClick={() => setText(q)}>
                    {q}
                  </Chip>
                ))}
              </div>
            )}
            <TextArea
              label={r.kind === 'question' ? 'Your answer' : 'Note to the renter (optional)'}
              rows={3}
              value={text}
              error={r.kind === 'question' ? error : undefined}
              onChange={(e) => {
                setText(e.target.value)
                setError(undefined)
              }}
            />
          </div>
        )}
      </div>
    </Screen>
  )
}
