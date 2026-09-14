import { SparkleIcon, type Icon } from '@phosphor-icons/react'

/** App identity — update once the product name/branding is final. */
export const APP = {
  name: 'Prototype',
  tagline: 'Props rental for film & ad shoots',
  description: 'Art directors hire props from owners for their shoots. Every screen is live and clickable.',
  version: '0.1',
  logo: SparkleIcon as Icon,
}

export type DeviceId = 'phone' | 'compact' | 'tablet' | 'tablet-landscape'

export interface DeviceSpec {
  label: string
  kind: 'phone' | 'tablet'
  /** Screen size in CSS px (what the app lays out against). */
  width: number
  height: number
  statusBar: number
  gestureBar: number
  bezel: number
  radius: number
}

/** Device frames available in the desktop preview. */
export const DEVICES: Record<DeviceId, DeviceSpec> = {
  phone: { label: 'Phone', kind: 'phone', width: 393, height: 852, statusBar: 36, gestureBar: 18, bezel: 11, radius: 54 },
  compact: { label: 'Compact', kind: 'phone', width: 360, height: 780, statusBar: 34, gestureBar: 16, bezel: 10, radius: 48 },
  tablet: { label: 'Tablet', kind: 'tablet', width: 800, height: 1280, statusBar: 30, gestureBar: 16, bezel: 18, radius: 40 },
  'tablet-landscape': {
    label: 'Landscape',
    kind: 'tablet',
    width: 1280,
    height: 800,
    statusBar: 30,
    gestureBar: 16,
    bezel: 18,
    radius: 40,
  },
}

export type AccentId = 'indigo' | 'blue' | 'violet' | 'orange' | 'rose' | 'teal'

/** Accent palettes (defined in index.css). `swatch` is only used for the picker. */
export const ACCENTS: { id: AccentId; label: string; swatch: string }[] = [
  { id: 'indigo', label: 'Indigo', swatch: 'oklch(0.53 0.21 272)' },
  { id: 'blue', label: 'Blue', swatch: 'oklch(0.55 0.2 258)' },
  { id: 'violet', label: 'Violet', swatch: 'oklch(0.53 0.16 288)' },
  { id: 'orange', label: 'Orange', swatch: 'oklch(0.66 0.19 44)' },
  { id: 'rose', label: 'Rose', swatch: 'oklch(0.58 0.21 22)' },
  { id: 'teal', label: 'Teal', swatch: 'oklch(0.56 0.11 182)' },
]
