import { ArrowBendUpLeftIcon, StarIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { ratingSummary, type OwnerReview } from '@/lib/owner'
import { useOwner } from '@/store/owner'
import { plural } from '~/lib/data'
import { linkProps } from '~/router'
import { Button, Chip, Segmented, Stepper, Switch, TextArea, TextField } from '~/ui/controls'
import { Avatar, Card, CardHeader } from '~/ui/display'
import { toast } from '~/ui/feedback'
import { ProfileLayout } from './Profile'

/** Policies → Deposit multiple · Turnaround days · Modify by default */
export function PoliciesPage() {
  const policies = useOwner((s) => s.policies)
  const setPolicies = useOwner((s) => s.setPolicies)
  const listings = useOwner((s) => s.listings)
  const updateListing = useOwner((s) => s.updateListing)
  const differentTurnaround = listings.filter((l) => l.bufferDays !== policies.turnaround).length
  const differentDeposit = listings.filter((l) => l.deposit !== l.dayRate * policies.depositMultiple).length

  const applyAll = (what: 'turnaround' | 'deposit') => {
    const before = listings.map((l) => ({ id: l.id, bufferDays: l.bufferDays, deposit: l.deposit }))
    for (const l of listings) updateListing(l.id, what === 'turnaround' ? { bufferDays: policies.turnaround } : { deposit: l.dayRate * policies.depositMultiple })
    toast(`Applied to all ${listings.length} listings`, {
      tone: 'success',
      action: { label: 'Undo', onClick: () => before.forEach((b) => useOwner.getState().updateListing(b.id, { bufferDays: b.bufferDays, deposit: b.deposit })) },
    })
  }

  return (
    <ProfileLayout section="policies" title="Policies" subtitle="Defaults for new listings">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Deposit multiple" subtitle="Deposit per piece, as a multiple of the day rate" />
          <div className="p-4">
            <Segmented options={[1, 2, 3, 5].map((n) => ({ value: String(n), label: `${n}×` }))} value={String(policies.depositMultiple)} onChange={(v) => setPolicies({ depositMultiple: Number(v) })} />
            <p className="mt-3 text-[13px] text-muted">
              A {formatINR(450)}/day phone takes a {formatINR(450 * policies.depositMultiple)} deposit. Higher deposits protect fragile pieces; lower ones get more bookings.
            </p>
            {differentDeposit > 0 && (
              <Button size="sm" variant="tonal" className="mt-3" onClick={() => applyAll('deposit')}>
                Apply to {plural(differentDeposit, 'existing listing')}
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Turnaround days" subtitle="Kept free before and after each booking to clean, fix and pack" />
          <div className="flex flex-wrap items-center gap-3 p-4">
            <span className="mr-auto text-sm font-medium text-fg">{plural(policies.turnaround, 'day')} either side</span>
            {differentTurnaround > 0 && (
              <Button size="sm" variant="tonal" onClick={() => applyAll('turnaround')}>
                Apply to {plural(differentTurnaround, 'existing listing')}
              </Button>
            )}
            <Stepper value={policies.turnaround} min={0} max={3} label="Turnaround days" onChange={(turnaround) => setPolicies({ turnaround })} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Modifications" />
          <div className="flex items-center gap-3 p-4">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-fg">Allow modification by default</span>
              <span className="block text-[13px] text-muted">New listings let renters ask to repaint or alter them. You still approve every request before delivery.</span>
            </span>
            <Switch checked={policies.modifyDefault} onChange={(modifyDefault) => setPolicies({ modifyDefault })} label="Allow modification by default" />
          </div>
        </Card>
      </div>
    </ProfileLayout>
  )
}

/** Delivery → I deliver · Radius · Charge per trip · Per km beyond */
export function DeliveryPage() {
  const delivery = useOwner((s) => s.delivery)
  const setDelivery = useOwner((s) => s.setDelivery)
  const [perTrip, setPerTrip] = useState(String(delivery.perTrip))
  const [perKm, setPerKm] = useState(String(delivery.perKm))
  const dirty = Number(perTrip) !== delivery.perTrip || Number(perKm) !== delivery.perKm
  const example = 40
  const exampleCost = (Number(perTrip) || 0) + Math.max(0, example - delivery.radiusKm) * (Number(perKm) || 0)

  return (
    <ProfileLayout section="delivery" title="Delivery" subtitle="Whether you drop off and pick up, and what it costs renters">
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex items-center gap-3 p-4">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-fg">I deliver</span>
              <span className="block text-[13px] text-muted">{delivery.enabled ? 'You drop off and pick up. Renters see “Delivers to set”.' : 'Renters arrange their own pickup'}</span>
            </span>
            <Switch
              checked={delivery.enabled}
              label="I deliver"
              onChange={(enabled) => {
                setDelivery({ enabled })
                toast(enabled ? 'You now deliver to set' : 'Renters will collect', { tone: 'success' })
              }}
            />
          </div>
        </Card>

        {delivery.enabled && (
          <>
            <Card>
              <CardHeader title="Radius" subtitle="Trips inside this cost the flat charge" />
              <div className="flex flex-wrap gap-2 p-4">
                {[10, 25, 50, 100].map((km) => (
                  <Chip key={km} selected={delivery.radiusKm === km} onClick={() => setDelivery({ radiusKm: km })}>
                    {km === 100 ? 'All Mumbai (100 km)' : `${km} km`}
                  </Chip>
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader title="Charges" />
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                <TextField label="Charge per trip" prefix="₹" inputMode="numeric" value={perTrip} onChange={(e) => setPerTrip(e.target.value.replace(/\D/g, '').slice(0, 5))} />
                <TextField label="Per km beyond the radius" prefix="₹" inputMode="numeric" value={perKm} onChange={(e) => setPerKm(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                <p className="rounded-lg bg-surface-2 px-4 py-3 text-[13px] text-fg-2 sm:col-span-2">
                  A set {example} km away costs the renter <span className="font-bold text-fg">{formatINR(exampleCost)}</span> each way: {formatINR(Number(perTrip) || 0)} + {Math.max(0, example - delivery.radiusKm)} km × {formatINR(Number(perKm) || 0)}.
                </p>
              </div>
              <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
                <Button
                  variant="secondary"
                  disabled={!dirty}
                  onClick={() => {
                    setPerTrip(String(delivery.perTrip))
                    setPerKm(String(delivery.perKm))
                  }}
                >
                  Reset
                </Button>
                <Button
                  disabled={!dirty}
                  onClick={() => {
                    setDelivery({ perTrip: Number(perTrip) || 0, perKm: Number(perKm) || 0 })
                    toast('Delivery charges saved', { tone: 'success' })
                  }}
                >
                  Save charges
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </ProfileLayout>
  )
}

/** Reviews → Rating · Breakdown · Unreplied count · Review → Reply */
export function ReviewsPage() {
  const reviews = useOwner((s) => s.reviews)
  const listings = useOwner((s) => s.listings)
  const [filter, setFilter] = useState<'all' | 'unreplied'>('all')
  const [stars, setStars] = useState<number | null>(null)
  const sum = ratingSummary(reviews)
  const shown = [...reviews].filter((r) => (filter === 'all' || !r.reply) && (!stars || r.rating === stars)).sort((a, b) => b.at - a.at)

  return (
    <ProfileLayout section="reviews" title="Reviews" subtitle={`${plural(reviews.length, 'review')} from renters · replies are public on your vendor page`}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="h-fit p-5 xl:sticky xl:top-4">
          <div className="flex items-end gap-3">
            <p className="font-display text-5xl font-extrabold leading-none tabular-nums text-fg">{sum.avg.toFixed(1)}</p>
            <div className="pb-1">
              <p className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <StarIcon key={n} size={15} weight="fill" className={n <= Math.round(sum.avg) ? 'text-amber-500' : 'text-line-strong'} />
                ))}
              </p>
              <p className="mt-0.5 text-xs text-muted">{plural(reviews.length, 'review')}</p>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            {sum.counts.map(({ star, n }) => (
              <button key={star} type="button" onClick={() => setStars(stars === star ? null : star)} className={cn('flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors', stars === star ? 'bg-accent-soft' : 'hover:bg-surface-2')}>
                <span className="w-3 text-right font-semibold text-fg-2">{star}</span>
                <StarIcon size={11} weight="fill" className="text-amber-500" />
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <span className="block h-full rounded-full bg-amber-500" style={{ width: `${reviews.length ? (n / reviews.length) * 100 : 0}%` }} />
                </span>
                <span className="w-4 text-right tabular-nums text-muted">{n}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-accent-soft px-3 py-2 text-[13px] text-accent-soft-fg">
            <span className="font-bold">{sum.unreplied}</span> unreplied · replying lifts repeat bookings
          </p>
        </Card>

        <div className="flex min-w-0 flex-col gap-3">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: reviews.length },
              { value: 'unreplied', label: 'Unreplied', count: sum.unreplied },
            ]}
            className="self-start"
          />
          {shown.map((r) => (
            <ReviewCard key={r.id} review={r} listingName={listings.find((l) => l.id === r.listingId)?.name} />
          ))}
          {shown.length === 0 && <Card className="p-6 text-center text-sm text-muted">{filter === 'unreplied' ? 'Every review has a reply. Nice.' : 'No reviews match.'}</Card>}
        </div>
      </div>
    </ProfileLayout>
  )
}

function ReviewCard({ review: r, listingName }: { review: OwnerReview; listingName?: string }) {
  const reply = useOwner((s) => s.replyReview)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(() => (r.rating >= 5 ? 'Thank you! Hope to see you on the next shoot.' : ''))
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Avatar name={r.renter} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{r.renter}</p>
          <a {...linkProps(`/stock/${r.listingId}`)} className="block truncate text-xs text-muted hover:text-accent hover:underline">
            {listingName}
          </a>
        </div>
        <p className="flex gap-0.5" aria-label={`${r.rating} out of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <StarIcon key={n} size={13} weight="fill" className={n <= r.rating ? 'text-amber-500' : 'text-line-strong'} />
          ))}
        </p>
        <span className="shrink-0 text-xs text-subtle">{timeAgo(r.at)}</span>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-fg">{r.text}</p>
      {r.reply ? (
        <div className="mt-3 border-l-2 border-accent bg-surface-2/60 py-2 pl-3 pr-2">
          <p className="text-xs font-semibold text-fg-2">Your reply</p>
          <p className="text-sm text-fg">{r.reply}</p>
        </div>
      ) : open ? (
        <div className="mt-3">
          <TextArea label="Your reply" rows={3} value={text} autoFocus onChange={(e) => setText(e.target.value)} hint="Replies are public on your vendor page" />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={text.trim().length < 2}
              onClick={() => {
                reply(r.id, text.trim())
                toast('Reply posted', { tone: 'success' })
              }}
            >
              Post reply
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="tonal" icon={ArrowBendUpLeftIcon} className="mt-3" onClick={() => setOpen(true)}>
          Reply
        </Button>
      )}
    </Card>
  )
}
