import { CaretDownIcon, MagnifyingGlassIcon, XCircleIcon, type Icon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { haptic } from '@/lib/haptics'
import { EASE_OUT, T } from '@/lib/motion'
import { BottomSheet } from '@/overlays/BottomSheet'

const fieldBox = (error?: string) =>
  cn(
    'relative rounded-2xl border bg-surface transition-[border-color,box-shadow] duration-200',
    error
      ? 'border-danger'
      : 'border-line-strong focus-within:border-accent focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_14%,transparent)]',
  )

const floatingLabel = (error?: string) =>
  cn(
    'pointer-events-none absolute top-4 origin-left text-base text-muted transition-transform duration-200 ease-out-quint',
    'peer-focus:-translate-y-2.5 peer-focus:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-75',
    error ? 'peer-focus:text-danger' : 'peer-focus:text-accent',
  )

/** Error (animated) or hint text under a field. */
export function FieldMessage({ error, hint }: { error?: string; hint?: string }) {
  if (error) {
    return (
      <motion.p
        key={error}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-1.5 px-1 text-xs font-medium text-danger"
      >
        {error}
      </motion.p>
    )
  }
  return hint ? <p className="mt-1.5 px-1 text-xs text-muted">{hint}</p> : null
}

interface TextFieldProps extends Omit<ComponentProps<'input'>, 'size' | 'prefix'> {
  label: string
  error?: string
  hint?: string
  icon?: Icon
  /** Short fixed text before the value, e.g. "+91". Shown once the field is active. */
  prefix?: string
  trailing?: ReactNode
}

/** Outlined text field with a floating label. */
export function TextField({
  label,
  error,
  hint,
  icon: LIcon,
  prefix,
  trailing,
  className,
  id,
  style,
  ...rest
}: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={className}>
      <div className={fieldBox(error)}>
        {LIcon && (
          <LIcon size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        )}
        <input
          id={inputId}
          placeholder=" "
          aria-invalid={!!error || undefined}
          className={cn(
            'peer block h-14 w-full rounded-2xl bg-transparent pb-2 pt-6 text-base text-fg outline-none placeholder:text-transparent',
            LIcon ? 'pl-12' : 'pl-4',
            trailing ? 'pr-12' : 'pr-4',
          )}
          // Leave room for the prefix text, sized to its length.
          style={prefix ? { paddingLeft: `calc(1rem + ${prefix.length}ch + 0.45rem)`, ...style } : style}
          {...rest}
        />
        {prefix && (
          <span className="pointer-events-none absolute bottom-2 left-4 text-base leading-6 text-fg opacity-0 transition-opacity duration-200 peer-focus:opacity-100 peer-[:not(:placeholder-shown)]:opacity-100">
            {prefix}
          </span>
        )}
        <label htmlFor={inputId} className={cn(floatingLabel(error), LIcon ? 'left-12' : 'left-4')}>
          {label}
        </label>
        {trailing && <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      <FieldMessage error={error} hint={hint} />
    </div>
  )
}

interface TextAreaProps extends ComponentProps<'textarea'> {
  label: string
  error?: string
  hint?: string
}

export function TextArea({ label, error, hint, className, id, rows = 3, ...rest }: TextAreaProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={className}>
      <div className={fieldBox(error)}>
        <textarea
          id={inputId}
          rows={rows}
          placeholder=" "
          aria-invalid={!!error || undefined}
          className="peer block w-full resize-none rounded-2xl bg-transparent px-4 pb-3 pt-7 text-base leading-relaxed text-fg outline-none placeholder:text-transparent"
          {...rest}
        />
        <label htmlFor={inputId} className={cn(floatingLabel(error), 'left-4')}>
          {label}
        </label>
      </div>
      <FieldMessage error={error} hint={hint} />
    </div>
  )
}

export interface Option<T extends string> {
  value: T
  label: string
  description?: string
  icon?: Icon
}

function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200',
        checked ? 'border-accent' : 'border-line-strong',
      )}
    >
      <motion.span
        className="size-2.5 rounded-full bg-accent"
        initial={false}
        animate={{ scale: checked ? 1 : 0 }}
        transition={T.snappy}
      />
    </span>
  )
}

/** Single-choice list (radio style) — use inside sheets. */
export function OptionList<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: Option<T>[]
  value: T | null
  onSelect: (value: T) => void
}) {
  return (
    <div className="-mx-2 flex flex-col gap-0.5">
      {options.map(({ value: v, label, description, icon: OIcon }) => {
        const active = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              haptic()
              onSelect(v)
            }}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors duration-150 active:bg-surface-2',
              active && 'bg-accent-soft',
            )}
          >
            {OIcon && <OIcon size={20} className={active ? 'text-accent' : 'text-muted'} />}
            <span className="min-w-0 flex-1">
              <span className={cn('block text-[15px] font-medium', active ? 'text-accent-soft-fg' : 'text-fg')}>
                {label}
              </span>
              {description && <span className="block text-[13px] text-muted">{description}</span>}
            </span>
            <RadioDot checked={active} />
          </button>
        )
      })}
    </div>
  )
}

interface SelectFieldProps<T extends string> {
  label: string
  value: T | null
  options: Option<T>[]
  onChange: (value: T) => void
  error?: string
  sheetTitle?: string
  className?: string
}

/** Looks like a text field; opens a bottom sheet with the options. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  sheetTitle,
  className,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'relative flex h-14 w-full items-center rounded-2xl border bg-surface pl-4 pr-11 text-left transition-colors duration-200',
          error ? 'border-danger' : open ? 'border-accent' : 'border-line-strong',
        )}
      >
        <span
          className={cn(
            'pointer-events-none absolute left-4 top-4 origin-left text-base transition-transform duration-200 ease-out-quint',
            selected ? '-translate-y-2.5 scale-75 text-muted' : 'text-muted',
          )}
        >
          {label}
        </span>
        {selected && <span className="truncate pt-4 text-base text-fg">{selected.label}</span>}
        <CaretDownIcon
          size={18}
          weight="bold"
          className={cn('absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      <FieldMessage error={error} />
      <BottomSheet open={open} onClose={() => setOpen(false)} title={sheetTitle ?? label}>
        <OptionList
          options={options}
          value={value}
          onSelect={(v) => {
            onChange(v)
            setOpen(false)
          }}
        />
      </BottomSheet>
    </div>
  )
}

interface SearchFieldProps extends Omit<ComponentProps<'input'>, 'size'> {
  onClear?: () => void
}

export function SearchField({ className, value, onClear, ...rest }: SearchFieldProps) {
  return (
    <div
      className={cn(
        'flex h-11 items-center gap-2.5 rounded-xl bg-surface-2 px-3.5 transition-shadow focus-within:shadow-[0_0_0_2px_var(--color-accent)]',
        className,
      )}
    >
      <MagnifyingGlassIcon size={19} className="shrink-0 text-muted" />
      <input
        type="search"
        value={value}
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden"
        {...rest}
      />
      {!!value && onClear && (
        <button type="button" aria-label="Clear" onClick={onClear} className="pressable -mr-1 grid size-7 place-items-center">
          <XCircleIcon size={19} weight="fill" className="text-subtle" />
        </button>
      )}
    </div>
  )
}

/* ── One-time code ───────────────────────────────────────────────────────── */

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  error?: string
  autoFocus?: boolean
  disabled?: boolean
}

/**
 * Boxed verification-code input. A single hidden field drives the boxes, so
 * paste and Android's SMS code autofill work naturally.
 */
export function OtpInput({ value, onChange, length = 6, error, autoFocus, disabled }: OtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const activeIndex = Math.min(value.length, length - 1)

  // Focus after the screen's slide-in, so the keyboard doesn't interrupt the animation.
  useEffect(() => {
    if (!autoFocus) return
    const t = setTimeout(() => inputRef.current?.focus(), 420)
    return () => clearTimeout(t)
  }, [autoFocus])

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length}
          disabled={disabled}
          aria-label="Verification code"
          aria-invalid={!!error || undefined}
          className="absolute inset-0 z-10 w-full cursor-pointer text-base text-transparent caret-transparent opacity-0 outline-none"
        />
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
          {Array.from({ length }, (_, i) => {
            const char = value[i]
            const active = focused && !disabled && i === activeIndex
            return (
              <div
                key={i}
                className={cn(
                  'grid h-14 place-items-center rounded-2xl border bg-surface font-display text-2xl font-bold text-fg transition-[border-color,box-shadow] duration-200',
                  error
                    ? 'border-danger'
                    : active
                      ? 'border-accent shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_14%,transparent)]'
                      : char
                        ? 'border-fg/25'
                        : 'border-line-strong',
                )}
              >
                {char ? (
                  <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={T.snappy}>
                    {char}
                  </motion.span>
                ) : active ? (
                  <span className="h-6 w-0.5 animate-pulse rounded-full bg-accent" />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
      <FieldMessage error={error} />
    </div>
  )
}

/* ── Toggles ─────────────────────────────────────────────────────────────── */

export function SwitchVisual({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200',
        checked ? 'bg-accent' : 'bg-line-strong',
      )}
    >
      <motion.span
        className="size-6 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)]"
        initial={false}
        animate={{ x: checked ? 20 : 0 }}
        transition={T.snappy}
      />
    </span>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        haptic()
        onChange(!checked)
      }}
      className="rounded-full outline-none focus-visible:ring-4 focus-visible:ring-accent/25 disabled:opacity-45"
    >
      <SwitchVisual checked={checked} />
    </button>
  )
}

export function CheckboxVisual({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-[22px] shrink-0 place-items-center rounded-[7px] border-2 transition-colors duration-200',
        checked ? 'border-accent bg-accent' : 'border-line-strong bg-surface',
      )}
    >
      <svg viewBox="0 0 24 24" className="size-3.5 text-accent-fg">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
        />
      </svg>
    </span>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => {
        haptic()
        onChange(!checked)
      }}
      className="flex w-full items-start gap-3 text-left"
    >
      <span className="pt-px">
        <CheckboxVisual checked={checked} />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-fg">{label}</span>
        {description && <span className="block text-[13px] text-muted">{description}</span>}
      </span>
    </button>
  )
}
