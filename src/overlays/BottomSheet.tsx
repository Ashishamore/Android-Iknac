import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { T } from '@/lib/motion'
import { useBackHandler } from '@/navigation'
import { OverlayPortal } from './OverlayRoot'
import { PresenceLayer } from './PresenceLayer'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  /** Sticky area under the scrollable content (actions). */
  footer?: ReactNode
  /** Allow closing by backdrop tap, drag and back button. Default true. */
  dismissible?: boolean
  className?: string
}

const noop = () => {}

/** Draggable bottom sheet. Drag the handle down, tap outside, or press back to close. */
export function BottomSheet({ open, onClose, dismissible = true, ...rest }: BottomSheetProps) {
  useBackHandler(open, dismissible ? onClose : noop)
  return (
    <OverlayPortal>
      <AnimatePresence>
        {open && <SheetPanel key="sheet" onClose={onClose} dismissible={dismissible} {...rest} />}
      </AnimatePresence>
    </OverlayPortal>
  )
}

function SheetPanel({
  onClose,
  title,
  description,
  children,
  footer,
  dismissible,
  className,
}: Omit<BottomSheetProps, 'open'>) {
  const drag = useDragControls()

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 520) onClose()
  }

  return (
    <PresenceLayer>
      <motion.div
        className="absolute inset-0 bg-scrim/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={T.base}
        onClick={dismissible ? onClose : undefined}
      />
      <motion.div
        role="dialog"
        aria-modal
        className={cn(
          'absolute inset-x-0 bottom-0 mx-auto flex max-h-[92%] w-full flex-col rounded-t-[28px] bg-surface shadow-sheet @medium:max-w-xl',
          className,
        )}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%', transition: { ...T.sheet, stiffness: 520 } }}
        transition={T.sheet}
        drag={dismissible ? 'y' : false}
        dragListener={false}
        dragControls={drag}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.03, bottom: 0.9 }}
        onDragEnd={onDragEnd}
      >
        <div
          className={cn('shrink-0 touch-none pb-1 pt-2.5', dismissible && 'cursor-grab active:cursor-grabbing')}
          onPointerDown={(e) => dismissible && drag.start(e)}
        >
          <div className="mx-auto h-1 w-9 rounded-full bg-line-strong" />
          {(title || description) && (
            <div className="px-5 pb-1 pt-3">
              {title && <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-fg">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
          )}
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-5 py-3">{footer}</div>}
        <div className="shrink-0 pb-safe" />
      </motion.div>
    </PresenceLayer>
  )
}
