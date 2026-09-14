import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CUSTOMER_NOTIFICATIONS } from '@/data/notifications'

interface NotificationsState {
  read: Record<string, boolean>
  markRead: (id: string) => void
  markAllRead: () => void
}

/** Read state of the customer's notifications (kept until "Reset demo"). */
export const useNotifications = create<NotificationsState>()(
  persist(
    (set) => ({
      read: { n5: true, n6: true },
      markRead: (id) => set((s) => ({ read: { ...s.read, [id]: true } })),
      markAllRead: () => set({ read: Object.fromEntries(CUSTOMER_NOTIFICATIONS.map((n) => [n.id, true])) }),
    }),
    { name: 'proto:notifications', version: 1 },
  ),
)

export const useUnreadNotifications = () =>
  useNotifications((s) => CUSTOMER_NOTIFICATIONS.filter((n) => !s.read[n.id]).length)
