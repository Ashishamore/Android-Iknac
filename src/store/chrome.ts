import { useEffect } from 'react'
import { create } from 'zustand'
import { useScreenInfo } from '@/navigation'

export interface StatusBarPref {
  /** Icon colour: "light" icons for dark backgrounds, "dark" for light ones. */
  tone: 'light' | 'dark'
  /** Background colour behind the status bar (any CSS colour). Used for Android's theme-color. */
  color?: string
}

interface ChromeState {
  statusBar: Record<string, StatusBarPref>
  /** Height of each screen's sticky footer, so toasts can float above it. */
  footers: Record<string, number>
  setStatusBar: (key: string, pref: StatusBarPref | null) => void
  setFooter: (key: string, height: number | null) => void
}

const without = <T,>(obj: Record<string, T>, key: string) => {
  const next = { ...obj }
  delete next[key]
  return next
}

/** System chrome that screens can influence (status bar style, footer insets). */
export const useChrome = create<ChromeState>()((set) => ({
  statusBar: {},
  footers: {},
  setStatusBar: (key, pref) =>
    set((s) => ({ statusBar: pref ? { ...s.statusBar, [key]: pref } : without(s.statusBar, key) })),
  setFooter: (key, height) =>
    set((s) => ({ footers: height == null ? without(s.footers, key) : { ...s.footers, [key]: height } })),
}))

/** Let a screen choose the status bar style while it's on screen. */
export function useStatusBar(tone: StatusBarPref['tone'], color?: string) {
  const { key } = useScreenInfo()
  const setStatusBar = useChrome((s) => s.setStatusBar)
  useEffect(() => {
    setStatusBar(key, { tone, color })
    return () => setStatusBar(key, null)
  }, [key, tone, color, setStatusBar])
}
