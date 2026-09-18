import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { EASE_OUT } from '@/lib/motion'
import { nav } from '@/navigation'
import { useBroadcast, useMaintenance } from '@/store/platform'
import type { Role } from '@/store/session'
import { BroadcastStrip, MaintenanceStrip } from './Promo'

const grow = { initial: { height: 0 }, animate: { height: 'auto' }, exit: { height: 0 }, transition: { duration: 0.22, ease: EASE_OUT } }

/**
 * The strips the Control Centre puts at the top of an app: the maintenance
 * notice (a feature flag) and the broadcast that is up for this app.
 */
export function AppStrip({ section }: { section: Role | null }) {
  const maintenance = useMaintenance()
  const broadcast = useBroadcast(section === 'owner' ? 'provider' : 'renter')
  const [hidden, setHidden] = useState<string[]>([])
  const show = section === 'customer' || section === 'owner'
  const live = show && broadcast && !hidden.includes(broadcast.id) ? broadcast : null

  return (
    <div className="relative z-30 shrink-0">
      <AnimatePresence initial={false}>
        {show && maintenance && (
          <motion.div key="maintenance" {...grow} className="overflow-hidden">
            <MaintenanceStrip text={maintenance} inset />
          </motion.div>
        )}
        {live && (
          <motion.div key={live.id} {...grow} className="overflow-hidden">
            <BroadcastStrip broadcast={live} inset={!maintenance} onOpen={live.button ? () => nav.push(live.button!.to) : undefined} onHide={() => setHidden((h) => [...h, live.id])} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
