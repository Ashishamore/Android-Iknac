import {
  CopyIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  NavigationArrowIcon,
  PhoneIcon,
  SealCheckIcon,
  ShareNetworkIcon,
  StarIcon,
  StorefrontIcon,
  TruckIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { PropCard } from '@/components/PropCard'
import { VENDOR_TERMS } from '@/data/ops'
import { SUPPORT } from '@/data/profile'
import { vendorById, type Category, type Vendor } from '@/data/props'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { formatDistance } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useNow } from '@/lib/hooks'
import { resultsPath } from '@/lib/search'
import { vendorFacts } from '@/lib/vendor'
import { nav, useParams } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { usePrefs } from '@/store/prefs'
import { useProfile } from '@/store/profile'
import { useSaved } from '@/store/saved'
import { AppBar, Avatar, Button, Card, Chip, ChipRow, EmptyState, IconButton, Screen, SectionHeader, Tag } from '@/ui'
import { CHECKS } from '@/lib/platform'
import { liveProps } from '@/lib/search'
import { useCatalogueVersion, useVendorAccount, useVendorVerified } from '@/store/platform'

const DAY = 86_400_000

/** Vendor profile: who they are, stats, their props, reviews and rental terms. */
export default function VendorProfileScreen() {
  const { id } = useParams<{ id: string }>()
  const vendor = vendorById(id)
  if (!vendor) {
    return (
      <Screen header={<AppBar title="Vendor" />}>
        <EmptyState icon={StorefrontIcon} title="Vendor not found" action={<Button onClick={() => nav.pop()}>Go back</Button>} />
      </Screen>
    )
  }
  return <VendorProfile vendor={vendor} />
}

function VendorProfile({ vendor }: { vendor: Vendor }) {
  const popup = usePopup()
  usePrefs((s) => s.distanceUnit) // re-render when units change
  const saved = useSaved((s) => !!s.vendors[vendor.id])
  const toggleVendor = useSaved((s) => s.toggleVendor)
  const myReviews = useProfile((s) => s.reviews).filter((r) => r.vendorId === vendor.id)
  const [category, setCategory] = useState<Category | null>(null)
  const now = useNow(60_000).getTime()
  useCatalogueVersion()
  const verified = useVendorVerified(vendor.id)
  const account = useVendorAccount(vendor.id)
  const facts = vendorFacts(vendor)
  const live = liveProps(facts.props)
  const shown = category ? live.filter((p) => p.category === category) : live
  // "What's verified" — the documents the admin panel has approved.
  const checked = CHECKS.filter((c) => account?.checks[c.id])

  const toggleSave = () => {
    haptic()
    toggleVendor(vendor.id)
    popup.toast(saved ? `${vendor.name} removed from saved` : `${vendor.name} saved`, {
      tone: saved ? 'default' : 'success',
      action: saved ? undefined : { label: 'View', onClick: () => nav.push('/customer/profile/saved?tab=vendors') },
    })
  }

  const share = async () => {
    const url = `${window.location.origin}/customer/vendors/${vendor.id}`
    const choice = await popup.actionSheet({
      title: `Share ${vendor.name}`,
      options: [
        { id: 'copy', label: 'Copy link', icon: CopyIcon },
        { id: 'whatsapp', label: 'WhatsApp', icon: ShareNetworkIcon },
      ],
    })
    if (choice === 'copy') {
      try {
        await navigator.clipboard.writeText(url)
        popup.toast('Link copied', { tone: 'success' })
      } catch {
        popup.toast(url)
      }
    } else if (choice === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(`${vendor.name} on the props app: ${url}`)}`, '_blank', 'noopener')
  }

  const about = `${vendor.name} rents ${facts.categories.map((c) => c.toLowerCase()).join(', ')} from ${vendor.area}, ${vendor.city}. Strong on ${facts.eras.slice(0, 3).join(', ')} pieces.${
    vendor.delivery ? (vendor.freight ? ` Ships across India by road (${vendor.freight} to Mumbai).` : ' Delivers to set across the city.') : ' Pickup only.'
  }`

  return (
    <Screen
      header={
        <AppBar
          title={vendor.name}
          titleOnScroll
          actions={
            <>
              <IconButton icon={ShareNetworkIcon} label="Share vendor" onClick={share} />
              <IconButton
                icon={HeartIcon}
                weight={saved ? 'fill' : 'regular'}
                label={saved ? `Remove ${vendor.name} from saved vendors` : `Save ${vendor.name}`}
                aria-pressed={saved}
                onClick={toggleSave}
                className={saved ? 'text-danger' : undefined}
              />
            </>
          }
        />
      }
    >
      <div className="px-4 pt-1 @medium:mx-auto @medium:max-w-2xl">
        {/* Who they are */}
        <div className="flex items-center gap-4">
          <Avatar name={vendor.name} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 font-display text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-fg">
              <span className="truncate">{vendor.name}</span>
              {verified && <SealCheckIcon size={20} weight="fill" aria-label="Verified" className="shrink-0 text-accent" />}
            </h1>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-fg-2">
              <MapPinIcon size={14} weight="fill" className="shrink-0 text-subtle" />
              <span className="truncate">
                {vendor.area}, {vendor.city} · {formatDistance(vendor.distanceKm)}
              </span>
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm">
              <StarIcon size={15} weight="fill" className="text-amber-500" />
              <span className="font-bold text-fg">{vendor.rating.toFixed(1)}</span>
              <span className="text-muted">· {facts.ratings.toLocaleString('en-IN')} ratings</span>
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {verified && (
            <Tag tone="brand">
              <SealCheckIcon size={12} weight="fill" /> Verified vendor
            </Tag>
          )}
          {vendor.delivery ? (
            <Tag tone="success">
              <TruckIcon size={12} weight="fill" /> {vendor.freight ? `Road freight · ${vendor.freight}` : 'Delivers to set'}
            </Tag>
          ) : (
            <Tag tone="neutral">Pickup only</Tag>
          )}
          <Tag tone="neutral">Since {facts.since}</Tag>
        </div>

        {/* What's verified */}
        {checked.length > 0 && (
          <div className="mt-3 rounded-2xl bg-surface p-3.5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">What’s verified</p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {checked.map((c) => (
                <li key={c.id} className="flex items-center gap-1.5 text-[13px] font-medium text-fg-2">
                  <SealCheckIcon size={14} weight="fill" className="shrink-0 text-success" />
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl bg-surface py-3 text-center shadow-card">
          <Stat value={String(live.length)} label="Props" />
          <Stat value={`~${facts.replyMins} min`} label="Replies in" />
          <Stat value={`${facts.onTime}%`} label="On time" />
        </div>

        {/* Actions */}
        <div className="mt-3 flex gap-2.5">
          <Button
            variant="secondary"
            icon={PhoneIcon}
            className="flex-1"
            onClick={() => {
              window.location.href = `tel:${SUPPORT.phone}`
            }}
          >
            Call
          </Button>
          <Button
            variant="secondary"
            icon={NavigationArrowIcon}
            className="flex-1"
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${vendor.area}, ${vendor.city}`)}`, '_blank', 'noopener')}
          >
            Directions
          </Button>
        </div>
        <p className="mt-2 px-1 text-xs text-subtle">Calls go through a masked number, so neither side sees the other’s phone.</p>

        <Card className="mt-4 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">About</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-fg-2">{about}</p>
        </Card>
      </div>

      {/* Props */}
      <div className="@medium:mx-auto @medium:max-w-2xl">
        <SectionHeader
          title="Props"
          subtitle={`${live.length} listed`}
          action="Search"
          onAction={() => nav.push(resultsPath({ vendorId: vendor.id, scope: 'india' }))}
          className="pt-6"
        />
        {facts.categories.length > 1 && (
          <ChipRow className="pb-3">
            <Chip selected={!category} onClick={() => setCategory(null)}>
              All
            </Chip>
            {facts.categories.map((c) => (
              <Chip key={c} selected={category === c} onClick={() => setCategory(category === c ? null : c)}>
                {c}
              </Chip>
            ))}
          </ChipRow>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 @medium:mx-auto @medium:max-w-2xl @medium:grid-cols-3">
        {shown.map((p) => (
          <PropCard key={p.id} item={p} />
        ))}
      </div>
      <div className="px-4 pt-3 @medium:mx-auto @medium:max-w-md">
        <Button variant="outline" block icon={MagnifyingGlassIcon} onClick={() => nav.push(resultsPath({ vendorId: vendor.id, scope: 'india' }))}>
          Filter these in Discover
        </Button>
      </div>

      {/* Reviews */}
      <div className="px-4 pb-10 @medium:mx-auto @medium:max-w-2xl">
        <SectionHeader title="Reviews" subtitle={`${vendor.rating.toFixed(1)} average from ${facts.ratings.toLocaleString('en-IN')} ratings`} className="px-0 pt-7" />
        <div className="grid grid-cols-1 gap-2.5">
          {myReviews.map((r) => (
            <Review key={r.id} name="You" role="Your review" rating={r.rating} text={r.text} tags={r.tags} at={r.at} mine />
          ))}
          {facts.reviews.map((r) => (
            <Review key={r.name} name={r.name} role={r.role} rating={r.rating} text={r.text} tags={r.tags} at={now - r.daysAgo * DAY} />
          ))}
        </div>

        <SectionHeader title="Rental terms" className="px-0 pt-7" />
        <Card className="divide-y divide-line px-4">
          {VENDOR_TERMS.map((t) => (
            <div key={t.title} className="py-3">
              <p className="text-sm font-semibold text-fg">{t.title}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted">{t.text}</p>
            </div>
          ))}
        </Card>
      </div>
    </Screen>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 px-1">
      <p className="truncate font-display text-[17px] font-bold tabular-nums text-fg">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

function Review({ name, role, rating, text, tags, at, mine }: { name: string; role: string; rating: number; text: string; tags: string[]; at: number; mine?: boolean }) {
  return (
    <Card className={cn('p-4', mine && 'ring-1 ring-accent/30')}>
      <div className="flex items-center gap-3">
        <Avatar name={name === 'You' ? 'Y' : name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{name}</p>
          <p className="truncate text-xs text-muted">{role}</p>
        </div>
        <span className="shrink-0 text-xs text-subtle">{timeAgo(at)}</span>
      </div>
      <p className="mt-2 flex gap-0.5" aria-label={`${rating} out of 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <StarIcon key={n} size={14} weight="fill" className={n <= rating ? 'text-amber-500' : 'text-line-strong'} />
        ))}
      </p>
      {text && <p className="mt-1.5 text-sm leading-relaxed text-fg">{text}</p>}
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-fg-2">
              {t}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}
