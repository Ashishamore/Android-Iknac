import { CaretDownIcon, CheckIcon, MagnifyingGlassIcon, MinusIcon, PlusIcon, XIcon, type Icon } from '@phosphor-icons/react'
import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from '@/ui/Display'

/* ── Buttons ─────────────────────────────────────────────────────────────── */

const VARIANTS = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-strong shadow-[0_1px_0_rgb(0_0_0/0.06)]',
  secondary: 'border border-line-strong bg-surface text-fg hover:bg-surface-2',
  ghost: 'text-fg-2 hover:bg-surface-2 hover:text-fg',
  tonal: 'bg-accent-soft text-accent-soft-fg hover:brightness-[0.97] dark:hover:brightness-125',
  danger: 'bg-danger text-white hover:brightness-95',
  'danger-ghost': 'text-danger hover:bg-danger-soft',
  success: 'bg-success text-white hover:brightness-95',
}

const SIZES = {
  xs: 'h-7 gap-1 rounded-md px-2 text-xs',
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-[13px]',
  md: 'h-9 gap-2 rounded-lg px-3.5 text-sm',
  lg: 'h-10 gap-2 rounded-lg px-4 text-sm',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
  icon?: Icon
  iconRight?: Icon
  loading?: boolean
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon: LIcon, iconRight: RIcon, loading, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  const iconSize = size === 'xs' ? 13 : size === 'sm' ? 15 : 16
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-[background-color,color,filter,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        block && 'flex w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : LIcon ? <LIcon size={iconSize} weight={variant === 'primary' ? 'bold' : 'regular'} className="shrink-0" /> : null}
      {children}
      {RIcon && <RIcon size={iconSize - 2} weight="bold" className="shrink-0 opacity-80" />}
    </button>
  )
})

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { icon: Icon; label: string; size?: 'xs' | 'sm' | 'md'; badge?: number; active?: boolean; weight?: 'regular' | 'bold' | 'fill' }
>(function IconButton({ icon: I, label, size = 'md', badge, active, weight, className, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'relative grid shrink-0 place-items-center rounded-lg text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg disabled:pointer-events-none disabled:opacity-40',
        size === 'xs' ? 'size-7' : size === 'sm' ? 'size-8' : 'size-9',
        active && 'bg-accent-soft text-accent-soft-fg hover:bg-accent-soft',
        className,
      )}
      {...rest}
    >
      <I size={size === 'xs' ? 15 : size === 'sm' ? 17 : 19} weight={weight ?? (active ? 'fill' : 'regular')} />
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  )
})

/* ── Fields ──────────────────────────────────────────────────────────────── */

export function Field({ label, hint, error, htmlFor, optional, className, children, aside }: { label?: ReactNode; hint?: ReactNode; error?: string; htmlFor?: string; optional?: boolean; className?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor={htmlFor} className={cn('text-[13px] font-semibold', error ? 'text-danger' : 'text-fg-2')}>
            {label}
            {optional && <span className="ml-1 font-normal text-subtle">(optional)</span>}
          </label>
          {aside}
        </div>
      )}
      {children}
      {error ? <p className="mt-1.5 text-xs font-medium text-danger">{error}</p> : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

const inputBase =
  'w-full min-w-0 rounded-lg border bg-surface text-sm text-fg outline-none transition-[border-color,box-shadow] placeholder:text-subtle focus:border-accent focus:ring-3 focus:ring-accent/15 disabled:bg-surface-2 disabled:text-muted'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  prefix?: ReactNode
  suffix?: ReactNode
  optional?: boolean
  inputClassName?: string
}

export function TextField({ label, hint, error, prefix, suffix, optional, className, inputClassName, id, ...rest }: TextFieldProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fid} optional={optional} className={className}>
      <div className="relative flex items-center">
        {prefix && <span className="pointer-events-none absolute left-3 text-sm text-muted">{prefix}</span>}
        <input
          id={fid}
          aria-invalid={!!error || undefined}
          className={cn(inputBase, 'h-9 px-3', prefix ? 'pl-8' : '', suffix ? 'pr-10' : '', error ? 'border-danger' : 'border-line-strong', inputClassName)}
          {...rest}
        />
        {suffix && <span className="absolute right-3 text-sm text-muted">{suffix}</span>}
      </div>
    </Field>
  )
}

export function TextArea({ label, hint, error, optional, className, id, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: ReactNode; hint?: ReactNode; error?: string; optional?: boolean }) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fid} optional={optional} className={className}>
      <textarea id={fid} aria-invalid={!!error || undefined} className={cn(inputBase, 'resize-y px-3 py-2 leading-relaxed', error ? 'border-danger' : 'border-line-strong')} {...rest} />
    </Field>
  )
}

export function Select({ label, hint, error, className, id, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label?: ReactNode; hint?: ReactNode; error?: string }) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fid} className={className}>
      <div className="relative">
        <select id={fid} className={cn(inputBase, 'h-9 appearance-none pl-3 pr-8', error ? 'border-danger' : 'border-line-strong')} {...rest}>
          {children}
        </select>
        <CaretDownIcon size={14} weight="bold" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
      </div>
    </Field>
  )
}

export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { onClear?: () => void }>(function SearchInput({ className, onClear, value, ...rest }, ref) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <MagnifyingGlassIcon size={16} className="pointer-events-none absolute left-2.5 text-muted" />
      <input ref={ref} type="search" value={value} className={cn(inputBase, 'h-9 border-line-strong pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden')} {...rest} />
      {onClear && value ? (
        <button type="button" aria-label="Clear search" onClick={onClear} className="absolute right-1.5 grid size-6 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-fg">
          <XIcon size={13} weight="bold" />
        </button>
      ) : null}
    </div>
  )
})

/* ── Toggles ─────────────────────────────────────────────────────────────── */

export function Switch({ checked, onChange, label, disabled, size = 'md' }: { checked: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-40',
        size === 'sm' ? 'h-4 w-7' : 'h-5 w-9',
        checked ? 'bg-accent' : 'bg-line-strong',
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full bg-white shadow-sm transition-transform duration-200',
          size === 'sm' ? 'size-3' : 'size-4',
          checked ? (size === 'sm' ? 'translate-x-3.5' : 'translate-x-[18px]') : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

export function Checkbox({ checked, indeterminate, onChange, label, className }: { checked: boolean; indeterminate?: boolean; onChange: (on: boolean) => void; label: string; className?: string }) {
  const on = checked || indeterminate
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={cn('grid size-4 shrink-0 place-items-center rounded-[5px] border transition-colors', on ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong bg-surface hover:border-muted', className)}
    >
      {indeterminate ? <MinusIcon size={11} weight="bold" /> : checked ? <CheckIcon size={11} weight="bold" /> : null}
    </button>
  )
}

export function Segmented<T extends string>({ options, value, onChange, size = 'md', className }: { options: { value: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md'; className?: string }) {
  return (
    <div role="tablist" className={cn('inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-surface-2 p-0.5 no-scrollbar', className)}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              on ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg',
            )}
          >
            {o.label}
            {o.count !== undefined && <span className={cn('rounded px-1 text-[11px] tabular-nums', on ? 'bg-accent-soft text-accent-soft-fg' : 'bg-surface-3 text-muted')}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Underline tabs, like Teams / Outlook. */
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('flex items-center gap-1 overflow-x-auto border-b border-line no-scrollbar', className)}>
      {tabs.map((t) => {
        const on = t.value === value
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.value)}
            className={cn('relative inline-flex h-10 shrink-0 items-center gap-1.5 px-3 text-[13px] font-semibold transition-colors', on ? 'text-fg' : 'text-muted hover:text-fg')}
          >
            {t.label}
            {t.count ? <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', on ? 'bg-accent text-accent-fg' : 'bg-surface-3 text-fg-2')}>{t.count}</span> : null}
            {on && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />}
          </button>
        )
      })}
    </div>
  )
}

export function Chip({ selected, onClick, children, className }: { selected?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
        selected ? 'border-accent bg-accent-soft text-accent-soft-fg' : 'border-line-strong bg-surface text-fg-2 hover:border-muted hover:text-fg',
        className,
      )}
    >
      {selected && <CheckIcon size={13} weight="bold" />}
      {children}
    </button>
  )
}

export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <span className="inline-flex h-8 shrink-0 items-center rounded-lg border border-line-strong bg-surface" role="group" aria-label={label}>
      <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid h-full w-8 place-items-center rounded-l-lg text-fg-2 hover:bg-surface-2 disabled:opacity-35">
        <MinusIcon size={13} weight="bold" />
      </button>
      <span className="w-8 border-x border-line text-center text-sm font-bold tabular-nums text-fg" aria-live="polite">
        {value}
      </span>
      <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid h-full w-8 place-items-center rounded-r-lg text-fg-2 hover:bg-surface-2 disabled:opacity-35">
        <PlusIcon size={13} weight="bold" />
      </button>
    </span>
  )
}

/** Keyboard key hint. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface-2 px-1 font-sans text-[11px] font-semibold text-muted', className)}>{children}</kbd>
}
