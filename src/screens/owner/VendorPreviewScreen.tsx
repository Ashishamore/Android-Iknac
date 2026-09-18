import { EyeIcon, MapPinIcon, SealCheckIcon, StarIcon, TruckIcon } from '@phosphor-icons/react'
import { ListingThumb } from '@/components/owner/OwnerUI'
import { timeAgo } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { ratingSummary } from '@/lib/owner'
import { useOwner } from '@/store/owner'
import { AppBar, Avatar, Card, Screen, SectionHeader, Tag } from '@/ui'

/** "See it as a renter does" → your vendor page, read-only. */
export default function VendorPreviewScreen() {
  const business = useOwner((s) => s.business)
  const verification = useOwner((s) => s.verification)
  const listings = useOwner((s) => s.listings)
  const reviews = useOwner((s) => s.reviews)
  const delivery = useOwner((s) => s.delivery)
  const followers = useOwner((s) => s.followers)
  const live = listings.filter((l) => l.listed && !l.review)
  const sum = ratingSummary(reviews)
  const verified = verification.phone === 'done' && verification.identity === 'done' && verification.warehouse === 'done' && verification.bank === 'done'
  const area = business.address.split(',').slice(-2, -1)[0]?.trim() || 'Mumbai'

  return (
    <Screen header={<AppBar title="As a renter sees you" />}>
      <div className="flex items-center gap-2 bg-info-soft px-4 py-2 text-[13px] font-medium text-fg">
        <EyeIcon size={16} weight="fill" className="shrink-0 text-info" /> Preview of your vendor page
      </div>
      <div className="px-4 pb-10 pt-4 @medium:mx-auto @medium:max-w-2xl">
        <div className="flex items-center gap-4">
          <Avatar name={business.name} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 font-display text-[22px] font-extrabold leading-tight text-fg">
              <span className="truncate">{business.name}</span>
              {verified && <SealCheckIcon size={20} weight="fill" className="shrink-0 text-accent" />}
            </h1>
            <p className="flex items-center gap-1 text-sm text-fg-2">
              <MapPinIcon size={14} weight="fill" className="text-subtle" /> {area}, Mumbai
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm">
              <StarIcon size={15} weight="fill" className="text-amber-500" />
              <span className="font-bold text-fg">{sum.avg.toFixed(1)}</span>
              <span className="text-muted">· {reviews.length} reviews · {followers.toLocaleString('en-IN')} followers</span>
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {verified && (
            <Tag tone="brand">
              <SealCheckIcon size={12} weight="fill" /> Verified vendor
            </Tag>
          )}
          <Tag tone={delivery.enabled ? 'success' : 'neutral'}>
            <TruckIcon size={12} weight="fill" /> {delivery.enabled ? 'Delivers to set' : 'Pickup only'}
          </Tag>
          <Tag tone="neutral">{business.type}</Tag>
        </div>

        <SectionHeader title="Props" subtitle={`${live.length} listed`} className="px-0 pt-6" />
        <div className="grid grid-cols-2 gap-3 @medium:grid-cols-3">
          {live.map((l) => (
            <div key={l.id} className="rounded-2xl bg-surface p-2 shadow-card">
              <ListingThumb listing={l} className="aspect-square w-full rounded-xl" iconSize={30} />
              <p className="line-clamp-2 min-h-10 px-1 pt-2 text-sm font-semibold leading-5 text-fg">{l.name}</p>
              <p className="px-1 pb-1 text-sm">
                <span className="font-bold tabular-nums text-fg">{formatINR(l.dayRate)}</span>
                <span className="text-muted"> /day</span>
              </p>
            </div>
          ))}
        </div>

        <SectionHeader title="Reviews" className="px-0 pt-6" />
        <div className="grid grid-cols-1 gap-2.5">
          {[...reviews]
            .sort((a, b) => b.at - a.at)
            .slice(0, 3)
            .map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-fg">{r.renter}</p>
                  <span className="shrink-0 text-xs text-subtle">{timeAgo(r.at)}</span>
                </div>
                <p className="mt-1 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <StarIcon key={n} size={13} weight="fill" className={n <= r.rating ? 'text-amber-500' : 'text-line-strong'} />
                  ))}
                </p>
                <p className="mt-1.5 text-sm text-fg">{r.text}</p>
                {r.reply && <p className="mt-2 rounded-xl bg-surface-2 p-2.5 text-[13px] text-fg-2">Reply: {r.reply}</p>}
              </Card>
            ))}
        </div>
      </div>
    </Screen>
  )
}
