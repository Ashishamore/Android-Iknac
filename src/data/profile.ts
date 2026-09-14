/** Mock data for the Profile area: plans, languages, notifications, help and reviews. */
import type { Category } from './props'

export type PlanId = 'free' | 'pro' | 'studio'

export const PLANS: {
  id: PlanId
  name: string
  monthly: number
  yearly: number
  credits: number
  projects: string
  seats: string
  /** Active projects allowed (null = unlimited). */
  maxProjects: number | null
  maxSeats: number
  perks: string[]
  tag?: string
}[] = [
  { id: 'free', name: 'Starter', monthly: 0, yearly: 0, credits: 3, projects: '1 active project', seats: '2 team members', maxProjects: 1, maxSeats: 2, perks: ['Search and book props', 'Delivery tracking'] },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 1499,
    yearly: 14990,
    credits: 30,
    projects: 'Unlimited projects',
    seats: '10 team members',
    maxProjects: null,
    maxSeats: 10,
    perks: ['Priority delivery slots', 'Company PO invoicing', 'Saved search alerts'],
    tag: 'Popular',
  },
  {
    id: 'studio',
    name: 'Studio',
    monthly: 4999,
    yearly: 49990,
    credits: 120,
    projects: 'Unlimited projects',
    seats: '50 team members',
    maxProjects: null,
    maxSeats: 50,
    perks: ['Dedicated account manager', '30-day credit line', 'No deposit with verified vendors'],
  },
]

export const LANGUAGES = [
  { id: 'en', name: 'English', native: 'English' },
  { id: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { id: 'mr', name: 'Marathi', native: 'मराठी' },
  { id: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { id: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { id: 'te', name: 'Telugu', native: 'తెలుగు' },
  { id: 'bn', name: 'Bengali', native: 'বাংলা' },
  { id: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { id: 'ml', name: 'Malayalam', native: 'മലയാളം' },
]

export const NOTIFICATION_TYPES = [
  { id: 'bookings', label: 'Bookings & holds', description: 'Confirmations and holds about to run out' },
  { id: 'deliveries', label: 'Deliveries & returns', description: 'Driver on the way, arrival, photo check' },
  { id: 'alerts', label: 'Saved search alerts', description: 'New props that match your searches' },
  { id: 'team', label: 'Team chat', description: 'Messages on your projects' },
  { id: 'payments', label: 'Payments & invoices', description: 'Receipts, PO reminders, refunds' },
  { id: 'offers', label: 'Offers & tips', description: 'New collections and seasonal deals' },
]

export const DEFAULT_NOTIFICATIONS: Record<string, boolean> = {
  bookings: true,
  deliveries: true,
  alerts: true,
  team: true,
  payments: true,
  offers: false,
}

export const FAQS = [
  { q: 'How do holds work?', a: 'Reserve an item for 24 hours for free while you finalise. You can extend by 48 hours or release it. Nobody else can book it during a hold.' },
  { q: 'What does the deposit cover?', a: 'A refundable 30% of the rent, held until the props are back with the vendor and checked. Damage is charged at repair cost from the deposit.' },
  { q: 'What if something arrives damaged?', a: 'Do the photo check within 30 minutes of delivery: scan the tags, photograph each item, flag damage and sign. That record protects your deposit.' },
  { q: 'Can I paint or alter a prop?', a: 'Only props marked “Can be modified”. Use “Ask to paint” on the board to send the colour and details; the owner confirms before delivery.' },
  { q: 'How do I cancel?', a: 'Cancellation is free up to 48 hours before delivery. After that, 50% of the rent is charged.' },
  { q: 'How does road freight work?', a: 'Vendors outside Mumbai deliver by road. It takes 1–4 days depending on the city, and the cost shows in the booking before you pay.' },
  { q: 'How do AI Studio credits work?', a: 'Each board you generate or rebuild uses one credit. Your plan includes monthly credits and you can top up any time.' },
  { q: 'How do I get a GST invoice?', a: 'Add your company GSTIN in Invoices & GST. Every booking then comes with a tax invoice you can claim input credit on.' },
]

export const TICKET_TOPICS = ['Booking', 'Delivery', 'Damage or deposit', 'Payment or invoice', 'AI Studio', 'Something else']

export const REVIEW_TAGS = ['On time', 'As described', 'Great condition', 'Helpful team', 'Easy returns']

export const ADDRESS_LABELS = ['Office', 'Studio', 'Warehouse', 'Home', 'Other'] as const
export type AddressLabel = (typeof ADDRESS_LABELS)[number]

export const SUPPORT = { phone: '18001203456', email: 'help@propsrental.in', whatsapp: '919876500000' }

/** Typical size of a prop by category (cm: width × depth × height), for the listing. */
export const CATEGORY_SIZE: Record<Category, [number, number, number] | null> = {
  Furniture: [180, 80, 85],
  Lighting: [45, 45, 60],
  Decor: [30, 25, 22],
  Costume: null,
  Vehicles: [420, 170, 150],
  'Vanity vans': [900, 250, 330],
  Locations: null,
  Plants: [70, 70, 180],
  Catering: null,
  Animals: null,
}
