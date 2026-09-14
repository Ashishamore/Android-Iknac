import { createContext, useContext, useSyncExternalStore } from 'react'
import type { DeviceSpec } from '@/app/config'

/**
 * native — full-screen, the app *is* the page (phones, tablets, installed PWA)
 * frame  — desktop preview: the app runs inside a device frame
 */
export type ShellMode = 'native' | 'frame'

// `?mode=native|frame` forces a mode for this browser tab; `?mode=auto` clears it.
const MODE_KEY = 'proto:mode'
function readForcedMode(): string | null {
  try {
    const param = new URLSearchParams(window.location.search).get('mode')
    if (param === 'native' || param === 'frame') sessionStorage.setItem(MODE_KEY, param)
    else if (param === 'auto') sessionStorage.removeItem(MODE_KEY)
    return sessionStorage.getItem(MODE_KEY)
  } catch {
    return null
  }
}
const forcedMode = readForcedMode()

function computeMode(): ShellMode {
  if (forcedMode === 'native' || forcedMode === 'frame') return forcedMode
  if (window.matchMedia('(display-mode: standalone)').matches) return 'native'
  if (window.matchMedia('(pointer: coarse)').matches) return 'native' // touch-first: phones & tablets
  return window.innerWidth >= 720 && window.innerHeight >= 540 ? 'frame' : 'native'
}

function subscribe(cb: () => void) {
  window.addEventListener('resize', cb)
  return () => window.removeEventListener('resize', cb)
}

export const useShellMode = () => useSyncExternalStore(subscribe, computeMode)

export interface DeviceInfo {
  mode: ShellMode
  /** The simulated device (frame mode only). */
  device: DeviceSpec | null
  /** Visual scale of the device frame (frame mode). Divide screen-space measurements by it. */
  scale: number
}

export const DeviceContext = createContext<DeviceInfo>({ mode: 'native', device: null, scale: 1 })

export const useDevice = () => useContext(DeviceContext)
