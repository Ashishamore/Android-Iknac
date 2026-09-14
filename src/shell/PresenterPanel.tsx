import { ArrowCounterClockwiseIcon, DeviceMobileIcon, DeviceTabletIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { APP, DEVICES, type DeviceId } from '@/app/config'
import { cn } from '@/lib/cn'
import { resetDemoData as resetDemo } from '@/store/reset'
import { usePrefs } from '@/store/prefs'

/** Desktop-only controls around the device frame, for demos and design reviews. */
export function PresenterPanel({ docked, width }: { docked: boolean; width: number }) {
  if (!docked) return <CompactToolbar />
  const Logo = APP.logo
  return (
    <aside className="relative z-10 flex h-full shrink-0 flex-col justify-center py-6 pl-7" style={{ width }}>
      <div className="flex max-h-full flex-col overflow-y-auto rounded-[28px] border border-line bg-surface/85 p-6 shadow-float backdrop-blur-xl [scrollbar-color:var(--color-line-strong)_transparent] [scrollbar-width:thin]">
        <header className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-fg shadow-float">
            <Logo size={22} weight="fill" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold leading-tight">{APP.name}</h1>
            <p className="text-xs text-muted">{APP.tagline}</p>
          </div>
        </header>
        <p className="mt-4 text-sm leading-relaxed text-muted">{APP.description}</p>

        <Section title="Device">
          <DevicePicker />
        </Section>

        <footer className="mt-6 flex items-center justify-between border-t border-line pt-4">
          <button
            type="button"
            onClick={resetDemo}
            className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-muted transition-colors hover:text-fg"
          >
            <ArrowCounterClockwiseIcon size={16} weight="bold" />
            Reset demo
          </button>
          <span className="text-xs text-subtle">
            <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-muted">
              Esc
            </kbd>{' '}
            to go back
          </span>
        </footer>
      </div>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-2xs font-bold uppercase tracking-[0.08em] text-subtle">{title}</h2>
      {children}
    </section>
  )
}

function DevicePicker() {
  const device = usePrefs((s) => s.device)
  const setDevice = usePrefs((s) => s.setDevice)
  return (
    <div className="grid grid-cols-2 gap-2">
      {(Object.keys(DEVICES) as DeviceId[]).map((id) => {
        const d = DEVICES[id]
        const DIcon = d.kind === 'phone' ? DeviceMobileIcon : DeviceTabletIcon
        const active = device === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setDevice(id)}
            className={cn(
              'pressable flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left',
              active ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong',
            )}
          >
            <DIcon
              size={20}
              weight={active ? 'fill' : 'regular'}
              className={cn(active ? 'text-accent' : 'text-muted', id === 'tablet-landscape' && 'rotate-90')}
            />
            <span className="min-w-0">
              <span className={cn('block text-sm font-semibold', active ? 'text-accent-soft-fg' : 'text-fg')}>
                {d.label}
              </span>
              <span className="block text-2xs text-muted tabular-nums">
                {d.width} × {d.height}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Condensed controls for narrower desktop windows. */
function CompactToolbar() {
  const device = usePrefs((s) => s.device)
  const setDevice = usePrefs((s) => s.setDevice)

  return (
    <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-surface/85 p-1.5 shadow-float backdrop-blur-xl">
      {(Object.keys(DEVICES) as DeviceId[]).map((id) => {
        const d = DEVICES[id]
        const DIcon = d.kind === 'phone' ? DeviceMobileIcon : DeviceTabletIcon
        return (
          <button
            key={id}
            type="button"
            title={`${d.label} · ${d.width}×${d.height}`}
            onClick={() => setDevice(id)}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors',
              device === id ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
            )}
          >
            <DIcon size={17} weight={device === id ? 'fill' : 'regular'} className={id === 'tablet-landscape' ? 'rotate-90' : ''} />
            <span className="hidden lg:inline">{d.label}</span>
          </button>
        )
      })}
      <span className="mx-1 h-5 w-px bg-line" />
      <button
        type="button"
        title="Reset demo"
        onClick={resetDemo}
        className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <ArrowCounterClockwiseIcon size={18} />
      </button>
    </div>
  )
}
