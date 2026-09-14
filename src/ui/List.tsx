import { CaretRightIcon, type Icon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { haptic } from '@/lib/haptics'
import type { Tone } from '@/lib/tones'
import { IconTile } from './Display'
import { SwitchVisual } from './Form'

/** Rounded card grouping list rows (settings style). */
export function ListGroup({
  title,
  footer,
  children,
  className,
}: {
  title?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('px-4', className)}>
      {title && <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">{title}</h3>}
      <div className="overflow-hidden rounded-2xl bg-surface shadow-card">{children}</div>
      {footer && <p className="px-1 pt-2 text-xs leading-relaxed text-muted">{footer}</p>}
    </section>
  )
}

interface ListItemProps {
  title: ReactNode
  subtitle?: ReactNode
  icon?: Icon
  iconTone?: Tone
  /** Custom leading element (e.g. an Avatar); replaces `icon`. */
  leading?: ReactNode
  /** Muted text on the right (e.g. current value). */
  value?: ReactNode
  trailing?: ReactNode
  chevron?: boolean
  onClick?: () => void
  /** Renders the row as a switch. */
  toggle?: { checked: boolean; onChange: (checked: boolean) => void }
  destructive?: boolean
  className?: string
}

export function ListItem({
  title,
  subtitle,
  icon,
  iconTone = 'neutral',
  leading,
  value,
  trailing,
  chevron,
  onClick,
  toggle,
  destructive,
  className,
}: ListItemProps) {
  const hasLeading = !!(leading || icon)
  const interactive = !!(onClick || toggle)
  const showChevron = chevron ?? (!!onClick && !trailing && !toggle)

  const content = (
    <>
      {leading ?? (icon && <IconTile icon={icon} tone={destructive ? 'danger' : iconTone} size="sm" />)}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[15px] font-medium', destructive ? 'text-danger' : 'text-fg')}>
          {title}
        </span>
        {subtitle && <span className="mt-0.5 block truncate text-[13px] text-muted">{subtitle}</span>}
      </span>
      {value && <span className="shrink-0 text-sm text-muted">{value}</span>}
      {trailing}
      {toggle && <SwitchVisual checked={toggle.checked} />}
      {showChevron && <CaretRightIcon size={15} weight="bold" className="shrink-0 text-subtle" />}
      <span
        aria-hidden
        className={cn('absolute bottom-0 right-0 h-px bg-line group-last:hidden', hasLeading ? 'left-[66px]' : 'left-4')}
      />
    </>
  )

  const classes = cn(
    'group relative flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors duration-150',
    interactive && 'outline-none hover:bg-surface-2/60 active:bg-surface-2 focus-visible:bg-surface-2',
    className,
  )

  if (!interactive) return <div className={classes}>{content}</div>
  return (
    <button
      type="button"
      role={toggle ? 'switch' : undefined}
      aria-checked={toggle ? toggle.checked : undefined}
      onClick={() => {
        if (toggle) {
          haptic()
          toggle.onChange(!toggle.checked)
        }
        onClick?.()
      }}
      className={classes}
    >
      {content}
    </button>
  )
}
