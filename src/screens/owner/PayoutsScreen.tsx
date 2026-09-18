import { BankIcon, CaretRightIcon, DownloadSimpleIcon, FileTextIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import { PLATFORM } from '@/data/owner'
import { cn } from '@/lib/cn'
import { formatDayShort, monthLabel, todayISO } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { nextPayoutDate, orderMoney, payoutSummary } from '@/lib/owner'
import { nav } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useFeeRate, useOwner } from '@/store/owner'
import { AppBar, Button, Card, IconTile, Screen, SectionHeader, Tag } from '@/ui'

/** Payouts: coming to you, settled, deposits you hold, where it lands, and order by order. */
export default function PayoutsScreen() {
  const popup = usePopup()
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
    const csv = `${business.name} · payout statement ${ym}\norder,item,renter,hire,discount,fee,net\n${lines.join('\n')}\n`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `payouts-${ym}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    popup.toast(`Statement for ${ym} downloaded`, { tone: 'success' })
  }

  return (
    <Screen header={<AppBar title="Payouts" subtitle={`Every Friday · next on ${formatDayShort(nextPayoutDate(today))}`} />}>
      <div className="px-4 pb-10 pt-1 @medium:mx-auto @medium:max-w-2xl">
        <div className="rounded-3xl bg-accent p-5 text-accent-fg shadow-float">
          <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-80">Next payout · {formatDayShort(nextPayoutDate(today))}</p>
          <p className="mt-1 font-display text-[30px] font-extrabold leading-tight tabular-nums">{formatINR(sum.next)}</p>
          <p className="text-sm opacity-90">
            To {bank.name} •••• {bank.last4}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Mini value={formatINR(sum.coming)} label="Coming to you" />
          <Mini value={formatINR(sum.settled)} label="Settled so far" tone="text-success" />
          <Mini value={formatINR(sum.deposits)} label="Deposits you hold" />
        </div>

        {/* Where it lands */}
        <SectionHeader title="Where it lands" className="px-0 pt-6" />
        <Card className="overflow-hidden">
          <button type="button" onClick={() => nav.push('/renter/profile/verification')} className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2">
            <IconTile icon={BankIcon} tone="success" size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-fg">
                {bank.name} •••• {bank.last4}
              </span>
              <span className="block text-[13px] text-muted">
                {bank.holder} · {bank.ifsc}
              </span>
            </span>
            <PencilSimpleIcon size={17} className="shrink-0 text-subtle" />
            <span aria-hidden className="absolute bottom-0 left-[66px] right-0 h-px bg-line" />
          </button>
          {months.map((ym) => (
            <button key={ym} type="button" onClick={() => statement(ym)} className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2">
              <IconTile icon={FileTextIcon} tone="neutral" size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-fg">Invoice · {monthLabel(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1)}</span>
                <span className="block text-[13px] text-muted">{PLATFORM} fee invoice and payout statement</span>
              </span>
              <DownloadSimpleIcon size={17} className="shrink-0 text-accent" />
              <span aria-hidden className="absolute bottom-0 left-[66px] right-0 h-px bg-line group-last:hidden" />
            </button>
          ))}
        </Card>

        {/* Order by order */}
        <SectionHeader title="Order by order" subtitle="Hire · discount · fee · net" className="px-0 pt-6" />
        <Card className="overflow-hidden">
          {rows.map((o) => {
            const l = listingOf(o.listingId)!
            const m = orderMoney(o, l, fee)
            const state = o.status === 'closed' ? (o.settled ? 'Paid' : 'In next payout') : o.status === 'returned' ? 'In next payout' : 'Upcoming'
            return (
              <button key={o.id} type="button" onClick={() => nav.push(`/renter/orders/${o.id}`)} className="group relative block w-full px-4 py-3 text-left transition-colors active:bg-surface-2">
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-fg">
                    {l.name} × {o.qty}
                  </span>
                  <span className="shrink-0 text-[15px] font-bold tabular-nums text-fg">{formatINR(m.net + o.claim)}</span>
                  <CaretRightIcon size={13} weight="bold" className="shrink-0 text-subtle" />
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-muted">
                    {o.id} · hire {formatINR(m.hire)}
                    {m.discount ? ` · −${formatINR(m.discount)} discount` : ''} · −{formatINR(m.fee)} fee
                  </span>
                  <Tag tone={state === 'Paid' ? 'success' : state === 'Upcoming' ? 'neutral' : 'brand'}>{state}</Tag>
                </span>
                <span aria-hidden className="absolute bottom-0 left-4 right-0 h-px bg-line group-last:hidden" />
              </button>
            )
          })}
        </Card>
        <div className="pt-4 @medium:mx-auto @medium:max-w-md">
          <Button variant="outline" block icon={DownloadSimpleIcon} onClick={() => statement(today.slice(0, 7))}>
            This month’s statement
          </Button>
        </div>
      </div>
    </Screen>
  )
}

function Mini({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-surface p-3 shadow-card">
      <p className={cn('truncate text-[15px] font-bold tabular-nums text-fg', tone)}>{value}</p>
      <p className="text-[11px] leading-tight text-muted">{label}</p>
    </div>
  )
}
