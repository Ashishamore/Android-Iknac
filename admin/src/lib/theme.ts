import { useLayoutEffect } from 'react'
import { useMediaQuery } from '@/lib/hooks'
import { useUi } from '~/store/ui'

export function useIsDark() {
  const theme = useUi((s) => s.theme)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  return theme === 'dark' || (theme === 'system' && systemDark)
}

/** Applies the theme and accent to <html> (the tokens in src/index.css key off these). */
export function useThemeController() {
  const dark = useIsDark()
  const accent = useUi((s) => s.accent)
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    if (accent === 'indigo') delete root.dataset.accent
    else root.dataset.accent = accent
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) meta.content = dark ? '#14171c' : '#ffffff'
  }, [dark, accent])
}
