/** Placeholder notifications for the art-director (customer) app. */

export type NotificationKind = 'booking' | 'message' | 'reminder' | 'quote' | 'return' | 'offer'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  time: string
  group: 'Today' | 'Earlier'
}

export const CUSTOMER_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    kind: 'booking',
    title: 'Booking confirmed',
    body: 'Vintage rotary phone is booked for 18–20 Sep.',
    time: '10 min',
    group: 'Today',
  },
  {
    id: 'n2',
    kind: 'message',
    title: 'Kapoor Props replied',
    body: '“Yes, the Chesterfield sofa is available for your dates.”',
    time: '1 h',
    group: 'Today',
  },
  {
    id: 'n3',
    kind: 'reminder',
    title: 'Pickup tomorrow',
    body: 'Collect 4 props from Andheri West by 10:00 AM.',
    time: '3 h',
    group: 'Today',
  },
  {
    id: 'n4',
    kind: 'quote',
    title: 'New quote received',
    body: 'Filmy Props sent a quote for 12 items — ₹18,400.',
    time: 'Yesterday',
    group: 'Earlier',
  },
  {
    id: 'n5',
    kind: 'return',
    title: 'Return due Friday',
    body: 'Please return 3 props from “Monsoon Ad Shoot”.',
    time: 'Yesterday',
    group: 'Earlier',
  },
  {
    id: 'n6',
    kind: 'offer',
    title: 'Price drop',
    body: 'Retro film camera set is 20% off this week.',
    time: '2 days',
    group: 'Earlier',
  },
]
