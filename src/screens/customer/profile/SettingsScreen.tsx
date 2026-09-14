import {
  DeviceMobileIcon,
  FileTextIcon,
  InfoIcon,
  MoonIcon,
  PaletteIcon,
  RulerIcon,
  ShieldCheckIcon,
  TranslateIcon,
} from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { ACCENTS } from '@/app/config'
import { useIsDark } from '@/app/theme'
import { LANGUAGES, NOTIFICATION_TYPES } from '@/data/profile'
import { formatDistance, formatSize } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { usePrefs } from '@/store/prefs'
import { AppBar, ListGroup, ListItem, OptionList, Screen, Segmented } from '@/ui'
import { AppColourSheet } from '../../shared/AppColourSheet'

/** Settings → Notifications · Units · Language (plus appearance and about). */
export default function SettingsScreen() {
  const popup = usePopup()
  const prefs = usePrefs()
  const dark = useIsDark()
  const [languageOpen, setLanguageOpen] = useState(false)
  const [colour, setColour] = useState({ key: 0, open: false })
  const language = LANGUAGES.find((l) => l.id === prefs.language) ?? LANGUAGES[0]
  const enabled = NOTIFICATION_TYPES.filter((n) => prefs.notifications[n.id]).length
  const swatch = prefs.accent === 'custom' ? prefs.customAccent : ACCENTS.find((a) => a.id === prefs.accent)?.swatch
  const accentLabel = prefs.accent === 'custom' ? prefs.customAccent.toUpperCase() : ACCENTS.find((a) => a.id === prefs.accent)?.label

  const soon = (what: string) => popup.toast(`${what} opens in the browser in the full app`, { tone: 'info' })

  return (
    <Screen header={<AppBar title="Settings" />}>
      <div className="space-y-6 pb-10 pt-2 @medium:mx-auto @medium:max-w-2xl">
        {/* Notifications */}
        <ListGroup title="Notifications" footer={`${enabled} of ${NOTIFICATION_TYPES.length} on. Booking and delivery alerts also come by SMS.`}>
          {NOTIFICATION_TYPES.map((n) => (
            <ListItem
              key={n.id}
              title={n.label}
              subtitle={n.description}
              toggle={{ checked: !!prefs.notifications[n.id], onChange: (on) => prefs.setNotification(n.id, on) }}
            />
          ))}
        </ListGroup>

        {/* Units */}
        <section className="px-4">
          <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">Units</h3>
          <div className="space-y-4 rounded-2xl bg-surface p-4 shadow-card">
            <UnitRow label="Distance">
              <Segmented
                options={[
                  { value: 'km', label: 'Kilometres' },
                  { value: 'mi', label: 'Miles' },
                ]}
                value={prefs.distanceUnit}
                onChange={(v) => {
                  haptic()
                  prefs.setUnitsPref({ distanceUnit: v })
                }}
              />
            </UnitRow>
            <UnitRow label="Prop sizes">
              <Segmented
                options={[
                  { value: 'cm', label: 'Centimetres' },
                  { value: 'in', label: 'Inches' },
                ]}
                value={prefs.sizeUnit}
                onChange={(v) => {
                  haptic()
                  prefs.setUnitsPref({ sizeUnit: v })
                }}
              />
            </UnitRow>
            <div className="flex items-start gap-3 rounded-xl bg-surface-2 px-3.5 py-3">
              <RulerIcon size={18} className="mt-0.5 shrink-0 text-muted" />
              <div className="min-w-0 text-[13px] leading-relaxed text-fg-2">
                <p>
                  Kapoor Props is <span className="font-semibold text-fg">{formatDistance(2.4)}</span> away
                </p>
                <p>
                  A Chesterfield sofa is <span className="font-semibold text-fg">{formatSize([180, 80, 85])}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Language */}
        <ListGroup title="Language">
          <ListItem icon={TranslateIcon} title="App language" value={language.native} onClick={() => setLanguageOpen(true)} />
        </ListGroup>

        {/* Appearance */}
        <ListGroup title="Appearance">
          <ListItem
            icon={MoonIcon}
            title="Dark theme"
            subtitle={prefs.theme === 'system' ? 'Following your device' : 'Easier on the eyes at night'}
            toggle={{ checked: dark, onChange: (on) => prefs.setTheme(on ? 'dark' : 'light') }}
          />
          <ListItem
            icon={DeviceMobileIcon}
            title="Match device"
            subtitle="Switch with your phone’s setting"
            toggle={{ checked: prefs.theme === 'system', onChange: (on) => prefs.setTheme(on ? 'system' : dark ? 'dark' : 'light') }}
          />
          <ListItem
            icon={PaletteIcon}
            title="App colour"
            value={accentLabel}
            trailing={<span className="size-5 shrink-0 rounded-full ring-2 ring-surface-2" style={{ background: swatch }} />}
            chevron
            onClick={() => setColour((s) => ({ key: s.key + 1, open: true }))}
          />
        </ListGroup>

        {/* About */}
        <ListGroup title="About">
          <ListItem icon={FileTextIcon} title="Terms of service" onClick={() => soon('Terms of service')} />
          <ListItem icon={ShieldCheckIcon} title="Privacy policy" onClick={() => soon('Privacy policy')} />
          <ListItem icon={InfoIcon} title="App version" value="1.0 · prototype" />
        </ListGroup>
      </div>

      <BottomSheet open={languageOpen} onClose={() => setLanguageOpen(false)} title="App language" description="Labels, messages and invoices">
        <OptionList
          options={LANGUAGES.map((l) => ({ value: l.id, label: l.native, description: l.name === l.native ? undefined : l.name }))}
          value={prefs.language}
          onSelect={(id) => {
            prefs.setLanguage(id)
            setLanguageOpen(false)
            const picked = LANGUAGES.find((l) => l.id === id)!
            popup.toast(id === 'en' ? 'Language set to English' : `${picked.name} selected · the prototype shows English for now`, { tone: 'success' })
          }}
        />
      </BottomSheet>
      <AppColourSheet key={colour.key} open={colour.open} onClose={() => setColour((s) => ({ ...s, open: false }))} />
    </Screen>
  )
}

function UnitRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[15px] font-medium text-fg">{label}</p>
      {children}
    </div>
  )
}
