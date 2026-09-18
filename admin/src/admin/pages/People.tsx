import { ArrowSquareOutIcon, CheckIcon, PackageIcon, ProhibitIcon, SealCheckIcon, UserPlusIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { formatINR, formatPhone } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { ACCOUNT_STATE, CHECKS, type Account, type CheckKind } from '@/lib/platform'
import { TONE_SOFT } from '@/lib/tones'
import { usePlatform } from '@/store/platform'
import { renterAppUrl } from '~/lib/data'
import { navigate, useQuery } from '~/router'
import { Button, SearchInput, Segmented, Select, Switch } from '~/ui/controls'
import { Avatar, Banner, Card, KV, PageHeader, SectionTitle, Tag } from '~/ui/display'
import { confirm, toast } from '~/ui/feedback'
import { Drawer } from '~/ui/overlays'
import { DataTable, ShowMore, Toolbar, type Column } from '~/ui/table'
import { AREA } from '../nav'

type SideFilter = 'all' | 'renter' | 'provider'
type StateFilter = 'all' | 'verified' | 'unverified' | 'pending' | 'suspended' | 'nosub' | 'reported'

const STATE_OPTIONS: { value: StateFilter; label: string }[] = [
  { value: 'all', label: 'Any state' },
  { value: 'verified', label: 'Verified' },
  { value: 'unverified', label: 'Not verified' },
  { value: 'pending', label: 'Waiting to be let in' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'nosub', label: 'Subscription off' },
  { value: 'reported', label: 'Has reports' },
]

const PAGE = 40

/** PEOPLE: renters and providers in one table, with the account drawer. */
export default function People() {
  const query = useQuery()
  const accounts = usePlatform((s) => s.accounts)
  const plans = usePlatform((s) => s.plans)
  const now = useNow(60_000).getTime()
  const [q, setQ] = useState('')
  const [side, setSide] = useState<SideFilter>((query.get('side') as SideFilter) ?? 'all')
  const [state, setState] = useState<StateFilter>((query.get('state') as StateFilter) ?? 'all')
  const [shown, setShown] = useState(PAGE)
  const [openId, setOpenId] = useState<string | null>(query.get('open'))

  const text = q.trim().toLowerCase()
  const rows = accounts.filter((a) => {
    if (side !== 'all' && a.side !== side) return false
    if (state === 'verified' && !a.verified) return false
    if (state === 'unverified' && a.verified) return false
    if (state === 'pending' && a.state !== 'pending') return false
    if (state === 'suspended' && a.state !== 'suspended') return false
    if (state === 'nosub' && a.subscription) return false
    if (state === 'reported' && !a.reports) return false
    if (!text) return true
    return [a.name, a.business, a.email, a.phone, a.city].some((v) => v.toLowerCase().includes(text))
  })

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? '—'

  const columns: Column<Account>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (a) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={a.business} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-center gap-1 font-semibold text-fg">
              <span className="truncate">{a.business}</span>
              {a.verified && <SealCheckIcon size={13} weight="fill" aria-label="Verified" className="shrink-0 text-accent" />}
            </span>
            <span className="truncate text-xs text-muted">{a.name}</span>
          </span>
        </span>
      ),
    },
    { key: 'side', header: 'Side', width: 'w-24', hide: 'sm', cell: (a) => <Tag tone={a.side === 'provider' ? 'brand' : 'neutral'}>{a.side === 'provider' ? 'Providing' : 'Renting'}</Tag> },
    { key: 'city', header: 'City', width: 'w-28', hide: 'md', cell: (a) => a.city },
    { key: 'plan', header: 'Plan', width: 'w-24', hide: 'lg', cell: (a) => <span className={cn(!a.subscription && 'text-muted')}>{planName(a.planId)}</span> },
    { key: 'gross', header: 'Rented', width: 'w-28', align: 'right', hide: 'sm', cell: (a) => (a.gross ? formatINR(a.gross) : '—') },
    { key: 'seen', header: 'Last seen', width: 'w-28', hide: 'lg', cell: (a) => <span className="text-muted">{timeAgo(a.lastSeen, now)}</span> },
    {
      key: 'state',
      header: 'State',
      width: 'w-40',
      cell: (a) => (
        <span className="flex flex-wrap items-center gap-1">
          <Tag tone={ACCOUNT_STATE[a.state].tone}>{ACCOUNT_STATE[a.state].label}</Tag>
          {a.reports > 0 && <Tag tone="warning">{a.reports} report{a.reports === 1 ? '' : 's'}</Tag>}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="People"
        subtitle={AREA.people.intent}
        meta={
          <>
            <Tag tone="neutral">{accounts.length} accounts</Tag>
            <Tag tone="neutral">{accounts.filter((a) => a.side === 'renter').length} renting</Tag>
            <Tag tone="neutral">{accounts.filter((a) => a.side === 'provider').length} providing</Tag>
          </>
        }
      />

      <Toolbar>
        <SearchInput value={q} onChange={(e) => setQ(e.currentTarget.value)} onClear={() => setQ('')} placeholder="Name, business, email, phone or city" className="w-full sm:w-80" />
        <Segmented
          value={side}
          onChange={(v) => {
            setSide(v)
            setShown(PAGE)
          }}
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'renter', label: 'Renting' },
            { value: 'provider', label: 'Providing' },
          ]}
        />
        <Select
          className="w-52"
          value={state}
          onChange={(e) => {
            setState(e.currentTarget.value as StateFilter)
            setShown(PAGE)
          }}
        >
          {STATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <span className="ml-auto text-[13px] text-muted">{rows.length.toLocaleString('en-IN')} shown</span>
      </Toolbar>

      <DataTable
        columns={columns}
        rows={rows.slice(0, shown)}
        rowKey={(a) => a.id}
        activeKey={openId ?? undefined}
        onRow={(a) => setOpenId(a.id)}
        empty={{ icon: UsersThreeIcon, title: 'Nobody matches', description: 'Try a different search, or clear the filters.' }}
      />
      <ShowMore shown={Math.min(shown, rows.length)} total={rows.length} step={PAGE} onMore={() => setShown((n) => n + PAGE)} />

      <AccountDrawer id={openId} onClose={() => setOpenId(null)} />
    </>
  )
}

/** ACCOUNT DRAWER: the tick, the checks, the plan, and letting them in or out. */
function AccountDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const account = usePlatform((s) => s.accounts.find((a) => a.id === id))
  const plans = usePlatform((s) => s.plans)
  const setVerified = usePlatform((s) => s.setVerified)
  const setCheck = usePlatform((s) => s.setCheck)
  const setAccountPlan = usePlatform((s) => s.setAccountPlan)
  const setSubscription = usePlatform((s) => s.setSubscription)
  const setAccountState = usePlatform((s) => s.setAccountState)
  const now = useNow(60_000).getTime()
  if (!account)
    return (
      <Drawer open={false} onClose={onClose} title="">
        {null}
      </Drawer>
    )

  const a = account
  const mine = plans.filter((p) => p.audience === a.side)

  const suspend = async () => {
    const ok = await confirm({
      title: `Suspend ${a.business}?`,
      message: a.side === 'provider' ? 'Their whole shelf leaves Discover straight away. The catalogue is untouched, so lifting it puts everything back.' : 'They keep their projects and boards, but cannot book anything.',
      confirmText: 'Suspend',
      tone: 'danger',
      icon: ProhibitIcon,
    })
    if (!ok) return
    setAccountState(a.id, 'suspended', 'Suspend')
    toast(`${a.business} suspended`, { tone: 'success' })
  }

  const lift = () => {
    setAccountState(a.id, 'active', 'Lift the suspension')
    toast(`${a.business} is back on`, { tone: 'success' })
  }

  const letIn = () => {
    setAccountState(a.id, 'active', 'Let them in')
    toast(`${a.business} can sign in`, { tone: 'success' })
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={a.business}
      subtitle={`${a.name} · ${a.side === 'provider' ? 'Providing' : 'Renting'} · ${a.city}`}
      badge={a.verified ? <SealCheckIcon size={16} weight="fill" aria-label="Verified" className="shrink-0 text-accent" /> : undefined}
      footer={
        <>
          {a.state === 'pending' && (
            <Button icon={CheckIcon} onClick={letIn}>
              Let them in
            </Button>
          )}
          {a.state === 'suspended' ? (
            <Button variant="secondary" onClick={lift}>
              Lift the suspension
            </Button>
          ) : (
            <Button variant="danger-ghost" icon={ProhibitIcon} onClick={suspend}>
              Suspend
            </Button>
          )}
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {a.state === 'suspended' && (
        <Banner tone="danger" icon={ProhibitIcon} title="Suspended" className="mb-4">
          {a.side === 'provider' ? 'Their stock is out of Discover. The catalogue is untouched — lifting this puts it all back.' : 'They can sign in and read, but cannot book anything.'}
        </Banner>
      )}
      {a.state === 'pending' && (
        <Banner tone="warning" icon={UserPlusIcon} title="Waiting to be let in" className="mb-4">
          They signed up {timeAgo(a.joined, now)} and cannot use the app until someone lets them in.
        </Banner>
      )}

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Avatar name={a.business} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-bold text-fg">{a.business}</p>
            <p className="truncate text-[13px] text-muted">{a.name}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-fg">Verified</p>
            <p className="text-xs text-muted">The tick both apps print, on cards and on their page.</p>
          </div>
          <Switch checked={a.verified} onChange={(on) => setVerified(a.id, on)} label="Verified" />
        </div>
      </Card>

      <SectionTitle className="mt-5">What has been checked</SectionTitle>
      <Card className="overflow-hidden">
        {CHECKS.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-3 border-b border-line px-4 py-2.5 last:border-0 hover:bg-surface-2">
            <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg', a.checks[c.id] ? TONE_SOFT.success : TONE_SOFT.neutral)}>
              <CheckIcon size={14} weight="bold" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-fg">{c.label}</span>
              <span className="block truncate text-xs text-muted">{c.note}</span>
            </span>
            <Switch checked={a.checks[c.id as CheckKind]} onChange={(on) => setCheck(a.id, c.id, on)} label={c.label} size="sm" />
          </label>
        ))}
      </Card>

      <SectionTitle className="mt-5">Plan</SectionTitle>
      <Card className="p-4">
        <Select label={`Plans for the ${a.side === 'provider' ? 'providing' : 'renting'} side`} value={a.planId} onChange={(e) => setAccountPlan(a.id, e.currentTarget.value)}>
          {mine.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.price ? `${formatINR(p.price)} a month` : 'free'}
            </option>
          ))}
        </Select>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-fg">Subscription running</p>
            <p className="text-xs text-muted">Off drops them to the free limits and keeps their data.</p>
          </div>
          <Switch checked={a.subscription} onChange={(on) => setSubscription(a.id, on)} label="Subscription running" />
        </div>
      </Card>

      <SectionTitle className="mt-5">On record</SectionTitle>
      <Card className="px-4 py-1">
        <dl className="divide-y divide-line">
          <KV label="Phone" value={formatPhone(a.phone)} />
          <KV label="Email" value={<span className="truncate">{a.email}</span>} />
          <KV label="Joined" value={timeAgo(a.joined, now)} />
          <KV label="Last seen" value={timeAgo(a.lastSeen, now)} />
          <KV label="Gross rented" value={a.gross ? formatINR(a.gross) : '—'} strong />
          <KV label="Orders" value={a.orders} />
          <KV label="Reports" value={a.reports || 'None'} warn={a.reports > 0} />
        </dl>
      </Card>

      {a.side === 'provider' && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={PackageIcon}
            onClick={() => {
              onClose()
              navigate(`/admin/listings?provider=${a.id}`)
            }}
          >
            Their listings
          </Button>
          {a.vendorId && (
            <Button variant="secondary" icon={ArrowSquareOutIcon} onClick={() => window.open(`${renterAppUrl().replace(/\/customer$/, '')}/customer/vendors/${a.vendorId}`, '_blank', 'noopener')}>
              See their page as a renter
            </Button>
          )}
        </div>
      )}
    </Drawer>
  )
}
