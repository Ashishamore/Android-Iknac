import { ReceiptIcon, ScalesIcon, TruckIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { formatDateRangeShort, timeAgo } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { ORDER_STATE, OUTCOMES, outcomeSentence, type Dispute, type DisputeOutcome, type PlatformOrder } from '@/lib/platform'
import { usePlatform } from '@/store/platform'
import { useQuery } from '~/router'
import { Button, SearchInput, Segmented, TextArea } from '~/ui/controls'
import { Banner, Card, KV, PageHeader, SectionTitle, Tag } from '~/ui/display'
import { toast } from '~/ui/feedback'
import { Drawer } from '~/ui/overlays'
import { DataTable, ShowMore, Toolbar, TwoLine, type Column } from '~/ui/table'
import { AREA } from '../nav'

const PAGE = 40

/** ORDERS & DISPUTES: settle what two sides cannot, and read the order behind it. */
export default function Orders() {
  const query = useQuery()
  const disputes = usePlatform((s) => s.disputes)
  const orders = usePlatform((s) => s.orders)
  const accounts = usePlatform((s) => s.accounts)
  const now = useNow(60_000).getTime()
  const [tab, setTab] = useState<'disputes' | 'orders'>(query.get('tab') === 'orders' ? 'orders' : 'disputes')
  const [settling, setSettling] = useState<string | null>(query.get('open'))
  const [orderId, setOrderId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)

  const open = disputes.filter((d) => d.state === 'open')
  const settled = disputes.filter((d) => d.state === 'settled')
  const name = (id: string) => accounts.find((a) => a.id === id)?.business ?? 'Unknown'

  const text = q.trim().toLowerCase()
  const rows = orders.filter((o) => !text || [o.id, o.production, name(o.providerId), name(o.renterId)].some((v) => v.toLowerCase().includes(text)))

  const columns: Column<PlatformOrder>[] = [
    { key: 'id', header: 'Order', width: 'w-28', cell: (o) => <span className="font-bold text-fg">{o.id}</span> },
    { key: 'renting', header: 'Renting', cell: (o) => <TwoLine top={name(o.renterId)} bottom={o.production} /> },
    { key: 'provider', header: 'Provider', width: 'w-44', hide: 'sm', cell: (o) => name(o.providerId) },
    { key: 'items', header: 'Items', width: 'w-20', align: 'right', hide: 'md', cell: (o) => o.items.reduce((n, i) => n + i.qty, 0) },
    { key: 'deposit', header: 'Deposit', width: 'w-28', align: 'right', hide: 'lg', cell: (o) => formatINR(o.deposit) },
    { key: 'placed', header: 'Placed', width: 'w-28', hide: 'lg', cell: (o) => <span className="text-muted">{timeAgo(o.placed, now)}</span> },
    { key: 'state', header: 'State', width: 'w-44', cell: (o) => <Tag tone={ORDER_STATE[o.state].tone}>{ORDER_STATE[o.state].label}</Tag> },
  ]

  return (
    <>
      <PageHeader
        title="Orders & disputes"
        subtitle={AREA.orders.intent}
        actions={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'disputes', label: 'Disputes', count: open.length },
              { value: 'orders', label: 'All orders', count: orders.length },
            ]}
          />
        }
      />

      {tab === 'disputes' ? (
        <>
          <SectionTitle>Open</SectionTitle>
          {open.length === 0 ? (
            <Card>
              <p className="px-4 py-8 text-center text-[13px] text-muted">Nothing between two sides right now.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {open.map((d) => (
                <Card key={d.id} className="flex flex-col p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger">
                      <ScalesIcon size={18} weight="bold" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-fg">{d.subject}</p>
                      <p className="text-xs text-muted">
                        {d.kind} · raised by {name(d.byAccountId)} · {timeAgo(d.raisedAt, now)}
                      </p>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-lg font-extrabold tabular-nums text-fg">{formatINR(d.amount)}</span>
                      <span className="block text-[11px] text-muted">in contention</span>
                    </span>
                  </div>
                  <p className="mt-3 flex-1 text-[13px] leading-relaxed text-fg-2">{d.detail}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => setSettling(d.id)}>
                      Settle it
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setOrderId(d.orderId)}>
                      Order {d.orderId}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <SectionTitle className="mt-6">Settled</SectionTitle>
          <Card className="overflow-hidden">
            {settled.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted">Nothing settled yet.</p>
            ) : (
              settled.map((d) => (
                <div key={d.id} className="border-b border-line px-4 py-3 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-fg">{d.subject}</p>
                    <Tag tone="neutral">{OUTCOMES.find((o) => o.id === d.outcome)?.label}</Tag>
                    <span className="text-[13px] tabular-nums text-muted">{formatINR(d.amount)}</span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-fg-2">{d.message}</p>
                  <p className="mt-1 text-xs text-subtle">
                    {d.orderId} · settled {d.settledAt ? timeAgo(d.settledAt, now) : ''}
                  </p>
                </div>
              ))
            )}
          </Card>
        </>
      ) : (
        <>
          <Toolbar>
            <SearchInput value={q} onChange={(e) => setQ(e.currentTarget.value)} onClear={() => setQ('')} placeholder="Order number, production or provider" className="w-full sm:w-96" />
            <span className="ml-auto text-[13px] text-muted">{rows.length} shown</span>
          </Toolbar>
          <DataTable
            columns={columns}
            rows={rows.slice(0, shown)}
            rowKey={(o) => o.id}
            activeKey={orderId ?? undefined}
            onRow={(o) => setOrderId(o.id)}
            empty={{ icon: ReceiptIcon, title: 'No orders match', description: 'Search by order number, production or provider.' }}
          />
          <ShowMore shown={Math.min(shown, rows.length)} total={rows.length} step={PAGE} onMore={() => setShown((n) => n + PAGE)} />
        </>
      )}

      <SettleDrawer key={settling ?? 'none'} id={settling} onClose={() => setSettling(null)} />
      <OrderDrawer id={orderId} onClose={() => setOrderId(null)} />
    </>
  )
}

/** SETTLE DRAWER: pick an outcome, edit what both sides read, record it. */
function SettleDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const dispute = usePlatform((s) => s.disputes.find((d) => d.id === id))
  const order = usePlatform((s) => s.orders.find((o) => o.id === dispute?.orderId))
  const accounts = usePlatform((s) => s.accounts)
  const settleDispute = usePlatform((s) => s.settleDispute)
  const [outcome, setOutcome] = useState<DisputeOutcome>('deposit')
  const [message, setMessage] = useState<string | null>(null)
  if (!dispute) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>

  const d: Dispute = dispute
  const suggested = outcomeSentence(outcome, d.amount, formatINR)
  const text = message ?? suggested

  return (
    <Drawer
      open
      onClose={onClose}
      title={d.subject}
      subtitle={`${d.kind} · ${formatINR(d.amount)} in contention`}
      width="max-w-[580px]"
      footer={
        <>
          <Button
            onClick={() => {
              settleDispute(d.id, outcome, text)
              toast('Settled · both sides have been told', { tone: 'success' })
              onClose()
            }}
          >
            Settle and tell both sides
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-fg-2">{d.detail}</p>

      <Card className="mt-4 px-4 py-1">
        <dl className="divide-y divide-line">
          <KV label="Raised by" value={accounts.find((a) => a.id === d.byAccountId)?.business ?? 'Unknown'} strong />
          <KV label="Order" value={d.orderId} note={order?.production} />
          <KV label="Deposit on that order" value={order ? formatINR(order.deposit) : '—'} strong />
          <KV label="In contention" value={formatINR(d.amount)} warn />
        </dl>
      </Card>

      <SectionTitle className="mt-5">Outcome</SectionTitle>
      <div className="space-y-2">
        {OUTCOMES.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              setOutcome(o.id)
              setMessage(null)
            }}
            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${outcome === o.id ? 'border-accent bg-accent-soft/50' : 'border-line hover:bg-surface-2'}`}
          >
            <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2 ${outcome === o.id ? 'border-accent' : 'border-line-strong'}`}>{outcome === o.id && <span className="size-2 rounded-full bg-accent" />}</span>
            <span className="min-w-0">
              <span className="block text-[13px] font-bold text-fg">{o.label}</span>
              <span className="block text-xs text-muted">{o.note}</span>
            </span>
          </button>
        ))}
      </div>

      <SectionTitle className="mt-5">What both sides will read</SectionTitle>
      <TextArea rows={5} value={text} onChange={(e) => setMessage(e.currentTarget.value)} />
      {message !== null && (
        <button type="button" onClick={() => setMessage(null)} className="mt-1.5 text-xs font-semibold text-accent hover:underline">
          Put the suggested wording back
        </button>
      )}

      <Banner tone="neutral" className="mt-4">
        This records the decision and tells both sides. No money moves in the prototype.
      </Banner>
    </Drawer>
  )
}

/** ORDER DRAWER: the money lines, what was hired, and the transport legs. */
function OrderDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const order = usePlatform((s) => s.orders.find((o) => o.id === id))
  const accounts = usePlatform((s) => s.accounts)
  const commission = usePlatform((s) => s.commission)
  const now = useNow(60_000).getTime()
  if (!order) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>

  const o = order
  const name = (aid: string) => accounts.find((a) => a.id === aid)?.business ?? 'Unknown'
  const subtotal = o.hire + o.transport
  const gst = Math.round(subtotal * 0.18)

  return (
    <Drawer
      open
      onClose={onClose}
      title={o.id}
      subtitle={`${o.production} · ${formatDateRangeShort(o.from, o.to)}`}
      badge={<Tag tone={ORDER_STATE[o.state].tone}>{ORDER_STATE[o.state].label}</Tag>}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <Card className="px-4 py-1">
        <dl className="divide-y divide-line">
          <KV label="Renting" value={name(o.renterId)} strong />
          <KV label="Provider" value={name(o.providerId)} strong />
          <KV label="Placed" value={timeAgo(o.placed, now)} />
          <KV label="Days" value={`${o.days} day${o.days === 1 ? '' : 's'}`} />
        </dl>
      </Card>

      <SectionTitle className="mt-5">Money</SectionTitle>
      <Card className="px-4 py-1">
        <dl className="divide-y divide-line">
          <KV label="Hire" value={formatINR(o.hire)} />
          <KV label="Transport" value={formatINR(o.transport)} />
          <KV label="GST 18%" value={formatINR(gst)} />
          <KV label="Total" value={formatINR(subtotal + gst)} strong />
          <KV label="Deposit (refundable)" value={formatINR(o.deposit)} />
          <KV label={`PropKart keeps ${Math.round(commission * 100)}%`} value={formatINR(Math.round(o.hire * commission))} note="Read live from the Money page" />
          <KV label="Provider is paid" value={formatINR(o.hire - Math.round(o.hire * commission))} strong />
        </dl>
      </Card>

      <SectionTitle className="mt-5">What was hired</SectionTitle>
      <Card className="overflow-hidden">
        {o.items.map((i) => (
          <div key={i.name} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-[13px] last:border-0">
            <span className="min-w-0 truncate font-medium text-fg">{i.name}</span>
            <span className="shrink-0 tabular-nums text-muted">× {i.qty}</span>
          </div>
        ))}
      </Card>

      <SectionTitle className="mt-5">Transport</SectionTitle>
      <Card className="overflow-hidden">
        {o.legs.map((l) => (
          <div key={l.label} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0">
            <TruckIcon size={16} className="shrink-0 text-muted" />
            <TwoLine top={l.label} bottom={l.where} className="flex-1" />
            <span className="shrink-0 text-[13px] tabular-nums text-muted">{l.when}</span>
          </div>
        ))}
      </Card>

      <Banner tone="neutral" icon={ReceiptIcon} className="mt-5" title="Nothing here can be edited">
        Orders are read-only in the Control Centre. Settle a dispute to change what happens to a deposit.
      </Banner>
    </Drawer>
  )
}
