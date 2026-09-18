import { CameraIcon, CheckCircleIcon, ClockCountdownIcon, PackageIcon, ReceiptIcon, TruckIcon, WarningIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { ListingThumb } from '@/components/owner/OwnerUI'
import { usePhotoPicker } from '@/components/usePhotoPicker'
import { PHOTO_ANGLES } from '@/data/owner'
import { cn } from '@/lib/cn'
import { formatDayShort, todayISO } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { downscaleImage } from '@/lib/image'
import { lateFee, type Listing, type Order } from '@/lib/owner'
import { nav, useParams } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useOwner } from '@/store/owner'
import { AppBar, Button, Card, CheckboxVisual, EmptyState, Screen, SectionHeader, Tag, TextField } from '@/ui'

export default function HandoverScreen() {
  const { id } = useParams<{ id: string }>()
  const order = useOwner((s) => s.orders.find((o) => o.id === id))
  const listing = useOwner((s) => s.listings.find((l) => l.id === order?.listingId))
  if (!order || !listing) {
    return (
      <Screen header={<AppBar title="Handover" />}>
        <EmptyState icon={PackageIcon} title="Handover not found" action={<Button onClick={() => nav.pop()}>Go back</Button>} />
      </Screen>
    )
  }
  if (order.status === 'confirmed') return <PackList o={order} l={listing} />
  if (order.status === 'out') return <CheckIn o={order} l={listing} />
  return (
    <Screen header={<AppBar title={`Handover ${order.id}`} />}>
      <EmptyState
        icon={CheckCircleIcon}
        title={order.status === 'request' ? 'Not accepted yet' : 'Already back'}
        description={order.status === 'request' ? 'Accept the booking first, then pack it here.' : 'This order has been checked in.'}
        action={<Button onClick={() => nav.replace(`/renter/orders/${order.id}`)}>Open order</Button>}
      />
    </Screen>
  )
}

/** Going out → Pack list: pick the pieces, tick them off, take out photos, hand over. */
function PackList({ o, l }: { o: Order; l: Listing }) {
  const popup = usePopup()
  const orders = useOwner((s) => s.orders)
  const dispatch = useOwner((s) => s.dispatchOrder)
  // Pieces in the yard: not in repair and not out with someone else.
  const busy = new Set(orders.filter((x) => x.status === 'out').flatMap((x) => x.pieceIds))
  const available = l.pieces.filter((p) => !p.repair && !busy.has(p.id))
  const [packed, setPacked] = useState<string[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const picker = usePhotoPicker({
    title: 'Out photo',
    description: 'Front, back and any existing marks',
    sample: { url: 'sample', label: 'A placeholder photo' },
    onPick: async ({ url, file }) => {
      const p = file ? await downscaleImage(file, 900, 0.75) : 'sample'
      if (file) URL.revokeObjectURL(url)
      setPhotos((x) => [...x, p])
    },
  })
  const ready = packed.length === o.qty && photos.length > 0

  const handOver = () => {
    dispatch(o.id, packed, photos.length)
    haptic('success')
    nav.pop()
    popup.toast(`Out with ${o.renter.company} · back ${formatDayShort(o.to)}`, { tone: 'success' })
  }

  return (
    <Screen
      header={<AppBar title="Pack list" subtitle={`${o.id} · ${o.renter.company}`} />}
      footer={
        <div className="@medium:mx-auto @medium:max-w-md">
          <Button size="lg" block icon={TruckIcon} disabled={!ready} onClick={handOver}>
            {ready ? 'Hand over' : packed.length < o.qty ? `Tick ${o.qty - packed.length} more piece${o.qty - packed.length === 1 ? '' : 's'}` : 'Take at least one out photo'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 px-4 pb-10 pt-1 @medium:mx-auto @medium:max-w-2xl">
        <Card className="flex items-center gap-3 p-3.5">
          <ListingThumb listing={l} className="size-14 shrink-0 rounded-xl" iconSize={22} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-fg">
              {l.name} × {o.qty}
            </p>
            <p className="text-[13px] text-muted">
              {formatDayShort(o.from)} – {formatDayShort(o.to)} · {o.delivery ? 'you deliver' : 'they collect'}
            </p>
          </div>
        </Card>

        <SectionHeader title="Pieces to pack" subtitle={`Tick ${o.qty} · ${packed.length} done`} className="px-1 pt-3" />
        <Card className="overflow-hidden">
          {available.map((p) => {
            const on = packed.includes(p.id)
            const full = !on && packed.length >= o.qty
            return (
              <button
                key={p.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={full}
                onClick={() => {
                  haptic()
                  setPacked((x) => (on ? x.filter((y) => y !== p.id) : [...x, p.id]))
                }}
                className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2 disabled:opacity-45"
              >
                <CheckboxVisual checked={on} />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-semibold tracking-wide text-fg">{p.code}</span>
                  <span className="block text-[13px] text-muted">{p.condition} · in yard</span>
                </span>
                <span aria-hidden className="absolute bottom-0 left-12 right-0 h-px bg-line group-last:hidden" />
              </button>
            )
          })}
          {available.length < o.qty && <p className="px-4 py-3 text-[13px] text-warning">Only {available.length} pieces are in the yard. Bring one back from repair first.</p>}
        </Card>

        <SectionHeader title="Out photos" subtitle="They’re compared when it comes back" className="px-1 pt-3" />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {photos.map((p, i) => (
            <span key={i} className="relative shrink-0">
              <ListingThumb listing={{ ...l, photos: [p] }} className="size-20 rounded-2xl" iconSize={24} />
              <span className="absolute bottom-1 left-1 rounded bg-fg/70 px-1 text-[10px] font-bold text-bg">{PHOTO_ANGLES[i % PHOTO_ANGLES.length]}</span>
            </span>
          ))}
          <button type="button" onClick={picker.pick} className="grid size-20 shrink-0 place-items-center rounded-2xl border-2 border-dashed border-line-strong text-muted">
            <span className="flex flex-col items-center gap-0.5 text-[11px] font-semibold">
              <CameraIcon size={22} /> Photo
            </span>
          </button>
        </div>
      </div>
      {picker.element}
    </Screen>
  )
}

/** Coming back → Check against out photos, piece by piece. */
function CheckIn({ o, l }: { o: Order; l: Listing }) {
  const popup = usePopup()
  const returnOrder = useOwner((s) => s.returnOrder)
  const today = todayISO()
  const late = o.to < today ? lateFee(o, l, today) : null
  const pieces = l.pieces.filter((p) => o.pieceIds.includes(p.id))
  const [marks, setMarks] = useState<Record<string, 'ok' | 'damaged'>>({})
  const [note, setNote] = useState('')
  const [cost, setCost] = useState('')
  const damaged = pieces.filter((p) => marks[p.id] === 'damaged')
  const allChecked = pieces.every((p) => marks[p.id])

  const finish = () => {
    if (damaged.length && (note.trim().length < 3 || !Number(cost))) {
      haptic('warning')
      return popup.toast('Describe the damage and the repair cost', { tone: 'error' })
    }
    returnOrder(o.id, damaged.length ? { amount: Number(cost), note: `${damaged.map((p) => p.code).join(', ')}: ${note.trim()}` } : null)
    haptic('success')
    nav.replace(`/renter/orders/${o.id}`)
    popup.toast(damaged.length ? 'Checked in · damage report opened' : 'Checked in · release the deposit when ready', { tone: 'success' })
  }

  return (
    <Screen
      header={<AppBar title="Check it back in" subtitle={`${o.id} · ${o.renter.company}`} />}
      footer={
        <div className="@medium:mx-auto @medium:max-w-md">
          <Button size="lg" block icon={CheckCircleIcon} disabled={!allChecked} onClick={finish}>
            {allChecked ? (damaged.length ? 'Check in and report damage' : 'Mark returned') : `Check ${pieces.filter((p) => !marks[p.id]).length} more`}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 px-4 pb-10 pt-1 @medium:mx-auto @medium:max-w-2xl">
        {late && (
          <div className="flex items-center gap-3 rounded-2xl bg-danger-soft p-3.5">
            <ClockCountdownIcon size={22} weight="fill" className="shrink-0 text-danger" />
            <p className="text-[13px] text-fg-2">
              <span className="font-bold text-danger">
                {late.days} day{late.days === 1 ? '' : 's'} late
              </span>{' '}
              · late fee {formatINR(late.amount)} is added to their bill.
            </p>
          </div>
        )}
        <p className="px-1 text-[13px] text-muted">Compare each piece with the {o.outPhotos} photos taken when it went out.</p>
        {pieces.map((p) => {
          const m = marks[p.id]
          return (
            <Card key={p.id} className="p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold tracking-wide text-fg">{p.code}</p>
                <Tag tone="neutral">Went out {p.condition.toLowerCase()}</Tag>
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {PHOTO_ANGLES.map((a) => (
                  <span key={a} className="relative">
                    <ListingThumb listing={l} className="aspect-square w-full rounded-xl" iconSize={22} />
                    <span className="absolute bottom-1 left-1 rounded bg-fg/70 px-1 text-[10px] font-bold text-bg">Out · {a}</span>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  aria-pressed={m === 'ok'}
                  onClick={() => setMarks((x) => ({ ...x, [p.id]: 'ok' }))}
                  className={cn('flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors', m === 'ok' ? 'bg-success text-white' : 'bg-surface-2 text-fg-2')}
                >
                  <CheckCircleIcon size={17} weight={m === 'ok' ? 'fill' : 'regular'} /> Same as out
                </button>
                <button
                  type="button"
                  aria-pressed={m === 'damaged'}
                  onClick={() => setMarks((x) => ({ ...x, [p.id]: 'damaged' }))}
                  className={cn('flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors', m === 'damaged' ? 'bg-danger text-white' : 'bg-surface-2 text-fg-2')}
                >
                  <WarningIcon size={17} weight={m === 'damaged' ? 'fill' : 'regular'} /> Damaged
                </button>
              </div>
            </Card>
          )
        })}
        {damaged.length > 0 && (
          <Card className="space-y-3 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-danger">
              <WarningIcon size={17} weight="fill" /> Damage on {damaged.map((p) => p.code).join(', ')}
            </p>
            <TextField label="What’s wrong?" value={note} onChange={(e) => setNote(e.target.value)} />
            <TextField label="Repair cost" prefix="₹" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value.replace(/\D/g, '').slice(0, 7))} hint={`You hold ${formatINR(l.deposit * o.qty)} as deposit`} />
          </Card>
        )}
        <button type="button" onClick={() => nav.push(`/renter/orders/${o.id}`)} className="flex items-center gap-2 px-1 text-sm font-semibold text-accent">
          <ReceiptIcon size={16} /> Open order
        </button>
      </div>
    </Screen>
  )
}
