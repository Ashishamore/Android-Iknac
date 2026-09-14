import { BellIcon, HandWavingIcon } from '@phosphor-icons/react'
import { motion, useTransform } from 'motion/react'
import { PropCard } from '@/components/PropCard'
import { TRENDING_PROPS } from '@/data/props'
import { EASE_OUT } from '@/lib/motion'
import { nav } from '@/navigation'
import { useUnreadNotifications } from '@/store/notifications'
import { useDisplayName } from '@/store/session'
import { AppBar, Carousel, IconButton, ImagePlaceholder, Screen, SectionHeader, useScrollY } from '@/ui'

function greeting(date = new Date()) {
  const h = date.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

interface Banner {
  id: string
  /** Image in /public (16:9). Slots without one show a placeholder. */
  image?: string
  alt?: string
  onClick?: () => void
}

/** Home hero banners, in slide order. */
const BANNERS: Banner[] = [
  {
    id: 'hero-props',
    image: '/banners/hero-props-yellow-car.webp',
    alt: 'Cars, bikes & statement props — vintage cars, scooters and chandeliers for the money shot. Browse hero props.',
    // No hero-props collection yet — Discover is the closest destination.
    onClick: () => nav.switchTab('discover'),
  },
  {
    id: 'recreate-era-latch',
    image: '/banners/recreate-era-latch.webp',
    alt: 'Recreate the era — vintage leather and brass props. Browse hero props.',
    onClick: () => nav.switchTab('discover'),
  },
  {
    id: 'recreate-era-pottery',
    image: '/banners/recreate-era-pottery.webp',
    alt: 'Recreate the era — antique pottery and period décor. Browse hero props.',
    onClick: () => nav.switchTab('discover'),
  },
]

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: EASE_OUT, delay },
})

export default function HomeTab() {
  const firstName = useDisplayName().split(' ')[0]
  const unread = useUnreadNotifications()

  return (
    <Screen
      header={
        <AppBar
          transparent
          solidAt={64}
          title={`Hi, ${firstName}`}
          actions={
            <IconButton
              icon={BellIcon}
              label="Notifications"
              variant="surface"
              badge={unread}
              onClick={() => nav.push('/customer/notifications')}
            />
          }
        />
      }
    >
      <WelcomeHeader firstName={firstName} />

      <Carousel className="mt-4">
        {BANNERS.map((b, i) =>
          b.image ? (
            <button
              key={b.id}
              type="button"
              onClick={b.onClick}
              className="block w-full overflow-hidden rounded-3xl bg-surface-3 shadow-card transition-transform duration-200 ease-out-quint active:scale-[0.985] dark:ring-1 dark:ring-white/10"
            >
              <img
                src={b.image}
                alt={b.alt ?? ''}
                draggable={false}
                decoding="async"
                fetchPriority={i === 0 ? 'high' : 'auto'}
                className="aspect-video w-full object-cover"
              />
            </button>
          ) : (
            <ImagePlaceholder key={b.id} label={`Image ${i + 1}`} hint="16:9 banner" className="aspect-video rounded-3xl" />
          ),
        )}
      </Carousel>

      <SectionHeader
        title="Trending props"
        subtitle="Most booked this week"
        action="See all"
        onAction={() => nav.push('/customer/trending')}
        className="pt-5"
      />
      <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1">
        {TRENDING_PROPS.slice(0, 8).map((item) => (
          <PropCard key={item.id} item={item} className="w-[164px] shrink-0 snap-start" />
        ))}
      </div>
      <div className="h-6" />
    </Screen>
  )
}

/** Greets the signed-in user at the top of Home. The bell sits in the app bar above it. */
function WelcomeHeader({ firstName }: { firstName: string }) {
  // Fade out as it scrolls under the app bar (which then shows "Hi, …").
  const scrollY = useScrollY()
  const opacity = useTransform(scrollY, [0, 64], [1, 0])
  return (
    <motion.header style={{ opacity }} className="px-4 pb-2 pt-[calc(var(--sat)+20px)]">
      <div className="pr-14">
        <motion.p {...rise(0)} className="text-sm font-medium text-muted">
          {greeting()}
        </motion.p>
        <motion.h1
          {...rise(0.05)}
          className="mt-0.5 flex items-center gap-2 font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-fg"
        >
          <span className="truncate">Welcome, {firstName}</span>
          <motion.span
            aria-hidden
            className="inline-flex shrink-0 text-amber-400"
            style={{ originX: 0.75, originY: 0.8 }}
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, 18, -8, 18, -4, 12, 0] }}
            transition={{ duration: 1.5, delay: 0.45, ease: 'easeInOut' }}
          >
            <HandWavingIcon size={28} weight="fill" />
          </motion.span>
        </motion.h1>
      </div>
      <motion.p {...rise(0.1)} className="mt-1 text-balance text-[15px] leading-snug text-muted">
        Find the perfect props for your next shoot.
      </motion.p>
    </motion.header>
  )
}
