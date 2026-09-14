import { CheckIcon, EyedropperIcon, FilmSlateIcon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { ACCENTS } from '@/app/config'
import { useIsDark } from '@/app/theme'
import { cn } from '@/lib/cn'
import { accentVars, parseHex, readableOn } from '@/lib/color'
import { haptic } from '@/lib/haptics'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { usePrefs } from '@/store/prefs'
import { Button, TextField } from '@/ui'

function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('mb-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted', className)}>{children}</p>
}

/** Choose the app's primary colour: a preset, or any brand colour by hex code. */
export function AppColourSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const popup = usePopup()
  const accent = usePrefs((s) => s.accent)
  const customAccent = usePrefs((s) => s.customAccent)
  const setAccent = usePrefs((s) => s.setAccent)
  const setCustomAccent = usePrefs((s) => s.setCustomAccent)
  const [hex, setHex] = useState(() => customAccent.replace('#', '').toUpperCase())
  const parsed = parseHex(hex)

  const applyCustom = () => {
    if (!parsed) return
    setCustomAccent(parsed)
    onClose()
    popup.toast(`App colour set to ${parsed.toUpperCase()}`, { tone: 'success' })
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="App colour"
      description="Pick a preset, or use your brand’s hex code."
      footer={
        <Button block size="lg" disabled={!parsed} onClick={applyCustom}>
          Apply custom colour
        </Button>
      }
    >
      <Label>Presets</Label>
      <div className="grid grid-cols-6 gap-1">
        {ACCENTS.map((a) => {
          const active = accent === a.id
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                haptic()
                setAccent(a.id)
              }}
              className="pressable flex flex-col items-center gap-1.5 py-1"
            >
              <span
                className={cn(
                  'grid size-10 place-items-center rounded-full ring-offset-2 ring-offset-surface',
                  active && 'ring-2 ring-fg/80',
                )}
                style={{ background: a.swatch }}
              >
                {active && <CheckIcon size={16} weight="bold" className="text-white" />}
              </span>
              <span className={cn('text-2xs font-medium', active ? 'text-fg' : 'text-muted')}>{a.label}</span>
            </button>
          )
        })}
      </div>

      <Label className="mt-6">Custom colour</Label>
      <div className="flex items-start gap-3">
        <TextField
          className="min-w-0 flex-1"
          label="Hex code"
          prefix="#"
          value={hex}
          maxLength={6}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          hint="6 characters, e.g. E23744"
          onChange={(e) => setHex(e.target.value.replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
        />
        {/* Swatch doubles as the system colour picker. */}
        <label
          title="Pick a colour"
          className="relative grid size-14 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-line-strong bg-surface-2"
          style={parsed ? { background: parsed } : undefined}
        >
          <input
            type="color"
            aria-label="Open colour picker"
            value={parsed ?? '#000000'}
            onChange={(e) => setHex(e.target.value.slice(1).toUpperCase())}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
          <EyedropperIcon
            size={20}
            weight="bold"
            className={parsed ? undefined : 'text-muted'}
            style={parsed ? { color: readableOn(parsed) } : undefined}
          />
        </label>
      </div>
      <Preview hex={parsed} />
    </BottomSheet>
  )
}

/** How the colour will look on the main UI elements. */
function Preview({ hex }: { hex: string | null }) {
  const dark = useIsDark()
  if (!hex) {
    return <p className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm text-muted">Enter a valid hex code to preview it.</p>
  }
  const v = accentVars(hex)
  const soft = dark ? `color-mix(in oklab, ${v['--color-brand-500']} 16%, transparent)` : v['--color-brand-50']
  const softFg = dark ? v['--color-brand-300'] : v['--color-brand-700']
  return (
    <div className="mt-4 rounded-2xl border border-line p-4">
      <p className="mb-3 text-2xs font-semibold uppercase tracking-[0.08em] text-subtle">Preview</p>
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold"
          style={{ background: hex, color: v['--color-accent-fg'] }}
        >
          Book prop
        </span>
        <span
          className="inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold"
          style={{ background: soft, color: softFg }}
        >
          Selected
        </span>
        <span className="ml-auto flex flex-col items-center">
          <span className="h-[3px] w-8 rounded-b-full" style={{ background: hex }} />
          <FilmSlateIcon size={22} weight="fill" className="mt-1.5" style={{ color: hex }} />
          <span className="mt-0.5 text-2xs font-semibold" style={{ color: hex }}>
            Tab
          </span>
        </span>
      </div>
    </div>
  )
}
