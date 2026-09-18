import { HeartIcon, MapPinIcon, StarIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { vendorById, type RentalProp } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatDateRangeShort } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { T } from '@/lib/motion'
import { clashOn, distanceLabel } from '@/lib/search'
import { nav } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { usePrefs } from '@/store/prefs'
import { useSaved } from '@/store/saved'
import { CheckboxVisual } from '@/ui'
import { VerifiedTick } from '@/components/platform/VerifiedTick'

/** Prop photo, or a blank tile with a small faint icon until real photos are supplied. */
export function PropThumb({ item, className, iconSize = 30 }: { item: RentalProp; className?: string; iconSize?: number }) {
  if (item.image) {
    return <img src={item.image} alt="" draggable={false} className={cn('object-cover', className)} />
  }
  const PIcon = item.icon
  return (
    <div className={cn('grid place-items-center bg-surface-2', className)}>
      <PIcon aria-hidden size={iconSize} weight="light" className="text-subtle opacity-60" />
    </div>
  )
}

/** Opens the prop's listing screen. */
const openListing = (item: RentalProp) => nav.push(`/customer/props/${item.id}`)

/** Heart button that saves / unsaves a prop. */
function SaveButton({ item, className }: { item: RentalProp; className?: string }) {
  const popup = usePopup()
  const saved = useSaved((s) => !!s.saved[item.id])
  const toggle = useSaved((s) => s.toggle)
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${item.name} from saved` : `Save ${item.name}`}
      onClick={() => {
        haptic()
        toggle(item.id)
        popup.toast(saved ? 'Removed from saved props' : 'Added to saved props', { tone: saved ? 'default' : 'success' })
      }}
      className={cn(
        'pressable grid size-8 place-items-center rounded-full bg-surface/90 shadow-card backdrop-blur-sm',
        className,
      )}
    >
      <motion.span
        key={saved ? 'saved' : 'not-saved'}
        initial={{ scale: saved ? 0.4 : 0.8 }}
        animate={{ scale: 1 }}
        transition={T.pop_in}
        className="grid place-items-center"
      >
        <HeartIcon size={17} weight={saved ? 'fill' : 'bold'} className={saved ? 'text-danger' : 'text-fg-2'} />
      </motion.span>
    </button>
  )
}

/** For "select multiple": tapping toggles the prop instead of opening it. */
export interface Selection {
  selected: boolean
  onToggle: () => void
}

/**
 * Rental prop card: image, rating, save, name and rate per day.
 * Tapping the card opens the prop's listing.
 */
export function PropCard({
  item,
  className,
  onOpen,
  meta,
  selection,
}: {
  item: RentalProp
  className?: string
  onOpen?: () => void
  /** Extra line under the price (distance, availability…). */
  meta?: ReactNode
  selection?: Selection
}) {
  const open = selection
    ? () => {
        haptic()
        selection.onToggle()
      }
    : (onOpen ?? (() => openListing(item)))

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={open}
        aria-pressed={selection ? selection.selected : undefined}
        className={cn(
          'pressable block w-full rounded-2xl bg-surface p-2 text-left shadow-card outline-none transition-shadow focus-visible:ring-4 focus-visible:ring-accent/25',
          selection?.selected && 'ring-2 ring-accent',
        )}
      >
        <div className="relative">
          <PropThumb item={item} className="aspect-square w-full rounded-xl" />
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-semibold text-fg shadow-sm backdrop-blur-sm">
            <StarIcon size={12} weight="fill" className="text-amber-500" />
            {item.rating.toFixed(1)}
            <span className="font-normal text-muted">({item.reviews})</span>
          </span>
        </div>
        <div className="px-1 pb-1 pt-2.5">
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-fg">{item.name}</h3>
          <p className="mt-1.5 text-sm">
            <span className="font-bold tabular-nums text-fg">{formatINR(item.pricePerDay)}</span>
            <span className="text-muted"> /day</span>
          </p>
          {meta && <div className="mt-1 text-xs text-muted">{meta}</div>}
        </div>
      </button>

      {selection ? (
        <span className="pointer-events-none absolute right-4 top-4">
          <CheckboxVisual checked={selection.selected} />
        </span>
      ) : (
        <SaveButton item={item} className="absolute right-4 top-4" />
      )}
    </div>
  )
}

/** Vendor distance, then a warning if the prop is booked on the shoot dates. */
export function PropMeta({ item, from, to }: { item: RentalProp; from?: string | null; to?: string | null }) {
  usePrefs((s) => s.distanceUnit) // re-render when units change
  const clash = from && to ? clashOn(item, from, to) : undefined
  return (
    <>
      <span className="flex items-center gap-1 truncate">
        <MapPinIcon size={12} weight="fill" className="shrink-0 text-subtle" />
        <span className="truncate">{distanceLabel(item)}</span>
      </span>
      {from && to && (
        <span className={cn('mt-0.5 flex items-center gap-1 font-medium', clash ? 'text-warning' : 'text-success')}>
          <span className={cn('size-1.5 shrink-0 rounded-full', clash ? 'bg-warning' : 'bg-success')} />
          <span className="truncate">{clash ? `Booked ${formatDateRangeShort(clash[0], clash[1])}` : 'Free on your dates'}</span>
        </span>
      )}
    </>
  )
}

/** Horizontal row for list view: thumb, name, vendor, rating, price, availability. */
export function PropRow({
  item,
  from,
  to,
  onOpen,
  selection,
  className,
}: {
  item: RentalProp
  from?: string | null
  to?: string | null
  onOpen?: () => void
  selection?: Selection
  className?: string
}) {
  const v = vendorById(item.vendorId)
  const open = selection
    ? () => {
        haptic()
        selection.onToggle()
      }
    : (onOpen ?? (() => openListing(item)))

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={open}
        aria-pressed={selection ? selection.selected : undefined}
        className={cn(
          'pressable flex w-full gap-3 rounded-2xl bg-surface p-2.5 pr-12 text-left shadow-card outline-none focus-visible:ring-4 focus-visible:ring-accent/25',
          selection?.selected && 'ring-2 ring-accent',
        )}
      >
        <PropThumb item={item} iconSize={28} className="size-[92px] shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 py-0.5">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-5 text-fg">{item.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
            <span className="truncate">{v.name}</span>
            <VerifiedTick vendorId={v.id} size={13} />
          </p>
          <p className="mt-1.5 flex items-center gap-2 text-sm">
            <span>
              <span className="font-bold tabular-nums text-fg">{formatINR(item.pricePerDay)}</span>
              <span className="text-muted"> /day</span>
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-fg-2">
              <StarIcon size={12} weight="fill" className="text-amber-500" />
              {item.rating.toFixed(1)}
            </span>
          </p>
          <div className="mt-1 text-xs text-muted">
            <PropMeta item={item} from={from} to={to} />
          </div>
        </div>
      </button>
      {selection ? (
        <span className="pointer-events-none absolute right-3 top-3">
          <CheckboxVisual checked={selection.selected} />
        </span>
      ) : (
        <SaveButton item={item} className="absolute right-2.5 top-2.5 shadow-none" />
      )}
    </div>
  )
}
