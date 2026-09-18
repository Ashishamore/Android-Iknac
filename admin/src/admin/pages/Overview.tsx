import { ArrowRightIcon, ClockCounterClockwiseIcon, CurrencyInrIcon, HandCoinsIcon, MegaphoneIcon, PackageIcon, ScalesIcon, SealCheckIcon, TicketIcon, UserPlusIcon, UsersThreeIcon, type Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { formatINR, formatINRCompact } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { activeRecently, ROLE_META } from '@/lib/platform'
import { usePlatform } from '@/store/platform'
import { linkProps, navigate } from '~/router'
import { Button } from '~/ui/controls'
import { Card, CardHeader, PageHeader, SectionTitle, Stat } from '~/ui/display'
import { TwoLine } from '~/ui/table'
import { useCounts, useJoinSeries, useMe, useMoney } from '../lib'
import { AREA } from '../nav'

/** OVERVIEW: the market at a glance, and what is waiting for a person. */
export default function Overview() {
  const counts = useCounts()
  const money = useMoney()
  const me = useMe()
  const accounts = usePlatform((s) => s.accounts)
  const admins = usePlatform((s) => s.admins)
  const audit = usePlatform((s) => s.audit)
  const disputes = usePlatform((s) => s.disputes)
  const now = useNow(60_000).getTime()
  const recent = accounts.filter((a) => activeRecently(a, now)).length
  const open = disputes.filter((d) => d.state === 'open')

  const needs: { label: string; n: number; to: string; icon: Icon; note?: string }[] = [
    { label: 'Verification documents waiting', n: counts.docs, to: '/admin/verification', icon: SealCheckIcon },
    { label: 'Disputes open', n: counts.disputes, to: '/admin/orders', icon: ScalesIcon },
    { label: 'Payouts due', n: counts.payouts, to: '/admin/money?tab=due', icon: HandCoinsIcon, note: formatINR(counts.payoutTotal) },
    { label: 'Listings reported', n: counts.reported, to: '/admin/listings', icon: PackageIcon },
    { label: 'New listings waiting to go live', n: counts.listingsWaiting, to: '/admin/listings?tab=waiting', icon: PackageIcon },
    { label: 'Accounts not yet let in', n: counts.pending, to: '/admin/people?state=pending', icon: UserPlusIcon },
  ].filter((x) => x.n > 0)

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={AREA.overview.intent}
        actions={
          <Button variant="secondary" icon={ClockCounterClockwiseIcon} onClick={() => navigate('/admin/audit')}>
            Full log
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="People on PropKart"
          value={counts.people.toLocaleString('en-IN')}
          hint={`${counts.renters} renting · ${counts.providers} providing`}
          icon={UsersThreeIcon}
          onClick={() => navigate('/admin/people')}
        />
        <Stat label="Active recently" value={recent.toLocaleString('en-IN')} hint="In the last 48 hours" icon={ClockCounterClockwiseIcon} tone="info" />
        <Stat label="Verified" value={counts.verified.toLocaleString('en-IN')} hint={`${Math.round((counts.verified / counts.people) * 100)}% of accounts`} icon={SealCheckIcon} tone="success" onClick={() => navigate('/admin/people?state=verified')} />
        <Stat label="Suspended" value={counts.suspended} hint={counts.suspended ? 'Their stock is out of Discover' : 'Nobody is suspended'} icon={UsersThreeIcon} tone="danger" onClick={() => navigate('/admin/people?state=suspended')} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Gross rented" value={formatINRCompact(money.gross)} hint="All time, across providers" icon={CurrencyInrIcon} />
        <Stat label="Commission earned" value={formatINRCompact(money.earned)} hint={`${Math.round(money.commission * 100)}% of gross`} icon={HandCoinsIcon} tone="success" onClick={() => navigate('/admin/money')} />
        <Stat label="Subscriptions a month" value={formatINRCompact(money.subscriptions)} hint={`${money.paying} paying accounts`} icon={SealCheckIcon} tone="brand" onClick={() => navigate('/admin/subscriptions')} />
        <Stat label="Advertising a day" value={formatINR(money.advertising)} hint={`${money.campaignsLive} campaigns live`} icon={MegaphoneIcon} tone="warning" onClick={() => navigate('/admin/ads')} />
      </div>

      {needs.length > 0 && (
        <section className="mt-6">
          <SectionTitle>Needs a person</SectionTitle>
          <Card className="overflow-hidden">
            {needs.map((n) => (
              <a key={n.label} {...linkProps(n.to)} className="group flex items-center gap-3 border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-surface-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg-2">
                  <n.icon size={16} weight="bold" />
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-medium text-fg">{n.label}</span>
                {n.note && <span className="hidden shrink-0 text-[13px] tabular-nums text-muted sm:block">{n.note}</span>}
                <span className="shrink-0 rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">{n.n}</span>
                <ArrowRightIcon size={14} weight="bold" className="shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
              </a>
            ))}
          </Card>
        </section>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <JoinedCard />

        <Card className="flex flex-col">
          <CardHeader
            title="Open disputes"
            subtitle={open.length ? `${open.length} waiting on a decision` : 'Nothing open'}
            icon={ScalesIcon}
            actions={
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders?tab=orders')}>
                All orders
              </Button>
            }
          />
          <div className="flex-1">
            {open.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted">Nothing between two sides right now.</p>
            ) : (
              open.map((d) => (
                <a key={d.id} {...linkProps(`/admin/orders?open=${d.id}`)} className="flex items-center gap-3 border-b border-line px-4 py-2.5 transition-colors last:border-0 hover:bg-surface-2">
                  <TwoLine top={d.subject} bottom={`${d.kind} · ${d.orderId} · ${timeAgo(d.raisedAt, now)}`} className="flex-1" />
                  <span className="shrink-0 text-[13px] font-bold tabular-nums text-fg">{formatINR(d.amount)}</span>
                </a>
              ))
            )}
          </div>
        </Card>
      </div>

      <section className="mt-6">
        <SectionTitle
          aside={
            <a {...linkProps('/admin/audit')} className="text-[13px] font-semibold text-accent hover:underline">
              Full log
            </a>
          }
        >
          Last thing anyone did
        </SectionTitle>
        <Card className="overflow-hidden">
          {audit.slice(0, 6).map((e) => {
            const who = admins.find((a) => a.id === e.adminId)
            return (
              <div key={e.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 text-[13px] last:border-0">
                <span className="w-24 shrink-0 truncate text-muted sm:w-32">{who?.name ?? 'Someone'}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold text-fg">{e.action}</span> <span className="text-fg-2">{e.target}</span>
                  {e.detail && <span className="hidden text-muted sm:inline"> · {e.detail}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-subtle">{timeAgo(e.at, now)}</span>
              </div>
            )
          })}
        </Card>
      </section>

      <p className="mt-6 text-xs text-muted">
        Signed in as {me.name} · {ROLE_META[me.role].label}. Overview and the audit log are the two pages every role reaches.
      </p>
    </>
  )
}

/** Who joined: twelve weeks of sign-ups, and what is running alongside. */
function JoinedCard() {
  const { weeks, last30 } = useJoinSeries()
  const money = useMoney()
  const peak = Math.max(1, ...weeks)
  const total = weeks.reduce((n, w) => n + w, 0)

  return (
    <Card className="flex flex-col">
      <CardHeader title="Who joined" subtitle={`${total} accounts in the last 12 weeks`} icon={UserPlusIcon} />
      <div className="px-4 py-4">
        <div role="img" aria-label={`Sign-ups by week, oldest to newest: ${weeks.join(', ')}`} className="flex h-20 items-end gap-1.5">
          {weeks.map((n, i) => (
            <span key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className={cn('w-full rounded-t-sm transition-[height]', i === weeks.length - 1 ? 'bg-accent' : 'bg-accent/35')} style={{ height: `${Math.max(3, (n / peak) * 64)}px` }} />
            </span>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-subtle">
          <span>12 weeks ago</span>
          <span>This week</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
          <Figure label="New in 30 days" value={last30} />
          <Figure label="Coupons running" value={money.couponsRunning} icon={TicketIcon} to="/admin/coupons" />
          <Figure label="Campaigns live" value={money.campaignsLive} icon={MegaphoneIcon} to="/admin/ads" />
        </div>
      </div>
    </Card>
  )
}

function Figure({ label, value, icon: FIcon, to }: { label: string; value: number; icon?: Icon; to?: string }) {
  const body = (
    <>
      <span className="flex items-center justify-center gap-1.5 font-display text-xl font-extrabold tabular-nums text-fg">
        {FIcon && <FIcon size={15} weight="bold" className="text-muted" />}
        {value}
      </span>
      <span className="mt-0.5 block text-[11px] text-muted">{label}</span>
    </>
  )
  return to ? (
    <a {...linkProps(to)} className="rounded-lg py-1 transition-colors hover:bg-surface-2">
      {body}
    </a>
  ) : (
    <div className="py-1">{body}</div>
  )
}
