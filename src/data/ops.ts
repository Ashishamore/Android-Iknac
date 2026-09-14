/**
 * Mock data for running a project: delivery windows, transport modes,
 * tracking stages, vendor terms, the team and the project chat.
 */
import {
  ArrowUUpLeftIcon,
  CarProfileIcon,
  HandGrabbingIcon,
  PackageIcon,
  PathIcon,
  TruckIcon,
  VanIcon,
  type Icon,
} from '@phosphor-icons/react'

/** Delivery / pickup windows. */
export const WINDOWS = ['6–8 AM', '8–10 AM', '10 AM–12 PM', '2–4 PM', '5–7 PM', '8–10 PM']

export type TransportMode = 'vendor' | 'tempo' | 'truck' | 'self'

export const TRANSPORT_MODES: { id: TransportMode; label: string; description: string; icon: Icon }[] = [
  { id: 'vendor', label: 'Vendor delivers', description: 'Their own team and vehicle', icon: VanIcon },
  { id: 'tempo', label: 'Partner tempo', description: 'Up to 1 tonne · 2 helpers', icon: TruckIcon },
  { id: 'truck', label: 'Partner truck', description: 'Large sets and heavy props', icon: CarProfileIcon },
  { id: 'self', label: 'We’ll collect', description: 'Your team picks up and returns', icon: HandGrabbingIcon },
]

export type RunKind = 'delivery' | 'return' | 'move'

/** Tracking (6 stages) for each kind of run. */
export const STAGES: Record<RunKind, string[]> = {
  delivery: ['Booked', 'Packed', 'Dispatched', 'On the way', 'Arrived', 'Received'],
  return: ['Scheduled', 'Packed on set', 'Picked up', 'On the way', 'At vendor', 'Deposit released'],
  move: ['Scheduled', 'Loading', 'Loaded', 'On the way', 'Arrived', 'Unloaded'],
}

export const RUN_ICON: Record<RunKind, Icon> = { delivery: PackageIcon, return: ArrowUUpLeftIcon, move: PathIcon }

/** Stage at which the photo check happens (condition at handover). */
export const CHECK_STAGE: Record<RunKind, number> = { delivery: 4, return: 1, move: 4 }

export const DRIVERS = [
  { name: 'Santosh Pawar', phone: '9820012345', vehicle: 'MH 02 EK 4471 · Tata Ace', rating: 4.8 },
  { name: 'Imran Shaikh', phone: '9819955501', vehicle: 'MH 03 CP 9012 · Mahindra Bolero Pickup', rating: 4.7 },
  { name: 'Ramesh Yadav', phone: '9867123098', vehicle: 'MH 04 JK 2230 · Eicher 14 ft', rating: 4.9 },
  { name: 'Vikram Jadhav', phone: '9930045612', vehicle: 'MH 01 AZ 7788 · Tata Intra', rating: 4.6 },
]

export const VENDOR_TERMS = [
  { title: 'Damage', text: 'Repairs are charged at cost from your deposit. Report damage in the 30-minute photo check.' },
  { title: 'Late return', text: 'Each extra day is charged at the daily rent plus 10%.' },
  { title: 'Cancellation', text: 'Free up to 48 hours before delivery, then 50% of the rent.' },
  { title: 'Changes', text: 'No painting or alterations without the owner’s written OK.' },
]

export const PAINT_COLOURS = [
  { name: 'Ivory', hex: '#f3ecd9' },
  { name: 'Mustard', hex: '#d9a21b' },
  { name: 'Maroon', hex: '#7a1f2b' },
  { name: 'Teal', hex: '#1f6f6b' },
  { name: 'Charcoal', hex: '#34363b' },
]

export const DAMAGE_TYPES = ['Scratch', 'Dent', 'Stain', 'Broken part', 'Missing piece']

export const ROLES = ['Producer', 'Director', 'Line producer', 'Set decorator', 'Production assistant', 'Transport coordinator']

export const BANKS = ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak']

/** Teammates on the sample project. */
export const SAMPLE_TEAM = [
  { name: 'Priya Nair', phone: '9876501234', role: 'Producer', admin: true },
  { name: 'Arjun Shah', phone: '9820456789', role: 'Director', admin: false },
  { name: 'Kavya Rao', phone: '9833012345', role: 'Set decorator', admin: false },
]

/** Canned replies for the simulated project chat. */
export const CHAT_REPLIES = [
  'On it 👍',
  'Makes sense. Let’s lock it by tomorrow.',
  'Can you share the board link?',
  'Checked with the vendor, they’re fine with that.',
  'Noted. I’ll update the call sheet.',
]
