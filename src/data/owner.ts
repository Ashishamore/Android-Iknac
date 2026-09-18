/** Constants and mock content for the Prop Owner app. */
import type { Category, Era, Material } from './props'
import type { Condition, StaffRole } from '@/lib/owner'

export const PLATFORM = 'PropKart'

export const CONDITIONS: Condition[] = ['Excellent', 'Good', 'Fair', 'Worn']

export const BUSINESS_TYPES = ['Prop house', 'Individual collector', 'Costume studio', 'Vehicle owner', 'Location owner']

export const STAFF_ROLES: { id: StaffRole; text: string }[] = [
  { id: 'Owner', text: 'Everything, including payouts and bank details' },
  { id: 'Manager', text: 'Stock, prices, bookings and messages' },
  { id: 'Warehouse', text: 'Handovers, pack lists and photo checks' },
]

export const OWNER_LANGUAGES = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'hi', label: 'Hindi', native: 'हिंदी' },
  { id: 'mr', label: 'Marathi', native: 'मराठी' },
]

export const ANNOUNCEMENT = 'Scheduled maintenance: payouts pause on Sun 21 Sept, 2–4 AM.'

export const PROMOTION = { title: 'Festive searches are up 38%', text: 'Boost your lamps, lanterns and brass for Diwali shoots.' }

export const DECLINE_REASONS = ['Already booked elsewhere', 'Needs repair', 'Dates too short to turn around', 'Outside my delivery area', 'Other']

export const OWNER_PLANS = [
  { id: 'standard' as const, name: 'Standard', fee: 0.12, monthly: 0, perks: ['List unlimited stock', 'Payouts every Friday', 'Deposit protection'] },
  { id: 'pro' as const, name: 'Pro', fee: 0.08, monthly: 1499, perks: ['Everything in Standard', '8% fee instead of 12%', 'One free boost a month', 'Priority support'] },
]
export type OwnerPlanId = (typeof OWNER_PLANS)[number]['id']

export const BOOST_OPTIONS = [
  { days: 3, price: 299 },
  { days: 7, price: 599 },
  { days: 14, price: 999 },
]

/** What "Read the photos" can recognise (simulated AI), in rotation. */
export const AI_GUESSES: { name: string; category: Category; era: Era; material: Material; size: [number, number, number]; weight: number; dayRate: number; description: string }[] = [
  { name: 'Brass Table Lamp with Fabric Shade', category: 'Lighting', era: '1940s–60s', material: 'Brass', size: [30, 30, 55], weight: 2.4, dayRate: 450, description: 'Solid brass base with a pleated cream shade. Wired and working, warm bulb included.' },
  { name: 'Rattan Peacock Chair', category: 'Furniture', era: '1970s', material: 'Wood', size: [95, 70, 150], weight: 9, dayRate: 1600, description: 'Tall fan-back rattan chair, great as a hero piece for a 70s living room or verandah.' },
  { name: 'Leather Doctor’s Bag', category: 'Decor', era: 'Colonial', material: 'Leather', size: [40, 20, 28], weight: 1.6, dayRate: 350, description: 'Brown leather bag with brass clasp. Aged patina, clasp opens and closes.' },
  { name: 'Enamel Milk Cans (set of 3)', category: 'Decor', era: '1940s–60s', material: 'Metal', size: [25, 25, 45], weight: 4.5, dayRate: 300, description: 'Chipped white enamel cans with lids. Good for dairy, village and railway scenes.' },
]

export const SAMPLE_CSV = `name,category,era,day rate,pieces,width cm,depth cm,height cm,weight kg
Bakelite Table Fan,Decor,1940s–60s,380,3,35,25,45,3.2
Marble-top Café Table,Furniture,1940s–60s,900,4,60,60,75,
Railway Station Bench,Furniture,Colonial,1500,2,180,55,85,40
Kerosene Stove,Decor,1970s,,5,,,,`

export const HELP_TOPICS = [
  { q: 'When do I get paid?', a: 'Every Friday, for orders that came back and were checked by Wednesday night. Money lands in your bank account the same day.' },
  { q: 'What if a renter damages something?', a: 'Report it in the return check with photos. You can claim the repair cost from the deposit within 24 hours.' },
  { q: 'Why is my listing in review?', a: 'New listings are checked by our team for photos, size and price, usually within 2 hours.' },
  { q: 'How do holds work?', a: 'Renters can hold pieces for 24 hours while they get approvals. Held pieces can’t be booked by anyone else.' },
]

/** Letters for the fake piece photos in the handover check. */
export const PHOTO_ANGLES = ['Front', 'Back', 'Detail']
