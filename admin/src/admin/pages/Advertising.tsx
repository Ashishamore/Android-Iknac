import { CursorClickIcon, EyeIcon, MegaphoneIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { CampaignCard, CampaignStrip } from '@/components/platform/Promo'
import { PROPS, VENDORS } from '@/data/props'
import { addDays, formatDayShort, todayISO } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { CAMPAIGN_STATE, campaignState, SLOTS, tapRate, type Campaign, type Slot } from '@/lib/platform'
import { newId, usePlatform } from '@/store/platform'
import { Button, Select, Switch, TextArea, TextField } from '~/ui/controls'
import { Banner, Card, PageHeader, SectionTitle, Stat, Tag } from '~/ui/display'
import { confirm, toast } from '~/ui/feedback'
import { Drawer } from '~/ui/overlays'
import { DataTable, TwoLine, type Column } from '~/ui/table'
import { AREA } from '../nav'

const ROUTES: Record<Slot, { to: string; label: string }[]> = {
  'renter-home': [
    { to: '/customer/discover', label: 'Discover' },
    { to: '/customer/trending', label: 'Trending props' },
    { to: '/customer/ai-studio', label: 'AI Studio' },
    { to: '/customer/projects', label: 'Projects' },
    { to: '/customer/profile/plan', label: 'Profile → Plan' },
    ...VENDORS.map((v) => ({ to: `/customer/vendors/${v.id}`, label: `Vendor · ${v.name}` })),
  ],
  'provider-today': [
    { to: '/renter/profile/promote', label: 'Promote' },
    { to: '/renter/profile/plan', label: 'Plan' },
    { to: '/renter/add', label: 'Add stock' },
    { to: '/renter/stock', label: 'Stock' },
    { to: '/renter/profile/payouts', label: 'Payouts' },
  ],
}

const blank = (): Campaign => ({
  id: newId('cm'),
  name: '',
  slot: 'renter-home',
  headline: '',
  sub: '',
  button: 'Have a look',
  propId: null,
  to: '/customer/discover',
  starts: todayISO(),
  ends: addDays(todayISO(), 30),
  priority: 5,
  sponsored: true,
  ratePerDay: 1000,
  shown: 0,
  taps: 0,
  live: true,
})

/** ADVERTISING: paid and house campaigns, in the two slots the apps have. */
export default function Advertising() {
  const campaigns = usePlatform((s) => s.campaigns)
  const toggle = usePlatform((s) => s.toggleCampaign)
  const today = todayISO()
  const [editing, setEditing] = useState<Campaign | null>(null)

  const live = campaigns.filter((c) => campaignState(c, today) === 'running')
  const shown = campaigns.reduce((n, c) => n + c.shown, 0)
  const taps = campaigns.reduce((n, c) => n + c.taps, 0)
  const revenue = live.filter((c) => c.sponsored).reduce((n, c) => n + c.ratePerDay, 0)

  const columns: Column<Campaign>[] = [
    { key: 'name', header: 'Campaign', cell: (c) => <TwoLine top={c.name || 'Untitled'} bottom={c.headline} /> },
    { key: 'slot', header: 'Slot', width: 'w-36', hide: 'sm', cell: (c) => SLOTS.find((s) => s.id === c.slot)?.label },
    { key: 'priority', header: 'Priority', width: 'w-20', align: 'right', hide: 'lg', cell: (c) => c.priority },
    { key: 'runs', header: 'Runs', width: 'w-44', hide: 'lg', cell: (c) => <TwoLine top={formatDayShort(c.starts)} bottom={`to ${formatDayShort(c.ends)}`} /> },
    { key: 'shown', header: 'Shown', width: 'w-24', align: 'right', hide: 'md', cell: (c) => c.shown.toLocaleString('en-IN') },
    { key: 'taps', header: 'Taps', width: 'w-28', align: 'right', hide: 'md', cell: (c) => `${c.taps.toLocaleString('en-IN')} · ${tapRate(c).toFixed(1)}%` },
    { key: 'rate', header: 'A day', width: 'w-24', align: 'right', hide: 'sm', cell: (c) => (c.sponsored ? formatINR(c.ratePerDay) : <span className="text-muted">House</span>) },
    { key: 'state', header: 'State', width: 'w-28', cell: (c) => <Tag tone={CAMPAIGN_STATE[campaignState(c, today)].tone}>{CAMPAIGN_STATE[campaignState(c, today)].label}</Tag> },
    {
      key: 'live',
      header: 'On',
      width: 'w-16',
      align: 'right',
      cell: (c) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Switch checked={c.live} onChange={(on) => toggle(c.id, on)} label={`${c.name} live`} size="sm" />
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Advertising"
        subtitle={AREA.ads.intent}
        actions={
          <Button icon={PlusIcon} onClick={() => setEditing(blank())}>
            New campaign
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Live now" value={live.length} hint={`of ${campaigns.length} campaigns`} icon={MegaphoneIcon} />
        <Stat label="Revenue a day" value={formatINR(revenue)} hint="Paid placements only" icon={MegaphoneIcon} tone="success" />
        <Stat label="Shown" value={shown.toLocaleString('en-IN')} hint="All time" icon={EyeIcon} tone="info" />
        <Stat label="Tapped" value={`${taps.toLocaleString('en-IN')}`} hint={`${shown ? ((taps / shown) * 100).toFixed(1) : '0'}% of the time`} icon={CursorClickIcon} tone="brand" />
      </div>

      <SectionTitle className="mt-6">Slots</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SLOTS.map((s) => {
          const running = live.filter((c) => c.slot === s.id).sort((a, b) => b.priority - a.priority)
          return (
            <Card key={s.id} className="p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-fg">{s.label}</p>
                  <p className="text-xs text-muted">{s.where}</p>
                </div>
                <Tag tone={running.length ? 'success' : 'neutral'}>{running.length ? `${running.length} running` : 'Empty'}</Tag>
              </div>
              {running[0] && <p className="mt-2 text-[13px] text-fg-2">Showing now: {running[0].name}{running.length > 1 ? `, then ${running.length - 1} more by priority` : ''}</p>}
            </Card>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Only what is built can be booked. New slots need a place in the app first.</p>

      <SectionTitle className="mt-6">Campaigns</SectionTitle>
      <DataTable
        columns={columns}
        rows={campaigns}
        rowKey={(c) => c.id}
        activeKey={editing?.id}
        onRow={(c) => setEditing(c)}
        empty={{ icon: MegaphoneIcon, title: 'No campaigns', description: 'A campaign fills one of the two slots above.', action: <Button onClick={() => setEditing(blank())}>New campaign</Button> }}
      />

      <CampaignDrawer key={editing?.id ?? 'none'} campaign={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function CampaignDrawer({ campaign, onClose }: { campaign: Campaign | null; onClose: () => void }) {
  const campaigns = usePlatform((s) => s.campaigns)
  const save = usePlatform((s) => s.saveCampaign)
  const remove = usePlatform((s) => s.deleteCampaign)
  const [draft, setDraft] = useState<Campaign | null>(campaign)
  if (!campaign || !draft) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>

  const isNew = !campaigns.some((c) => c.id === campaign.id)
  const set = (patch: Partial<Campaign>) => setDraft({ ...draft, ...patch })
  const ready = draft.name.trim() && draft.headline.trim() && draft.ends >= draft.starts

  return (
    <Drawer
      open
      onClose={onClose}
      title={isNew ? 'New campaign' : draft.name || 'Campaign'}
      subtitle={SLOTS.find((s) => s.id === draft.slot)?.where}
      width="max-w-[620px]"
      footer={
        <>
          <Button
            disabled={!ready}
            onClick={() => {
              save(draft)
              toast(isNew ? `${draft.name} created` : `${draft.name} saved`, { tone: 'success' })
              onClose()
            }}
          >
            {isNew ? 'Create the campaign' : 'Save the campaign'}
          </Button>
          {!isNew && (
            <Button
              variant="danger-ghost"
              icon={TrashIcon}
              onClick={async () => {
                if (!(await confirm({ title: `Delete ${draft.name}?`, message: 'It stops showing straight away, and its numbers go with it.', confirmText: 'Delete', tone: 'danger', icon: TrashIcon }))) return
                remove(draft.id)
                toast(`${draft.name} deleted`)
                onClose()
              }}
            >
              Delete
            </Button>
          )}
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <SectionTitle>How it looks, at phone width</SectionTitle>
      <div className="rounded-2xl border border-line bg-bg p-4">
        <div className="mx-auto w-[344px] max-w-full">{draft.slot === 'renter-home' ? <CampaignCard campaign={draft} /> : <CampaignStrip campaign={draft} />}</div>
      </div>

      <SectionTitle className="mt-5">What it says</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <TextField className="col-span-2" label="Campaign name" value={draft.name} onChange={(e) => set({ name: e.currentTarget.value })} placeholder="Classic Wheels · festive" hint="For this table only. Nobody on a phone sees it." />
        <Select
          label="Slot"
          value={draft.slot}
          onChange={(e) => {
            const slot = e.currentTarget.value as Slot
            set({ slot, to: ROUTES[slot][0].to })
          }}
        >
          {SLOTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
        <TextField label="Button" value={draft.button} onChange={(e) => set({ button: e.currentTarget.value })} placeholder="See the cars" />
        <TextField className="col-span-2" label="Headline" value={draft.headline} onChange={(e) => set({ headline: e.currentTarget.value })} placeholder="Hero cars, booked by the day" />
        <TextArea className="col-span-2" label="Underneath" rows={2} value={draft.sub} onChange={(e) => set({ sub: e.currentTarget.value })} placeholder="One line about what it is" />
      </div>

      <SectionTitle className="mt-5">Where it points</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Picture" value={draft.propId ?? ''} onChange={(e) => set({ propId: e.currentTarget.value || null })} hint="A listing's plate">
          <option value="">No picture</option>
          {PROPS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select label="Goes to" value={draft.to} onChange={(e) => set({ to: e.currentTarget.value })}>
          {ROUTES[draft.slot].map((r) => (
            <option key={r.to} value={r.to}>
              {r.label}
            </option>
          ))}
          {!ROUTES[draft.slot].some((r) => r.to === draft.to) && <option value={draft.to}>{draft.to}</option>}
        </Select>
      </div>

      <SectionTitle className="mt-5">When, and how hard</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Starts" type="date" value={draft.starts} onChange={(e) => set({ starts: e.currentTarget.value })} />
        <TextField label="Ends" type="date" value={draft.ends} onChange={(e) => set({ ends: e.currentTarget.value })} error={draft.ends < draft.starts ? 'Before it starts' : undefined} />
        <TextField className="col-span-2" label="Priority" type="number" min={1} max={10} value={draft.priority} onChange={(e) => set({ priority: Number(e.currentTarget.value) })} hint="Higher runs first when two campaigns share a slot." />
      </div>

      <div className="mt-4 rounded-xl border border-line px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-fg">Paid placement</p>
            <p className="text-xs text-muted">Prints “Sponsored” on the card, and bills a rate per day.</p>
          </div>
          <Switch checked={draft.sponsored} onChange={(sponsored) => set({ sponsored })} label="Paid placement" />
        </div>
        {draft.sponsored && <TextField className="mt-3" label="Rate a day" type="number" min={0} prefix="₹" value={draft.ratePerDay} onChange={(e) => set({ ratePerDay: Number(e.currentTarget.value) })} />}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-fg">Live</p>
          <p className="text-xs text-muted">Off takes it out of the slot, and keeps the numbers.</p>
        </div>
        <Switch checked={draft.live} onChange={(live) => set({ live })} label="Live" />
      </div>

      {!isNew && (
        <Banner tone="neutral" className="mt-4">
          Shown {draft.shown.toLocaleString('en-IN')} times, tapped {draft.taps.toLocaleString('en-IN')} — {tapRate(draft).toFixed(1)}% of the time.
        </Banner>
      )}
    </Drawer>
  )
}
