import { motion } from 'motion/react'
import { PropCard } from '@/components/PropCard'
import { TRENDING_PROPS } from '@/data/props'
import { EASE_OUT } from '@/lib/motion'
import { liveProps } from '@/lib/search'
import { useCatalogueVersion } from '@/store/platform'
import { AppBar, Screen } from '@/ui'

/** "See all" for the Trending props section on Home. */
export default function TrendingScreen() {
  useCatalogueVersion()
  const items = liveProps(TRENDING_PROPS)
  return (
    <Screen header={<AppBar title="Trending props" subtitle={`${items.length} props · most booked this week`} />}>
      <div className="grid grid-cols-2 gap-3 p-4 @medium:grid-cols-3 @expanded:grid-cols-4">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT, delay: Math.min(i, 8) * 0.035 }}
          >
            <PropCard item={item} />
          </motion.div>
        ))}
      </div>
      <div className="h-4" />
    </Screen>
  )
}
