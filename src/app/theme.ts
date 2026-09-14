import { useEffect, useLayoutEffect } from 'react'
import { ACCENT_VAR_NAMES, accentVars, parseHex } from '@/lib/color'
import { useMediaQuery } from '@/lib/hooks'
import { focusedKeyOf, useNavSnapshot } from '@/navigation'
import { useChrome } from '@/store/chrome'
import { usePrefs } from '@/store/prefs'

export function useIsDark() {
  const theme = usePrefs((s) => s.theme)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  return theme === 'dark' || (theme === 'system' && systemDark)
}

/** Applies theme + accent to <html> (tokens in index.css key off these). */
export function useThemeController() {
  const dark = useIsDark()
  const accent = usePrefs((s) => s.accent)
  const customAccent = usePrefs((s) => s.customAccent)
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    ACCENT_VAR_NAMES.forEach((name) => root.style.removeProperty(name))
    if (accent === 'custom') {
      // Custom hex: generate the brand scale and set it inline (overrides the presets).
      delete root.dataset.accent
      const hex = parseHex(customAccent) ?? '#4f46e5'
      Object.entries(accentVars(hex)).forEach(([name, value]) => root.style.setProperty(name, value))
    } else if (accent === 'indigo') {
      delete root.dataset.accent
    } else {
      root.dataset.accent = accent
    }
  }, [dark, accent, customAccent])
}

/** Keeps Android's status bar / address bar colour in sync with the focused screen. */
export function useThemeColorMeta() {
  const dark = useIsDark()
  const accent = usePrefs((s) => s.accent)
  const customAccent = usePrefs((s) => s.customAccent)
  const focusedKey = useNavSnapshot(focusedKeyOf)
  const pref = useChrome((s) => s.statusBar[focusedKey])
  const color = pref?.color ?? 'var(--color-surface)'

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) return
    // Wait a frame so theme/accent class changes have been applied.
    const raf = requestAnimationFrame(() => {
      const hex = resolveColor(color)
      if (hex) meta.content = hex
    })
    return () => cancelAnimationFrame(raf)
  }, [color, dark, accent, customAccent])
}

let canvasCtx: CanvasRenderingContext2D | null = null

/** Resolve any CSS colour (incl. var() and oklch) to #rrggbb. */
function resolveColor(css: string): string | null {
  const probe = document.createElement('span')
  probe.style.color = css
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const computed = getComputedStyle(probe).color
  probe.remove()
  canvasCtx ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!canvasCtx) return null
  canvasCtx.clearRect(0, 0, 1, 1)
  canvasCtx.fillStyle = computed
  canvasCtx.fillRect(0, 0, 1, 1)
  const [r, g, b] = canvasCtx.getImageData(0, 0, 1, 1).data
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
