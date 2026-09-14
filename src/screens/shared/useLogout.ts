import { SignOutIcon } from '@phosphor-icons/react'
import { usePopup } from '@/overlays/popupContext'
import { useSession } from '@/store/session'

/** Confirm, then log out (the app switches back to the Welcome screen). */
export function useLogout() {
  const popup = usePopup()
  const logout = useSession((s) => s.logout)
  return async () => {
    const ok = await popup.confirm({
      title: 'Log out?',
      message: 'You can log back in with your mobile number any time.',
      confirmText: 'Log out',
      tone: 'danger',
      icon: SignOutIcon,
    })
    if (ok) logout()
  }
}
