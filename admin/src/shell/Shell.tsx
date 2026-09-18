import {
  ArrowCounterClockwiseIcon,
  BellIcon,
  CalendarDotsIcon,
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretUpDownIcon,
  ChatCircleTextIcon,
  ClockCounterClockwiseIcon,
  DesktopIcon,
  FilmSlateIcon,
  GearSixIcon,
  LifebuoyIcon,
  ListIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  MoonIcon,
  PackageIcon,
  PlusIcon,
  QrCodeIcon,
  SealCheckIcon,
  SquaresFourIcon,
  StarIcon,
  SunHorizonIcon,
  SunIcon,
  UserCircleIcon,
  WalletIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { ANNOUNCEMENT } from '@/data/owner'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { useOwner } from '@/store/owner'
import { openRenterApp } from '~/lib/actions'
import { isVerified, resetDemo, useCounts } from '~/lib/data'
import { useT, type TKey } from '~/lib/i18n'
import { useIsDark } from '~/lib/theme'
import { linkProps, navigate, useLocation } from '~/router'
import { useChromeUi, useUi } from '~/store/ui'
import { Button, IconButton, Kbd } from '~/ui/controls'
import { Avatar, CountBadge } from '~/ui/display'
import { confirm } from '~/ui/feedback'
import { Menu } from '~/ui/overlays'
import { CommandPalette } from './CommandPalette'
import { NotificationsFlyout } from './Notifications'

interface NavItem {
  key: TKey
  to: string
  icon: Icon
  badge?: number
  badgeTone?: 'danger' | 'brand' | 'neutral'
}

/** Teams / Outlook-style frame: title bar, announcement strip, sidebar and the page. */
export function Shell({ children, bleed }: { children: ReactNode; bleed?: boolean }) {
  const { path } = useLocation()
  const main = useRef<HTMLElement>(null)
  const mobileNav = useChromeUi((s) => s.mobileNav)
  const setChrome = useChromeUi((s) => s.set)
  const dismissed = useOwner((s) => s.announcementDismissed)
  const dismiss = useOwner((s) => s.dismissAnnouncement)

  useEffect(() => {
    main.current?.scrollTo({ top: 0 })
    setChrome({ mobileNav: false, notifications: false })
  }, [path, setChrome])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setChrome({ palette: !useChromeUi.getState().palette })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setChrome])

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      <TitleBar />
      <AnimatePresence initial={false}>
        {!dismissed && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.22, ease: EASE_OUT }} className="shrink-0 overflow-hidden">
            <div role="status" className="flex items-center gap-2.5 border-b border-warning/20 bg-warning-soft py-1.5 pl-4 pr-2 text-[13px] text-fg">
              <MegaphoneIcon size={16} weight="fill" className="shrink-0 text-warning" />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">Maintenance</span> · {ANNOUNCEMENT.replace('Scheduled maintenance: ', '')}
              </span>
              <IconButton icon={XIcon} label="Dismiss announcement" size="xs" onClick={dismiss} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden lg:flex">
          <Sidebar />
        </aside>
        <main ref={main} className="thin-scroll relative min-w-0 flex-1 overflow-y-auto">
          {bleed ? children : <div className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-6">{children}</div>}
        </main>
      </div>

      {/* Mobile / tablet nav drawer */}
      <AnimatePresence>
        {mobileNav && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-scrim/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setChrome({ mobileNav: false })} />
            <motion.div className="absolute inset-y-0 left-0 flex shadow-float" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.26, ease: EASE_OUT }}>
              <Sidebar drawer />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <NotificationsFlyout />
      <CommandPalette />
    </div>
  )
}

function TitleBar() {
  const t = useT()
  const setChrome = useChromeUi((s) => s.set)
  const notificationsOpen = useChromeUi((s) => s.notifications)
  const counts = useCounts()
  const business = useOwner((s) => s.business)
  const theme = useUi((s) => s.theme)
  const setTheme = useUi((s) => s.setTheme)
  const dark = useIsDark()

  return (
    <header className="relative z-40 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 sm:px-3">
      <IconButton icon={ListIcon} label="Open navigation" className="lg:hidden" onClick={() => setChrome({ mobileNav: true })} />
      <a {...linkProps('/today')} className="flex shrink-0 items-center gap-2 rounded-lg px-1 py-1">
        <span className="grid size-7 place-items-center rounded-lg bg-accent text-accent-fg">
          <PackageIcon size={17} weight="fill" />
        </span>
        <span className="hidden font-display text-[15px] font-extrabold tracking-[-0.01em] text-fg sm:inline">PropKart</span>
        <span className="hidden rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted md:inline">for Business</span>
      </a>

      <div className="flex min-w-0 flex-1 justify-center px-1 sm:px-4">
        <button
          type="button"
          onClick={() => setChrome({ palette: true })}
          className="flex h-8 w-full max-w-lg items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 text-left text-[13px] text-muted transition-colors hover:border-line-strong hover:bg-surface"
        >
          <MagnifyingGlassIcon size={15} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">{t('search')}</span>
          <span className="hidden items-center gap-0.5 sm:flex">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton icon={LifebuoyIcon} label="Help" className="hidden sm:grid" onClick={() => navigate('/profile/help')} />
        <IconButton icon={dark ? SunIcon : MoonIcon} label={dark ? 'Switch to light theme' : 'Switch to dark theme'} className="hidden sm:grid" onClick={() => setTheme(dark ? 'light' : 'dark')} />
        <IconButton icon={BellIcon} label={t('notifications')} badge={counts.unread} active={notificationsOpen} onClick={() => setChrome({ notifications: !notificationsOpen })} data-flyout-anchor />
        <Menu
          width={260}
          items={[
            { heading: `${business.owner} · Owner` },
            { label: 'Profile', icon: UserCircleIcon, onSelect: () => navigate('/profile') },
            { label: 'Switch workspace', icon: SquaresFourIcon, onSelect: () => navigate('/workspace') },
            { label: 'Switch to renting things', icon: FilmSlateIcon, onSelect: openRenterApp },
            'divider',
            { heading: 'Theme' },
            { label: 'Light', icon: SunIcon, checked: theme === 'light', onSelect: () => setTheme('light') },
            { label: 'Dark', icon: MoonIcon, checked: theme === 'dark', onSelect: () => setTheme('dark') },
            { label: 'Match system', icon: DesktopIcon, checked: theme === 'system', onSelect: () => setTheme('system') },
            'divider',
            { label: 'Older version (take one)', icon: ClockCounterClockwiseIcon, onSelect: () => navigate('/provider') },
            {
              label: 'Reset demo data',
              icon: ArrowCounterClockwiseIcon,
              destructive: true,
              onSelect: async () => {
                if (await confirm({ title: 'Reset demo data?', message: 'Clears every change made in the admin panel and restores the Kapoor Props sample.', confirmText: 'Reset', tone: 'danger', icon: ArrowCounterClockwiseIcon })) resetDemo()
              },
            },
          ]}
        >
          <button type="button" aria-label="Account" className="ml-1 rounded-full outline-offset-2 transition-opacity hover:opacity-85">
            <Avatar name={business.owner} size="sm" presence="online" />
          </button>
        </Menu>
      </div>
    </header>
  )
}

function Sidebar({ drawer }: { drawer?: boolean }) {
  const t = useT()
  const { path } = useLocation()
  const collapsed = useUi((s) => s.sidebarCollapsed) && !drawer
  const toggle = useUi((s) => s.toggleSidebar)
  const setChrome = useChromeUi((s) => s.set)
  const business = useOwner((s) => s.business)
  const verification = useOwner((s) => s.verification)
  const counts = useCounts()

  const primary: NavItem[] = [
    { key: 'today', to: '/today', icon: SunHorizonIcon, badge: counts.waiting, badgeTone: 'danger' },
    { key: 'stock', to: '/stock', icon: PackageIcon, badge: counts.listings, badgeTone: 'neutral' },
    { key: 'diary', to: '/diary', icon: CalendarDotsIcon, badge: counts.diary, badgeTone: 'danger' },
    { key: 'profile', to: '/profile', icon: UserCircleIcon },
  ]
  const work: NavItem[] = [
    { key: 'requests', to: '/requests', icon: ChatCircleTextIcon, badge: counts.messages, badgeTone: 'brand' },
    { key: 'handover', to: '/handover', icon: QrCodeIcon, badge: counts.moving, badgeTone: counts.overdue ? 'danger' : 'neutral' },
  ]
  const shortcuts: NavItem[] = [
    { key: 'payouts', to: '/profile/payouts', icon: WalletIcon },
    { key: 'reviews', to: '/profile/reviews', icon: StarIcon, badge: counts.unreplied, badgeTone: 'brand' },
  ]
  const all = [...primary, ...work, ...shortcuts, { key: 'add' as const, to: '/add', icon: PlusIcon }]
  const orderPaths = path.startsWith('/orders/') ? '/requests' : path
  const active = all.filter((n) => orderPaths === n.to || orderPaths.startsWith(`${n.to}/`)).sort((a, b) => b.to.length - a.to.length)[0]?.to

  const renderItem = (n: NavItem) => {
    const on = active === n.to
    return (
      <a
        key={n.to}
        {...linkProps(n.to)}
        title={collapsed ? t(n.key) : undefined}
        aria-current={on ? 'page' : undefined}
        className={cn(
          'group relative flex h-9 items-center gap-3 rounded-lg text-[13px] font-medium transition-colors',
          collapsed ? 'justify-center px-0' : 'px-2.5',
          on ? 'bg-accent-soft font-semibold text-accent-soft-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
        )}
      >
        {on && <span className="absolute -left-2 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-accent" />}
        <n.icon size={19} weight={on ? 'fill' : 'regular'} className="shrink-0" />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{t(n.key)}</span>}
        {n.badge ? collapsed ? <span className={cn('absolute right-2 top-1.5 size-2 rounded-full ring-2 ring-surface', n.badgeTone === 'neutral' ? 'hidden' : n.badgeTone === 'brand' ? 'bg-accent' : 'bg-danger')} /> : <CountBadge n={n.badge} tone={n.badgeTone} /> : null}
      </a>
    )
  }

  return (
    <nav aria-label="Main" className={cn('flex h-full flex-col border-r border-line bg-surface transition-[width] duration-200', drawer ? 'w-72' : collapsed ? 'w-[60px]' : 'w-60')}>
      {/* Workspace */}
      <div className={cn('border-b border-line p-2', collapsed && 'px-1.5')}>
        <Menu
          align="start"
          width={272}
          items={[
            { heading: 'Workspaces' },
            { label: `${business.name} · I rent props out`, icon: SealCheckIcon, checked: true, onSelect: () => navigate('/today') },
            { label: 'I hire props (renter app)', icon: FilmSlateIcon, onSelect: openRenterApp },
            'divider',
            { label: 'All workspaces', icon: SquaresFourIcon, onSelect: () => navigate('/workspace') },
            { label: 'Business settings', icon: GearSixIcon, onSelect: () => navigate('/profile/business') },
          ]}
        >
          <button type="button" className={cn('flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-surface-2', collapsed && 'justify-center')}>
            <Avatar name={business.name} size="sm" className="[&>span]:rounded-lg" />
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-[13px] font-bold text-fg">
                    <span className="truncate">{business.name}</span>
                    {isVerified(verification) && <SealCheckIcon size={14} weight="fill" aria-label="Verified" className="shrink-0 text-accent" />}
                  </span>
                  <span className="block truncate text-[11px] text-muted">{business.type} · Andheri West</span>
                </span>
                <CaretUpDownIcon size={14} className="shrink-0 text-muted" />
              </>
            )}
          </button>
        </Menu>
      </div>

      <div className="thin-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-3">
        {collapsed ? (
          <IconButton icon={PlusIcon} label={t('add')} weight="bold" onClick={() => navigate('/add')} className={cn('mx-auto bg-accent text-accent-fg hover:bg-accent-strong hover:text-accent-fg', active === '/add' && 'ring-2 ring-accent/30')} />
        ) : (
          <Button icon={PlusIcon} block onClick={() => navigate('/add')} className="justify-start gap-2.5 px-3">
            <span className="flex-1 text-left">{t('add')}</span>
            {counts.drafts > 0 && <span className="rounded-md bg-white/20 px-1.5 text-[11px] tabular-nums">{counts.drafts}</span>}
          </Button>
        )}
        <div className="flex flex-col gap-0.5">{primary.map(renderItem)}</div>
        <Group label={t('work')} collapsed={collapsed}>
          {work.map(renderItem)}
        </Group>
        <Group label={t('business')} collapsed={collapsed}>
          {shortcuts.map(renderItem)}
        </Group>
      </div>

      <div className="border-t border-line p-2">
        {drawer ? (
          <Button variant="ghost" block icon={XIcon} onClick={() => setChrome({ mobileNav: false })}>
            Close
          </Button>
        ) : (
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? 'Expand sidebar' : t('collapse')}
            className={cn('flex h-8 w-full items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg', collapsed && 'justify-center px-0')}
          >
            {collapsed ? <CaretDoubleRightIcon size={16} /> : <CaretDoubleLeftIcon size={16} />}
            {!collapsed && t('collapse')}
          </button>
        )}
      </div>
    </nav>
  )
}

function Group({ label, collapsed, children }: { label: string; collapsed: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      {collapsed ? <div className="mx-3 mb-1 h-px bg-line" /> : <p className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-subtle">{label}</p>}
      {children}
    </div>
  )
}
