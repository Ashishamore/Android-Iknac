import { CaretRightIcon, ImageIcon, type Icon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { CATEGORY_ICON, propById } from '@/data/props'
import { cn } from '@/lib/cn'
import { useNow } from '@/lib/hooks'
import { dueLabel, type Listing } from '@/lib/owner'
import { TONE_SOFT, type Tone } from '@/lib/tones'
import { linkProps } from '~/router'

export { Avatar, Spinner, Tag } from '@/ui/Display'

/* ── Page chrome ─────────────────────────────────────────────────────────── */

export function PageHeader({
  crumbs,
  title,
  subtitle,
  actions,
  meta,
  className,
}: {
  crumbs?: { label: string; to?: string }[]
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('mb-5', className)}>
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-1.5 flex min-w-0 items-center gap-1 text-[13px] text-muted">
          {crumbs.map((c, i) => (
            <span key={i} className="flex min-w-0 items-center gap-1">
              {i > 0 && <CaretRightIcon size={11} weight="bold" className="shrink-0 text-subtle" />}
              {c.to ? (
                <a {...linkProps(c.to)} className="truncate rounded hover:text-fg hover:underline">
                  {c.label}
                </a>
              ) : (
                <span className="truncate text-fg-2">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[22px] font-extrabold leading-tight tracking-[-0.015em] text-fg sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-1.5">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}

export function Card({ className, children, as: Tag = 'section' }: { className?: string; children: ReactNode; as?: 'section' | 'div' | 'article' }) {
  return <Tag className={cn('min-w-0 rounded-xl border border-line bg-surface shadow-card', className)}>{children}</Tag>
}

export function CardHeader({ title, subtitle, icon: HIcon, actions, className }: { title: ReactNode; subtitle?: ReactNode; icon?: Icon; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 border-b border-line px-4 py-3', className)}>
      {HIcon && <HIcon size={18} weight="duotone" className="shrink-0 text-accent" />}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-bold text-fg">{title}</h2>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon: EIcon, title, description, action, className }: { icon: Icon; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">
        <EIcon size={24} weight="duotone" />
      </span>
      <p className="mt-3 text-[15px] font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Big number tiles on dashboards. */
export function Stat({ label, value, hint, icon: SIcon, tone, onClick, className }: { label: string; value: ReactNode; hint?: ReactNode; icon?: Icon; tone?: Tone; onClick?: () => void; className?: string }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn('group min-w-0 rounded-xl border border-line bg-surface p-4 text-left shadow-card', onClick && 'transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-float', className)}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[13px] font-medium text-muted">{label}</p>
        {SIcon && (
          <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg', TONE_SOFT[tone ?? 'brand'])}>
            <SIcon size={15} weight="bold" />
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate font-display text-2xl font-extrabold tabular-nums tracking-[-0.01em] text-fg">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
    </Tag>
  )
}

/** Label → value rows. */
export function KV({ label, value, note, strong, warn, className }: { label: ReactNode; value: ReactNode; note?: ReactNode; strong?: boolean; warn?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-2.5', className)}>
      <dt className="min-w-0">
        <span className={cn('block text-[13px]', strong ? 'font-semibold text-fg' : 'text-fg-2')}>{label}</span>
        {note && <span className="block text-xs text-subtle">{note}</span>}
      </dt>
      <dd className={cn('shrink-0 text-right text-[13px] tabular-nums', strong ? 'font-bold text-fg' : 'font-semibold', warn ? 'text-warning' : 'text-fg')}>{value}</dd>
    </div>
  )
}

export function ProgressBar({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'success' | 'warning' | 'danger'; className?: string }) {
  const fill = { brand: 'bg-accent', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }[tone]
  return (
    <span className={cn('block h-1.5 overflow-hidden rounded-full bg-surface-3', className)}>
      <span className={cn('block h-full rounded-full transition-[width] duration-500', fill)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  )
}

export function CountBadge({ n, tone = 'danger', className }: { n: number; tone?: 'danger' | 'brand' | 'neutral'; className?: string }) {
  if (!n) return null
  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums leading-none',
        tone === 'danger' ? 'bg-danger text-white' : tone === 'brand' ? 'bg-accent text-accent-fg' : 'bg-surface-3 text-fg-2',
        className,
      )}
    >
      {n > 99 ? '99+' : n}
    </span>
  )
}

/** A listing's first photo, or its category icon on a blank tile. */
export function Thumb({ listing, className, iconSize = 20 }: { listing: Pick<Listing, 'photos' | 'category' | 'catalogId'>; className?: string; iconSize?: number }) {
  const photo = listing.photos.find((p) => p.startsWith('data:') || p.startsWith('/') || p.startsWith('blob:'))
  if (photo) return <img src={photo} alt="" draggable={false} className={cn('shrink-0 object-cover', className)} />
  const TIcon = (listing.catalogId && propById(listing.catalogId)?.icon) || CATEGORY_ICON[listing.category]
  return (
    <span className={cn('grid shrink-0 place-items-center bg-surface-2', className)}>
      {TIcon ? <TIcon size={iconSize} weight="light" className="text-subtle" /> : <ImageIcon size={iconSize} className="text-subtle" />}
    </span>
  )
}

/** The 24-hour answer clock. */
export function DueTag({ due, className }: { due: number; className?: string }) {
  const now = useNow(30_000).getTime()
  const d = dueLabel(due, now)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
        d.overdue ? 'bg-danger text-white' : d.urgent ? 'bg-warning-soft text-warning' : 'bg-surface-2 text-fg-2',
        className,
      )}
    >
      {d.text}
    </span>
  )
}

/** Info / warning / danger strip inside a page. */
export function Banner({ tone = 'info', icon: BIcon, title, children, actions, className }: { tone?: Tone; icon?: Icon; title?: ReactNode; children?: ReactNode; actions?: ReactNode; className?: string }) {
  const iconTone = { brand: 'text-accent', neutral: 'text-muted', success: 'text-success', danger: 'text-danger', warning: 'text-warning', info: 'text-info' }[tone]
  const bg = { brand: 'bg-accent-soft border-accent/15', neutral: 'bg-surface-2 border-line', success: 'bg-success-soft border-success/20', danger: 'bg-danger-soft border-danger/20', warning: 'bg-warning-soft border-warning/20', info: 'bg-info-soft border-info/20' }[tone]
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3', bg, className)}>
      {BIcon && <BIcon size={20} weight="fill" className={cn('mt-px shrink-0', iconTone)} />}
      <div className="min-w-0 flex-1 basis-60">
        {title && <p className="text-sm font-semibold text-fg">{title}</p>}
        {children && <div className="text-[13px] leading-relaxed text-fg-2">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function SectionTitle({ children, className, aside }: { children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <div className={cn('mb-2 flex items-center justify-between gap-2', className)}>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{children}</h3>
      {aside}
    </div>
  )
}
