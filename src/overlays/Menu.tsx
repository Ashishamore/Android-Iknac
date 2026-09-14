import type { Icon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { T } from '@/lib/motion'
import { useBackHandler } from '@/navigation'
import { useDevice } from '@/shell/device'
import { OverlayPortal } from './OverlayRoot'
import { useOverlayRoot } from './overlayContext'
import { PresenceLayer } from './PresenceLayer'

export interface MenuItem {
  label: string
  icon?: Icon
  onSelect: () => void
  destructive?: boolean
}

interface MenuProps {
  items: MenuItem[]
  /** The trigger element (e.g. an IconButton). Tapping it toggles the menu. */
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
}

/** Anchored dropdown menu (e.g. the ⋮ overflow menu in an app bar). */
export function Menu({ items, children, align = 'end', className }: MenuProps) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const overlay = useOverlayRoot()
  const { scale } = useDevice()
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null)
  const close = () => setPos(null)
  useBackHandler(pos !== null, close)

  const toggle = () => {
    if (pos) return close()
    const a = anchorRef.current?.getBoundingClientRect()
    const r = overlay?.getBoundingClientRect()
    if (!a || !r) return
    // Rects are in screen space; the device frame may be scaled.
    const top = (a.bottom - r.top) / scale + 6
    setPos(align === 'end' ? { top, right: (r.right - a.right) / scale } : { top, left: (a.left - r.left) / scale })
  }

  return (
    <>
      <span ref={anchorRef} className={cn('inline-flex', className)} onClick={toggle}>
        {children}
      </span>
      <OverlayPortal>
        <AnimatePresence>
          {pos && (
            <PresenceLayer key="menu" onClick={close}>
              <motion.div
                role="menu"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'absolute min-w-52 overflow-hidden rounded-2xl border border-line bg-surface py-1.5 shadow-float',
                  align === 'end' ? 'origin-top-right' : 'origin-top-left',
                )}
                style={{ top: pos.top, left: pos.left, right: pos.right }}
                initial={{ opacity: 0, scale: 0.9, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
                transition={T.pop_in}
              >
                {items.map(({ label, icon: MIcon, onSelect, destructive }) => (
                  <button
                    key={label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close()
                      onSelect()
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] font-medium transition-colors hover:bg-surface-2 active:bg-surface-2',
                      destructive ? 'text-danger' : 'text-fg',
                    )}
                  >
                    {MIcon && <MIcon size={19} className={destructive ? '' : 'text-muted'} />}
                    {label}
                  </button>
                ))}
              </motion.div>
            </PresenceLayer>
          )}
        </AnimatePresence>
      </OverlayPortal>
    </>
  )
}
