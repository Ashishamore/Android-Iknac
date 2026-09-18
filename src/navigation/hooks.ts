import { useContext, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import {
  getSnapshot,
  onTabReselect,
  registerOverlay,
  subscribe,
  unregisterOverlay,
  type NavSnapshot,
} from './navStore'
import { ScreenContext } from './ScreenContext'
import { useFlags } from '@/store/platform'
import { getTabs } from './navStore'

const identity = (s: NavSnapshot) => s

export function useNavSnapshot(): NavSnapshot
export function useNavSnapshot<T>(selector: (s: NavSnapshot) => T): T
export function useNavSnapshot<T>(selector: (s: NavSnapshot) => T = identity as never) {
  return useSyncExternalStore(subscribe, () => selector(getSnapshot()))
}

export const useScreenInfo = () => useContext(ScreenContext)

/** Route params of the current screen, e.g. { id: "42" } for "/projects/:id". */
export function useParams<T extends Record<string, string> = Record<string, string>>() {
  return (useContext(ScreenContext).entry?.params ?? {}) as T
}

export function useQuery() {
  return useContext(ScreenContext).entry?.query ?? new URLSearchParams()
}

export function useRouteState<T>() {
  return useContext(ScreenContext).entry?.state as T | undefined
}

export const useIsFocused = () => useContext(ScreenContext).focused

/**
 * While `active`, the system back button calls `onBack` instead of navigating.
 * Used by every popup (sheets, dialogs, menus).
 */
export function useBackHandler(active: boolean, onBack: () => void) {
  const ref = useRef(onBack)
  useLayoutEffect(() => {
    ref.current = onBack
  })
  useEffect(() => {
    if (!active) return
    const id = registerOverlay(() => ref.current())
    return () => unregisterOverlay(id)
  }, [active])
}

/** Fires when the user taps the already-active tab (used to scroll to top). */
export function useTabReselect(tabId: string | undefined, cb: () => void) {
  const ref = useRef(cb)
  useLayoutEffect(() => {
    ref.current = cb
  })
  useEffect(() => {
    if (!tabId) return
    return onTabReselect((id) => id === tabId && ref.current())
  }, [tabId])
}

/** The tabs a Control Centre feature flag has not taken away. */
export function useVisibleTabs() {
  const flags = useFlags()
  return getTabs().filter((t) => !t.hidden?.(flags))
}
