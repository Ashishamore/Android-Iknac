import { useUi, type Lang } from '~/store/ui'

/**
 * Shell labels in English, Hindi and Marathi (Profile → Language).
 * Page content stays in English in the prototype.
 */
const DICT = {
  today: { en: 'Today', hi: 'आज', mr: 'आज' },
  stock: { en: 'Stock', hi: 'स्टॉक', mr: 'स्टॉक' },
  add: { en: 'Add stock', hi: 'स्टॉक जोड़ें', mr: 'स्टॉक जोडा' },
  diary: { en: 'Diary', hi: 'डायरी', mr: 'डायरी' },
  profile: { en: 'Profile', hi: 'प्रोफ़ाइल', mr: 'प्रोफाइल' },
  requests: { en: 'Messages', hi: 'संदेश', mr: 'संदेश' },
  handover: { en: 'Handover', hi: 'हैंडओवर', mr: 'हस्तांतरण' },
  payouts: { en: 'Payouts', hi: 'भुगतान', mr: 'पेआउट' },
  reviews: { en: 'Reviews', hi: 'समीक्षाएं', mr: 'पुनरावलोकने' },
  work: { en: 'Work', hi: 'काम', mr: 'काम' },
  business: { en: 'Business', hi: 'व्यवसाय', mr: 'व्यवसाय' },
  search: { en: 'Search stock, orders, renters…', hi: 'स्टॉक, ऑर्डर, किराएदार खोजें…', mr: 'स्टॉक, ऑर्डर, भाडेकरू शोधा…' },
  notifications: { en: 'Notifications', hi: 'सूचनाएं', mr: 'सूचना' },
  collapse: { en: 'Collapse sidebar', hi: 'साइडबार छोटा करें', mr: 'साइडबार लहान करा' },
} satisfies Record<string, Record<Lang, string>>

export type TKey = keyof typeof DICT

export function useT() {
  const lang = useUi((s) => s.language)
  return (key: TKey) => DICT[key][lang]
}
