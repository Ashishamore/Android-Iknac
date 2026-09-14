import {
  ArrowUUpLeftIcon,
  ChatCircleTextIcon,
  ClockIcon,
  ReceiptIcon,
  SealCheckIcon,
  TagIcon,
  type Icon,
} from '@phosphor-icons/react'
import { CUSTOMER_NOTIFICATIONS, type AppNotification, type NotificationKind } from '@/data/notifications'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/tones'
import { usePopup } from '@/overlays/popupContext'
import { useNotifications, useUnreadNotifications } from '@/store/notifications'
import { AppBar, Button, IconTile, ListGroup, Screen } from '@/ui'

const KIND: Record<NotificationKind, { icon: Icon; tone: Tone }> = {
  booking: { icon: SealCheckIcon, tone: 'success' },
  message: { icon: ChatCircleTextIcon, tone: 'brand' },
  reminder: { icon: ClockIcon, tone: 'warning' },
  quote: { icon: ReceiptIcon, tone: 'info' },
  return: { icon: ArrowUUpLeftIcon, tone: 'warning' },
  offer: { icon: TagIcon, tone: 'danger' },
}

export default function NotificationsScreen() {
  const popup = usePopup()
  const read = useNotifications((s) => s.read)
  const markRead = useNotifications((s) => s.markRead)
  const markAllRead = useNotifications((s) => s.markAllRead)
  const unread = useUnreadNotifications()

  return (
    <Screen
      header={
        <AppBar
          title="Notifications"
          subtitle={unread ? `${unread} unread` : 'All caught up'}
          actions={
            <Button
              variant="ghost"
              size="sm"
              disabled={!unread}
              onClick={() => {
                markAllRead()
                popup.toast('All notifications marked as read', { tone: 'success' })
              }}
            >
              Mark all read
            </Button>
          }
        />
      }
    >
      {(['Today', 'Earlier'] as const).map((group) => {
        const items = CUSTOMER_NOTIFICATIONS.filter((n) => n.group === group)
        if (!items.length) return null
        return (
          <ListGroup key={group} title={group} className="pt-5">
            {items.map((n) => (
              <NotificationRow key={n.id} notification={n} unread={!read[n.id]} onClick={() => markRead(n.id)} />
            ))}
          </ListGroup>
        )
      })}
      <div className="h-8" />
    </Screen>
  )
}

function NotificationRow({
  notification: n,
  unread,
  onClick,
}: {
  notification: AppNotification
  unread: boolean
  onClick: () => void
}) {
  const { icon, tone } = KIND[n.kind]
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
    >
      <IconTile icon={icon} tone={tone} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cn('min-w-0 flex-1 truncate text-[15px] text-fg', unread ? 'font-bold' : 'font-medium')}>
            {n.title}
          </span>
          <span className={cn('shrink-0 text-xs', unread ? 'font-semibold text-accent' : 'text-subtle')}>{n.time}</span>
        </span>
        <span className={cn('mt-0.5 flex items-start gap-2 text-sm leading-snug', unread ? 'text-fg-2' : 'text-muted')}>
          <span className="min-w-0 flex-1">{n.body}</span>
          {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />}
        </span>
      </span>
      <span aria-hidden className="absolute bottom-0 left-[66px] right-0 h-px bg-line group-last:hidden" />
    </button>
  )
}
