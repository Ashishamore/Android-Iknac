import { LightningIcon, ProhibitIcon, SparkleIcon, TruckIcon, UserPlusIcon, WrenchIcon, type Icon } from '@phosphor-icons/react'
import { useState } from 'react'
import { MaintenanceStrip } from '@/components/platform/Promo'
import { cn } from '@/lib/cn'
import { FLAG_META, type FlagKey } from '@/lib/platform'
import { usePlatform } from '@/store/platform'
import { Button, Switch, TextArea } from '~/ui/controls'
import { Banner, Card, CardHeader, PageHeader, SectionTitle, Tag } from '~/ui/display'
import { toast } from '~/ui/feedback'
import { AREA } from '../nav'

const ICON: Record<FlagKey, Icon> = {
  aiStudio: SparkleIcon,
  transport: TruckIcon,
  instantBooking: LightningIcon,
  signups: UserPlusIcon,
  maintenance: WrenchIcon,
}

/** FEATURE FLAGS: switches that change what the apps show, right now. */
export default function Flags() {
  const flags = usePlatform((s) => s.flags)
  const setFlag = usePlatform((s) => s.setFlag)
  const maintenanceText = usePlatform((s) => s.maintenanceText)
  const setMaintenanceText = usePlatform((s) => s.setMaintenanceText)
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? maintenanceText
  const off = FLAG_META.filter((f) => f.id !== 'maintenance' && f.id !== 'instantBooking' && !flags[f.id])

  return (
    <>
      <PageHeader title="Feature flags" subtitle={AREA.flags.intent} />

      <Banner tone="warning" icon={LightningIcon} className="mb-4">
        These take effect the moment you switch them. An open renter or provider app changes under whoever is holding it.
      </Banner>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {FLAG_META.map((f) => {
          const on = flags[f.id]
          const FIcon = ICON[f.id]
          return (
            <Card key={f.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', on ? 'bg-accent-soft text-accent-soft-fg' : 'bg-surface-2 text-muted')}>
                  <FIcon size={18} weight="bold" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-fg">{f.label}</p>
                    <Tag tone={on ? 'success' : 'neutral'}>{on ? 'On' : 'Off'}</Tag>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-fg-2">{on ? f.on : f.off}</p>
                </div>
                <Switch
                  checked={on}
                  onChange={(next) => {
                    setFlag(f.id, next)
                    toast(`${f.label} ${next ? 'on' : 'off'}`, { tone: 'success' })
                  }}
                  label={f.label}
                />
              </div>
              <p className="mt-2 border-t border-line pt-2 text-xs text-muted">{on ? f.off : f.on}</p>
            </Card>
          )
        })}
      </div>

      <SectionTitle className="mt-6">Maintenance wording</SectionTitle>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
        <Card className="p-4">
          <TextArea label="The sentence shown" rows={3} value={text} onChange={(e) => setDraft(e.currentTarget.value)} hint="Plain, and specific about the time. It sits above everything in both apps." />
          <div className="mt-3 flex items-center gap-2">
            <Button
              disabled={text === maintenanceText || !text.trim()}
              onClick={() => {
                setMaintenanceText(text.trim())
                setDraft(null)
                toast('Wording saved', { tone: 'success' })
              }}
            >
              Save the wording
            </Button>
            {draft !== null && text !== maintenanceText && (
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            )}
            {!flags.maintenance && <p className="text-xs text-muted">The notice is off, so nobody sees this yet.</p>}
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Preview" subtitle="At the top of both apps" icon={WrenchIcon} />
          <div className="rounded-b-xl bg-bg p-4">
            <div className="mx-auto w-[344px] max-w-full overflow-hidden rounded-2xl border border-line bg-surface">
              <MaintenanceStrip text={text} />
              <div className="h-20 bg-bg px-4 py-3">
                <p className="text-[13px] font-semibold text-fg">Hi, Rohan</p>
                <p className="text-xs text-muted">The app carries on underneath.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <SectionTitle className="mt-6">What is currently off</SectionTitle>
      <Card className="overflow-hidden">
        {off.length === 0 && !flags.maintenance && !flags.instantBooking ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">Everything is on, and no notice is up. The apps are as built.</p>
        ) : (
          <>
            {off.map((f) => (
              <div key={f.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                <ProhibitIcon size={16} className="shrink-0 text-danger" />
                <span className="min-w-0 flex-1 text-[13px]">
                  <span className="font-semibold text-fg">{f.label}</span> <span className="text-fg-2">— {f.off}</span>
                </span>
                <Button size="sm" variant="secondary" onClick={() => setFlag(f.id, true)}>
                  Switch it back on
                </Button>
              </div>
            ))}
            {flags.instantBooking && (
              <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                <LightningIcon size={16} className="shrink-0 text-warning" />
                <span className="min-w-0 flex-1 text-[13px]">
                  <span className="font-semibold text-fg">Instant booking</span> <span className="text-fg-2">— bookings confirm outright instead of waiting on the provider.</span>
                </span>
                <Button size="sm" variant="secondary" onClick={() => setFlag('instantBooking', false)}>
                  Switch it off
                </Button>
              </div>
            )}
            {flags.maintenance && (
              <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                <WrenchIcon size={16} className="shrink-0 text-warning" />
                <span className="min-w-0 flex-1 text-[13px]">
                  <span className="font-semibold text-fg">Maintenance notice</span> <span className="text-fg-2">— a strip is up at the top of both apps.</span>
                </span>
                <Button size="sm" variant="secondary" onClick={() => setFlag('maintenance', false)}>
                  Take it down
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  )
}
