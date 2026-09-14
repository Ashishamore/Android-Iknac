import { AnimatePresence, motion, useIsPresent, type Variants } from 'motion/react'
import { memo, useMemo, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { T } from '@/lib/motion'
import { useNavSnapshot } from './hooks'
import { ROOT_KEY, type NavAction, type Presentation, type StackEntry } from './navStore'
import { ScreenContext } from './ScreenContext'

interface Custom {
  action: NavAction
  prevTopKey: string
}

/** Where a new screen starts (and where a popped screen leaves to). */
const OFFSTAGE: Record<Presentation, Record<string, number | string>> = {
  push: { x: '100%' },
  modal: { y: '100%' },
  fade: { opacity: 0, scale: 0.97 },
}

/** How the screen underneath reacts when something is presented over it. */
const UNDER: Record<Presentation, Record<string, number | string>> = {
  push: { x: '-28%' },
  modal: { x: 0 },
  fade: { x: 0 },
}

const SCRIM: Record<Presentation, number> = { push: 0.12, modal: 0.3, fade: 0 }

const isBackward = (c: Custom) => c.action === 'pop' || c.action === 'tab'

/**
 * Renders the tab host plus every pushed screen as stacked layers. Screens
 * beneath the top stay mounted, so scroll position and state survive a round
 * trip — just like a native back stack.
 */
export function StackView({ root }: { root: ReactNode }) {
  const snap = useNavSnapshot()
  const custom: Custom = { action: snap.action, prevTopKey: snap.prevTopKey }
  const { stack } = snap

  return (
    <div className="absolute inset-0 isolate overflow-clip bg-bg">
      <Layer layerKey={ROOT_KEY} depth={stack.length} above={stack[0]} custom={custom}>
        {root}
      </Layer>
      <AnimatePresence initial={false} custom={custom}>
        {stack.map((entry, i) => (
          <Layer
            key={entry.key}
            layerKey={entry.key}
            entry={entry}
            depth={stack.length - 1 - i}
            above={stack[i + 1]}
            custom={custom}
          >
            <ScreenHost entry={entry} focused={i === stack.length - 1} />
          </Layer>
        ))}
      </AnimatePresence>
    </div>
  )
}

interface LayerProps {
  layerKey: string
  entry?: StackEntry
  /** 0 = top-most layer. */
  depth: number
  above?: StackEntry
  custom: Custom
  children: ReactNode
}

function Layer({ layerKey, entry, depth, above, custom, children }: LayerProps) {
  const isPresent = useIsPresent()
  const presentation = entry?.route.presentation ?? 'push'
  const coveredBy = above?.route.presentation ?? 'push'
  const covered = depth > 0

  const variants: Variants = {
    offstage: OFFSTAGE[presentation],
    shown: (c: Custom) => ({
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
      transition: isBackward(c) ? T.pop : T.push,
    }),
    under: (c: Custom) => ({ ...UNDER[coveredBy], transition: isBackward(c) ? T.pop : T.push }),
    exit: (c: Custom) => {
      // Screens that weren't on top (e.g. during popToRoot) vanish instantly.
      if (c.prevTopKey !== layerKey) return { opacity: 0, transition: { duration: 0 } }
      if (c.action === 'replace') return { x: '-28%', transition: T.push }
      return { ...OFFSTAGE[presentation], transition: T.pop }
    },
  }

  return (
    <motion.div
      className={cn(
        // `isolate` keeps each layer's scrim inside it; `overflow-clip` (not `hidden`)
        // means focus/scrollIntoView can never shift a screen sideways.
        'absolute inset-0 isolate overflow-clip bg-bg',
        entry && presentation === 'push' && 'shadow-edge',
      )}
      style={{ visibility: depth >= 2 ? 'hidden' : 'visible' }}
      custom={custom}
      variants={variants}
      initial={entry ? 'offstage' : false}
      animate={covered ? 'under' : 'shown'}
      exit="exit"
      inert={covered || !isPresent}
    >
      {children}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-40 bg-scrim"
        initial={false}
        animate={{ opacity: covered ? SCRIM[coveredBy] : 0 }}
        transition={isBackward(custom) ? T.pop : T.push}
      />
    </motion.div>
  )
}

const ScreenHost = memo(function ScreenHost({ entry, focused }: { entry: StackEntry; focused: boolean }) {
  const Component = entry.route.component
  const value = useMemo(() => ({ key: entry.key, entry, focused }), [entry, focused])
  return (
    <ScreenContext.Provider value={value}>
      <Component />
    </ScreenContext.Provider>
  )
})
