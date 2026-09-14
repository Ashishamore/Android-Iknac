import { ArrowsLeftRightIcon, MapPinIcon, SparkleIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo } from 'react'
import type { Era } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { T } from '@/lib/motion'
import { categoryIcon, placeItems, type SceneItem } from '@/lib/studio'

/** Period palettes for the illustrated scene (content colours, not UI chrome). */
const PALETTE: Record<Era, { wall: [string, string]; floor: string; ink: string; light: string }> = {
  Colonial: { wall: ['#f2e7d5', '#e2cdae'], floor: '#b4865a', ink: '#6b4a22', light: '#fff8ea' },
  '1940s–60s': { wall: ['#e5eddd', '#cddbc4'], floor: '#9b8a73', ink: '#3f5a36', light: '#f7fbf3' },
  '1970s': { wall: ['#f8e2ca', '#eec6a0'], floor: '#98582f', ink: '#8a3f12', light: '#fff5e8' },
  '1980s–90s': { wall: ['#e9e3f7', '#d5cbef'], floor: '#7c7290', ink: '#4a3890', light: '#f8f5ff' },
  Y2K: { wall: ['#e2f2fc', '#c6e0f4'], floor: '#8aafc8', ink: '#1d5f86', light: '#f4fbff' },
  Modern: { wall: ['#f1f3f5', '#e0e4e8'], floor: '#b4bac3', ink: '#39414d', light: '#fcfdfe' },
}

interface SceneCanvasProps {
  items: SceneItem[]
  era: Era | null
  /** Reference photo: markers are drawn over it instead of the illustration. */
  photo?: string | null
  /** Thumbnail mode: no markers or labels. */
  compact?: boolean
  activeSlot?: string | null
  onSelect?: (slotId: string | null) => void
  /** "Swap" in the marker bubble. */
  onSwap?: (slotId: string) => void
  className?: string
}

/**
 * "Scene image with item markers": an illustrated set (or the reference photo)
 * with a numbered marker for every item on the board.
 */
export function SceneCanvas({ items, era, photo, compact, activeSlot, onSelect, onSwap, className }: SceneCanvasProps) {
  const p = PALETTE[era ?? 'Modern']
  const places = useMemo(() => placeItems(items.map((it) => it.slot)), [items])
  const active = items.find((it) => it.slot.id === activeSlot)

  return (
    <div
      className={cn('relative isolate aspect-[16/10] w-full overflow-hidden rounded-3xl bg-surface-2', className)}
      onClick={() => onSelect?.(null)}
    >
      {photo ? (
        <>
          <img src={photo} alt="Reference" draggable={false} className="absolute inset-0 size-full object-cover dark:brightness-90" />
          <div aria-hidden className="absolute inset-0 bg-linear-to-b from-black/5 via-transparent to-black/30" />
        </>
      ) : (
        <Illustration palette={p} />
      )}

      {/* Props drawn into the illustrated scene */}
      {!photo &&
        items.map(({ slot, prop }) => {
          const at = places[slot.id]
          if (!at || at.place) return null
          const Icon = prop?.icon ?? categoryIcon(slot.category)
          return (
            <motion.div
              key={slot.id}
              aria-hidden
              className="pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_6px_6px_rgb(0_0_0/0.12)]"
              style={{ left: `${at.x}%`, top: `${at.y}%`, width: `${at.size}%`, color: p.ink, opacity: slot.haveIt ? 0.45 : 1 }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: slot.haveIt ? 0.45 : 1, scale: 1 }}
              transition={T.pop_in}
            >
              <Icon size="100%" weight="duotone" />
            </motion.div>
          )
        })}

      {/* The setting itself (Locations) as labels, top-left */}
      {items.map(({ slot, prop, n }) => {
        const at = places[slot.id]
        if (!at?.place) return null
        const selected = slot.id === activeSlot
        const label = (
          <>
            {!compact && <Marker n={n} selected={selected} muted={slot.haveIt} inline />}
            <MapPinIcon size={compact ? 9 : 13} weight="fill" className="shrink-0 text-accent" />
            <span className="truncate">{prop?.name ?? slot.name}</span>
          </>
        )
        const pill = 'absolute z-10 inline-flex max-w-[60%] items-center gap-1.5 rounded-full bg-surface/90 font-semibold text-fg shadow-card backdrop-blur-sm'
        // Thumbnails sit inside a button, so no nested buttons there.
        if (compact) {
          return (
            <span key={slot.id} className={cn(pill, 'left-1.5 px-1.5 py-0.5 text-[9px]')} style={{ top: `calc(${at.y * 0.6}% + 4px)` }}>
              {label}
            </span>
          )
        }
        return (
          <button
            key={slot.id}
            type="button"
            aria-label={`Item ${n}: ${slot.name}`}
            aria-pressed={selected}
            onClick={(e) => {
              e.stopPropagation()
              haptic()
              onSelect?.(selected ? null : slot.id)
            }}
            className={cn(pill, 'left-3 px-2.5 py-1 text-xs', selected && 'ring-2 ring-accent')}
            style={{ top: `calc(${at.y}% + 6px)` }}
          >
            {label}
          </button>
        )
      })}

      {/* Numbered markers */}
      {!compact &&
        items.map(({ slot, n }) => {
          const at = places[slot.id]
          if (!at || at.place) return null
          const selected = slot.id === activeSlot
          // Photos: on the spot. Illustrations: the icon's top-right corner.
          const left = photo ? at.x : at.x + at.size * 0.42
          const top = photo ? at.y : at.y - at.size * 1.6 * 0.42
          return (
            <button
              key={slot.id}
              type="button"
              aria-label={`Item ${n}: ${slot.name}`}
              aria-pressed={selected}
              onClick={(e) => {
                e.stopPropagation()
                haptic()
                onSelect?.(selected ? null : slot.id)
              }}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <Marker n={n} selected={selected} muted={slot.haveIt} pulse={!!photo && !selected} />
            </button>
          )
        })}

      {/* Bubble for the selected marker */}
      <AnimatePresence>
        {active && !compact && !places[active.slot.id]?.place && (
          <Bubble key={active.slot.id} item={active} at={places[active.slot.id]} photo={!!photo} onSwap={onSwap} />
        )}
      </AnimatePresence>

      {!compact && (
        <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          <SparkleIcon size={11} weight="fill" /> AI concept
        </span>
      )}
    </div>
  )
}

function Marker({ n, selected, muted, inline, pulse }: { n: number; selected: boolean; muted?: boolean; inline?: boolean; pulse?: boolean }) {
  return (
    <span className={cn('relative grid place-items-center', !inline && 'size-7')}>
      {pulse && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-white/60"
          animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <span
        className={cn(
          'relative grid place-items-center rounded-full font-bold tabular-nums transition-transform duration-200',
          inline ? 'size-[18px] text-[10px]' : 'size-6 text-[11px] shadow-float ring-2 ring-white',
          selected ? 'scale-125 bg-accent text-accent-fg' : muted ? 'bg-surface-3 text-muted' : 'bg-fg text-bg',
        )}
      >
        {n}
      </span>
    </span>
  )
}

function Bubble({
  item,
  at,
  photo,
  onSwap,
}: {
  item: SceneItem
  at: { x: number; y: number; size: number }
  photo: boolean
  onSwap?: (slotId: string) => void
}) {
  const right = at.x > 55
  const top = Math.min(80, Math.max(20, photo ? at.y : at.y - at.size * 0.5))
  const side = photo ? 5 : at.size * 0.5 + 3
  return (
    <motion.div
      className="absolute z-20 w-[52%] max-w-56 -translate-y-1/2 rounded-2xl bg-surface p-2.5 text-left shadow-float"
      style={right ? { right: `${100 - at.x + side}%`, top: `${top}%` } : { left: `${at.x + side}%`, top: `${top}%` }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
      transition={T.pop_in}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-2xs font-bold uppercase tracking-[0.06em] text-accent">{item.slot.name}</p>
      <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-fg">
        {item.prop?.name ?? 'We already have this'}
      </p>
      {item.prop && (
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-xs">
            <b className="text-fg">{formatINR(item.prop.pricePerDay)}</b>
            <span className="text-muted">/day</span>
          </span>
          {onSwap && (
            <button
              type="button"
              onClick={() => onSwap(item.slot.id)}
              className="pressable inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2 py-1 text-xs font-semibold text-accent-soft-fg"
            >
              <ArrowsLeftRightIcon size={12} weight="bold" /> Swap
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

/** A simple set: wall, arched window, frame, skirting, floor and rug. */
function Illustration({ palette: p }: { palette: (typeof PALETTE)[Era] }) {
  const line = `${p.ink}2e`
  return (
    <div aria-hidden className="absolute inset-0 dark:brightness-[0.82]">
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${p.wall[0]}, ${p.wall[1]})` }} />
      <div
        className="absolute -left-[12%] -top-[20%] size-[75%] rounded-full"
        style={{ background: `radial-gradient(circle, ${p.light}d0 0%, transparent 68%)` }}
      />
      <div
        className="absolute left-[6%] top-[9%] h-[42%] w-[19%] overflow-hidden rounded-t-full border-[3px]"
        style={{ borderColor: line, background: `linear-gradient(180deg, ${p.light}, ${p.wall[0]})` }}
      >
        <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2" style={{ background: line }} />
        <div className="absolute inset-x-0 top-[55%] h-[3px]" style={{ background: line }} />
      </div>
      <div className="absolute right-[8%] top-[13%] h-[19%] w-[12%] rounded-md border-[3px]" style={{ borderColor: line }} />
      <div className="absolute inset-x-0 bottom-0 h-[31%]" style={{ background: p.floor }} />
      <div className="absolute inset-x-0 bottom-[31%] h-[2.5%]" style={{ background: `${p.ink}40` }} />
      <div
        className="absolute bottom-[5%] left-1/2 h-[15%] w-[58%] -translate-x-1/2 rounded-[50%]"
        style={{ background: `${p.ink}26` }}
      />
    </div>
  )
}
