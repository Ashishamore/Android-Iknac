import { CheckIcon, type Icon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { haptic } from '@/lib/haptics'
import { EASE_OUT, T } from '@/lib/motion'
import { Badge } from './Display'

/* ── Chips ───────────────────────────────────────────────────────────────── */

interface ChipProps {
  children: ReactNode
  selected?: boolean
  onClick?: () => void
  icon?: Icon
}

export function Chip({ children, selected, onClick, icon: CIcon }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => {
        haptic()
        onClick?.()
      }}
      className={cn(
        'pressable inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors duration-200',
        selected
          ? 'border-accent/40 bg-accent-soft text-accent-soft-fg'
          : 'border-line-strong bg-surface text-fg-2 hover:bg-surface-2',
      )}
    >
      {CIcon ? (
        <CIcon size={16} weight={selected ? 'fill' : 'regular'} />
      ) : (
        <motion.span
          className="inline-flex overflow-hidden"
          initial={false}
          animate={{ width: selected ? 16 : 0, opacity: selected ? 1 : 0, marginRight: selected ? 0 : -6 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
        >
          <CheckIcon size={15} weight="bold" className="shrink-0" />
        </motion.span>
      )}
      {children}
    </button>
  )
}

/** Horizontally scrolling row of chips, edge to edge. */
export function ChipRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('no-scrollbar flex gap-2 overflow-x-auto px-4', className)}>{children}</div>
}

/* ── Segmented control ───────────────────────────────────────────────────── */

interface SegmentedProps<T extends string> {
  options: { value: T; label: string; icon?: Icon }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function Segmented<T extends string>({ options, value, onChange, className }: SegmentedProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div role="tablist" className={cn('relative flex rounded-xl bg-surface-2 p-1', className)}>
      <motion.div
        aria-hidden
        className="absolute bottom-1 left-1 top-1 rounded-[10px] bg-surface shadow-card dark:bg-surface-3"
        style={{ width: `calc((100% - 8px) / ${options.length})` }}
        initial={false}
        animate={{ x: `${index * 100}%` }}
        transition={T.snappy}
      />
      {options.map(({ value: v, label, icon: OIcon }) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={v === value}
          onClick={() => {
            haptic()
            onChange(v)
          }}
          className={cn(
            'relative z-10 flex h-9 flex-1 items-center justify-center gap-1.5 text-sm font-semibold transition-colors duration-200',
            v === value ? 'text-fg' : 'text-muted',
          )}
        >
          {OIcon && <OIcon size={16} weight={v === value ? 'fill' : 'regular'} />}
          {label}
        </button>
      ))}
    </div>
  )
}

/* ── Underline tabs ──────────────────────────────────────────────────────── */

interface TabsProps<T extends string> {
  tabs: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
  /** fill = equal widths · scroll = content width, horizontally scrollable */
  variant?: 'fill' | 'scroll'
  className?: string
}

export function Tabs<T extends string>({ tabs, value, onChange, variant = 'fill', className }: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null)
  const index = Math.max(0, tabs.findIndex((t) => t.value === value))

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    // offsetLeft/offsetWidth are layout values, unaffected by the device-frame scale.
    const measure = () => {
      const el = labelRefs.current[index]
      if (!el) return
      const pad = variant === 'fill' ? 12 : 0
      setBar({ x: el.offsetLeft - pad, w: el.offsetWidth + pad * 2 })
      if (variant === 'scroll') {
        list.scrollTo({ left: el.offsetLeft - (list.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' })
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    return () => ro.disconnect()
  }, [index, tabs.length, variant])

  return (
    <div className={cn('border-b border-line', className)}>
      <div ref={listRef} className={cn('relative flex', variant === 'scroll' && 'no-scrollbar gap-6 overflow-x-auto px-4')}>
        {tabs.map((t, i) => {
          const active = t.value === value
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                haptic()
                onChange(t.value)
              }}
              className={cn(
                'flex h-12 shrink-0 items-center justify-center whitespace-nowrap text-sm font-semibold transition-colors duration-200',
                variant === 'fill' && 'flex-1',
                active ? 'text-accent' : 'text-muted hover:text-fg',
              )}
            >
              <span
                ref={(el) => {
                  labelRefs.current[i] = el
                }}
                className="inline-flex items-center gap-1.5"
              >
                {t.label}
                {t.count ? <Badge tone={active ? 'brand' : 'neutral'}>{t.count}</Badge> : null}
              </span>
            </button>
          )
        })}
        {bar && (
          <motion.span
            aria-hidden
            className="absolute bottom-0 left-0 h-[3px] rounded-t-full bg-accent"
            initial={false}
            animate={{ x: bar.x, width: bar.w }}
            transition={T.snappy}
          />
        )}
      </div>
    </div>
  )
}

/** Cross-fades content when `id` changes (e.g. tab panels). `dir` sets the slide direction. */
export function FadeSwitch({
  id,
  dir = 0,
  children,
  className,
}: {
  id: string
  dir?: number
  children: ReactNode
  className?: string
}) {
  return (
    <AnimatePresence mode="wait" initial={false} custom={dir}>
      <motion.div
        key={id}
        custom={dir}
        variants={{
          enter: (d: number) => ({ opacity: 0, x: d * 18 }),
          center: { opacity: 1, x: 0 },
          exit: (d: number) => ({ opacity: 0, x: d * -18 }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.2, ease: EASE_OUT }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
