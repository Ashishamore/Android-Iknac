type HapticKind = 'light' | 'medium' | 'success' | 'warning'

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 8,
  medium: 14,
  success: [10, 50, 18],
  warning: [20, 60, 20],
}

/** Subtle vibration feedback on Android devices (no-op elsewhere). */
export function haptic(kind: HapticKind = 'light') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  // Browsers block vibration until the user has interacted with the page.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return
  try {
    navigator.vibrate(PATTERNS[kind])
  } catch {
    /* unsupported */
  }
}
