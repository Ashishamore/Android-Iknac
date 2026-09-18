import { BellIcon, ChecksIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { nav } from '@/navigation'
import { useOwner } from '@/store/owner'
import { AppBar, Button, Card, EmptyState, Screen } from '@/ui'

/** The bell: bookings, damage, payouts, reviews and listing checks. */
export default function OwnerNotificationsScreen() {
  const items = useOwner((s) => s.notifications)
  const markRead = useOwner((s) => s.markRead)
  const unread = items.filter((n) => !n.read).length
  return (
    <Screen
      header={
        <AppBar
          title="Notifications"
          subtitle={unread ? `${unread} unread` : 'All caught up'}
          actions={
            unread ? (
              <Button size="sm" variant="ghost" icon={ChecksIcon} onClick={() => markRead()}>
                Mark all read
              </Button>
            ) : undefined
          }
        />
      }
    >
      {items.length === 0 ? (
        <EmptyState icon={BellIcon} title="No notifications" />
      ) : (
        <div className="px-4 pb-10 pt-2 @medium:mx-auto @medium:max-w-2xl">
          <Card className="overflow-hidden">
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  markRead(n.id)
                  nav.push(n.to)
                }}
                className={cn('group relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-surface-2', !n.read && 'bg-accent-soft/40')}
              >
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-accent')} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={cn('min-w-0 flex-1 truncate text-[15px] text-fg', n.read ? 'font-medium' : 'font-bold')}>{n.title}</span>
                    <span className="shrink-0 text-xs text-subtle">{timeAgo(n.at)}</span>
                  </span>
                  <span className="block text-[13px] leading-snug text-muted">{n.body}</span>
                </span>
                <span aria-hidden className="absolute bottom-0 left-9 right-0 h-px bg-line group-last:hidden" />
              </button>
            ))}
          </Card>
        </div>
      )}
    </Screen>
  )
}
