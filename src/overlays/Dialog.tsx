import type { Icon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { T } from '@/lib/motion'
import { TONE_SOFT, type Tone } from '@/lib/tones'
import { useBackHandler } from '@/navigation'
import { OverlayPortal } from './OverlayRoot'
import { PresenceLayer } from './PresenceLayer'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children?: ReactNode
  icon?: Icon
  tone?: Tone
  /** Buttons row. */
  actions?: ReactNode
  dismissible?: boolean
}

const noop = () => {}

/** Centered modal dialog with a soft spring entrance. */
export function Dialog({ open, onClose, title, children, icon: DIcon, tone = 'brand', actions, dismissible = true }: DialogProps) {
  useBackHandler(open, dismissible ? onClose : noop)
  return (
    <OverlayPortal>
      <AnimatePresence>
        {open && (
          <PresenceLayer key="dialog" className="grid place-items-center p-6">
            <motion.div
              className="absolute inset-0 bg-scrim/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={T.base}
              onClick={dismissible ? onClose : undefined}
            />
            <motion.div
              role="alertdialog"
              aria-modal
              className="relative w-full max-w-[340px] rounded-[28px] bg-surface p-6 shadow-float"
              initial={{ opacity: 0, scale: 0.9, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6, transition: T.fast }}
              transition={T.pop_in}
            >
              {DIcon && (
                <div className={cn('mb-4 grid size-12 place-items-center rounded-2xl', TONE_SOFT[tone])}>
                  <DIcon size={24} weight="fill" />
                </div>
              )}
              {title && <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-fg">{title}</h2>}
              {children && <div className="mt-1.5 text-[15px] leading-relaxed text-muted">{children}</div>}
              {actions && <div className="mt-6 flex gap-2.5 [&>*]:min-w-0 [&>*]:flex-1">{actions}</div>}
            </motion.div>
          </PresenceLayer>
        )}
      </AnimatePresence>
    </OverlayPortal>
  )
}
