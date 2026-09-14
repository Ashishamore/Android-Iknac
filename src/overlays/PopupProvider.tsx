import { CheckCircleIcon, InfoIcon, WarningCircleIcon, type Icon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { haptic } from '@/lib/haptics'
import { T } from '@/lib/motion'
import { focusedKeyOf, getTabs, useBackHandler, useNavSnapshot } from '@/navigation'
import { useChrome } from '@/store/chrome'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/Display'
import { BottomSheet } from './BottomSheet'
import { Dialog } from './Dialog'
import { OverlayPortal } from './OverlayRoot'
import {
  PopupContext,
  type ActionSheetOptions,
  type AlertOptions,
  type ConfirmOptions,
  type PopupApi,
  type ToastOptions,
} from './popupContext'
import { PresenceLayer } from './PresenceLayer'

interface ToastReq extends ToastOptions {
  id: number
  message: ReactNode
}

type DialogReq =
  | { kind: 'confirm'; options: ConfirmOptions }
  | { kind: 'alert'; options: AlertOptions }

interface Loader {
  id: number
  message: string
}

export function PopupProvider({ children }: { children: ReactNode }) {
  const seq = useRef(0)
  const [toast, setToast] = useState<ToastReq | null>(null)
  const [dialog, setDialog] = useState<(DialogReq & { open: boolean }) | null>(null)
  const [sheet, setSheet] = useState<(ActionSheetOptions<string> & { open: boolean }) | null>(null)
  const [loader, setLoader] = useState<Loader | null>(null)
  const settleDialog = useRef<((ok: boolean) => void) | null>(null)
  const settleSheet = useRef<((id: string | null) => void) | null>(null)

  const api = useMemo<PopupApi>(() => {
    const openDialog = (req: DialogReq, settle: (ok: boolean) => void) => {
      settleDialog.current?.(false)
      settleDialog.current = settle
      setDialog({ ...req, open: true })
    }
    return {
      toast: (message, options) => setToast({ id: ++seq.current, message, ...options }),
      confirm: (options) => new Promise<boolean>((resolve) => openDialog({ kind: 'confirm', options }, resolve)),
      alert: (options) => new Promise<void>((resolve) => openDialog({ kind: 'alert', options }, () => resolve())),
      actionSheet: <T extends string>(options: ActionSheetOptions<T>) =>
        new Promise<T | null>((resolve) => {
          settleSheet.current?.(null)
          settleSheet.current = resolve as (id: string | null) => void
          setSheet({ ...(options as ActionSheetOptions<string>), open: true })
        }),
      loading: (message = 'Please wait…') => {
        const id = ++seq.current
        setLoader({ id, message })
        return () => setLoader((l) => (l?.id === id ? null : l))
      },
    }
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  const closeDialog = (ok: boolean) => {
    const settle = settleDialog.current
    settleDialog.current = null
    settle?.(ok)
    setDialog((d) => d && { ...d, open: false })
  }

  const closeSheet = (id: string | null) => {
    const settle = settleSheet.current
    settleSheet.current = null
    settle?.(id)
    setSheet((s) => s && { ...s, open: false })
  }

  return (
    <PopupContext.Provider value={api}>
      {children}

      <Dialog
        open={!!dialog?.open}
        onClose={() => closeDialog(false)}
        title={dialog?.options.title}
        icon={dialog?.options.icon}
        tone={dialog?.kind === 'confirm' ? (dialog.options.tone ?? 'brand') : (dialog?.options.tone ?? 'brand')}
        actions={
          dialog?.kind === 'confirm' ? (
            <>
              <Button variant="secondary" block onClick={() => closeDialog(false)}>
                {dialog.options.cancelText ?? 'Cancel'}
              </Button>
              <Button
                variant={dialog.options.tone === 'danger' ? 'danger' : 'primary'}
                block
                onClick={() => closeDialog(true)}
              >
                {dialog.options.confirmText ?? 'Confirm'}
              </Button>
            </>
          ) : (
            <Button block onClick={() => closeDialog(true)}>
              {dialog?.options.buttonText ?? 'OK'}
            </Button>
          )
        }
      >
        {dialog?.options.message}
      </Dialog>

      <BottomSheet open={!!sheet?.open} onClose={() => closeSheet(null)} title={sheet?.title} description={sheet?.description}>
        <div className="-mx-2 flex flex-col">
          {sheet?.options.map(({ id, label, description, icon: OIcon, destructive }) => (
            <button
              key={id}
              type="button"
              onClick={() => closeSheet(id)}
              className="flex items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
            >
              {OIcon && (
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-full',
                    destructive ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-fg-2',
                  )}
                >
                  <OIcon size={20} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className={cn('block text-[15px] font-semibold', destructive ? 'text-danger' : 'text-fg')}>
                  {label}
                </span>
                {description && <span className="block text-[13px] text-muted">{description}</span>}
              </span>
            </button>
          ))}
        </div>
        <Button variant="secondary" block className="mt-3" onClick={() => closeSheet(null)}>
          {sheet?.cancelText ?? 'Cancel'}
        </Button>
      </BottomSheet>

      <ToastViewport toast={toast} onDismiss={dismissToast} />
      <LoadingOverlay loader={loader} />
    </PopupContext.Provider>
  )
}

const TOAST_ICONS: Record<NonNullable<ToastOptions['tone']>, { icon?: Icon; className: string }> = {
  default: { className: '' },
  success: { icon: CheckCircleIcon, className: 'text-emerald-400' },
  error: { icon: WarningCircleIcon, className: 'text-rose-400' },
  info: { icon: InfoIcon, className: 'text-sky-400' },
}

function ToastViewport({ toast, onDismiss }: { toast: ToastReq | null; onDismiss: () => void }) {
  // The bottom nav is only shown on the tabs, and only when there are 2+ tabs.
  const onRoot = useNavSnapshot((s) => s.stack.length === 0) && getTabs().length > 1
  const focusedKey = useNavSnapshot(focusedKeyOf)
  const footer = useChrome((s) => s.footers[focusedKey] ?? 0)

  useEffect(() => {
    if (!toast) return
    if (toast.tone === 'success') haptic('success')
    if (toast.tone === 'error') haptic('warning')
    const t = setTimeout(onDismiss, toast.duration ?? 2800)
    return () => clearTimeout(t)
  }, [toast, onDismiss])

  const bottom = onRoot
    ? 'calc(var(--bn) + var(--sab) + 12px)'
    : footer
      ? `${footer + 12}px`
      : 'calc(var(--sab) + 16px)'
  const tone = TOAST_ICONS[toast?.tone ?? 'default']
  const TIcon = toast?.icon ?? tone.icon

  return (
    <OverlayPortal>
      <div
        className="pointer-events-none absolute inset-x-0 grid justify-items-center px-4 [--bn:var(--nav-h)] @expanded:[--bn:0px]"
        style={{ bottom }}
      >
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              role="status"
              className="pointer-events-auto col-start-1 row-start-1 flex w-full max-w-md items-center gap-3 self-end rounded-2xl bg-[#1a1d23] py-3 pl-4 pr-3 text-white shadow-float dark:bg-surface-3"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98, transition: T.fast }}
              transition={T.pop_in}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={(_, info) => Math.abs(info.offset.x) > 80 && onDismiss()}
            >
              {TIcon && <TIcon size={20} weight="fill" className={cn('shrink-0', tone.className)} />}
              <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick()
                    onDismiss()
                  }}
                  className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-brand-300 active:bg-white/10"
                >
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </OverlayPortal>
  )
}

const noop = () => {}

function LoadingOverlay({ loader }: { loader: Loader | null }) {
  // Swallow the back button while something is "processing".
  useBackHandler(!!loader, noop)
  return (
    <OverlayPortal>
      <AnimatePresence>
        {loader && (
          <PresenceLayer key="loader" className="grid place-items-center">
            <motion.div
              className="absolute inset-0 bg-scrim/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative flex min-w-40 flex-col items-center gap-3 rounded-3xl bg-surface px-8 py-6 shadow-float"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={T.pop_in}
            >
              <Spinner className="size-8 text-accent" />
              <p className="text-sm font-semibold text-fg">{loader.message}</p>
            </motion.div>
          </PresenceLayer>
        )}
      </AnimatePresence>
    </OverlayPortal>
  )
}
