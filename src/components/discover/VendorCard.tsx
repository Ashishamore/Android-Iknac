import { MapPinIcon, SealCheckIcon, StarIcon, TruckIcon } from '@phosphor-icons/react'
import { propCountByVendor, type Vendor } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatDistance } from '@/lib/format'
import { usePrefs } from '@/store/prefs'
import { Avatar, Tag } from '@/ui'

/** Vendor tile for "Vendors near you": name, area, distance, rating, props. */
export function VendorCard({ vendor, onClick, className }: { vendor: Vendor; onClick: () => void; className?: string }) {
  usePrefs((s) => s.distanceUnit) // re-render when units change
  const count = propCountByVendor(vendor.id)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('pressable flex flex-col rounded-2xl bg-surface p-3.5 text-left shadow-card outline-none focus-visible:ring-4 focus-visible:ring-accent/25', className)}
    >
      <div className="flex items-center gap-3">
        <Avatar name={vendor.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[15px] font-semibold text-fg">
            <span className="truncate">{vendor.name}</span>
            {vendor.verified && <SealCheckIcon size={15} weight="fill" aria-label="Verified" className="shrink-0 text-accent" />}
          </p>
          <p className="truncate text-xs text-muted">{vendor.area}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs font-medium text-fg-2">
        <span className="inline-flex items-center gap-1">
          <MapPinIcon size={13} weight="fill" className="text-subtle" />
          {formatDistance(vendor.distanceKm)}
        </span>
        <span className="inline-flex items-center gap-1">
          <StarIcon size={13} weight="fill" className="text-amber-500" />
          {vendor.rating.toFixed(1)}
        </span>
        <span>
          {count} prop{count === 1 ? '' : 's'}
        </span>
      </div>
      {vendor.delivery && (
        <Tag tone="success" className="mt-2.5 self-start">
          <TruckIcon size={12} weight="fill" /> Delivers to set
        </Tag>
      )}
    </button>
  )
}
