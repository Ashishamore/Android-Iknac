import { CheckIcon, CrownSimpleIcon } from '@phosphor-icons/react'
import { OWNER_PLANS, PLATFORM, type OwnerPlanId } from '@/data/owner'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep, useNow } from '@/lib/hooks'
import { orderMoney } from '@/lib/owner'
import { usePopup } from '@/overlays/popupContext'
import { feeFor, useFeeRate, useOwner } from '@/store/owner'
import { usePlatform } from '@/store/platform'
import { AppBar, Button, Card, Screen, SectionHeader, Tag } from '@/ui'
import { SubscriptionNote } from '@/components/platform/SubscriptionNote'

/** Plan: what PropKart takes, and Standard vs Pro. */
export default function OwnerPlanScreen() {
  const popup = usePopup()
  const plan = useOwner((s) => s.plan)
  const setPlan = useOwner((s) => s.setPlan)
  const orders = useOwner((s) => s.orders)
  const listings = useOwner((s) => s.listings)
  const current = OWNER_PLANS.find((p) => p.id === plan)!
  // The Control Centre sets the platform rate; Pro takes four points off it.
  const commission = usePlatform((s) => s.commission)
  const fee = useFeeRate()
  const feeOf = (id: OwnerPlanId) => feeFor(id, commission)
  const now = useNow(60_000).getTime()
  const example = 10000
  // Hire on recent orders (last 45 days), to show what Pro would save.
  const recent = orders.filter((o) => ['out', 'returned', 'closed'].includes(o.status) && now - o.requestedAt < 45 * 86_400_000)
  const hire = recent.reduce((n, o) => n + orderMoney(o, listings.find((l) => l.id === o.listingId)!, 0).hire - o.discount, 0)
  const proSaving = Math.round(hire * (feeOf('standard') - feeOf('pro'))) - OWNER_PLANS[1].monthly

  const choose = async (id: OwnerPlanId) => {
    const next = OWNER_PLANS.find((p) => p.id === id)!
    const ok = await popup.confirm({
      title: id === 'pro' ? 'Switch to Pro?' : 'Go back to Standard?',
      message:
        id === 'pro'
          ? `${formatINR(next.monthly)} a month, and ${PLATFORM} takes ${Math.round(feeOf('pro') * 100)}% instead of ${Math.round(feeOf('standard') * 100)}%.`
          : `No monthly fee, and ${PLATFORM} takes ${Math.round(feeOf('standard') * 100)}% of each order.`,
      confirmText: id === 'pro' ? `Pay ${formatINR(next.monthly)}` : 'Switch',
      icon: CrownSimpleIcon,
    })
    if (!ok) return
    const hide = popup.loading('Updating your plan…')
    await sleep(1000)
    hide()
    setPlan(id)
    haptic('success')
    popup.toast(`You’re on ${next.name}`, { tone: 'success' })
  }

  return (
    <Screen header={<AppBar title="Plan" />}>
      <div className="px-4 pb-10 pt-1 @medium:mx-auto @medium:max-w-2xl">
        <SubscriptionNote side="provider" className="mb-3" />
        <div className="rounded-3xl bg-accent p-5 text-accent-fg shadow-float">
          <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-80">Your plan</p>
          <p className="mt-1 font-display text-[28px] font-extrabold leading-tight">{current.name}</p>
          <p className="mt-1 text-sm opacity-90">
            {PLATFORM} takes {Math.round(fee * 100)}% of each order{current.monthly ? ` · ${formatINR(current.monthly)} a month` : ' · no monthly fee'}
          </p>
        </div>

        <SectionHeader title="How the fee works" className="px-0 pt-6" />
        <Card className="px-4 py-1.5">
          <dl className="divide-y divide-line">
            <Row label="A booking worth" value={formatINR(example)} />
            <Row label={`${PLATFORM} keeps (${Math.round(fee * 100)}%)`} value={`−${formatINR(example * fee)}`} />
            <Row label="You get" value={formatINR(example * (1 - fee))} strong />
          </dl>
        </Card>
        <p className="mt-2 px-1 text-xs text-muted">The fee covers payments, deposit protection, delivery tracking and support. Deposits and late fees go to you in full.</p>

        <SectionHeader title="Plans" className="px-0 pt-6" />
        <div className="grid grid-cols-1 gap-3 @medium:grid-cols-2">
          {OWNER_PLANS.map((p) => {
            const isCurrent = p.id === plan
            return (
              <Card key={p.id} className={cn('flex flex-col p-4', isCurrent && 'ring-2 ring-accent')}>
                <div className="flex items-center gap-2">
                  <p className="font-display text-lg font-bold text-fg">{p.name}</p>
                  {isCurrent && (
                    <Tag tone="success" className="ml-auto">
                      Current
                    </Tag>
                  )}
                </div>
                <p className="mt-1">
                  <span className="font-display text-2xl font-extrabold tabular-nums text-fg">{Math.round(feeOf(p.id) * 100)}%</span>
                  <span className="text-sm text-muted"> per order{p.monthly ? ` + ${formatINR(p.monthly)}/month` : ''}</span>
                </p>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm text-fg-2">
                      <CheckIcon size={15} weight="bold" className="mt-0.5 shrink-0 text-success" />
                      {perk}
                    </li>
                  ))}
                </ul>
                {p.id === 'pro' && !isCurrent && (
                  <p className={cn('mt-3 rounded-xl px-3 py-2 text-[13px]', proSaving > 0 ? 'bg-success-soft text-fg' : 'bg-surface-2 text-muted')}>
                    {proSaving > 0 ? `On your recent orders, Pro would have saved you ${formatINR(proSaving)} a month.` : 'Worth it once you rent out more than ₹37,500 a month.'}
                  </p>
                )}
                <Button className="mt-4" block variant={isCurrent ? 'outline' : 'primary'} disabled={isCurrent} onClick={() => choose(p.id)}>
                  {isCurrent ? 'Current plan' : `Switch to ${p.name}`}
                </Button>
              </Card>
            )
          })}
        </div>
      </div>
    </Screen>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className={cn('text-sm', strong ? 'font-semibold text-fg' : 'text-fg-2')}>{label}</dt>
      <dd className={cn('text-sm tabular-nums', strong ? 'font-bold text-fg' : 'font-semibold text-fg')}>{value}</dd>
    </div>
  )
}
