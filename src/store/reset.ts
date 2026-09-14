import { whenHistoryIdle } from '@/navigation/navStore'

/** Presentation preferences survive a reset; everything else the app saved is cleared. */
const KEEP = new Set(['proto:prefs'])

/**
 * Wipe all data saved during the demo and restart on the Welcome screen.
 * Persisted stores must use a `proto:` storage key to be included.
 */
export async function resetDemoData() {
  // Let popups finish closing (their history.back() would cancel the reload).
  await new Promise((r) => setTimeout(r, 0))
  await whenHistoryIdle()
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('proto:') && !KEEP.has(key))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    /* storage unavailable */
  }
  window.location.replace('/')
}
