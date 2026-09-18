import { CheckIcon, CreditCardIcon, PlusIcon, TrashIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { formatINR, formatINRCompact } from '@/lib/format'
import type { Side, SubPlan } from '@/lib/platform'
import { usePlatform } from '@/store/platform'
import { navigate } from '~/router'
import { Button, Segmented, Select, Switch, TextArea, TextField } from '~/ui/controls'
import { Banner, Card, PageHeader, SectionTitle, Stat, Tag } from '~/ui/display'
import { toast } from '~/ui/feedback'
import { Drawer } from '~/ui/overlays'
import { DataTable, type Column } from '~/ui/table'
import { AREA } from '../nav'

type Audience = 'all' | Side

interface PlanRow extends SubPlan {
  accounts: number
  running: number
}

/** SUBSCRIPTIONS: the plans on either side, and who is on what. */
export default function Subscriptions() {
  const plans = usePlatform((s) => s.plans)
  const accounts = usePlatform((s) => s.accounts)
  const togglePlan = usePlatform((s) => s.togglePlan)
  const [audience, setAudience] = useState<Audience>('all')
  const [editing, setEditing] = useState<SubPlan | null>(null)

  const rows: PlanRow[] = plans
    .filter((p) => audience === 'all' || p.audience === audience)
    .map((p) => ({
      ...p,
      accounts: accounts.filter((a) => a.planId === p.id).length,
      running: accounts.filter((a) => a.planId === p.id && a.subscription).length,
    }))

  const paying = accounts.filter((a) => a.subscription)
  const priceOf = (id: string) => plans.find((p) => p.id === id)?.price ?? 0
  const monthly = paying.reduce((n, a) => n + priceOf(a.planId), 0)
  const off = accounts.filter((a) => !a.subscription && priceOf(a.planId) > 0).length

  const columns: Column<PlanRow>[] = [
    { key: 'plan', header: 'Plan', cell: (p) => <span className="font-semibold text-fg">{p.name}</span> },
    { key: 'side', header: 'Side', width: 'w-28', cell: (p) => <Tag tone={p.audience === 'provider' ? 'brand' : 'neutral'}>{p.audience === 'provider' ? 'Providing' : 'Renting'}</Tag> },
    { key: 'price', header: 'Price', width: 'w-32', align: 'right', cell: (p) => (p.price ? `${formatINR(p.price)}/mo` : 'Free') },
    { key: 'accounts', header: 'Accounts', width: 'w-28', align: 'right', cell: (p) => p.accounts },
    { key: 'running', header: 'Running', width: 'w-28', align: 'right', hide: 'sm', cell: (p) => (p.price ? p.running : '—') },
    { key: 'month', header: 'A month', width: 'w-32', align: 'right', hide: 'md', cell: (p) => (p.price ? formatINR(p.price * p.running) : '—') },
  ]

  return (
    <>
      <PageHeader
        title="Subscriptions"
        subtitle={AREA.subscriptions.intent}
        actions={
          <Segmented
            value={audience}
            onChange={setAudience}
            options={[
              { value: 'all', label: 'Both apps' },
              { value: 'renter', label: 'Renting' },
              { value: 'provider', label: 'Providing' },
            ]}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Recurring revenue" value={formatINRCompact(monthly)} hint="A month" icon={CreditCardIcon} tone="success" />
        <Stat label="Paying accounts" value={paying.length} hint={`of ${accounts.length}`} icon={UsersThreeIcon} />
        <Stat label="Switched off" value={off} hint="On a paid plan, not running" icon={UsersThreeIcon} tone="warning" onClick={() => navigate('/admin/people?state=nosub')} />
        <Stat label="Plans" value={plans.length} hint={`${plans.filter((p) => p.open).length} open to sign-ups`} icon={CreditCardIcon} tone="brand" />
      </div>

      <SectionTitle className="mt-6">Plans</SectionTitle>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => (
          <Card key={p.id} className={cn('flex flex-col p-4', !p.open && 'opacity-75')}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[17px] font-bold text-fg">{p.name}</p>
                <p className="text-xs text-muted">{p.audience === 'provider' ? 'Providing' : 'Renting'}</p>
              </div>
              <span onClick={(e) => e.stopPropagation()}>
                <Switch checked={p.open} onChange={(open) => togglePlan(p.id, open)} label={`${p.name} open to sign-ups`} size="sm" />
              </span>
            </div>
            <p className="mt-2">
              <span className="font-display text-2xl font-extrabold tabular-nums text-fg">{p.price ? formatINR(p.price) : 'Free'}</span>
              {p.price > 0 && <span className="text-[13px] text-muted"> a month</span>}
            </p>
            <p className="mt-1 text-[13px] text-fg-2">{p.blurb}</p>
            <ul className="mt-3 flex-1 space-y-1">
              {p.unlocks.map((u) => (
                <li key={u} className="flex items-start gap-1.5 text-[13px] text-fg-2">
                  <CheckIcon size={13} weight="bold" className="mt-0.5 shrink-0 text-success" />
                  {u}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
              <span className="text-[13px] text-muted">
                <span className="font-bold text-fg">{p.accounts}</span> on this plan
                {p.price > 0 && <> · {p.running} running</>}
              </span>
              <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>
                Edit
              </Button>
            </div>
            {!p.open && <p className="mt-2 text-xs text-warning">Closed to new sign-ups. The accounts on it are untouched.</p>}
          </Card>
        ))}
      </div>

      <SectionTitle className="mt-6">Who is on what</SectionTitle>
      <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} activeKey={editing?.id} onRow={(p) => setEditing(p)} empty={{ icon: CreditCardIcon, title: 'No plans on this side', description: 'Switch the audience above.' }} />

      <PlanDrawer key={editing?.id ?? 'none'} plan={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function PlanDrawer({ plan, onClose }: { plan: SubPlan | null; onClose: () => void }) {
  const save = usePlatform((s) => s.savePlan)
  const accounts = usePlatform((s) => s.accounts)
  const [draft, setDraft] = useState<SubPlan | null>(plan)
  if (!plan || !draft) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>

  const set = (patch: Partial<SubPlan>) => setDraft({ ...draft, ...patch })
  const on = accounts.filter((a) => a.planId === draft.id).length

  return (
    <Drawer
      open
      onClose={onClose}
      title={draft.name}
      subtitle={`${on} account${on === 1 ? '' : 's'} on this plan`}
      footer={
        <>
          <Button
            disabled={!draft.name.trim()}
            onClick={() => {
              save(draft)
              toast(`${draft.name} saved`, { tone: 'success' })
              onClose()
            }}
          >
            Save the plan
          </Button>
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Name" value={draft.name} onChange={(e) => set({ name: e.currentTarget.value })} />
        <TextField label="Price a month" type="number" min={0} prefix="₹" value={draft.price} onChange={(e) => set({ price: Number(e.currentTarget.value) })} />
        <Select className="col-span-2" label="Who it is for" value={draft.audience} onChange={(e) => set({ audience: e.currentTarget.value as Side })}>
          <option value="renter">Renting</option>
          <option value="provider">Providing</option>
        </Select>
        <TextArea className="col-span-2" label="One line" rows={2} value={draft.blurb} onChange={(e) => set({ blurb: e.currentTarget.value })} />
      </div>

      <SectionTitle className="mt-5">What it unlocks</SectionTitle>
      <div className="space-y-2">
        {draft.unlocks.map((u, i) => (
          <div key={i} className="flex items-center gap-2">
            <TextField className="flex-1" value={u} onChange={(e) => set({ unlocks: draft.unlocks.map((x, j) => (j === i ? e.currentTarget.value : x)) })} />
            <Button variant="ghost" size="sm" icon={TrashIcon} aria-label="Remove this line" onClick={() => set({ unlocks: draft.unlocks.filter((_, j) => j !== i) })} />
          </div>
        ))}
        <Button variant="secondary" size="sm" icon={PlusIcon} onClick={() => set({ unlocks: [...draft.unlocks, ''] })}>
          Add a line
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-fg">Open to new sign-ups</p>
          <p className="text-xs text-muted">Closing it leaves the accounts on it alone.</p>
        </div>
        <Switch checked={draft.open} onChange={(open) => set({ open })} label="Open to new sign-ups" />
      </div>

      <Banner tone="neutral" className="mt-4">
        The phone apps read this on their Plan page, on whichever side the plan is for.
      </Banner>
    </Drawer>
  )
}
