import {
  HeartIcon,
  KanbanIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PaintBrushIcon,
  RulerIcon,
  SealCheckIcon,
  ShareNetworkIcon,
  StarIcon,
  TruckIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { BoardSheet } from '@/components/discover/BoardSheet'
import { VendorCard } from '@/components/discover/VendorCard'
import { PropCard, PropThumb } from '@/components/PropCard'
import { CATEGORY_SIZE } from '@/data/profile'
import { PROPS, propById, vendorById } from '@/data/props'
import { cn } from '@/lib/cn'
import { addDays, formatDateRangeShort, fromISODate, todayISO } from '@/lib/dates'
import { formatINR, formatSize } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { isFreeOn, resultsPath, similarity } from '@/lib/search'
import { nav, useParams } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { usePrefs } from '@/store/prefs'
import { activeProjects, useProjects } from '@/store/projects'
import { useTrackProp } from '@/store/recent'
import { useSaved } from '@/store/saved'
import { AppBar, Button, Card, EmptyState, IconButton, Screen, SectionHeader, Tag } from '@/ui'

/** A prop's listing: photo, price, vendor, availability, similar props, add to board. */
export default function PropDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const prop = propById(id)
  if (!prop) {
    return (
      <Screen header={<AppBar title="Prop" />}>
        <EmptyState icon={PackageIcon} title="Listing not found" action={<Button onClick={() => nav.pop()}>Go back</Button>} />
      </Screen>
    )
  }
  return <Listing propId={prop.id} />
}

function Listing({ propId }: { propId: string }) {
  const popup = usePopup()
  const prop = propById(propId)
  useTrackProp(prop.id)
  const vendor = vendorById(prop.vendorId)
  const saved = useSaved((s) => !!s.saved[prop.id])
  const toggle = useSaved((s) => s.toggle)
  const vendorSaved = useSaved((s) => !!s.vendors[prop.vendorId])
  const toggleVendor = useSaved((s) => s.toggleVendor)
  usePrefs((s) => s.sizeUnit) // re-render when units change
  const size = CATEGORY_SIZE[prop.category]
  const project = activeProjects(useProjects((s) => s.projects))[0]
  const [boardOpen, setBoardOpen] = useState(false)
  const today = todayISO()
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i))
  const upcoming = prop.booked.filter(([, e]) => e >= today)
  const similar = PROPS.filter((p) => p.id !== prop.id)
    .sort((a, b) => similarity(b, prop) - similarity(a, prop) || b.rating - a.rating)
    .slice(0, 8)
  const freeOnProject = project ? isFreeOn(prop, project.startDate, project.endDate) : null

  const share = async () => {
    const url = `${window.location.origin}/customer/props/${prop.id}`
    try {
      await navigator.clipboard.writeText(url)
      popup.toast('Link copied', { tone: 'success' })
    } catch {
      popup.toast(url)
    }
  }

  return (
    <Screen
      header={
        <AppBar
          title={prop.name}
          titleOnScroll
          actions={
            <>
              <IconButton
                icon={HeartIcon}
                weight={saved ? 'fill' : 'regular'}
                label={saved ? 'Remove from saved' : 'Save'}
                aria-pressed={saved}
                className={saved ? 'text-danger' : undefined}
                onClick={() => {
                  haptic()
                  toggle(prop.id)
                  popup.toast(saved ? 'Removed from saved props' : 'Added to saved props', { tone: saved ? 'default' : 'success' })
                }}
              />
              <IconButton icon={ShareNetworkIcon} label="Share" onClick={share} />
            </>
          }
        />
      }
      footer={
        <div className="flex gap-3 @medium:mx-auto @medium:max-w-xl">
          <Button size="lg" variant="secondary" icon={MagnifyingGlassIcon} className="flex-1" onClick={() => nav.push(resultsPath({ similarTo: prop.id }))}>
            Similar
          </Button>
          <Button size="lg" icon={KanbanIcon} className="flex-[1.4]" onClick={() => setBoardOpen(true)}>
            Add to board
          </Button>
        </div>
      }
    >
      <div className="pb-6 @medium:mx-auto @medium:max-w-2xl">
        <div className="px-4 pt-2">
          <PropThumb item={prop} iconSize={72} className="aspect-[4/3] w-full rounded-3xl" />
        </div>
        <div className="px-4 pt-4">
          <div className="flex flex-wrap gap-1.5">
            <Tag tone="brand">{prop.category}</Tag>
            <Tag tone="neutral">{prop.era}</Tag>
            {prop.material && <Tag tone="neutral">{prop.material}</Tag>}
          </div>
          <h1 className="mt-2 font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-fg">{prop.name}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-fg-2">
            <StarIcon size={15} weight="fill" className="text-amber-500" />
            <b className="font-semibold">{prop.rating.toFixed(1)}</b>
            <span className="text-muted">· {prop.reviews} reviews</span>
          </p>
          <p className="mt-3 text-sm">
            <span className="font-display text-2xl font-extrabold tabular-nums text-fg">{formatINR(prop.pricePerDay)}</span>
            <span className="text-muted"> /day · plus GST</span>
          </p>
          {project && (
            <p className={cn('mt-1.5 text-[13px] font-medium', freeOnProject ? 'text-success' : 'text-warning')}>
              ● {freeOnProject ? 'Free' : 'Booked'} on {project.name} dates ({formatDateRangeShort(project.startDate, project.endDate)})
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            {prop.modifiable && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-fg-2">
                <PaintBrushIcon size={13} /> Can be modified
              </span>
            )}
            {vendor.delivery && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-fg-2">
                <TruckIcon size={13} /> Delivers to set
              </span>
            )}
            {vendor.verified && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-fg-2">
                <SealCheckIcon size={13} className="text-accent" /> Verified vendor
              </span>
            )}
          </div>
        </div>

        <SectionHeader title="Availability" subtitle="Next two weeks" className="pt-6" />
        <Card className="mx-4 p-3.5">
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const booked = !isFreeOn(prop, d, d)
              const shoot = project && d >= project.startDate && d <= project.endDate
              return (
                <span
                  key={d}
                  className={cn(
                    'flex flex-col items-center rounded-lg py-1.5 text-center',
                    booked ? 'bg-danger-soft text-danger' : shoot ? 'bg-success-soft text-success' : 'bg-surface-2 text-fg-2',
                  )}
                  title={booked ? 'Booked' : 'Free'}
                >
                  <span className="text-[10px] font-semibold uppercase opacity-70">{fromISODate(d).toLocaleDateString('en-IN', { weekday: 'narrow' })}</span>
                  <span className="text-sm font-bold tabular-nums">{fromISODate(d).getDate()}</span>
                </span>
              )
            })}
          </div>
          <p className="mt-3 text-[13px] text-muted">
            {upcoming.length ? `Booked ${upcoming.map(([s, e]) => formatDateRangeShort(s, e)).join(', ')}` : 'Free for the next few weeks'}
            {project && ' · green = your shoot days'}
          </p>
        </Card>

        <SectionHeader title="From" className="pt-6" />
        <div className="relative px-4">
          <VendorCard vendor={vendor} className="w-full pr-28" onClick={() => nav.push(`/customer/vendors/${vendor.id}`)} />
          <button
            type="button"
            aria-pressed={vendorSaved}
            aria-label={vendorSaved ? `Remove ${vendor.name} from saved vendors` : `Save ${vendor.name}`}
            onClick={() => {
              haptic()
              toggleVendor(vendor.id)
              popup.toast(vendorSaved ? 'Vendor removed from saved' : 'Vendor saved', {
                tone: vendorSaved ? 'default' : 'success',
                action: vendorSaved ? undefined : { label: 'View', onClick: () => nav.push('/customer/profile/saved?tab=vendors') },
              })
            }}
            className={cn(
              'pressable absolute right-7 top-3.5 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold outline-none focus-visible:ring-4 focus-visible:ring-accent/25',
              vendorSaved ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-fg-2',
            )}
          >
            <HeartIcon size={14} weight={vendorSaved ? 'fill' : 'bold'} />
            {vendorSaved ? 'Saved' : 'Save'}
          </button>
        </div>

        <SectionHeader title="About" className="pt-6" />
        <p className="px-4 text-[15px] leading-relaxed text-fg-2">
          {prop.era} {prop.category.toLowerCase()}
          {prop.material ? ` in ${prop.material.toLowerCase()}` : ''}, kept by {vendor.name} in {vendor.area}.{' '}
          {prop.modifiable ? 'The owner allows repainting and small alterations on request.' : 'Please don’t paint or alter it.'} Photos coming soon.
        </p>
        {size && (
          <p className="mt-2.5 flex items-center gap-1.5 px-4 text-sm text-fg-2">
            <RulerIcon size={16} className="shrink-0 text-muted" />
            About <span className="font-semibold text-fg">{formatSize(size)}</span>
            <span className="text-muted">(W × D × H)</span>
          </p>
        )}

        <SectionHeader title="Similar props" action="See all" onAction={() => nav.push(resultsPath({ similarTo: prop.id }))} className="pt-6" />
        <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 pt-1">
          {similar.map((p) => (
            <PropCard key={p.id} item={p} className="w-[156px] shrink-0 snap-start" onOpen={() => nav.push(`/customer/props/${p.id}`)} />
          ))}
        </div>
      </div>
      <BoardSheet open={boardOpen} onClose={() => setBoardOpen(false)} propIds={[prop.id]} />
    </Screen>
  )
}
