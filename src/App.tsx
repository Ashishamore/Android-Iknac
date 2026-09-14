import { useEffect } from 'react'
import { RoleRouter } from '@/app/RoleRouter'
import { useThemeColorMeta, useThemeController } from '@/app/theme'
import { nav } from '@/navigation'
import { PopupProvider } from '@/overlays/PopupProvider'
import { DeviceShell } from '@/shell/DeviceShell'

export default function App() {
  useThemeController()
  useThemeColorMeta()

  // Desktop: Esc behaves like the Android back button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') nav.back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <DeviceShell>
      <PopupProvider>
        <RoleRouter />
      </PopupProvider>
    </DeviceShell>
  )
}
