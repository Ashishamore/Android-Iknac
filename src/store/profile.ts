import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AddressLabel, PlanId } from '@/data/profile'
import { addDays, todayISO } from '@/lib/dates'
import { newId } from './projects'

export interface Address {
  id: string
  label: AddressLabel
  name: string
  line: string
  landmark: string
  phone: string
  isDefault: boolean
}

export interface SavedPayment {
  id: string
  kind: 'upi' | 'card'
  label: string
  detail: string
  isDefault: boolean
}

export interface Review {
  id: string
  vendorId: string
  bookingId: string | null
  rating: number
  tags: string[]
  text: string
  at: number
}

export interface Ticket {
  id: string
  topic: string
  text: string
  bookingId: string | null
  status: 'Open' | 'Resolved'
  at: number
}

export type VerifyKey = 'phone' | 'id' | 'gst'

interface ProfileState {
  /** Profile photo (downscaled data URL), or null for initials. */
  photo: string | null
  /** Production house / company. */
  house: string
  city: string
  email: string
  role: string
  verified: Record<VerifyKey, boolean>
  gst: { gstin: string; legalName: string; address: string }
  addresses: Address[]
  plan: { id: PlanId; cycle: 'monthly' | 'yearly'; renewsOn: string }
  payments: SavedPayment[]
  reviews: Review[]
  tickets: Ticket[]
  update: (patch: Partial<Pick<ProfileState, 'photo' | 'house' | 'city' | 'email' | 'role' | 'gst'>>) => void
  setVerified: (key: VerifyKey, on: boolean) => void
  saveAddress: (a: Address) => void
  removeAddress: (id: string) => () => void
  setDefaultAddress: (id: string) => void
  setPlan: (id: PlanId, cycle: 'monthly' | 'yearly') => void
  addPayment: (p: Omit<SavedPayment, 'id' | 'isDefault'>) => void
  removePayment: (id: string) => () => void
  setDefaultPayment: (id: string) => void
  addReview: (r: Omit<Review, 'id' | 'at'>) => void
  addTicket: (t: Omit<Ticket, 'id' | 'at' | 'status'>) => string
}

const DAY = 86_400_000

/** The signed-in art director's details and account settings (kept until "Reset demo"). */
export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      photo: null,
      house: 'Frame & Fable Films',
      city: 'Mumbai',
      email: 'rohan@frameandfable.in',
      role: 'Art Director',
      verified: { phone: true, id: true, gst: false },
      gst: {
        gstin: '27AAFCF4821K1Z3',
        legalName: 'Frame & Fable Films Pvt Ltd',
        address: '4th Floor, Laxmi Industrial Estate, New Link Road, Andheri West, Mumbai 400053',
      },
      addresses: [
        { id: 'addr-office', label: 'Office', name: 'Frame & Fable Films', line: '4th Floor, Laxmi Industrial Estate, New Link Road, Andheri West, Mumbai 400053', landmark: 'Near Oshiwara metro', phone: '9876543210', isDefault: true },
        { id: 'addr-studio', label: 'Studio', name: 'Film City – Stage 4', line: 'Film City Road, Goregaon East, Mumbai 400065', landmark: 'Gate 2', phone: '9876543210', isDefault: false },
        { id: 'addr-store', label: 'Warehouse', name: 'Props store', line: 'Unit 12, Oberoi Garden Estates, Chandivali, Mumbai 400072', landmark: 'Behind Powai Plaza', phone: '9833012345', isDefault: false },
      ],
      plan: { id: 'pro', cycle: 'monthly', renewsOn: addDays(todayISO(), 18) },
      payments: [
        { id: 'pay-upi', kind: 'upi', label: 'UPI', detail: 'rohan@okicici', isDefault: true },
        { id: 'pay-hdfc', kind: 'card', label: 'HDFC Bank credit card', detail: '•••• 4242', isDefault: false },
        { id: 'pay-icici', kind: 'card', label: 'ICICI corporate card', detail: '•••• 1881', isDefault: false },
      ],
      reviews: [
        {
          id: 'rev-kapoor',
          vendorId: 'kapoor',
          bookingId: null,
          rating: 5,
          tags: ['On time', 'Great condition'],
          text: 'Rotary phones and radios arrived spotless and working. Easy pickup too.',
          at: Date.now() - 62 * DAY,
        },
      ],
      tickets: [],

      update: (patch) => set(patch),
      setVerified: (key, on) => set((s) => ({ verified: { ...s.verified, [key]: on } })),
      saveAddress: (a) =>
        set((s) => {
          const exists = s.addresses.some((x) => x.id === a.id)
          let addresses = exists ? s.addresses.map((x) => (x.id === a.id ? a : x)) : [...s.addresses, a]
          if (a.isDefault) addresses = addresses.map((x) => ({ ...x, isDefault: x.id === a.id }))
          return { addresses }
        }),
      removeAddress: (id) => {
        const before = get().addresses
        set((s) => {
          const rest = s.addresses.filter((x) => x.id !== id)
          if (rest.length && !rest.some((x) => x.isDefault)) rest[0] = { ...rest[0], isDefault: true }
          return { addresses: rest }
        })
        return () => set({ addresses: before })
      },
      setDefaultAddress: (id) => set((s) => ({ addresses: s.addresses.map((x) => ({ ...x, isDefault: x.id === id })) })),
      setPlan: (id, cycle) => set({ plan: { id, cycle, renewsOn: addDays(todayISO(), cycle === 'yearly' ? 365 : 30) } }),
      addPayment: (p) =>
        set((s) => ({ payments: [...s.payments, { ...p, id: newId(), isDefault: s.payments.length === 0 }] })),
      removePayment: (id) => {
        const before = get().payments
        set((s) => {
          const rest = s.payments.filter((x) => x.id !== id)
          if (rest.length && !rest.some((x) => x.isDefault)) rest[0] = { ...rest[0], isDefault: true }
          return { payments: rest }
        })
        return () => set({ payments: before })
      },
      setDefaultPayment: (id) => set((s) => ({ payments: s.payments.map((x) => ({ ...x, isDefault: x.id === id })) })),
      addReview: (r) => set((s) => ({ reviews: [{ ...r, id: newId(), at: Date.now() }, ...s.reviews] })),
      addTicket: (t) => {
        const id = `TKT-${Math.floor(10000 + Math.random() * 89999)}`
        set((s) => ({ tickets: [{ ...t, id, status: 'Open', at: Date.now() }, ...s.tickets] }))
        return id
      },
    }),
    { name: 'proto:profile', version: 1 },
  ),
)
