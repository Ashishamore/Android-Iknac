import { PlusIcon, TicketIcon, TrashIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { CATEGORIES, type Category } from '@/data/props'
import { addDays, formatDayShort, todayISO } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { COUPON_AUDIENCE, COUPON_SCOPE, COUPON_STATE, couponSentence, couponState, type Coupon, type CouponAudience, type CouponScope } from '@/lib/platform'
import { newId, usePlatform } from '@/store/platform'
import { Button, Segmented, Select, Switch, TextArea, TextField } from '~/ui/controls'
import { Banner, Card, KV, PageHeader, ProgressBar, SectionTitle, Tag } from '~/ui/display'
import { confirm, toast } from '~/ui/feedback'
import { Drawer } from '~/ui/overlays'
import { DataTable, TwoLine, type Column } from '~/ui/table'
import { AREA } from '../nav'

const blank = (): Coupon => ({
  id: newId('cp'),
  code: '',
  kind: 'percent',
  value: 10,
  ceiling: 2000,
  minOrder: 5000,
  audience: 'renters',
  scope: 'any',
  category: null,
  starts: todayISO(),
  ends: addDays(todayISO(), 30),
  totalUses: 200,
  perAccount: 1,
  used: 0,
  note: '',
  live: true,
})

/** COUPONS: codes, who they are for, and what they take off. */
export default function Coupons() {
  const coupons = usePlatform((s) => s.coupons)
  const toggleCoupon = usePlatform((s) => s.toggleCoupon)
  const today = todayISO()
  const [editing, setEditing] = useState<Coupon | null>(null)

  const columns: Column<Coupon>[] = [
    { key: 'code', header: 'Code', width: 'w-36', cell: (c) => <span className="font-mono text-[13px] font-bold tracking-wide text-fg">{c.code}</span> },
    { key: 'what', header: 'What it does', cell: (c) => <span className="text-fg-2">{couponSentence(c, formatINR)}</span> },
    { key: 'for', header: 'For', width: 'w-24', hide: 'sm', cell: (c) => COUPON_AUDIENCE[c.audience] },
    { key: 'runs', header: 'Runs', width: 'w-44', hide: 'lg', cell: (c) => <TwoLine top={formatDayShort(c.starts)} bottom={`to ${formatDayShort(c.ends)}`} /> },
    {
      key: 'used',
      header: 'Used / limit',
      width: 'w-32',
      hide: 'md',
      cell: (c) => (
        <span className="block">
          <span className="tabular-nums">
            {c.used} / {c.totalUses}
          </span>
          <ProgressBar value={(c.used / c.totalUses) * 100} tone={c.used >= c.totalUses ? 'warning' : 'brand'} className="mt-1" />
        </span>
      ),
    },
    { key: 'state', header: 'State', width: 'w-32', cell: (c) => <Tag tone={COUPON_STATE[couponState(c, today)].tone}>{COUPON_STATE[couponState(c, today)].label}</Tag> },
    {
      key: 'live',
      header: 'On',
      width: 'w-16',
      align: 'right',
      cell: (c) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Switch checked={c.live} onChange={(on) => toggleCoupon(c.id, on)} label={`${c.code} live`} size="sm" />
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Coupons"
        subtitle={AREA.coupons.intent}
        actions={
          <Button icon={PlusIcon} onClick={() => setEditing(blank())}>
            New coupon
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={coupons}
        rowKey={(c) => c.id}
        activeKey={editing?.id}
        onRow={(c) => setEditing(c)}
        empty={{ icon: TicketIcon, title: 'No coupons yet', description: 'A code takes an amount off at checkout.', action: <Button onClick={() => setEditing(blank())}>New coupon</Button> }}
      />
      <CouponDrawer key={editing?.id ?? 'none'} coupon={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function CouponDrawer({ coupon, onClose }: { coupon: Coupon | null; onClose: () => void }) {
  const coupons = usePlatform((s) => s.coupons)
  const save = usePlatform((s) => s.saveCoupon)
  const remove = usePlatform((s) => s.deleteCoupon)
  const [draft, setDraft] = useState<Coupon | null>(coupon)
  if (!coupon || !draft) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>

  const isNew = !coupons.some((c) => c.id === coupon.id)
  const set = (patch: Partial<Coupon>) => setDraft({ ...draft, ...patch })
  const clash = coupons.some((c) => c.id !== draft.id && c.code === draft.code)
  const error = !draft.code ? 'A code is needed' : clash ? 'That code is already in use' : draft.ends < draft.starts ? 'It ends before it starts' : ''

  return (
    <Drawer
      open
      onClose={onClose}
      title={isNew ? 'New coupon' : draft.code || 'Coupon'}
      subtitle={isNew ? 'Checkout does not take a code yet — this is the rule it would read.' : `Used ${draft.used} of ${draft.totalUses}`}
      width="max-w-[560px]"
      footer={
        <>
          <Button
            disabled={!!error}
            onClick={() => {
              save(draft)
              toast(isNew ? `${draft.code} created` : `${draft.code} saved`, { tone: 'success' })
              onClose()
            }}
          >
            {isNew ? 'Create the coupon' : 'Save the coupon'}
          </Button>
          {!isNew && (
            <Button
              variant="danger-ghost"
              icon={TrashIcon}
              onClick={async () => {
                if (!(await confirm({ title: `Delete ${draft.code}?`, message: 'It stops working straight away. Uses already made are kept in the log.', confirmText: 'Delete', tone: 'danger', icon: TrashIcon }))) return
                remove(draft.id)
                toast(`${draft.code} deleted`)
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
      <TextField
        label="Code"
        value={draft.code}
        error={draft.code && clash ? 'That code is already in use' : undefined}
        onChange={(e) => set({ code: e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
        placeholder="FIRSTSET"
        hint="Uppercase, no spaces. It has to be unique."
        inputClassName="font-mono tracking-wide"
      />

      <SectionTitle className="mt-5">What it takes off</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Segmented
            value={draft.kind}
            onChange={(kind) => set({ kind, ceiling: kind === 'flat' ? null : (draft.ceiling ?? 2000) })}
            options={[
              { value: 'percent', label: 'Percentage' },
              { value: 'flat', label: 'Flat amount' },
            ]}
          />
        </div>
        <TextField label="Value" type="number" min={1} value={draft.value} onChange={(e) => set({ value: Number(e.currentTarget.value) })} suffix={draft.kind === 'percent' ? '%' : undefined} prefix={draft.kind === 'flat' ? '₹' : undefined} />
        {draft.kind === 'percent' && <TextField label="Ceiling" type="number" min={0} value={draft.ceiling ?? 0} onChange={(e) => set({ ceiling: Number(e.currentTarget.value) || null })} prefix="₹" hint="Most it can take off" />}
        <TextField label="Order must be over" type="number" min={0} value={draft.minOrder} onChange={(e) => set({ minOrder: Number(e.currentTarget.value) })} prefix="₹" className="col-span-2" />
      </div>

      <SectionTitle className="mt-5">Who, and on what</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Who" value={draft.audience} onChange={(e) => set({ audience: e.currentTarget.value as CouponAudience })}>
          {(Object.keys(COUPON_AUDIENCE) as CouponAudience[]).map((a) => (
            <option key={a} value={a}>
              {COUPON_AUDIENCE[a]}
            </option>
          ))}
        </Select>
        <Select label="On what" value={draft.scope} onChange={(e) => set({ scope: e.currentTarget.value as CouponScope, category: e.currentTarget.value === 'category' ? (draft.category ?? 'Lighting') : null })}>
          {(Object.keys(COUPON_SCOPE) as CouponScope[]).map((s) => (
            <option key={s} value={s}>
              {COUPON_SCOPE[s]}
            </option>
          ))}
        </Select>
        {draft.scope === 'category' && (
          <Select label="Category" className="col-span-2" value={draft.category ?? ''} onChange={(e) => set({ category: e.currentTarget.value as Category })}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id}
              </option>
            ))}
          </Select>
        )}
      </div>

      <SectionTitle className="mt-5">When, and how often</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Starts" type="date" value={draft.starts} onChange={(e) => set({ starts: e.currentTarget.value })} />
        <TextField label="Ends" type="date" value={draft.ends} onChange={(e) => set({ ends: e.currentTarget.value })} error={draft.ends < draft.starts ? 'Before it starts' : undefined} />
        <TextField label="Total uses" type="number" min={1} value={draft.totalUses} onChange={(e) => set({ totalUses: Number(e.currentTarget.value) })} />
        <TextField label="Per account" type="number" min={1} value={draft.perAccount} onChange={(e) => set({ perAccount: Number(e.currentTarget.value) })} />
      </div>

      <TextArea className="mt-4" label="Note to yourselves" optional rows={2} value={draft.note} onChange={(e) => set({ note: e.currentTarget.value })} placeholder="Why it exists, and who asked for it" />

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-fg">Live</p>
          <p className="text-xs text-muted">Off stops it working, and keeps the numbers.</p>
        </div>
        <Switch checked={draft.live} onChange={(live) => set({ live })} label="Live" />
      </div>

      <Card className="mt-4 p-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-muted">Preview</p>
        <p className="mt-1 text-[13px] leading-relaxed text-fg-2">
          <span className="font-mono font-bold text-fg">{draft.code || 'CODE'}</span> — {couponSentence(draft, formatINR)} {COUPON_AUDIENCE[draft.audience]} can use it {draft.perAccount} time{draft.perAccount === 1 ? '' : 's'} each, up to {draft.totalUses} in all.
        </p>
      </Card>

      {!isNew && (
        <Card className="mt-4 px-4 py-1">
          <dl className="divide-y divide-line">
            <KV label="Used" value={`${draft.used} of ${draft.totalUses}`} />
            <KV label="State" value={COUPON_STATE[couponState(draft, todayISO())].label} />
          </dl>
        </Card>
      )}

      <Banner tone="neutral" className="mt-4">
        Checkout does not take a code yet. This is the rule it would read when it does.
      </Banner>
      {error && !clash && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
    </Drawer>
  )
}
