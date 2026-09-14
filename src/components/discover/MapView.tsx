import { ListBulletsIcon, SealCheckIcon, StarIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { HOME_CITY, vendorById, type RentalProp, type Vendor } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatDistance, formatINR, formatINRCompact } from '@/lib/format'
import { usePrefs } from '@/store/prefs'
import { haptic } from '@/lib/haptics'
import { EASE_OUT, T } from '@/lib/motion'
import { nav } from '@/navigation'
import { Avatar } from '@/ui'
import { PropThumb } from '../PropCard'

/*
 * A stylised map of Mumbai (not to scale): the island city runs north–south
 * between the Arabian Sea and Thane Creek. Coordinates are % of the map box.
 */
const LAND =
  'M17,0 L15,10 L16,20 L14,30 L15,40 L17,48 L19,56 L21,63 L23,70 L27,78 L31,86 L34,93 L36,100 ' +
  'L47,100 L50,92 L53,84 L58,76 L64,68 L72,60 L80,54 L85,48 L88,38 L89,26 L90,14 L91,0 Z'
const PARK = 'M63,0 L89,0 L89,22 L76,29 L66,17 Z'
const ROADS = [
  'M40,0 L41,25 L42,45 L38,60 L34,72 L38,86 L41,100', // Western Express Highway
  'M84,0 L82,20 L78,40 L70,58 L57,72 L49,86 L44,100', // Eastern Express Highway
  'M41,37 L79,40', // JVLR
]
const AREAS: { name: string; x: number; y: number }[] = [
  { name: 'Malad', x: 27, y: 6 },
  { name: 'Goregaon', x: 49, y: 30 },
  { name: 'Juhu', x: 19, y: 43 },
  { name: 'Andheri', x: 45, y: 50 },
  { name: 'Powai', x: 77, y: 37 },
  { name: 'Bandra', x: 34, y: 60 },
  { name: 'Lower Parel', x: 41, y: 79 },
  { name: 'Colaba', x: 41, y: 96 },
]
/** "You" — the art director's base in Andheri. */
const YOU = { x: 46, y: 46 }

interface MapViewProps {
  results: RentalProp[]
  /** Results from vendors outside the city (not on this map). */
  onShowList: () => void
  className?: string
}

/** Results as price pins per vendor; tap a pin to see that vendor's props. */
export function MapView({ results, onShowList, className }: MapViewProps) {
  usePrefs((s) => s.distanceUnit) // re-render when units change
  const [activeId, setActiveId] = useState<string | null>(null)

  const pins = useMemo(() => {
    const byVendor = new Map<string, RentalProp[]>()
    for (const p of results) {
      const list = byVendor.get(p.vendorId) ?? []
      list.push(p)
      byVendor.set(p.vendorId, list)
    }
    return [...byVendor.entries()]
      .map(([id, props]) => ({ vendor: vendorById(id), props }))
      .filter((x): x is { vendor: Vendor & { map: { x: number; y: number } }; props: RentalProp[] } => !!x.vendor.map)
  }, [results])

  const outside = results.filter((p) => !vendorById(p.vendorId).map).length
  const active = pins.find((p) => p.vendor.id === activeId)

  return (
    <div className={cn('relative h-full min-h-[420px] overflow-hidden bg-[#d5e5f1] dark:bg-[#0e1822]', className)}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        aria-hidden
        onClick={() => setActiveId(null)}
      >
        <path d={LAND} className="fill-[#f4f2ec] dark:fill-[#1a1f26]" />
        <path d={PARK} className="fill-[#dcebd2] dark:fill-[#17261d]" />
        <ellipse cx="72" cy="41" rx="3.2" ry="2.2" className="fill-[#d5e5f1] dark:fill-[#0e1822]" />
        {ROADS.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            vectorEffect="non-scaling-stroke"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-white dark:stroke-[#262c35]"
          />
        ))}
      </svg>

      <span
        aria-hidden
        className="pointer-events-none absolute left-[7%] top-[62%] -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-2xs font-semibold uppercase tracking-[0.3em] text-[#7ea3c0] dark:text-[#3a5670]"
      >
        Arabian Sea
      </span>
      {AREAS.map((a) => (
        <span
          key={a.name}
          aria-hidden
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle"
          style={{ left: `${a.x}%`, top: `${a.y}%` }}
        >
          {a.name}
        </span>
      ))}

      {/* You are here */}
      <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${YOU.x}%`, top: `${YOU.y}%` }}>
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-info/30"
          animate={{ scale: [1, 2.6], opacity: [0.7, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
        <span className="relative block size-3.5 rounded-full border-2 border-white bg-info shadow" title="You" />
      </span>

      {pins.map(({ vendor, props }, i) => {
        const selected = vendor.id === activeId
        const from = Math.min(...props.map((p) => p.pricePerDay))
        return (
          <motion.button
            key={vendor.id}
            type="button"
            aria-label={`${vendor.name}: ${props.length} prop${props.length === 1 ? '' : 's'} from ${formatINR(from)} a day`}
            aria-pressed={selected}
            onClick={() => {
              haptic()
              setActiveId(selected ? null : vendor.id)
            }}
            className={cn(
              'absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold shadow-float transition-colors',
              selected ? 'z-20 bg-accent text-accent-fg' : 'z-10 bg-surface text-fg',
            )}
            style={{ left: `${vendor.map.x}%`, top: `${vendor.map.y}%` }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: selected ? 1.12 : 1 }}
            transition={{ ...T.pop_in, delay: Math.min(i, 8) * 0.03 }}
          >
            {formatINRCompact(from)}
            {props.length > 1 && (
              <span className={cn('rounded-full px-1.5 text-[10px]', selected ? 'bg-white/25' : 'bg-surface-3 text-fg-2')}>
                {props.length}
              </span>
            )}
          </motion.button>
        )
      })}

      {pins.length === 0 && (
        <div className="absolute inset-x-6 top-1/3 rounded-2xl bg-surface/95 p-4 text-center shadow-float">
          <p className="text-sm font-semibold text-fg">No matches on the {HOME_CITY} map</p>
          <p className="mt-0.5 text-[13px] text-muted">Try the list, or look wider in Filters.</p>
        </div>
      )}

      {outside > 0 && (
        <button
          type="button"
          onClick={onShowList}
          className="pressable absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface px-3.5 py-2 text-[13px] font-semibold text-fg shadow-float"
        >
          <ListBulletsIcon size={16} weight="bold" className="text-accent" />
          {outside} outside {HOME_CITY} · Show list
        </button>
      )}

      <AnimatePresence>
        {active && (
          <motion.div
            key={active.vendor.id}
            className="absolute inset-x-3 bottom-3 z-30 rounded-3xl bg-surface p-3 shadow-float @medium:mx-auto @medium:max-w-md"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0, transition: { duration: 0.16 } }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
          >
            <div className="flex items-center gap-3 px-1">
              <Avatar name={active.vendor.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-[15px] font-semibold text-fg">
                  <span className="truncate">{active.vendor.name}</span>
                  {active.vendor.verified && <SealCheckIcon size={15} weight="fill" className="shrink-0 text-accent" />}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted">
                  {active.vendor.area} · {formatDistance(active.vendor.distanceKm)} ·
                  <StarIcon size={11} weight="fill" className="text-amber-500" />
                  {active.vendor.rating.toFixed(1)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setActiveId(null)}
                className="pressable grid size-8 place-items-center rounded-full bg-surface-2 text-fg-2"
              >
                <XIcon size={16} weight="bold" />
              </button>
            </div>
            <div className="no-scrollbar -mx-3 mt-3 flex gap-2.5 overflow-x-auto px-3">
              {active.props.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => nav.push(`/customer/props/${p.id}`)}
                  className="pressable flex w-[208px] shrink-0 items-center gap-2.5 rounded-2xl bg-surface-2 p-2 text-left"
                >
                  <PropThumb item={p} iconSize={22} className="size-14 shrink-0 rounded-xl bg-surface" />
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-[13px] font-semibold leading-4 text-fg">{p.name}</span>
                    <span className="mt-1 block text-xs">
                      <span className="font-bold text-fg">{formatINR(p.pricePerDay)}</span>
                      <span className="text-muted"> /day</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
