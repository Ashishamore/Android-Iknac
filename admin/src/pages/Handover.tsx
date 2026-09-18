import {
  ArrowUUpLeftIcon,
  CameraIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  ImageSquareIcon,
  PackageIcon,
  QrCodeIcon,
  ReceiptIcon,
  ScanIcon,
  TruckIcon,
  UploadSimpleIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { PHOTO_ANGLES } from '@/data/owner'
import { cn } from '@/lib/cn'
import { formatDayShort, todayISO } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { lateFee, type Listing, type Order } from '@/lib/owner'
import { useOwner } from '@/store/owner'
import { plural } from '~/lib/data'
import { linkProps, navigate } from '~/router'
import { Button, Checkbox, TextField } from '~/ui/controls'
import { Banner, Card, CardHeader, EmptyState, PageHeader, Tag, Thumb } from '~/ui/display'
import { busy, sleep, toast } from '~/ui/feedback'
import { PhotoPicker } from './add/ListingForm'

/** Scan a code → Handover. Type or scan an order ID or a piece's tag code, or pick from today's moves. */
export function HandoverHome() {
  const orders = useOwner((s) => s.orders)
  const listings = useOwner((s) => s.listings)
  const today = todayISO()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const listingOf = (id: string) => listings.find((l) => l.id === id)!

  const rank = (o: Order) => (o.status === 'out' && o.to < today ? 0 : o.status === 'out' && o.to === today ? 1 : o.status === 'confirmed' && o.from <= today ? 2 : 3)
  const list = orders.filter((o) => o.status === 'out' || o.status === 'confirmed').sort((a, b) => rank(a) - rank(b) || a.from.localeCompare(b.from))
  const groups = [
    { title: 'Overdue returns', note: 'Late fee running', icon: ClockCountdownIcon, tone: 'text-danger', orders: list.filter((o) => rank(o) === 0) },
    { title: 'Coming back today', note: 'Check against out photos', icon: ArrowUUpLeftIcon, tone: 'text-warning', orders: list.filter((o) => rank(o) === 1) },
    { title: 'Going out', note: 'Pack list', icon: TruckIcon, tone: 'text-accent', orders: list.filter((o) => rank(o) === 2) },
    { title: 'Later', note: 'Upcoming and out', icon: PackageIcon, tone: 'text-muted', orders: list.filter((o) => rank(o) === 3) },
  ]

  const find = (raw: string) => {
    const c = raw.trim().toUpperCase()
    return list.find((o) => o.id === c || listingOf(o.listingId).pieces.some((p) => p.code === c && (o.pieceIds.includes(p.id) || o.status === 'confirmed'))) ?? null
  }

  const open = async (o: Order) => {
    const hide = busy(`Reading ${o.id}…`)
    await sleep(700)
    hide()
    navigate(`/handover/${o.id}`)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const o = find(code)
    if (!o) return setError('No handover matches that code. Try an order ID like OR-2049 or a tag like KP-RP-01.')
    void open(o)
  }

  return (
    <>
      <PageHeader crumbs={[{ label: 'Handover' }]} title="Scan a code" subtitle="Scan or type an order ID or a piece’s tag code to pack it or check it back in" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden">
          <div className="relative grid place-items-center bg-[#101318] px-6 py-10 text-white">
            <div className="relative grid size-44 place-items-center">
              {['left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl'].map((c) => (
                <span key={c} aria-hidden className={cn('absolute size-9 border-white/85', c)} />
              ))}
              <QrCodeIcon size={72} weight="thin" className="text-white/40" />
            </div>
            <p className="mt-4 text-center text-[13px] text-white/70">Point a USB or phone scanner at the tag. It types the code below.</p>
          </div>
          <form onSubmit={submit} className="space-y-3 p-4">
            <TextField
              label="Order ID or tag code"
              autoFocus
              placeholder="OR-2049 or KP-RP-01"
              value={code}
              error={error}
              inputClassName="font-mono uppercase tracking-wide"
              onChange={(e) => {
                setCode(e.target.value)
                setError(undefined)
              }}
            />
            <div className="flex gap-2">
              <Button type="submit" icon={ScanIcon} className="flex-1" disabled={!code.trim()}>
                Find handover
              </Button>
              <Button variant="secondary" className="flex-1" disabled={!list.length} onClick={() => list[0] && open(list[0])}>
                Demo: scan next
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Handovers" subtitle={list.length ? `${plural(list.length, 'order')} confirmed or out` : 'Nothing to hand over'} />
          {list.length === 0 ? (
            <EmptyState icon={CheckCircleIcon} title="Nothing to hand over" description="Confirmed bookings and pieces out with production appear here." />
          ) : (
            <div className="divide-y divide-line">
              {groups
                .filter((g) => g.orders.length)
                .map((g) => (
                  <div key={g.title} className="py-1">
                    <p className={cn('flex items-center gap-2 px-4 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-[0.08em]', g.tone)}>
                      <g.icon size={14} weight="bold" /> {g.title} · {g.orders.length}
                      <span className="ml-auto font-semibold normal-case tracking-normal text-muted">{g.note}</span>
                    </p>
                    {g.orders.map((o) => {
                      const l = listingOf(o.listingId)
                      const late = o.status === 'out' && o.to < today ? lateFee(o, l, today) : null
                      return (
                        <a key={o.id} {...linkProps(`/handover/${o.id}`)} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/70">
                          <Thumb listing={l} className="size-10 rounded-lg" iconSize={18} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-fg">
                              {l.name} × {o.qty}
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {o.id} · {o.renter.company} · {o.status === 'out' ? `back ${formatDayShort(o.to)}` : `out ${formatDayShort(o.from)}`}
                            </span>
                          </span>
                          {late ? (
                            <Tag tone="danger">
                              {late.days}d late · {formatINR(late.amount)}
                            </Tag>
                          ) : (
                            <Tag tone={o.status === 'out' ? 'info' : 'brand'} dot>
                              {o.status === 'out' ? 'Check in' : 'Pack'}
                            </Tag>
                          )}
                          <CaretRightIcon size={14} weight="bold" className="shrink-0 text-subtle" />
                        </a>
                      )
                    })}
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}

export function HandoverDetail({ id }: { id: string }) {
  const order = useOwner((s) => s.orders.find((o) => o.id === id))
  const listing = useOwner((s) => s.listings.find((l) => l.id === order?.listingId))
  if (!order || !listing) {
    return (
      <>
        <PageHeader crumbs={[{ label: 'Handover', to: '/handover' }, { label: id }]} title="Handover not found" />
        <Card>
          <EmptyState icon={PackageIcon} title="Handover not found" action={<Button onClick={() => navigate('/handover')}>Back to handovers</Button>} />
        </Card>
      </>
    )
  }
  if (order.status === 'confirmed') return <PackList o={order} l={listing} />
  if (order.status === 'out') return <CheckIn o={order} l={listing} />
  return (
    <>
      <PageHeader crumbs={[{ label: 'Handover', to: '/handover' }, { label: order.id }]} title={`Handover ${order.id}`} />
      <Card>
        <EmptyState
          icon={CheckCircleIcon}
          title={order.status === 'request' ? 'Not accepted yet' : 'Already back'}
          description={order.status === 'request' ? 'Accept the booking first, then pack it here.' : 'This order has been checked in.'}
          action={<Button onClick={() => navigate(`/orders/${order.id}`, { replace: true })}>Open order</Button>}
        />
      </Card>
    </>
  )
}

function OrderSummary({ o, l }: { o: Order; l: Listing }) {
  return (
    <Card className="flex flex-wrap items-center gap-3 p-4">
      <Thumb listing={l} className="size-14 rounded-lg" iconSize={22} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-fg">
          {l.name} × {o.qty}
        </p>
        <p className="text-[13px] text-muted">
          {o.renter.company} · {formatDayShort(o.from)} – {formatDayShort(o.to)} · {o.delivery ? 'you deliver' : 'they collect'}
        </p>
      </div>
      <Button size="sm" variant="ghost" icon={ReceiptIcon} onClick={() => navigate(`/orders/${o.id}`)}>
        Open order
      </Button>
    </Card>
  )
}

/** Going out → Pack list: pick the pieces, tick them off, take out photos, hand over. */
function PackList({ o, l }: { o: Order; l: Listing }) {
  const orders = useOwner((s) => s.orders)
  const dispatch = useOwner((s) => s.dispatchOrder)
  const out = new Set(orders.filter((x) => x.status === 'out').flatMap((x) => x.pieceIds))
  const available = l.pieces.filter((p) => !p.repair && !out.has(p.id))
  const [packed, setPacked] = useState<string[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const ready = packed.length === o.qty && photos.length > 0

  const handOver = () => {
    dispatch(o.id, packed, photos.length)
    navigate('/handover', { replace: true })
    toast(`Out with ${o.renter.company} · back ${formatDayShort(o.to)}`, { tone: 'success' })
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Handover', to: '/handover' }, { label: `${o.id} · Pack list` }]}
        title="Pack list"
        subtitle={`${o.id} · ${o.renter.company} · ${o.project}`}
        actions={
          <Button icon={TruckIcon} disabled={!ready} onClick={handOver}>
            {ready ? 'Hand over' : packed.length < o.qty ? `Tick ${plural(o.qty - packed.length, 'more piece')}` : 'Take at least one out photo'}
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        <OrderSummary o={o} l={l} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Pieces to pack" subtitle={`Tick ${o.qty} · ${packed.length} done`} icon={PackageIcon} />
            <ul className="divide-y divide-line">
              {available.map((p) => {
                const on = packed.includes(p.id)
                const full = !on && packed.length >= o.qty
                const toggle = () => !full && setPacked((x) => (on ? x.filter((y) => y !== p.id) : [...x, p.id]))
                return (
                  <li key={p.id} onClick={toggle} className={cn('flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/70', full && 'cursor-not-allowed opacity-45', on && 'bg-success-soft/60')}>
                    <Checkbox checked={on} label={`Packed ${p.code}`} onChange={toggle} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-sm font-semibold tracking-wide text-fg">{p.code}</span>
                      <span className="block text-xs text-muted">{p.condition} · in yard</span>
                    </span>
                    {on && <CheckCircleIcon size={18} weight="fill" className="text-success" />}
                  </li>
                )
              })}
            </ul>
            {available.length < o.qty && <p className="border-t border-line px-4 py-3 text-[13px] text-warning">Only {plural(available.length, 'piece is', 'pieces are')} in the yard. Bring one back from repair first.</p>}
          </Card>
          <Card>
            <CardHeader title="Out photos" subtitle="They’re compared when it comes back" icon={CameraIcon} />
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <span key={i} className="relative">
                    <Thumb listing={{ ...l, photos: [p] }} className="size-24 rounded-lg border border-line" iconSize={26} />
                    <span className="absolute bottom-1 left-1 rounded bg-fg/75 px-1 text-[10px] font-bold text-bg">{PHOTO_ANGLES[i % PHOTO_ANGLES.length]}</span>
                  </span>
                ))}
                <PhotoPicker onAdd={(p) => setPhotos((x) => [...x, ...p])}>
                  {(open) => (
                    <>
                      <button type="button" onClick={open} className="grid size-24 place-items-center rounded-lg border-2 border-dashed border-line-strong text-muted transition-colors hover:border-accent hover:text-accent">
                        <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                          <UploadSimpleIcon size={20} /> Upload
                        </span>
                      </button>
                      <button type="button" onClick={() => setPhotos((x) => [...x, 'sample'])} className="grid size-24 place-items-center rounded-lg border-2 border-dashed border-line-strong text-muted transition-colors hover:border-accent hover:text-accent">
                        <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                          <ImageSquareIcon size={20} /> Sample
                        </span>
                      </button>
                    </>
                  )}
                </PhotoPicker>
              </div>
              <p className="mt-3 text-xs text-muted">Front, back and any existing marks.</p>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

/** Coming back → Check against out photos, piece by piece. */
function CheckIn({ o, l }: { o: Order; l: Listing }) {
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
    if (damaged.length && (note.trim().length < 3 || !Number(cost))) return toast('Describe the damage and the repair cost', { tone: 'error' })
    returnOrder(o.id, damaged.length ? { amount: Number(cost), note: `${damaged.map((p) => p.code).join(', ')}: ${note.trim()}` } : null)
    navigate(`/orders/${o.id}`, { replace: true })
    toast(damaged.length ? 'Checked in · damage report opened' : 'Checked in · release the deposit when ready', { tone: 'success' })
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Handover', to: '/handover' }, { label: `${o.id} · Check in` }]}
        title="Check it back in"
        subtitle={`${o.id} · ${o.renter.company} · compare each piece with the ${o.outPhotos} photos taken when it went out`}
        actions={
          <Button icon={CheckCircleIcon} disabled={!allChecked} onClick={finish}>
            {allChecked ? (damaged.length ? 'Check in and report damage' : 'Mark returned') : `Check ${pieces.filter((p) => !marks[p.id]).length} more`}
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        {late && (
          <Banner tone="danger" icon={ClockCountdownIcon} title={`${plural(late.days, 'day')} late`}>
            Late fee {formatINR(late.amount)} is added to their bill.
          </Banner>
        )}
        <OrderSummary o={o} l={l} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {pieces.map((p) => {
            const m = marks[p.id]
            return (
              <Card key={p.id} className={cn('p-4', m === 'damaged' && 'border-danger/40', m === 'ok' && 'border-success/40')}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm font-semibold tracking-wide text-fg">{p.code}</p>
                  <Tag tone="neutral">Went out {p.condition.toLowerCase()}</Tag>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {PHOTO_ANGLES.map((a) => (
                    <span key={a} className="relative">
                      <Thumb listing={l} className="aspect-square w-full rounded-lg" iconSize={24} />
                      <span className="absolute bottom-1 left-1 rounded bg-fg/75 px-1 text-[10px] font-bold text-bg">Out · {a}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant={m === 'ok' ? 'success' : 'secondary'} icon={CheckCircleIcon} aria-pressed={m === 'ok'} onClick={() => setMarks((x) => ({ ...x, [p.id]: 'ok' }))}>
                    Same as out
                  </Button>
                  <Button variant={m === 'damaged' ? 'danger' : 'secondary'} icon={WarningIcon} aria-pressed={m === 'damaged'} onClick={() => setMarks((x) => ({ ...x, [p.id]: 'damaged' }))}>
                    Damaged
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
        {damaged.length > 0 && (
          <Card className="p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-danger">
              <WarningIcon size={17} weight="fill" /> Damage on {damaged.map((p) => p.code).join(', ')}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label="What’s wrong?" value={note} onChange={(e) => setNote(e.target.value)} />
              <TextField label="Repair cost" prefix="₹" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value.replace(/\D/g, '').slice(0, 7))} hint={`You hold ${formatINR(l.deposit * o.qty)} as deposit`} />
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
