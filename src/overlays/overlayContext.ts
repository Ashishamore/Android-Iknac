import { createContext, useContext } from 'react'

/**
 * All popups render into a layer inside the device screen (not document.body),
 * so they stay within the phone frame on desktop.
 */
export const OverlayRootContext = createContext<HTMLElement | null>(null)

export const useOverlayRoot = () => useContext(OverlayRootContext)
