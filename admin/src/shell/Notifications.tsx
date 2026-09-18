import { BellSlashIcon, ChecksIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { EASE_OUT } from '@/lib/motion'
import type { OwnerNotification } from '@/lib/owner'
import { useOwner } from '@/store/owner'
import { fromOwnerPath, navigate } from '~/router'
import { useChromeUi } from '~/store/ui'
import { Button } from '~/ui/controls'
import { EmptyState } from '~/ui/display'

/** Bell → notifications flyout (anchored under the title bar). */
export function NotificationsFlyout() {
  const open = useChromeUi((s) => s.notifications)
  const set = useChromeUi((s) => s.set)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!panel.current?.contains(t) && !t.closest('[data-flyout-anchor]')) set({ notifications: false })
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && set({ notifications: false })
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, set])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panel}
          role="dialog"
          aria-label="Notifications"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
          className="fixed right-2 top-[52px] z-[55] flex max-h-[min(560px,calc(100dvh-64px))] w-[400px] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-float"
        >
          <NotificationList onPick={() => set({ notifications: false })} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function NotificationList({ onPick, className }: { onPick?: () => void; className?: string }) {
  const notifications = useOwner((s) => s.notifications)
  const markRead = useOwner((s) => s.markRead)
  const unread = notifications.filter((n) => !n.read).length

  const open = (n: OwnerNotification) => {
    markRead(n.id)
    onPick?.()
    navigate(fromOwnerPath(n.to))
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <p className="flex-1 text-[15px] font-bold text-fg">
          Notifications {unread > 0 && <span className="ml-1 text-[13px] font-semibold text-muted">· {unread} new</span>}
        </p>
        <Button size="xs" variant="ghost" icon={ChecksIcon} disabled={!unread} onClick={() => markRead()}>
          Mark all read
        </Button>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-1">
        {notifications.length === 0 ? (
          <EmptyState icon={BellSlashIcon} title="You’re all caught up" />
        ) : (
          notifications.map((n) => (
            <button key={n.id} type="button" onClick={() => open(n)} className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-2">
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-accent')} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={cn('min-w-0 flex-1 truncate text-[13px]', n.read ? 'font-medium text-fg-2' : 'font-bold text-fg')}>{n.title}</span>
                  <span className="shrink-0 text-[11px] text-subtle">{timeAgo(n.at)}</span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-muted">{n.body}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
