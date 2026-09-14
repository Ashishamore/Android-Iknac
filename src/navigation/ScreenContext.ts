import { createContext } from 'react'
import type { StackEntry } from './navStore'

export interface ScreenInfo {
  /** Unique key of the layer: a stack entry key, or "tab:<id>" for tab screens. */
  key: string
  entry?: StackEntry
  tabId?: string
  /** True while this screen is the one the user is looking at. */
  focused: boolean
}

export const ScreenContext = createContext<ScreenInfo>({ key: 'root', focused: true })
