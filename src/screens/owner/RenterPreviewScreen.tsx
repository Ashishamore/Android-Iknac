import { EyeIcon, HeartIcon, KanbanIcon, MapPinIcon, PackageIcon, PaintBrushIcon, RulerIcon, SealCheckIcon, StarIcon, TruckIcon } from '@phosphor-icons/react'
import { ListingThumb } from '@/components/owner/OwnerUI'
import { cn } from '@/lib/cn'
import { addDays, fromISODate, todayISO } from '@/lib/dates'
import { formatINR, formatSize } from '@/lib/format'
import { dayLayers, inRepair, ratingSummary, tierRates, type Listing } from '@/lib/owner'
import { nav, useParams } from '@/navigation'
import { useListing, useOwner } from '@/store/owner'
import { usePrefs } from '@/store/prefs'
import { AppBar, Avatar, Button, Card, EmptyState, Screen, SectionHeader } from '@/ui'

export default function RenterPreviewScreen() {
  const { id } = useParams<{ id: string }>()
  const listing = useListing(id)
  if (!listing) {
    return (
      <Screen header={<AppBar title="Preview" />}>
        <EmptyState icon={PackageIcon} title="Listing not found" action={<Button onClick={() => nav.pop()}>Go back</Button>} />
      </Screen>
    )
  }
  return <Preview l={listing} />
}

/** "As a renter sees it": the item page, read-only. */
function Preview({ l }: { l: Listing }) {
  usePrefs((s) => s.sizeUnit)
  const business = useOwner((s) => s.business)
  const delivery = useOwner((s) => s.delivery)
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  const reviews = useOwner((s) => s.reviews)
  const mine = reviews.filter((r) => r.listingId === l.id)
  const rating = ratingSummary(mine.length ? mine : reviews)
  const t = tierRates(l.dayRate)
  const today = todayISO()
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i))
  const usable = l.pieces.length - inRepair(l)

  return (
    <Screen
      header={<AppBar title="As a renter sees it" subtitle={l.name} />}
      footer={
        <div className="flex gap-2.5 @medium:mx-auto @medium:max-w-md">
          <Button size="lg" variant="secondary" icon={HeartIcon} className="flex-1" disabled>
            Save
          </Button>
          <Button size="lg" icon={KanbanIcon} className="flex-[2]" disabled>
            Add to board
          </Button>
        </div>
      }
    >
      <div className="flex items-center gap-2 bg-info-soft px-4 py-2 text-[13px] font-medium text-fg">
        <EyeIcon size={16} weight="fill" className="shrink-0 text-info" /> Preview. Buttons work for renters, not here.
      </div>
      <div className="px-4 pb-8 pt-3 @medium:mx-auto @medium:max-w-2xl">
        <ListingThumb listing={l} className="aspect-square w-full rounded-3xl @medium:aspect-video" iconSize={72} />
        <div className="mt-4 flex items-center gap-1 text-sm">
          <StarIcon size={15} weight="fill" className="text-amber-500" />
          <span className="font-bold text-fg">{rating.avg.toFixed(1)}</span>
          <span className="text-muted">({mine.length || reviews.length} reviews)</span>
        </div>
        <h1 className="mt-1 font-display text-[24px] font-extrabold leading-tight tracking-[-0.01em] text-fg">{l.name}</h1>
        <p className="text-sm text-muted">
          {l.era} {l.category.toLowerCase()}
          {l.material ? ` · ${l.material}` : ''}
        </p>
        <p className="mt-3 text-sm">
          <span className="font-display text-2xl font-extrabold tabular-nums text-fg">{formatINR(l.dayRate)}</span>
          <span className="text-muted"> /day · plus GST</span>
        </p>
        <p className="text-[13px] text-muted">
          {formatINR(t.mid)}/day for 3–6 days · {formatINR(t.long)}/day for 7+ · {formatINR(l.deposit)} refundable deposit
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          {l.modifiable && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-fg-2">
              <PaintBrushIcon size={13} /> Can be modified
            </span>
          )}
          {delivery.enabled && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-fg-2">
              <TruckIcon size={13} /> Delivers to set
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-fg-2">
            <SealCheckIcon size={13} className="text-accent" /> Verified vendor
          </span>
        </div>

        <SectionHeader title="Availability" subtitle="Next two weeks" className="px-0 pt-6" />
        <Card className="p-3.5">
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const x = dayLayers(l, orders, holds, d)
              const booked = x.booked.reduce((n, o) => n + o.qty, 0)
              const off = x.blocked.length > 0 || booked >= usable || !l.listed
              return (
                <span key={d} className={cn('flex flex-col items-center rounded-lg py-1.5 text-center', off ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-fg-2')}>
                  <span className="text-[10px] font-semibold uppercase opacity-70">{fromISODate(d).toLocaleDateString('en-IN', { weekday: 'narrow' })}</span>
                  <span className="text-sm font-bold tabular-nums">{fromISODate(d).getDate()}</span>
                </span>
              )
            })}
          </div>
          <p className="mt-3 text-[13px] text-muted">Red days are booked or blocked. {usable} piece{usable === 1 ? '' : 's'} available.</p>
        </Card>

        <SectionHeader title="From" className="px-0 pt-6" />
        <Card className="flex items-center gap-3 p-3.5">
          <Avatar name={business.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[15px] font-semibold text-fg">
              <span className="truncate">{business.name}</span>
              <SealCheckIcon size={15} weight="fill" className="shrink-0 text-accent" />
            </p>
            <p className="flex items-center gap-1 truncate text-xs text-muted">
              <MapPinIcon size={12} weight="fill" /> Andheri West, Mumbai
            </p>
          </div>
        </Card>

        <SectionHeader title="About" className="px-0 pt-6" />
        <p className="text-[15px] leading-relaxed text-fg-2">{l.description || 'The owner hasn’t added a description yet.'}</p>
        {l.size && (
          <p className="mt-2.5 flex items-center gap-1.5 text-sm text-fg-2">
            <RulerIcon size={16} className="shrink-0 text-muted" />
            About <span className="font-semibold text-fg">{formatSize(l.size)}</span>
            {l.weight ? <span className="text-muted">· {l.weight} kg</span> : null}
          </p>
        )}
      </div>
    </Screen>
  )
}
