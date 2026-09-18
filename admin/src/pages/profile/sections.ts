import {
  BuildingsIcon,
  CrownSimpleIcon,
  GavelIcon,
  IdentificationBadgeIcon,
  LifebuoyIcon,
  MegaphoneIcon,
  StarIcon,
  TranslateIcon,
  TruckIcon,
  UsersThreeIcon,
  WalletIcon,
  type Icon,
} from '@phosphor-icons/react'

export type SectionId = 'business' | 'verification' | 'plan' | 'payouts' | 'policies' | 'delivery' | 'reviews' | 'promote' | 'staff' | 'language' | 'help'

/** Profile groups, as in the IA: who you are · money · how you trade · growing · this app. */
export const PROFILE_SECTIONS: { label: string; items: { id: SectionId; label: string; icon: Icon; description: string }[] }[] = [
  {
    label: 'Who you are',
    items: [
      { id: 'business', label: 'Business', icon: BuildingsIcon, description: 'Type, name, owner, phone, pincode, email, address, GST' },
      { id: 'verification', label: 'Verification', icon: IdentificationBadgeIcon, description: 'Phone, identity, warehouse address, bank, GST' },
    ],
  },
  {
    label: 'Money',
    items: [
      { id: 'plan', label: 'Plan', icon: CrownSimpleIcon, description: 'What PropKart takes from each order' },
      { id: 'payouts', label: 'Payouts', icon: WalletIcon, description: 'Coming to you, settled, deposits, invoices' },
    ],
  },
  {
    label: 'How you trade',
    items: [
      { id: 'policies', label: 'Policies', icon: GavelIcon, description: 'Deposit multiple, turnaround days, modifications' },
      { id: 'delivery', label: 'Delivery', icon: TruckIcon, description: 'Whether you deliver, radius and charges' },
      { id: 'reviews', label: 'Reviews', icon: StarIcon, description: 'Rating, breakdown and replies' },
    ],
  },
  {
    label: 'Growing',
    items: [
      { id: 'promote', label: 'Promote', icon: MegaphoneIcon, description: 'Followers, updates and boosts' },
      { id: 'staff', label: 'Staff', icon: UsersThreeIcon, description: 'Owner, managers and warehouse team' },
    ],
  },
  {
    label: 'This app',
    items: [
      { id: 'language', label: 'Language & appearance', icon: TranslateIcon, description: 'English, हिंदी, मराठी · theme and colour' },
      { id: 'help', label: 'Help & settings', icon: LifebuoyIcon, description: 'Answers, contact support, demo data' },
    ],
  },
]
