import { ArrowLeftIcon, XIcon } from '@phosphor-icons/react'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { nav, useScreenInfo, useTabReselect } from '@/navigation'
import { useChrome } from '@/store/chrome'
import { IconButton } from './Button'
import { ScrollYContext, useScrollY } from './scrollContext'

interface ScreenProps {
  children: ReactNode
  /** Sticky header, usually an <AppBar>. */
  header?: ReactNode
  /** Sticky bottom bar (primary actions). */
  footer?: ReactNode
  /** Floating action button, bottom-right (e.g. <Fab>). */
  fab?: ReactNode
  /** Classes for the scrolling content area. */
  className?: string
  /** Use the surface colour instead of the page background. */
  surface?: boolean
  /** Scrolls back to the top whenever this value changes (e.g. the active in-screen tab). */
  resetScrollOn?: unknown
}

/**
 * Base layout for every screen: header + independently scrolling body + footer.
 * Tapping the active bottom-nav tab scrolls tab screens back to the top.
 */
export function Screen({ children, header, footer, fab, className, surface, resetScrollOn }: ScreenProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: scrollRef })
  const { key, tabId } = useScreenInfo()
  const setFooter = useChrome((s) => s.setFooter)
  const hasFooter = !!footer

  useTabReselect(tabId, () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [resetScrollOn])

  useEffect(() => {
    const el = footerRef.current
    if (!hasFooter || !el) return
    const ro = new ResizeObserver(() => setFooter(key, el.offsetHeight))
    ro.observe(el)
    return () => {
      ro.disconnect()
      setFooter(key, null)
    }
  }, [key, hasFooter, setFooter])

  return (
    <ScrollYContext.Provider value={scrollY}>
      <div className={cn('relative flex h-full flex-col', surface ? 'bg-surface' : 'bg-bg')}>
        {header}
        <div
          ref={scrollRef}
          className={cn('no-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain', className)}
        >
          {children}
        </div>
        {footer && (
          <div
            ref={footerRef}
            className="relative z-10 shrink-0 border-t border-line bg-surface px-4 pb-[calc(var(--sab)+12px)] pt-3"
          >
            {footer}
          </div>
        )}
        {fab && <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 flex justify-end">{fab}</div>}
      </div>
    </ScrollYContext.Provider>
  )
}

interface AppBarProps {
  title?: ReactNode
  subtitle?: ReactNode
  /** Back arrow — shown by default on pushed screens. Pass a function to override. */
  back?: boolean | (() => void)
  /** Show ✕ instead of ← (for modal screens). */
  close?: boolean
  actions?: ReactNode
  /** Fade the title in after scrolling (pair with <LargeTitle>). */
  titleOnScroll?: boolean
  /** Float over a hero image; turns solid as the content scrolls. */
  transparent?: boolean
  /** With `transparent`: scroll distance (px) at which the bar is fully solid. */
  solidAt?: number
  /** Extra row under the bar (tabs, chips, search…). */
  children?: ReactNode
  className?: string
}

export function AppBar({
  title,
  subtitle,
  back,
  close,
  actions,
  titleOnScroll,
  transparent,
  solidAt = 150,
  children,
  className,
}: AppBarProps) {
  const { entry } = useScreenInfo()
  const scrollY = useScrollY()
  // Transparent bars: background fades in over [30%, 100%] of solidAt, the title just after.
  const fadeIn = useTransform(scrollY, transparent ? [solidAt * 0.8, solidAt * 1.2] : [36, 72], [0, 1])
  const solid = useTransform(
    scrollY,
    transparent ? [solidAt * 0.3, solidAt] : titleOnScroll ? [24, 64] : [0, 8],
    [0, 1],
  )
  const showBack = back === undefined ? !!entry : !!back
  const onBack = typeof back === 'function' ? back : () => nav.pop()

  // A transparent bar lets taps through to the content under it until it turns solid.
  const [isSolid, setIsSolid] = useState(false)
  useMotionValueEvent(solid, 'change', (v) => setIsSolid(v > 0.5))
  const passThrough = transparent && !isSolid

  return (
    <header
      className={cn(
        transparent ? 'absolute inset-x-0 top-0' : 'relative shrink-0',
        'z-30 pt-safe',
        passThrough && 'pointer-events-none',
        className,
      )}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-surface"
        style={{ opacity: transparent || titleOnScroll ? solid : 1 }}
      />
      <div className={cn('relative flex h-14 items-center gap-1', showBack ? 'px-2' : 'pl-4 pr-2')}>
        {showBack && (
          <IconButton
            icon={close ? XIcon : ArrowLeftIcon}
            label={close ? 'Close' : 'Back'}
            onClick={onBack}
            variant={transparent ? 'surface' : 'ghost'}
            className="pointer-events-auto"
          />
        )}
        <motion.div
          className={cn('min-w-0 flex-1', showBack && 'px-1.5')}
          style={{ opacity: titleOnScroll || transparent ? fadeIn : 1 }}
        >
          {title && (
            <h1 className="truncate font-display text-[17px] font-bold tracking-[-0.01em] text-fg">{title}</h1>
          )}
          {subtitle && <p className="-mt-0.5 truncate text-xs text-muted">{subtitle}</p>}
        </motion.div>
        {actions && <div className="pointer-events-auto flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {children && <div className="pointer-events-auto relative">{children}</div>}
      <motion.div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-line" style={{ opacity: solid }} />
    </header>
  )
}

/** Big screen title at the top of scrolling content (Material "large top app bar"). */
export function LargeTitle({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-end justify-between gap-3 px-4 pb-4 pt-1', className)}>
      <div className="min-w-0">
        <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-fg">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
