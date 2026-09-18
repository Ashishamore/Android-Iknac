import { CurrencyInrIcon, HandCoinsIcon, MegaphoneIcon, SealCheckIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { formatDayShort, timeAgo } from '@/lib/dates'
import { formatINR, formatINRCompact } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { COMMISSION_MAX, type Payout } from '@/lib/platform'
import { usePlatform } from '@/store/platform'
import { useQuery } from '~/router'
import { Button, Segmented, TextField } from '~/ui/controls'
import { Banner, Card, CardHeader, KV, PageHeader, ProgressBar, SectionTitle, Stat, Tag } from '~/ui/display'
import { toast } from '~/ui/feedback'
import { Dialog } from '~/ui/overlays'
import { DataTable, type Column } from '~/ui/table'
import { useMoney } from '../lib'
import { AREA } from '../nav'

/** MONEY: what the market turns over, the commission, and who is owed. */
export default function Money() {
  const query = useQuery()
  const money = useMoney()
  const payouts = usePlatform((s) => s.payouts)
  const accounts = usePlatform((s) => s.accounts)
  const markPaid = usePlatform((s) => s.markPaid)
  const now = useNow(60_000).getTime()
  const [tab, setTab] = useState<'due' | 'paid'>(query.get('tab') === 'paid' ? 'paid' : 'due')
  const [paying, setPaying] = useState<Payout | null>(null)
  const [ref, setRef] = useState('')

  const due = payouts.filter((p) => !p.paid)
  const paid = payouts.filter((p) => p.paid)
  const rows = tab === 'due' ? due : paid
  const name = (id: string) => accounts.find((a) => a.id === id)?.business ?? 'Unknown'

  const columns: Column<Payout>[] = [
    { key: 'provider', header: 'Provider', cell: (p) => <span className="font-semibold text-fg">{name(p.providerId)}</span> },
    { key: 'period', header: 'Period to', width: 'w-36', hide: 'sm', cell: (p) => formatDayShort(p.periodTo) },
    { key: 'amount', header: 'Amount', width: 'w-32', align: 'right', cell: (p) => <span className="font-bold text-fg">{formatINR(p.amount)}</span> },
    {
      key: 'state',
      header: '',
      width: 'w-40',
      align: 'right',
      cell: (p) =>
        p.paid ? (
          <span className="flex flex-col items-end">
            <Tag tone="success">Paid {timeAgo(p.paid.at, now)}</Tag>
            <span className="mt-0.5 text-[11px] text-subtle">{p.paid.ref}</span>
          </span>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation()
              setPaying(p)
              setRef(`NEFT-${Math.floor(4470000 + p.amount / 7)}`)
            }}
          >
            Mark paid
          </Button>
        ),
    },
  ]

  const revenue = [
    { label: 'Commission', value: money.earned, tone: 'brand' as const },
    { label: 'Subscriptions', value: money.subscriptions * 12, tone: 'success' as const },
    { label: 'Advertising', value: money.advertising * 365, tone: 'warning' as const },
  ]
  const revenueTotal = Math.max(1, revenue.reduce((n, r) => n + r.value, 0))

  return (
    <>
      <PageHeader title="Money" subtitle={AREA.money.intent} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Gross rented" value={formatINRCompact(money.gross)} hint="All time" icon={CurrencyInrIcon} />
        <Stat label="Commission" value={formatINRCompact(money.earned)} hint={`${Math.round(money.commission * 100)}% of gross`} icon={HandCoinsIcon} tone="success" />
        <Stat label="Subscriptions" value={formatINRCompact(money.subscriptions)} hint="A month" icon={SealCheckIcon} tone="brand" />
        <Stat label="Advertising" value={formatINR(money.advertising)} hint="A day" icon={MegaphoneIcon} tone="warning" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <CommissionCard />

        <Card className="flex flex-col">
          <CardHeader title="Where the revenue comes from" subtitle="A year, at today's rates" icon={CurrencyInrIcon} />
          <div className="flex-1 px-4 py-4">
            {revenue.map((r) => (
              <div key={r.label} className="mb-3 last:mb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-medium text-fg-2">{r.label}</span>
                  <span className="text-[13px] font-bold tabular-nums text-fg">{formatINRCompact(r.value)}</span>
                </div>
                <ProgressBar value={(r.value / revenueTotal) * 100} tone={r.tone} className="mt-1.5" />
                <p className="mt-1 text-[11px] text-subtle">{Math.round((r.value / revenueTotal) * 100)}% of the total</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <SectionTitle
          aside={
            <Segmented
              size="sm"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'due', label: 'Due', count: due.length },
                { value: 'paid', label: 'Paid', count: paid.length },
              ]}
            />
          }
        >
          Payouts {tab === 'due' && due.length > 0 && `· ${formatINR(due.reduce((n, p) => n + p.amount, 0))} owed`}
        </SectionTitle>
        <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} empty={{ icon: HandCoinsIcon, title: tab === 'due' ? 'Nothing owed' : 'Nothing paid yet', description: 'Payouts run every Friday.' }} />
      </div>

      <Dialog
        open={!!paying}
        onClose={() => setPaying(null)}
        title="Confirm sent"
        description={paying ? `${formatINR(paying.amount)} to ${name(paying.providerId)}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaying(null)}>
              Cancel
            </Button>
            <Button
              disabled={!ref.trim()}
              onClick={() => {
                if (!paying) return
                markPaid(paying.id, ref.trim())
                toast(`${name(paying.providerId)} marked paid`, { tone: 'success' })
                setPaying(null)
              }}
            >
              Confirm sent
            </Button>
          </>
        }
      >
        <TextField label="NEFT reference" value={ref} onChange={(e) => setRef(e.currentTarget.value)} hint="Kept on the payout, and in the audit log." />
        <p className="mt-3 text-xs text-muted">This records that the transfer was made. The prototype moves no money.</p>
      </Dialog>
    </>
  )
}

/** Commission: 0–40%, with a preview of what changes for a provider. */
function CommissionCard() {
  const commission = usePlatform((s) => s.commission)
  const money = useMoney()
  const save = usePlatform((s) => s.setCommission)
  const [draft, setDraft] = useState<number | null>(null)
  const pct = draft ?? Math.round(commission * 100)
  const dirty = pct !== Math.round(commission * 100)
  const example = 10000

  return (
    <Card>
      <CardHeader title="Commission" subtitle="What PropKart keeps of every order" icon={HandCoinsIcon} />
      <div className="px-4 py-4">
        <div className="flex items-end gap-4">
          <span className="font-display text-4xl font-extrabold tabular-nums leading-none text-fg">{pct}%</span>
          <span className="pb-1 text-[13px] text-muted">of the hire, before GST</span>
        </div>
        <input
          type="range"
          min={0}
          max={COMMISSION_MAX * 100}
          step={1}
          value={pct}
          onChange={(e) => setDraft(Number(e.currentTarget.value))}
          aria-label="Commission percentage"
          className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-3 accent-[var(--color-accent)]"
        />
        <div className="flex justify-between text-[11px] text-subtle">
          <span>0%</span>
          <span>{COMMISSION_MAX * 100}%</span>
        </div>

        <dl className="mt-4 divide-y divide-line border-y border-line">
          <KV label={`A booking worth ${formatINR(example)}`} value={formatINR(example)} />
          <KV label="PropKart keeps" value={formatINR(Math.round((example * pct) / 100))} strong />
          <KV label="The provider is paid" value={formatINR(example - Math.round((example * pct) / 100))} strong />
          <KV label="Across gross rented so far" value={formatINR(Math.round((money.gross * pct) / 100))} note={dirty ? `Was ${formatINR(money.earned)}` : undefined} warn={dirty} />
        </dl>

        <Banner tone="warning" className="mt-4">
          Read live by the provider app. Changing it changes every earnings figure a vendor is quoted, on Today, on a listing and on their Plan page.
        </Banner>

        <div className="mt-4 flex items-center gap-2">
          <Button
            disabled={!dirty}
            onClick={() => {
              save(pct / 100)
              setDraft(null)
              toast(`Commission is now ${pct}%`, { tone: 'success' })
            }}
          >
            Save the rate
          </Button>
          {dirty && (
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
