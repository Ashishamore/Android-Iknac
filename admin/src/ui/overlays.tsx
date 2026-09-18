import { CheckCircleIcon, InfoIcon, WarningCircleIcon, WarningIcon, XIcon, type Icon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { cloneElement, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { Spinner } from '@/ui/Display'
import { Button, IconButton } from './controls'
import { closeConfirm, dismissToast, useFeedback } from './feedback'

/* ── Dialog ──────────────────────────────────────────────────────────────── */

const DIALOG_SIZES = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }

export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  children,
  bodyClassName,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  footer?: ReactNode
  size?: keyof typeof DIALOG_SIZES
  children?: ReactNode
  bodyClassName?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div className="absolute inset-0 bg-scrim/45 backdrop-blur-[1px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn('relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-float sm:rounded-2xl', DIALOG_SIZES[size])}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            {(title || description) && (
              <div className="flex items-start gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0 flex-1">
                  {title && <h2 className="font-display text-[17px] font-bold text-fg">{title}</h2>}
                  {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
                </div>
                <IconButton icon={XIcon} label="Close" size="sm" onClick={onClose} className="-mr-1.5 -mt-1" />
              </div>
            )}
            <div className={cn('thin-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4', bodyClassName)}>{children}</div>
            {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2/50 px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ── Right-hand drawer ───────────────────────────────────────────────────── */

/**
 * One record, opened beside its table. Escape closes it, the page behind stays
 * readable, and destructive actions confirm in place rather than in a new page.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  badge,
  footer,
  width = 'max-w-[520px]',
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  badge?: ReactNode
  footer?: ReactNode
  width?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[55] flex justify-end">
          <motion.div className="absolute inset-0 bg-scrim/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Record'}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.26, ease: EASE_OUT }}
            className={cn('relative flex h-full w-full flex-col border-l border-line bg-surface shadow-float', width)}
          >
            <header className="flex items-start gap-3 border-b border-line px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate font-display text-[17px] font-bold text-fg">{title}</h2>
                  {badge}
                </div>
                {subtitle && <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p>}
              </div>
              <IconButton icon={XIcon} label="Close" size="sm" onClick={onClose} className="-mr-1.5" />
            </header>
            <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/50 px-5 py-3">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ── Dropdown menu ───────────────────────────────────────────────────────── */

export interface MenuItem {
  label: string
  icon?: Icon
  hint?: string
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
  checked?: boolean
}

export type MenuEntry = MenuItem | 'divider' | { heading: string }

export function Menu({ items, children, align = 'end', width = 220 }: { items: MenuEntry[]; children: ReactElement<{ onClick?: (e: React.MouseEvent) => void; 'aria-expanded'?: boolean; 'aria-haspopup'?: string }>; align?: 'start' | 'end'; width?: number }) {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; up: boolean } | null>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setPos(null), [])

  const place = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const estimate = items.length * 36 + 12
    const up = r.bottom + estimate > window.innerHeight - 8 && r.top > estimate
    const left = Math.min(Math.max(8, align === 'end' ? r.right - width : r.left), window.innerWidth - width - 8)
    setPos(up ? { bottom: window.innerHeight - r.top + 4, left, up } : { top: r.bottom + 4, left, up })
  }

  useEffect(() => {
    if (!pos) return
    const onDown = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !anchor?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [pos, close, anchor])

  useLayoutEffect(() => {
    if (pos) panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true })
  }, [pos])

  const trigger = cloneElement(children, {
    'aria-haspopup': 'menu',
    'aria-expanded': !!pos,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation()
      const el = e.currentTarget as HTMLElement
      setAnchor(el)
      if (pos) close()
      else place(el)
    },
  })

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const buttons = [...(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
    buttons[(i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
  }

  return (
    <>
      {trigger}
      {createPortal(
        <AnimatePresence>
          {pos && (
            <motion.div
              ref={panel}
              role="menu"
              onKeyDown={onKeyDown}
              initial={{ opacity: 0, y: pos.up ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width }}
              className="fixed z-[70] rounded-xl border border-line bg-surface p-1 shadow-float"
            >
              {items.map((it, i) =>
                it === 'divider' ? (
                  <div key={i} className="my-1 h-px bg-line" />
                ) : 'heading' in it ? (
                  <p key={i} className="px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.07em] text-subtle">
                    {it.heading}
                  </p>
                ) : (
                  <button
                    key={i}
                    type="button"
                    role="menuitem"
                    disabled={it.disabled}
                    onClick={(e) => {
                      e.stopPropagation()
                      close()
                      it.onSelect()
                    }}
                    className={cn(
                      'flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-medium outline-none transition-colors disabled:opacity-40',
                      it.destructive ? 'text-danger hover:bg-danger-soft focus:bg-danger-soft' : 'text-fg hover:bg-surface-2 focus:bg-surface-2',
                    )}
                  >
                    {it.icon ? <it.icon size={16} weight={it.checked ? 'fill' : 'regular'} className={cn('shrink-0', it.destructive ? '' : it.checked ? 'text-accent' : 'text-muted')} /> : <span className="w-4 shrink-0" />}
                    <span className="min-w-0 flex-1 truncate">{it.label}</span>
                    {it.hint && <span className="shrink-0 text-[11px] text-subtle">{it.hint}</span>}
                  </button>
                ),
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

/* ── Global hosts: toasts, confirm, busy ─────────────────────────────────── */

const TOAST_ICON = { success: CheckCircleIcon, error: WarningCircleIcon, info: InfoIcon, neutral: null }
const TOAST_TONE = { success: 'text-success', error: 'text-danger', info: 'text-info', neutral: '' }

export function FeedbackHost() {
  const toasts = useFeedback((s) => s.toasts)
  const c = useFeedback((s) => s.confirm)
  const busyText = useFeedback((s) => s.busy)

  return (
    <>
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-4 right-4 z-[80] flex flex-col items-center gap-2 sm:right-auto sm:items-start">
          <AnimatePresence initial={false}>
            {toasts.map((t) => {
              const TIcon = TOAST_ICON[t.tone]
              return (
                <motion.div
                  key={t.id}
                  layout="position"
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  className="pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-xl bg-fg py-2.5 pl-3.5 pr-2 text-[13px] font-medium text-bg shadow-float"
                >
                  {TIcon && <TIcon size={18} weight="fill" className={cn('shrink-0', TOAST_TONE[t.tone])} />}
                  <span className="min-w-0 flex-1 leading-snug">{t.text}</span>
                  {t.action && (
                    <button
                      type="button"
                      onClick={() => {
                        t.action!.onClick()
                        dismissToast(t.id)
                      }}
                      className="shrink-0 rounded-md px-2 py-1 text-[13px] font-bold text-brand-300 hover:bg-white/10 dark:text-brand-600 dark:hover:bg-black/10"
                    >
                      {t.action.label}
                    </button>
                  )}
                  <button type="button" aria-label="Dismiss" onClick={() => dismissToast(t.id)} className="grid size-7 shrink-0 place-items-center rounded-md opacity-60 hover:bg-white/10 hover:opacity-100 dark:hover:bg-black/10">
                    <XIcon size={13} weight="bold" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}

      <Dialog
        open={!!c}
        onClose={() => closeConfirm(false)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => closeConfirm(false)}>
              {c?.cancelText ?? 'Cancel'}
            </Button>
            <Button variant={c?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => closeConfirm(true)} autoFocus>
              {c?.confirmText ?? 'OK'}
            </Button>
          </>
        }
      >
        {c && (
          <div className="flex items-start gap-3.5 pt-1">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', c.tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent')}>
              {c.icon ? <c.icon size={20} weight="duotone" /> : <WarningIcon size={20} weight="duotone" />}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[17px] font-bold text-fg">{c.title}</h2>
              {c.message && <p className="mt-1 text-sm leading-relaxed text-fg-2">{c.message}</p>}
            </div>
          </div>
        )}
      </Dialog>

      {createPortal(
        <AnimatePresence>
          {busyText && (
            <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-scrim/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-5 py-4 text-sm font-semibold text-fg shadow-float">
                <Spinner className="size-5 text-accent" />
                {busyText}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
