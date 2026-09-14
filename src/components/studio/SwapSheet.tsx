import { MagnifyingGlassIcon, SealCheckIcon } from '@phosphor-icons/react'
import { propById, vendorById } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { distanceLabel, isFreeOn } from '@/lib/search'
import { candidatesFor, type Limits, type Slot } from '@/lib/studio'
import { BottomSheet } from '@/overlays/BottomSheet'
import { Button } from '@/ui'
import { PropThumb } from '../PropCard'

interface SwapSheetProps {
  open: boolean
  onClose: () => void
  slot: Slot | null
  /** The prop in the slot now (null if removed). */
  currentId: string | null
  limits: Limits
  onPick: (propId: string) => void
  onBrowse: () => void
}

/** Alternatives for one slot, within the board's limits. */
export function SwapSheet({ open, onClose, slot, currentId, limits, onPick, onBrowse }: SwapSheetProps) {
  const current = currentId ? propById(currentId) : null
  const options = slot ? candidatesFor(slot, limits).filter((c) => c.prop.id !== currentId).slice(0, 8) : []

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={slot ? `Swap · ${slot.name}` : 'Swap'}
      description={current ? `Now: ${current.name} · ${formatINR(current.pricePerDay)}/day` : 'Pick a prop for this slot'}
      footer={
        <Button variant="secondary" size="lg" block icon={MagnifyingGlassIcon} onClick={onBrowse}>
          Browse more in Discover
        </Button>
      }
    >
      {options.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Nothing else fits your limits. Try a wider distance or a different era.
        </p>
      ) : (
        <ul className="-mx-2 flex flex-col gap-0.5">
          {options.map(({ prop }) => {
            const v = vendorById(prop.vendorId)
            const diff = current ? prop.pricePerDay - current.pricePerDay : 0
            const free = limits.from && limits.to ? isFreeOn(prop, limits.from, limits.to) : null
            return (
              <li key={prop.id}>
                <button
                  type="button"
                  onClick={() => onPick(prop.id)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
                >
                  <PropThumb item={prop} iconSize={22} className="size-14 shrink-0 rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-fg">{prop.name}</span>
                    <span className="flex items-center gap-1 truncate text-xs text-muted">
                      <span className="truncate">
                        {v.name} · {distanceLabel(prop)}
                      </span>
                      {v.verified && <SealCheckIcon size={12} weight="fill" className="shrink-0 text-accent" />}
                    </span>
                    {free !== null && (
                      <span className={cn('text-xs font-medium', free ? 'text-success' : 'text-warning')}>
                        {free ? 'Free on your dates' : 'Booked on your dates'}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold text-fg">{formatINR(prop.pricePerDay)}</span>
                    {current && diff !== 0 && (
                      <span className={cn('block text-xs font-semibold', diff < 0 ? 'text-success' : 'text-muted')}>
                        {diff < 0 ? '−' : '+'}
                        {formatINR(Math.abs(diff))}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </BottomSheet>
  )
}
