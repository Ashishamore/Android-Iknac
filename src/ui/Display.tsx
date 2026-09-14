import { CaretRightIcon, ImageIcon, type Icon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { TONE_SOFT, TONE_SOLID, type Tone } from '@/lib/tones'

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn('size-5 animate-spin-slow', className)} aria-hidden>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M21.5 12A9.5 9.5 0 0 0 12 2.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

/* ── Avatar ──────────────────────────────────────────────────────────────── */

const AVATAR_TONES = [
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
]

const AVATAR_SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-13 text-base',
  xl: 'size-18 text-xl',
}

const PRESENCE = { online: 'bg-success', away: 'bg-warning', busy: 'bg-danger' }

const hashOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

interface AvatarProps {
  name: string
  src?: string
  size?: keyof typeof AVATAR_SIZES
  presence?: keyof typeof PRESENCE
  className?: string
}

export function Avatar({ name, src, size = 'md', presence, className }: AvatarProps) {
  return (
    <span className={cn('relative inline-flex h-fit shrink-0', className)}>
      <span
        className={cn(
          'grid place-items-center overflow-hidden rounded-full font-semibold',
          AVATAR_SIZES[size],
          !src && AVATAR_TONES[hashOf(name) % AVATAR_TONES.length],
        )}
      >
        {src ? <img src={src} alt="" className="size-full object-cover" /> : initialsOf(name)}
      </span>
      {presence && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-surface',
            size === 'xs' || size === 'sm' ? 'size-2.5' : 'size-3',
            PRESENCE[presence],
          )}
        />
      )}
    </span>
  )
}

export function AvatarStack({ names, max = 3, size = 'xs' }: { names: string[]; max?: number; size?: 'xs' | 'sm' }) {
  const extra = names.length - max
  return (
    <span className="flex items-center -space-x-1.5">
      {names.slice(0, max).map((n) => (
        <Avatar key={n} name={n} size={size} className="rounded-full ring-2 ring-surface" />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            'grid place-items-center rounded-full bg-surface-3 font-semibold text-fg-2 ring-2 ring-surface',
            AVATAR_SIZES[size],
          )}
        >
          +{extra}
        </span>
      )}
    </span>
  )
}

/* ── Badges & tags ───────────────────────────────────────────────────────── */

export function Badge({ children, tone = 'danger', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-2xs font-bold tabular-nums',
        tone === 'neutral'
          ? 'bg-surface-3 text-fg-2'
          : cn(TONE_SOLID[tone], tone === 'brand' ? 'text-accent-fg' : 'text-white'),
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Tag({ children, tone = 'neutral', dot, className }: { children: ReactNode; tone?: Tone; dot?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs font-semibold',
        TONE_SOFT[tone],
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', TONE_SOLID[tone])} />}
      {children}
    </span>
  )
}

export function IconTile({
  icon: TileIcon,
  tone = 'brand',
  size = 'md',
  className,
}: {
  icon: Icon
  tone?: Tone
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const box = { sm: 'size-9 rounded-xl', md: 'size-11 rounded-2xl', lg: 'size-14 rounded-2xl' }[size]
  const px = { sm: 19, md: 22, lg: 26 }[size]
  return (
    <span className={cn('grid shrink-0 place-items-center', box, TONE_SOFT[tone], className)}>
      <TileIcon size={px} weight="fill" />
    </span>
  )
}

/* ── Image placeholder ───────────────────────────────────────────────────── */

/**
 * Neutral stand-in for an image that hasn't been supplied yet. Size it with
 * className (e.g. "aspect-video rounded-3xl").
 */
export function ImagePlaceholder({
  label,
  hint,
  className,
  iconSize = 32,
}: {
  label?: string
  /** Small secondary text, e.g. the expected ratio. */
  hint?: string
  className?: string
  iconSize?: number
}) {
  return (
    <div
      role="img"
      aria-label={label ?? 'Image placeholder'}
      className={cn('relative grid place-items-center overflow-hidden bg-surface-3/70 text-subtle', className)}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, transparent 0 13px, color-mix(in oklab, var(--color-line-strong) 55%, transparent) 13px 14px)',
        }}
      />
      <div className="relative flex flex-col items-center gap-1.5 text-center">
        <ImageIcon size={iconSize} weight="duotone" />
        {label && <span className="text-sm font-semibold text-muted">{label}</span>}
        {hint && <span className="text-2xs font-medium uppercase tracking-[0.08em]">{hint}</span>}
      </div>
    </div>
  )
}

/* ── Progress & loading ──────────────────────────────────────────────────── */

export function ProgressBar({ value, tone = 'brand', className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-surface-3', className)}>
      <motion.div
        className={cn('h-full rounded-full', TONE_SOLID[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.1 }}
      />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-surface-3/80', className)}>
      <div className="absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-white/60 to-transparent dark:via-white/[0.06]" />
    </div>
  )
}

/* ── Layout helpers ──────────────────────────────────────────────────────── */

export function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: string
  onAction?: () => void
  className?: string
}) {
  return (
    <div className={cn('flex items-end justify-between gap-3 px-4 pb-3 pt-7', className)}>
      <div className="min-w-0">
        <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-fg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="pressable -mr-1 inline-flex shrink-0 items-center gap-0.5 rounded-lg px-1 py-0.5 text-sm font-semibold text-accent"
        >
          {action}
          <CaretRightIcon size={13} weight="bold" />
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon: EIcon,
  title,
  description,
  action,
  className,
}: {
  icon: Icon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className={cn('flex flex-col items-center px-8 py-14 text-center', className)}
    >
      <div className="mb-4 grid size-16 place-items-center rounded-3xl bg-accent-soft text-accent">
        <EIcon size={30} weight="duotone" />
      </div>
      <h3 className="font-display text-base font-bold text-fg">{title}</h3>
      {description && <p className="mt-1 max-w-64 text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}
