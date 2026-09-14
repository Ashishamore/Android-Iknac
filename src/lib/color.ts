/**
 * Colour helpers for custom accent colours: turn one hex code into the full
 * brand scale (50–950) the design system uses.
 */

/** Normalise "#abc", "abc", "#AABBCC" → "#aabbcc". Returns null if invalid. */
export function parseHex(input: string): string | null {
  const s = input.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(s)) return `#${[...s].map((c) => c + c).join('')}`.toLowerCase()
  if (/^[0-9a-f]{6}$/i.test(s)) return `#${s}`.toLowerCase()
  return null
}

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

/** sRGB hex → OKLCH (lightness 0–1, chroma, hue in degrees). */
export function hexToOklch(hex: string) {
  const [r, g, b] = hexToRgb(hex).map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const hue = (Math.atan2(B, A) * 180) / Math.PI
  return { l: L, c: Math.sqrt(A * A + B * B), h: hue < 0 ? hue + 360 : hue }
}

const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Text colour that reads well on the given background (white unless the colour is light). */
export function readableOn(hex: string) {
  const whiteContrast = 1.05 / (luminance(hex) + 0.05)
  return whiteContrast >= 2.2 ? '#ffffff' : '#0f1729'
}

/** Target lightness and chroma factor for each step (mirrors the preset palettes). */
const STEPS: [step: number, lightness: number, chroma: number][] = [
  [50, 0.97, 0.12],
  [100, 0.94, 0.24],
  [200, 0.88, 0.45],
  [300, 0.8, 0.68],
  [400, 0.71, 0.88],
  [500, 0.63, 1],
  [600, 0.56, 1],
  [700, 0.48, 0.9],
  [800, 0.4, 0.74],
  [900, 0.33, 0.56],
  [950, 0.25, 0.42],
]

const oklch = (l: number, c: number, h: number) => `oklch(${l.toFixed(3)} ${c.toFixed(4)} ${h.toFixed(1)})`

/**
 * CSS variables for a custom accent: the whole brand scale, plus the exact
 * chosen colour for primary surfaces and a readable text colour on top of it.
 */
export function accentVars(hex: string): Record<string, string> {
  const { l, c, h } = hexToOklch(hex)
  const vars: Record<string, string> = {}
  for (const [step, lightness, chroma] of STEPS) vars[`--color-brand-${step}`] = oklch(lightness, c * chroma, h)
  vars['--color-accent'] = hex
  vars['--color-accent-strong'] = oklch(Math.max(0, l - 0.07), c, h)
  vars['--color-accent-fg'] = readableOn(hex)
  return vars
}

/** Every variable accentVars() sets — used to clear them again. */
export const ACCENT_VAR_NAMES = Object.keys(accentVars('#4f46e5'))
