import { ArrowLeftIcon, CaretUpDownIcon, DesktopIcon, ListIcon, MoonIcon, ShieldCheckIcon, SunIcon, WrenchIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { ROLE_AREAS, ROLE_META, type Area } from '@/lib/platform'
import { usePlatform } from '@/store/platform'
import { useIsDark } from '~/lib/theme'
import { linkProps, navigate, useLocation } from '~/router'
import { useUi } from '~/store/ui'
import { Button, IconButton } from '~/ui/controls'
import { Avatar, CountBadge } from '~/ui/display'
import { Menu } from '~/ui/overlays'
import { useCan, useCounts, useMe } from './lib'
import { AREA, areaOf, GROUPS } from './nav'

/** The frame every Control Centre page sits in: rail, title bar, strips. */
export function ControlShell({ children }: { children: ReactNode }) {
  const { path } = useLocation()
  const [drawer, setDrawer] = useState(false)
  const main = useRef<HTMLElement>(null)
  const maintenance = usePlatform((s) => (s.flags.maintenance ? s.maintenanceText : null))

  useEffect(() => {
    main.current?.scrollTo({ top: 0 })
  }, [path])

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      <TitleBar onMenu={() => setDrawer(true)} />
      <AnimatePresence initial={false}>
        {maintenance && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.22, ease: EASE_OUT }} className="shrink-0 overflow-hidden">
            <div role="status" className="flex items-center gap-2.5 border-b border-warning/20 bg-warning-soft px-4 py-1.5 text-[13px] text-fg">
              <WrenchIcon size={15} weight="fill" className="shrink-0 text-warning" />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">Maintenance notice is up</span> · {maintenance}
              </span>
              <a {...linkProps('/admin/flags')} className="shrink-0 rounded font-semibold text-warning hover:underline">
                Change it
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden lg:flex">
          <Rail />
        </aside>
        <main ref={main} className="thin-scroll min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-6">{children}</div>
        </main>
      </div>

      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-scrim/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.div className="absolute inset-y-0 left-0 flex shadow-float" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.26, ease: EASE_OUT }}>
              <Rail onClose={() => setDrawer(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TitleBar({ onMenu }: { onMenu: () => void }) {
  const setTheme = useUi((s) => s.setTheme)
  const dark = useIsDark()

  return (
    <header className="relative z-40 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 sm:px-3">
      <IconButton icon={ListIcon} label="Open navigation" className="lg:hidden" onClick={onMenu} />
      <a {...linkProps('/admin')} className="flex shrink-0 items-center gap-2 rounded-lg px-1 py-1">
        <span className="grid size-7 place-items-center rounded-lg bg-fg text-bg">
          <ShieldCheckIcon size={16} weight="fill" />
        </span>
        <span className="font-display text-[15px] font-extrabold tracking-[-0.01em] text-fg">PropKart</span>
        <span className="hidden rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted sm:inline">Control Centre</span>
      </a>

      <div className="flex-1" />

      <Button variant="ghost" size="sm" icon={ArrowLeftIcon} onClick={() => navigate('/workspace')} className="hidden sm:inline-flex">
        Back to the apps
      </Button>
      <IconButton icon={dark ? SunIcon : MoonIcon} label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(dark ? 'light' : 'dark')} />
      <SignedInAs />
    </header>
  )
}

/** Signed in as → switch between admins, and see what each role cannot reach. */
function SignedInAs() {
  const admins = usePlatform((s) => s.admins)
  const signInAs = usePlatform((s) => s.signInAs)
  const me = useMe()
  const theme = useUi((s) => s.theme)
  const setTheme = useUi((s) => s.setTheme)

  const cannot = (role: typeof me.role) =>
    Object.values(AREA)
      .filter((a) => !ROLE_AREAS[role].includes(a.id))
      .map((a) => a.label)

  return (
    <Menu
      width={300}
      items={[
        { heading: 'Signed in as' },
        ...admins
          .filter((a) => a.active)
          .map((a) => ({
            label: a.name,
            hint: ROLE_META[a.role].label,
            icon: ShieldCheckIcon,
            checked: a.id === me.id,
            onSelect: () => signInAs(a.id),
          })),
        'divider' as const,
        { heading: cannot(me.role).length ? `${ROLE_META[me.role].label} cannot reach` : `${ROLE_META[me.role].label} reaches everything` },
        ...(cannot(me.role).length ? [{ label: cannot(me.role).join(' · '), disabled: true, onSelect: () => {} }] : []),
        'divider' as const,
        { heading: 'Theme' },
        { label: 'Light', icon: SunIcon, checked: theme === 'light', onSelect: () => setTheme('light') },
        { label: 'Dark', icon: MoonIcon, checked: theme === 'dark', onSelect: () => setTheme('dark') },
        { label: 'Match system', icon: DesktopIcon, checked: theme === 'system', onSelect: () => setTheme('system') },
        'divider' as const,
        { label: 'Back to the apps', icon: ArrowLeftIcon, onSelect: () => navigate('/workspace') },
      ]}
    >
      <button type="button" aria-label={`Signed in as ${me.name}`} className="ml-1 flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition-colors hover:bg-surface-2">
        <Avatar name={me.name} size="sm" presence="online" />
        <span className="hidden min-w-0 text-left md:block">
          <span className="block truncate text-[13px] font-bold leading-tight text-fg">{me.name}</span>
          <span className="block truncate text-[11px] leading-tight text-muted">{ROLE_META[me.role].label}</span>
        </span>
        <CaretUpDownIcon size={13} className="hidden shrink-0 text-muted md:block" />
      </button>
    </Menu>
  )
}

function Rail({ onClose }: { onClose?: () => void }) {
  const { path } = useLocation()
  const can = useCan()
  const counts = useCounts()
  const active = areaOf(path)

  const badge: Partial<Record<Area, number>> = {
    verification: counts.docs,
    listings: counts.listings,
    orders: counts.disputes,
    money: counts.payouts,
  }

  return (
    <nav aria-label="Control Centre" className={cn('flex h-full w-[248px] flex-col border-r border-line bg-surface', onClose && 'w-72')}>
      <div className="thin-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2 py-3">
        {GROUPS.map((group) => {
          const areas = group.areas.filter((a) => can(a))
          if (!areas.length) return null
          return (
            <div key={group.label} className="flex flex-col gap-0.5">
              <p className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-subtle">{group.label}</p>
              {areas.map((id) => {
                const a = AREA[id]
                const on = active === id
                const n = badge[id] ?? 0
                return (
                  <a
                    key={id}
                    {...linkProps(a.path)}
                    onClickCapture={onClose}
                    aria-current={on ? 'page' : undefined}
                    className={cn('group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium transition-colors', on ? 'bg-accent-soft font-semibold text-accent-soft-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg')}
                  >
                    {on && <span className="absolute -left-2 bottom-1.5 top-1.5 w-[3px] rounded-r-full bg-accent" />}
                    <a.icon size={18} weight={on ? 'fill' : 'regular'} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{a.label}</span>
                    {n > 0 && <CountBadge n={n} tone={id === 'money' ? 'brand' : 'danger'} />}
                  </a>
                )
              })}
            </div>
          )
        })}
      </div>
      <div className="border-t border-line p-2">
        {onClose ? (
          <Button variant="ghost" block icon={XIcon} onClick={onClose}>
            Close
          </Button>
        ) : (
          <button type="button" onClick={() => navigate('/workspace')} className="flex h-8 w-full items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg">
            <ArrowLeftIcon size={15} />
            Back to the apps
          </button>
        )}
      </div>
    </nav>
  )
}
