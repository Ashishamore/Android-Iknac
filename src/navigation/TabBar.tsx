import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { haptic } from '@/lib/haptics'
import { EASE_OUT, T } from '@/lib/motion'
import { APP } from '@/app/config'
import { useNavSnapshot } from './hooks'
import { getTabs, nav, type TabDef } from './navStore'

/**
 * Bottom navigation. The selected tab is marked by a thin primary line along
 * the top edge (it slides between tabs) and a filled, primary-coloured icon.
 */
export function BottomNav({ className }: { className?: string }) {
  const tabs = getTabs()
  const activeTab = useNavSnapshot((s) => s.activeTab)
  const index = Math.max(0, tabs.findIndex((t) => t.id === activeTab))
  if (tabs.length < 2) return null

  return (
    <nav className={cn('relative z-10 shrink-0 border-t border-line bg-surface pb-safe', className)}>
      <div
        className="relative mx-auto grid h-[var(--nav-h)] max-w-lg"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-px left-0 flex justify-center"
          style={{ width: `${100 / tabs.length}%` }}
          initial={false}
          animate={{ x: `${index * 100}%` }}
          transition={T.snappy}
        >
          <div className="h-[3px] w-10 rounded-b-full bg-accent" />
        </motion.div>
        {tabs.map((tab) => (
          <NavButton key={tab.id} tab={tab} active={tab.id === activeTab} />
        ))}
      </div>
    </nav>
  )
}

/** Navigation rail used on wide (tablet landscape) layouts. */
export function NavRail({ className }: { className?: string }) {
  const tabs = getTabs()
  const activeTab = useNavSnapshot((s) => s.activeTab)
  const index = Math.max(0, tabs.findIndex((t) => t.id === activeTab))
  const Logo = APP.logo
  if (tabs.length < 2) return null

  return (
    <nav
      className={cn(
        'relative z-10 w-24 shrink-0 flex-col items-center border-r border-line bg-surface pt-safe',
        className,
      )}
    >
      <div className="mb-6 mt-5 grid size-11 place-items-center rounded-2xl bg-accent text-accent-fg shadow-float">
        <Logo size={22} weight="fill" />
      </div>
      <div className="relative flex w-full flex-col">
        {/* Same idea as the bottom nav: a thin primary line, on the rail's outer edge. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 flex h-[72px] items-center"
          initial={false}
          animate={{ y: `${index * 100}%` }}
          transition={T.snappy}
        >
          <div className="h-10 w-[3px] rounded-r-full bg-accent" />
        </motion.div>
        {tabs.map((tab) => (
          <NavButton key={tab.id} tab={tab} active={tab.id === activeTab} className="h-[72px]" />
        ))}
      </div>
    </nav>
  )
}

function NavButton({ tab, active, className }: { tab: TabDef; active: boolean; className?: string }) {
  const badge = tab.useBadge?.()
  const Icon = tab.icon
  return (
    <button
      type="button"
      aria-label={tab.label}
      aria-current={active ? 'page' : undefined}
      onClick={() => {
        haptic()
        nav.switchTab(tab.id)
      }}
      className={cn('relative flex flex-col items-center justify-center gap-1 outline-none', className)}
    >
      <span className="relative grid h-7 w-16 place-items-center">
        <motion.span
          initial={false}
          animate={active ? { scale: [0.82, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 0.42, ease: EASE_OUT }}
          className="grid place-items-center"
        >
          <Icon
            size={24}
            weight={active ? 'fill' : 'regular'}
            className={cn('transition-colors duration-200', active ? 'text-accent' : 'text-muted')}
          />
        </motion.span>
        {badge ? (
          <span className="absolute left-[35px] top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'text-2xs font-semibold tracking-wide transition-colors duration-200',
          active ? 'text-accent' : 'text-muted',
        )}
      >
        {tab.label}
      </span>
    </button>
  )
}
