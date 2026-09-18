import { BankIcon, CheckIcon, CrownSimpleIcon, DownloadSimpleIcon, FileTextIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import { OWNER_PLANS, PLATFORM, type OwnerPlanId } from '@/data/owner'
import { cn } from '@/lib/cn'
import { formatDayShort, monthLabel, todayISO } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { nextPayoutDate, orderMoney, payoutSummary } from '@/lib/owner'
import { feeFor, useFeeRate, useOwner } from '@/store/owner'
import { usePlatform } from '@/store/platform'
import { downloadText, ORDER_STATUS } from '~/lib/data'
import { linkProps, navigate } from '~/router'
import { Button } from '~/ui/controls'
import { Card, CardHeader, KV, Stat, Tag } from '~/ui/display'
import { busy, confirm, sleep, toast } from '~/ui/feedback'
import { ProfileLayout } from './Profile'

/** Plan: what PropKart takes, and Standard vs Pro. */
export function PlanPage() {
  const plan = useOwner((s) => s.plan)
  const commission = usePlatform((x) => x.commission)
  const fee = useFeeRate()
  const setPlan = useOwner((s) => s.setPlan)
  const orders = useOwner((s) => s.orders)
  const listings = useOwner((s) => s.listings)
  const current = OWNER_PLANS.find((p) => p.id === plan)!
  const now = useNow(60_000).getTime()
  const example = 10000
  const recent = orders.filter((o) => ['out', 'returned', 'closed'].includes(o.status) && now - o.requestedAt < 45 * 86_400_000)
  const hire = recent.reduce((n, o) => n + orderMoney(o, listings.find((l) => l.id === o.listingId)!, 0).hire - o.discount, 0)
  const feeOf = (id: OwnerPlanId) => feeFor(id, commission)
  const proSaving = Math.round(hire * (feeOf('standard') - feeOf('pro'))) - OWNER_PLANS[1].monthly

  const choose = async (id: OwnerPlanId) => {
    const next = OWNER_PLANS.find((p) => p.id === id)!
    const ok = await confirm({
      title: id === 'pro' ? 'Switch to Pro?' : 'Go back to Standard?',
      message:
        id === 'pro'
          ? `${formatINR(next.monthly)} a month, and ${PLATFORM} takes ${Math.round(feeOf('pro') * 100)}% instead of ${Math.round(feeOf('standard') * 100)}%.`
          : `No monthly fee, and ${PLATFORM} takes ${Math.round(feeOf('standard') * 100)}% of each order.`,
      confirmText: id === 'pro' ? `Pay ${formatINR(next.monthly)}` : 'Switch',
      icon: CrownSimpleIcon,
    })
    if (!ok) return
    const hide = busy('Updating your plan…')
    await sleep(1000)
    hide()
    setPlan(id)
    toast(`You’re on ${next.name}`, { tone: 'success' })
  }

  return (
    <ProfileLayout section="plan" title="Plan" subtitle={`${PLATFORM} takes ${Math.round(fee * 100)}% of each order`}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative overflow-hidden rounded-xl bg-accent p-5 text-accent-fg shadow-float">
          <CrownSimpleIcon aria-hidden size={130} weight="fill" className="absolute -right-4 -top-6 opacity-10" />
          <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-80">Your plan</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{current.name}</p>
          <p className="mt-1 text-sm opacity-90">
            {PLATFORM} takes {Math.round(fee * 100)}% of each order{current.monthly ? ` · ${formatINR(current.monthly)} a month` : ' · no monthly fee'}
          </p>
        </div>
        <Card>
          <CardHeader title="How the fee works" />
          <dl className="divide-y divide-line px-4">
            <KV label="A booking worth" value={formatINR(example)} />
            <KV label={`${PLATFORM} keeps (${Math.round(fee * 100)}%)`} value={`−${formatINR(example * fee)}`} />
            <KV label="You get" value={formatINR(example * (1 - fee))} strong />
          </dl>
        </Card>
      </div>
      <p className="mt-2 text-xs text-muted">The fee covers payments, deposit protection, delivery tracking and support. Deposits and late fees go to you in full.</p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {OWNER_PLANS.map((p) => {
          const isCurrent = p.id === plan
          return (
            <Card key={p.id} className={cn('flex flex-col p-5', isCurrent && 'border-accent ring-1 ring-accent')}>
              <div className="flex items-center gap-2">
                <p className="font-display text-lg font-bold text-fg">{p.name}</p>
                {isCurrent && (
                  <Tag tone="success" className="ml-auto">
                    Current
                  </Tag>
                )}
              </div>
              <p className="mt-1">
                <span className="font-display text-3xl font-extrabold tabular-nums text-fg">{Math.round(feeOf(p.id) * 100)}%</span>
                <span className="text-sm text-muted"> per order{p.monthly ? ` + ${formatINR(p.monthly)}/month` : ''}</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-fg-2">
                    <CheckIcon size={15} weight="bold" className="mt-0.5 shrink-0 text-success" />
                    {perk}
                  </li>
                ))}
              </ul>
              {p.id === 'pro' && !isCurrent && (
                <p className={cn('mt-4 rounded-lg px-3 py-2 text-[13px]', proSaving > 0 ? 'bg-success-soft text-fg' : 'bg-surface-2 text-muted')}>
                  {proSaving > 0 ? `On your recent orders, Pro would have saved you ${formatINR(proSaving)} a month.` : 'Worth it once you rent out more than ₹37,500 a month.'}
                </p>
              )}
              <Button className="mt-4" block variant={isCurrent ? 'secondary' : 'primary'} disabled={isCurrent} onClick={() => choose(p.id)}>
                {isCurrent ? 'Current plan' : `Switch to ${p.name}`}
              </Button>
            </Card>
          )
        })}
      </div>
    </ProfileLayout>
  )
}

/** Payouts: coming to you, settled, deposits you hold, where it lands, and order by order. */
export function PayoutsPage() {
  const orders = useOwner((s) => s.orders)
  const listings = useOwner((s) => s.listings)
  const bank = useOwner((s) => s.bank)
  const business = useOwner((s) => s.business)
  const fee = useFeeRate()
  const listingOf = (id: string) => listings.find((l) => l.id === id)
  const sum = payoutSummary(orders, listingOf, fee)
  const rows = orders.filter((o) => o.status !== 'request' && o.status !== 'declined').sort((a, b) => b.from.localeCompare(a.from))
  const today = todayISO()
  const months = [...new Set(rows.filter((o) => o.status === 'closed').map((o) => o.to.slice(0, 7)))]

  const statement = (ym: string) => {
    const inMonth = rows.filter((o) => o.status === 'closed' && o.to.startsWith(ym))
    const lines = inMonth.map((o) => {
      const m = orderMoney(o, listingOf(o.listingId)!, fee)
      return `${o.id},${listingOf(o.listingId)!.name},${o.renter.company},${m.hire},${m.discount},${m.fee},${m.net + o.claim}`
    })
    downloadText(`payouts-${ym}.csv`, `${business.name} · payout statement ${ym}\norder,item,renter,hire,discount,fee,net\n${lines.join('\n')}\n`)
    toast(`Statement for ${ym} downloaded`, { tone: 'success' })
  }

  return (
    <ProfileLayout
      section="payouts"
      title="Payouts"
      subtitle={`Every Friday · next on ${formatDayShort(nextPayoutDate(today))}`}
      actions={
        <Button variant="secondary" icon={DownloadSimpleIcon} onClick={() => statement(today.slice(0, 7))}>
          This month’s statement
        </Button>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl bg-accent p-5 text-accent-fg shadow-float">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-80">Next payout · {formatDayShort(nextPayoutDate(today))}</p>
          <p className="mt-1 font-display text-[34px] font-extrabold leading-tight tabular-nums">{formatINR(sum.next)}</p>
        </div>
        <p className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm">
          <BankIcon size={17} /> To {bank.name} •••• {bank.last4}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Coming to you" value={formatINR(sum.coming)} hint="Confirmed, out and back" />
        <Stat label="Settled so far" value={<span className="text-success">{formatINR(sum.settled)}</span>} hint="Paid into your bank" />
        <Stat label="Deposits you hold" value={formatINR(sum.deposits)} hint="Released after return checks" />
      </div>

      <Card className="mt-4">
        <CardHeader title="Where it lands" />
        <ul className="divide-y divide-line">
          <li>
            <a {...linkProps('/profile/verification')} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/70">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success-soft text-success">
                <BankIcon size={19} weight="duotone" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-fg">
                  {bank.name} •••• {bank.last4}
                </span>
                <span className="block text-xs text-muted">
                  {bank.holder} · {bank.ifsc}
                </span>
              </span>
              <PencilSimpleIcon size={16} className="shrink-0 text-subtle" />
            </a>
          </li>
          {months.map((ym) => (
            <li key={ym}>
              <button type="button" onClick={() => statement(ym)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/70">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg-2">
                  <FileTextIcon size={19} weight="duotone" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-fg">Invoice · {monthLabel(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1)}</span>
                  <span className="block text-xs text-muted">{PLATFORM} fee invoice and payout statement (CSV)</span>
                </span>
                <DownloadSimpleIcon size={16} className="shrink-0 text-accent" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Order by order" subtitle="Hire · discount · fee · net" />
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                <th className="py-2.5 pl-4 pr-3">Order</th>
                <th className="px-3 py-2.5">Item</th>
                <th className="px-3 py-2.5">Payout</th>
                <th className="px-3 py-2.5 text-right">Hire</th>
                <th className="px-3 py-2.5 text-right">Discount</th>
                <th className="px-3 py-2.5 text-right">Fee</th>
                <th className="py-2.5 pl-3 pr-4 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((o) => {
                const l = listingOf(o.listingId)!
                const m = orderMoney(o, l, fee)
                const state = o.status === 'closed' ? (o.settled ? 'Paid' : 'In next payout') : o.status === 'returned' ? 'In next payout' : 'Upcoming'
                return (
                  <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="cursor-pointer transition-colors hover:bg-surface-2/70">
                    <td className="py-2.5 pl-4 pr-3">
                      <p className="font-semibold text-fg">{o.id}</p>
                      <p className="text-xs text-muted">{o.renter.company}</p>
                    </td>
                    <td className="max-w-56 px-3 py-2.5">
                      <p className="truncate text-fg-2">
                        {l.name} × {o.qty}
                      </p>
                      <p className="text-xs text-muted">{ORDER_STATUS[o.status].label}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <Tag tone={state === 'Paid' ? 'success' : state === 'Upcoming' ? 'neutral' : 'brand'}>{state}</Tag>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-fg-2">{formatINR(m.hire)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-fg-2">{m.discount ? `−${formatINR(m.discount)}` : '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-fg-2">−{formatINR(m.fee)}</td>
                    <td className="py-2.5 pl-3 pr-4 text-right font-bold tabular-nums text-fg">{formatINR(m.net + o.claim)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </ProfileLayout>
  )
}
