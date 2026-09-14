import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AccentId, DeviceId } from '@/app/config'
import { DEFAULT_NOTIFICATIONS } from '@/data/profile'
import { setUnits, type DistanceUnit, type SizeUnit } from '@/lib/format'

export type ThemePref = 'light' | 'dark' | 'system'

/** A preset accent, or 'custom' for the hex code in `customAccent`. */
export type AccentChoice = AccentId | 'custom'

interface PrefsState {
  theme: ThemePref
  accent: AccentChoice
  /** Hex code used when accent is 'custom', e.g. "#e23744". */
  customAccent: string
  /** Device frame used by the desktop preview. */
  device: DeviceId
  distanceUnit: DistanceUnit
  sizeUnit: SizeUnit
  /** Language id (only English text exists in the prototype). */
  language: string
  /** Notification type id → on/off. */
  notifications: Record<string, boolean>
  setTheme: (theme: ThemePref) => void
  setAccent: (accent: AccentId) => void
  /** Switch to a custom accent colour (hex must already be validated). */
  setCustomAccent: (hex: string) => void
  setDevice: (device: DeviceId) => void
  setUnitsPref: (patch: Partial<{ distanceUnit: DistanceUnit; sizeUnit: SizeUnit }>) => void
  setLanguage: (language: string) => void
  setNotification: (id: string, on: boolean) => void
}

/**
 * Presentation and app settings (kept across "Reset demo"). Key is read by the
 * inline script in index.html (avoids a theme flash).
 */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: 'light',
      accent: 'indigo',
      customAccent: '#e23744',
      device: 'phone',
      distanceUnit: 'km',
      sizeUnit: 'cm',
      language: 'en',
      notifications: DEFAULT_NOTIFICATIONS,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setCustomAccent: (hex) => set({ accent: 'custom', customAccent: hex }),
      setDevice: (device) => set({ device }),
      setUnitsPref: (patch) => set(patch),
      setLanguage: (language) => set({ language }),
      setNotification: (id, on) => set((s) => ({ notifications: { ...s.notifications, [id]: on } })),
    }),
    { name: 'proto:prefs', version: 1 },
  ),
)

// Formatting helpers read the units without needing React.
const syncUnits = (s: PrefsState) => setUnits({ distance: s.distanceUnit, size: s.sizeUnit })
syncUnits(usePrefs.getState())
usePrefs.subscribe(syncUnits)
