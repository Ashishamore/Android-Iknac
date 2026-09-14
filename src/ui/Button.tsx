import type { Icon, IconWeight } from '@phosphor-icons/react'
import { useMotionValueEvent } from 'motion/react'
import { useState, type ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Display'
import { useScrollY } from './scrollContext'

type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'outline' | 'ghost' | 'danger' | 'danger-soft'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-fg shadow-[0_1px_2px_rgb(16_24_40/0.14),inset_0_1px_0_rgb(255_255_255/0.14)] hover:bg-accent-strong',
  secondary: 'bg-surface-2 text-fg hover:bg-surface-3',
  tonal: 'bg-accent-soft text-accent-soft-fg hover:brightness-[0.97]',
  outline: 'border border-line-strong bg-surface text-fg hover:bg-surface-2',
  ghost: 'text-accent hover:bg-accent-soft',
  danger: 'bg-danger text-white hover:brightness-95',
  'danger-soft': 'bg-danger-soft text-danger hover:brightness-[0.98]',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-xl px-3.5 text-sm',
  md: 'h-11 gap-2 rounded-xl px-5 text-[15px]',
  lg: 'h-[52px] gap-2 rounded-2xl px-6 text-base',
}

const ICON_PX: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 }

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Full width. */
  block?: boolean
  loading?: boolean
  icon?: Icon
  trailingIcon?: Icon
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  icon: LeadIcon,
  trailingIcon: TrailIcon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      className={cn(
        'pressable relative inline-flex shrink-0 items-center justify-center font-semibold tracking-[-0.01em] outline-none focus-visible:ring-4 focus-visible:ring-accent/25 disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        loading && 'pointer-events-none',
        className,
      )}
      {...rest}
    >
      <span className={cn('inline-flex items-center justify-center gap-[inherit] transition-opacity', loading && 'opacity-0')}>
        {LeadIcon && <LeadIcon size={ICON_PX[size]} weight="bold" />}
        {children}
        {TrailIcon && <TrailIcon size={ICON_PX[size]} weight="bold" />}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner />
        </span>
      )}
    </button>
  )
}

/**
 * Floating action button (pass it to <Screen fab>). By default it sits
 * bottom-right and shrinks to just the icon while scrolled; with `block` it
 * spans the full width and always shows its label.
 */
export function Fab({
  icon: FIcon,
  label,
  onClick,
  block,
}: {
  icon: Icon
  label: string
  onClick: () => void
  block?: boolean
}) {
  const scrollY = useScrollY()
  const [scrolled, setScrolled] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 80))
  const compact = scrolled && !block
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'pressable pointer-events-auto flex h-14 items-center rounded-2xl bg-accent pl-4 text-accent-fg shadow-float outline-none transition-[padding] duration-300 ease-out-quint focus-visible:ring-4 focus-visible:ring-accent/30',
        compact ? 'pr-4' : 'pr-5',
        block && 'w-full justify-center @medium:mx-auto @medium:max-w-md',
      )}
    >
      <FIcon size={24} weight="bold" className="shrink-0" />
      <span
        className={cn(
          'overflow-hidden whitespace-nowrap text-[15px] font-semibold transition-all duration-300 ease-out-quint',
          compact ? 'ml-0 max-w-0 opacity-0' : 'ml-2 max-w-40 opacity-100',
        )}
      >
        {label}
      </span>
    </button>
  )
}

const ICON_BUTTON_VARIANTS = {
  ghost: 'text-fg hover:bg-surface-2 active:bg-surface-3',
  surface: 'bg-surface text-fg shadow-card hover:bg-surface-2',
  tonal: 'bg-accent-soft text-accent-soft-fg',
  solid: 'bg-accent text-accent-fg shadow-float',
}

interface IconButtonProps extends ComponentProps<'button'> {
  icon: Icon
  /** Accessible label (also shown as tooltip on desktop). */
  label: string
  variant?: keyof typeof ICON_BUTTON_VARIANTS
  size?: 'sm' | 'md' | 'lg'
  weight?: IconWeight
  /** Red dot (true) or count badge. */
  badge?: boolean | number
}

export function IconButton({
  icon: BIcon,
  label,
  variant = 'ghost',
  size = 'md',
  weight = 'regular',
  badge,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const box = { sm: 'size-9', md: 'size-10', lg: 'size-12' }[size]
  const px = { sm: 20, md: 22, lg: 24 }[size]
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'pressable relative grid shrink-0 place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-accent/25',
        box,
        ICON_BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      <BIcon size={px} weight={weight} />
      {badge === true && <span className="absolute right-2 top-2 size-2 rounded-full bg-danger ring-2 ring-surface" />}
      {typeof badge === 'number' && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-surface">
          {badge}
        </span>
      )}
    </button>
  )
}
