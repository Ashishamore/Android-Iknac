import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { EASE_OUT } from '@/lib/motion'
import { resetNavigation, StackView, TabHost } from '@/navigation'
import { useSession } from '@/store/session'
import { appFor } from './routes'

const FADE_MS = 240

/**
 * Shows the app for the current section (login flow, /customer or /renter).
 * When it changes, the current app fades out, navigation is reset to the new
 * app (and its URL section), and it fades in — like a native app after sign-in.
 */
export function RoleRouter() {
  const section = useSession((s) => s.section)
  const [shown, setShown] = useState(section)
  const fading = section !== shown

  useEffect(() => {
    if (!fading) return
    const t = setTimeout(() => {
      resetNavigation(appFor(section), useSession.getState().entryPath ?? undefined)
      setShown(section)
    }, FADE_MS)
    return () => clearTimeout(t)
  }, [section, fading])

  return (
    <motion.div
      className="absolute inset-0"
      initial={false}
      animate={fading ? { opacity: 0, scale: 0.98 } : { opacity: 1, scale: 1 }}
      transition={{ duration: FADE_MS / 1000, ease: EASE_OUT }}
    >
      <StackView key={shown ?? 'auth'} root={<TabHost />} />
    </motion.div>
  )
}
