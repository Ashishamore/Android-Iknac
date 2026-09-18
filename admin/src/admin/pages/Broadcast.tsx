import { BroadcastIcon, PaperPlaneTiltIcon, TrashIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { BroadcastStrip } from '@/components/platform/Promo'
import { timeAgo } from '@/lib/dates'
import { useNow } from '@/lib/hooks'
import { APP_LABEL, type BroadcastApp, type BroadcastTone } from '@/lib/platform'
import { usePlatform } from '@/store/platform'
import { Button, Segmented, Select, TextArea, TextField } from '~/ui/controls'
import { Banner, Card, CardHeader, PageHeader, SectionTitle, Tag } from '~/ui/display'
import { confirm, toast } from '~/ui/feedback'
import { AREA } from '../nav'

const ROUTES: Record<BroadcastApp, { to: string; label: string }[]> = {
  renter: [
    { to: '/customer/discover', label: 'Discover' },
    { to: '/customer/projects', label: 'Projects' },
    { to: '/customer/profile/plan', label: 'Profile → Plan' },
    { to: '/customer/profile/help', label: 'Help & support' },
  ],
  provider: [
    { to: '/renter/profile/payouts', label: 'Payouts' },
    { to: '/renter/stock', label: 'Stock' },
    { to: '/renter/profile/plan', label: 'Plan' },
    { to: '/renter/profile/help', label: 'Help & settings' },
  ],
  both: [
    { to: '/customer/profile/help', label: 'Help (renters)' },
    { to: '/renter/profile/help', label: 'Help (providers)' },
  ],
}

/** BROADCAST: a strip at the top of an app, to everyone using it. */
export default function Broadcast() {
  const accounts = usePlatform((s) => s.accounts)
  const broadcasts = usePlatform((s) => s.broadcasts)
  const send = usePlatform((s) => s.sendBroadcast)
  const pull = usePlatform((s) => s.pullBroadcast)
  const remove = usePlatform((s) => s.deleteBroadcast)
  const now = useNow(60_000).getTime()

  const [app, setApp] = useState<BroadcastApp>('renter')
  const [tone, setTone] = useState<BroadcastTone>('notice')
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [withButton, setWithButton] = useState(false)
  const [label, setLabel] = useState('Have a look')
  const [to, setTo] = useState(ROUTES.renter[0].to)

  const audience = app === 'both' ? accounts.length : accounts.filter((a) => (app === 'renter' ? a.side === 'renter' : a.side === 'provider')).length
  const ready = headline.trim().length > 2 && body.trim().length > 2
  const preview = { tone, headline, body, button: withButton ? { label, to } : null }

  const doSend = async () => {
    const ok = await confirm({
      title: `Send to ${audience} accounts?`,
      message: `It goes up at the top of ${APP_LABEL[app].toLowerCase()} until someone pulls it.`,
      confirmText: 'Send it',
      icon: PaperPlaneTiltIcon,
    })
    if (!ok) return
    send({ app, tone, headline: headline.trim(), body: body.trim(), button: withButton ? { label, to } : null, audience })
    setHeadline('')
    setBody('')
    toast(`Up at the top of ${APP_LABEL[app].toLowerCase()}`, { tone: 'success' })
  }

  return (
    <>
      <PageHeader title="Broadcast" subtitle={AREA.broadcast.intent} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader title="Say something" subtitle={`It will reach ${audience} accounts`} icon={BroadcastIcon} />
          <div className="space-y-3 px-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Which app"
                value={app}
                onChange={(e) => {
                  const next = e.currentTarget.value as BroadcastApp
                  setApp(next)
                  setTo(ROUTES[next][0].to)
                }}
              >
                <option value="renter">The renter app</option>
                <option value="provider">The provider app</option>
                <option value="both">Both apps</option>
              </Select>
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-fg-2">Tone</p>
                <Segmented
                  value={tone}
                  onChange={setTone}
                  options={[
                    { value: 'notice', label: 'Notice' },
                    { value: 'warning', label: 'Warning' },
                  ]}
                />
              </div>
            </div>
            <TextField label="Headline" value={headline} onChange={(e) => setHeadline(e.currentTarget.value)} placeholder="Payouts move to Thursdays" maxLength={60} hint={`${headline.length}/60 — it has to fit one line on a phone`} />
            <TextArea label="Body" rows={3} value={body} onChange={(e) => setBody(e.currentTarget.value)} placeholder="What changes, and when." maxLength={200} />

            <div className="rounded-xl border border-line px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-fg">
                <input type="checkbox" checked={withButton} onChange={(e) => setWithButton(e.currentTarget.checked)} className="size-4 accent-[var(--color-accent)]" />
                Add a button
              </label>
              {withButton && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <TextField label="Button label" value={label} onChange={(e) => setLabel(e.currentTarget.value)} />
                  <Select label="Where it goes" value={to} onChange={(e) => setTo(e.currentTarget.value)}>
                    {ROUTES[app].map((r) => (
                      <option key={r.to} value={r.to}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            <Button icon={PaperPlaneTiltIcon} disabled={!ready} onClick={doSend}>
              Send it to {audience} accounts
            </Button>
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Preview" subtitle="The strip as it appears at the top of the app" icon={BroadcastIcon} />
          <div className="rounded-b-xl bg-bg p-4">
            <div className="mx-auto w-[344px] max-w-full overflow-hidden rounded-2xl border border-line bg-surface">
              <BroadcastStrip broadcast={preview} />
              <div className="h-24 bg-bg px-4 py-3">
                <p className="text-[13px] font-semibold text-fg">Hi, Rohan</p>
                <p className="text-xs text-muted">The app carries on underneath.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <SectionTitle className="mt-6">Sent</SectionTitle>
      <Card className="overflow-hidden">
        {broadcasts.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">Nothing has been sent yet.</p>
        ) : (
          broadcasts.map((b) => (
            <div key={b.id} className="flex flex-wrap items-start gap-3 border-b border-line px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1 basis-64">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 truncate text-[13px] font-bold text-fg">{b.headline}</p>
                  <Tag tone={b.up ? 'success' : 'neutral'}>{b.up ? 'Up now' : 'Pulled'}</Tag>
                  {b.tone === 'warning' && <Tag tone="danger">Warning</Tag>}
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-fg-2">{b.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {APP_LABEL[b.app]} · {b.audience} accounts · reached {b.reached} · {timeAgo(b.sentAt, now)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {b.up && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      pull(b.id)
                      toast('Pulled from the top of the app')
                    }}
                  >
                    Pull
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  icon={TrashIcon}
                  onClick={async () => {
                    if (!(await confirm({ title: 'Delete this broadcast?', message: 'It goes from this list. The audit log keeps that it was sent.', confirmText: 'Delete', tone: 'danger', icon: TrashIcon }))) return
                    remove(b.id)
                    toast('Deleted')
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Banner tone="neutral" className="mt-4">
        One broadcast is up per app at a time. Sending a new one takes the old one down.
      </Banner>
    </>
  )
}
