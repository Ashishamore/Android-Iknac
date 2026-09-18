import { motion, type Variants } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { EASE_OUT } from '@/lib/motion'
import { useNavSnapshot, useVisibleTabs } from './hooks'
import { nav, type TabDef } from './navStore'
import { ScreenContext } from './ScreenContext'
import { BottomNav, NavRail } from './TabBar'

/** Keeps every visited tab mounted (scroll + state preserved) and cross-fades between them. */
export function TabHost() {
  const tabs = useVisibleTabs()
  const activeTab = useNavSnapshot((s) => s.activeTab)
  const rootFocused = useNavSnapshot((s) => s.stack.length === 0)
  const [initialTab] = useState(activeTab)
  const [visited, setVisited] = useState<string[]>([activeTab])
  const [switchState, setSwitchState] = useState({ tab: activeTab, dir: 0 })

  // Derive slide direction from the tab order whenever the active tab changes.
  if (switchState.tab !== activeTab) {
    const from = tabs.findIndex((t) => t.id === switchState.tab)
    const to = tabs.findIndex((t) => t.id === activeTab)
    setSwitchState({ tab: activeTab, dir: to > from ? 1 : -1 })
    if (!visited.includes(activeTab)) setVisited([...visited, activeTab])
  }

  // A tab can be switched off in the admin panel while it is open.
  const gone = tabs.length > 0 && !tabs.some((t) => t.id === activeTab)
  useEffect(() => {
    if (gone) nav.switchTab(tabs[0].id)
  }, [gone, tabs])

  return (
    <div className="flex h-full flex-col @expanded:flex-row">
      <NavRail className="hidden @expanded:flex" />
      <div className="relative min-h-0 flex-1 overflow-clip">
        {tabs
          .filter((t) => visited.includes(t.id))
          .map((t) => (
            <TabPane
              key={t.id}
              tab={t}
              active={t.id === activeTab}
              focused={rootFocused && t.id === activeTab}
              dir={switchState.dir}
              animateIn={t.id !== initialTab}
            />
          ))}
      </div>
      <BottomNav className="@expanded:hidden" />
    </div>
  )
}

const paneVariants: Variants = {
  active: (dir: number) => ({
    opacity: [0, 1],
    x: [dir * 20, 0],
    visibility: 'visible',
    transition: { duration: 0.32, ease: EASE_OUT },
  }),
  inactive: (dir: number) => ({
    opacity: 0,
    x: dir * -20,
    transition: { duration: 0.14, ease: EASE_OUT },
    transitionEnd: { visibility: 'hidden' },
  }),
}

interface TabPaneProps {
  tab: TabDef
  active: boolean
  focused: boolean
  dir: number
  animateIn: boolean
}

function TabPane({ tab, active, focused, dir, animateIn }: TabPaneProps) {
  const Component = tab.component
  const value = useMemo(() => ({ key: `tab:${tab.id}`, tabId: tab.id, focused }), [tab.id, focused])
  return (
    <motion.div
      className="absolute inset-0"
      custom={dir}
      variants={paneVariants}
      initial={animateIn ? { opacity: 0, x: dir * 20 } : false}
      animate={active ? 'active' : 'inactive'}
      inert={!active}
    >
      <ScreenContext.Provider value={value}>
        <Component />
      </ScreenContext.Provider>
    </motion.div>
  )
}
