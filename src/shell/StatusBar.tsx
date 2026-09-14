import { BatteryVerticalHighIcon, CellSignalFullIcon, WifiHighIcon } from '@phosphor-icons/react'
import type { DeviceSpec } from '@/app/config'
import { useIsDark } from '@/app/theme'
import { cn } from '@/lib/cn'
import { useNow } from '@/lib/hooks'
import { focusedKeyOf, useNavSnapshot } from '@/navigation'
import { useChrome } from '@/store/chrome'

/** Simulated Android status bar (desktop preview only). */
export function StatusBar({ spec }: { spec: DeviceSpec }) {
  const now = useNow(15_000)
  const focusedKey = useNavSnapshot(focusedKeyOf)
  const pref = useChrome((s) => s.statusBar[focusedKey])
  const dark = useIsDark()
  const tone = pref?.tone ?? (dark ? 'light' : 'dark')
  const time = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-[60] flex items-center justify-between text-[13px] font-semibold tracking-tight transition-colors duration-300',
        spec.kind === 'phone' ? 'px-7' : 'px-6',
        tone === 'light' ? 'text-white' : 'text-fg',
      )}
      style={{ height: 'var(--sat)' }}
    >
      <span className="tabular-nums">{time}</span>
      {spec.kind === 'phone' && (
        <span className="absolute left-1/2 top-[11px] size-3 -translate-x-1/2 rounded-full bg-[#050608] ring-[1.5px] ring-black/30" />
      )}
      <span className="flex items-center gap-1">
        <WifiHighIcon size={15} weight="fill" />
        <CellSignalFullIcon size={14} weight="fill" />
        <BatteryVerticalHighIcon size={15} weight="fill" />
      </span>
    </div>
  )
}

/** Android gesture-navigation handle. */
export function GestureBar() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[60] flex items-center justify-center"
      style={{ height: 'var(--sab)' }}
    >
      <span className="h-1 w-[108px] rounded-full bg-fg/75" />
    </div>
  )
}
