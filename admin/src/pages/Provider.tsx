import { ArrowLeftIcon, CalendarBlankIcon, CheckCircleIcon, ClockCounterClockwiseIcon, HammerIcon, PackageIcon, PlusIcon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { formatDateRangeShort, formatDayShort, todayISO } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { dayLayers, listingState, listingStats, orderMoney, STATE_META, tierRates, type Listing } from '@/lib/owner'
import { useFeeRate, useOwner } from '@/store/owner'
import { plural } from '~/lib/data'
import { linkProps, navigate } from '~/router'
import { MonthCalendar, MonthNav } from '~/ui/Calendar'
import { thisMonth } from '~/ui/month'
import { Button, Chip, SearchInput, Segmented, Switch, TextField } from '~/ui/controls'
import { Card, CardHeader, EmptyState, KV, Tag, Thumb } from '~/ui/display'
import { toast } from '~/ui/feedback'
import { DeclineDialog } from './inbox/panes'

type Tab = 'dash' | 'inventory' | 'requests' | 'earnings' | 'profile'
const TABS: { id: Tab; label: string }[] = [
  { id: 'dash', label: 'Dash' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'requests', label: 'Requests' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'profile', label: 'Profile' },
]

/**
 * OLDER VERSION (take one), kept at /provider for comparison. Not on the fork.
 * Dash · Inventory · Requests · Prop · Availability. Earnings and Profile were never built.
 */
export default function Provider({ tab = 'dash', propId, availability }: { tab?: Tab; propId?: string; availability?: boolean }) {
  const business = useOwner((s) => s.business)
  const current: Tab = propId ? 'inventory' : tab
  return (
    <div className="flex h-dvh flex-col bg-bg">
      <div className="flex items-center gap-2 bg-fg px-4 py-1.5 text-xs text-bg">
        <ClockCounterClockwiseIcon size={14} />
        <span className="min-w-0 flex-1 truncate">Older version · take one · kept for comparison</span>
        <a {...linkProps('/today')} className="font-semibold underline underline-offset-2">
          Open the current version
        </a>
      </div>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 pt-3">
          <span className="grid size-8 place-items-center rounded-md bg-surface-3 text-fg-2">
            <PackageIcon size={18} weight="fill" />
          </span>
          <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-fg">
            {business.name} <span className="font-normal text-muted">· Provider</span>
          </p>
          <Tag tone="neutral">Take one</Tag>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 no-scrollbar">
          {TABS.map((t) => (
            <a key={t.id} {...linkProps(t.id === 'dash' ? '/provider' : `/provider/${t.id}`)} className={cn('relative shrink-0 px-3 py-2.5 text-[13px] font-semibold', current === t.id ? 'text-fg' : 'text-muted hover:text-fg')}>
              {t.label}
              {current === t.id && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-fg" />}
            </a>
          ))}
        </nav>
      </header>
      <main className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-5">
          {propId ? availability ? <Availability id={propId} /> : <Prop id={propId} /> : current === 'dash' ? <Dash /> : current === 'inventory' ? <Inventory /> : current === 'requests' ? <Requests /> : <NotBuilt what={current === 'earnings' ? 'Earnings' : 'Profile'} />}
        </div>
      </main>
    </div>
  )
}

function NotBuilt({ what }: { what: string }) {
  return (
    <Card>
      <EmptyState icon={HammerIcon} title={`${what} wasn’t built in take one`} description="The current version has it." action={<Button onClick={() => navigate(what === 'Earnings' ? '/profile/payouts' : '/profile')}>Open it in the current version</Button>} />
    </Card>
  )
}

/** DASH → Needs you · Earned so far · Your stock */
function Dash() {
  const orders = useOwner((s) => s.orders)
  const requests = useOwner((s) => s.requests)
  const listings = useOwner((s) => s.listings)
  const fee = useFeeRate()
  const needs = orders.filter((o) => o.status === 'request').length + requests.filter((r) => r.status === 'open').length
  const earned = orders.filter((o) => ['out', 'returned', 'closed'].includes(o.status)).reduce((n, o) => n + orderMoney(o, listings.find((l) => l.id === o.listingId)!, fee).net, 0)
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Section title="Needs you">
        <p className="text-3xl font-bold tabular-nums text-fg">{needs}</p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => navigate('/provider/requests')}>
          See requests
        </Button>
      </Section>
      <Section title="Earned so far">
        <p className="text-3xl font-bold tabular-nums text-fg">{formatINR(earned)}</p>
        <p className="mt-2 text-xs text-muted">After the platform fee</p>
      </Section>
      <Section title="Your stock">
        <p className="text-3xl font-bold tabular-nums text-fg">{listings.length}</p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => navigate('/provider/inventory')}>
          Inventory
        </Button>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      {children}
    </Card>
  )
}

/** INVENTORY → Search · All/Active/Out/Paused · Listed switch · Add (not built) */
function Inventory() {
  const listings = useOwner((s) => s.listings)
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  const setListed = useOwner((s) => s.setListed)
  const [q, setQ] = useState('')
  const [f, setF] = useState<'all' | 'active' | 'out' | 'paused'>('all')
  const shown = listings.filter((l) => {
    const st = listingState(l, orders, holds)
    const ok = f === 'all' || (f === 'active' && l.listed) || (f === 'out' && st === 'out') || (f === 'paused' && !l.listed)
    return ok && l.name.toLowerCase().includes(q.trim().toLowerCase())
  })
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search" className="min-w-0 flex-1 basis-48" />
        <Segmented
          size="sm"
          value={f}
          onChange={setF}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'out', label: 'Out' },
            { value: 'paused', label: 'Paused' },
          ]}
        />
        <Button size="sm" icon={PlusIcon} disabled title="Not built in take one">
          Add
        </Button>
      </div>
      <Card>
        <ul className="divide-y divide-line">
          {shown.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
              <a {...linkProps(`/provider/prop/${l.id}`)} className="flex min-w-0 flex-1 items-center gap-3">
                <Thumb listing={l} className="size-10 rounded-md" iconSize={18} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-fg hover:underline">{l.name}</span>
                  <span className="block text-xs text-muted">
                    {formatINR(l.dayRate)}/day · {plural(l.pieces.length, 'piece')}
                  </span>
                </span>
              </a>
              <Switch size="sm" checked={l.listed} onChange={(on) => setListed([l.id], on)} label={`Listed: ${l.name}`} />
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

/** REQUESTS → Bookings (Accept · Decline with reason) · Questions (Answer) · Done */
function Requests() {
  const orders = useOwner((s) => s.orders)
  const requests = useOwner((s) => s.requests)
  const listings = useOwner((s) => s.listings)
  const accept = useOwner((s) => s.acceptOrder)
  const decline = useOwner((s) => s.declineOrder)
  const answer = useOwner((s) => s.answerRequest)
  const [tab, setTab] = useState<'bookings' | 'questions' | 'done'>('bookings')
  const [declining, setDeclining] = useState<{ key: number; open: boolean; id: string | null }>({ key: 0, open: false, id: null })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const nameOf = (id: string) => listings.find((l) => l.id === id)?.name ?? ''
  const bookings = orders.filter((o) => o.status === 'request')
  const questions = requests.filter((r) => r.status === 'open' && r.kind === 'question')
  const done = [...orders.filter((o) => o.status === 'declined' || o.status === 'confirmed'), ...requests.filter((r) => r.status === 'done')]

  return (
    <>
      <div className="mb-3 flex gap-2">
        <Chip selected={tab === 'bookings'} onClick={() => setTab('bookings')}>
          Bookings · {bookings.length}
        </Chip>
        <Chip selected={tab === 'questions'} onClick={() => setTab('questions')}>
          Questions · {questions.length}
        </Chip>
        <Chip selected={tab === 'done'} onClick={() => setTab('done')}>
          Done
        </Chip>
      </div>
      <Card>
        {tab === 'bookings' &&
          (bookings.length === 0 ? (
            <EmptyState icon={CheckCircleIcon} title="No booking requests" />
          ) : (
            <ul className="divide-y divide-line">
              {bookings.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 basis-56">
                    <span className="block text-sm font-semibold text-fg">
                      {o.renter.company} · {nameOf(o.listingId)} × {o.qty}
                    </span>
                    <span className="block text-xs text-muted">{formatDateRangeShort(o.from, o.to)}</span>
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => setDeclining((s) => ({ key: s.key + 1, open: true, id: o.id }))}>
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      accept(o.id)
                      toast('Accepted', { tone: 'success' })
                    }}
                  >
                    Accept
                  </Button>
                </li>
              ))}
            </ul>
          ))}
        {tab === 'questions' &&
          (questions.length === 0 ? (
            <EmptyState icon={CheckCircleIcon} title="No questions" />
          ) : (
            <ul className="divide-y divide-line">
              {questions.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <p className="text-sm font-semibold text-fg">
                    {r.renter.company} · {nameOf(r.listingId)}
                  </p>
                  <p className="text-[13px] text-fg-2">{r.text}</p>
                  <div className="mt-2 flex gap-2">
                    <TextField className="flex-1" placeholder="Answer" value={answers[r.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [r.id]: e.target.value }))} />
                    <Button
                      disabled={!answers[r.id]?.trim()}
                      onClick={() => {
                        answer(r.id, answers[r.id].trim())
                        toast('Answered', { tone: 'success' })
                      }}
                    >
                      Answer
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ))}
        {tab === 'done' && (
          <ul className="divide-y divide-line">
            {done.map((d) => (
              <li key={d.id} className="px-4 py-2.5 text-sm text-fg-2">
                {'renter' in d && 'qty' in d ? `${d.renter.company} · ${nameOf(d.listingId)} · ${d.status}` : `${d.renter.company} · answered`}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <DeclineDialog
        key={declining.key}
        open={declining.open}
        onClose={() => setDeclining((s) => ({ ...s, open: false }))}
        onDecline={(reason) => {
          if (declining.id) decline(declining.id, reason)
          setDeclining((s) => ({ ...s, open: false }))
          toast('Declined')
        }}
      />
    </>
  )
}

function useLegacyListing(id: string) {
  return useOwner((s) => s.listings.find((l) => l.id === id))
}

/** PROP → Earnings · Listed switch · Pricing · Availability */
function Prop({ id }: { id: string }) {
  const l = useLegacyListing(id)
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  const setListed = useOwner((s) => s.setListed)
  const fee = useFeeRate()
  if (!l) return <EmptyState icon={PackageIcon} title="Not found" />
  const stats = listingStats(l, orders, holds, fee)
  const t = tierRates(l.dayRate)
  return (
    <>
      <BackLink to="/provider/inventory" label="Inventory" />
      <div className="flex items-center gap-3">
        <Thumb listing={l} className="size-16 rounded-lg" iconSize={26} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-fg">{l.name}</h1>
          <Tag tone={STATE_META[listingState(l, orders, holds)].tone}>{STATE_META[listingState(l, orders, holds)].label}</Tag>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Section title="Earnings">
          <p className="text-2xl font-bold tabular-nums text-fg">{formatINR(stats.earned)}</p>
          <p className="text-xs text-muted">{plural(stats.bookings, 'booking')}</p>
        </Section>
        <Card className="flex items-center gap-3 p-4">
          <span className="flex-1 text-sm font-semibold text-fg">Listed</span>
          <Switch checked={l.listed} onChange={(on) => setListed([l.id], on)} label="Listed" />
        </Card>
        <Card>
          <CardHeader title="Pricing" />
          <dl className="divide-y divide-line px-4">
            <KV label="1–2 days" value={formatINR(t.short)} />
            <KV label="3–6 days" value={formatINR(t.mid)} />
            <KV label="7+ days" value={formatINR(t.long)} />
          </dl>
        </Card>
        <a {...linkProps(`/provider/prop/${l.id}/availability`)} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-card hover:bg-surface-2">
          <CalendarBlankIcon size={22} className="text-muted" />
          <span className="flex-1 text-sm font-semibold text-fg">Availability</span>
        </a>
      </div>
    </>
  )
}

/** AVAILABILITY → Month calendar · Tap to block/free · Bookings on this prop */
function Availability({ id }: { id: string }) {
  const l = useLegacyListing(id)
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  const addBlock = useOwner((s) => s.addBlock)
  const removeBlock = useOwner((s) => s.removeBlock)
  const [view, setView] = useState(thisMonth)
  if (!l) return <EmptyState icon={PackageIcon} title="Not found" />
  const today = todayISO()
  const bookings = orders.filter((o) => o.listingId === l.id && (o.status === 'confirmed' || o.status === 'out'))
  const tap = (date: string, listing: Listing) => {
    const d = dayLayers(listing, orders, holds, date)
    if (d.blocked.length) {
      removeBlock(listing.id, d.blocked[0].id)
      toast(`${formatDayShort(date)} freed`)
    } else {
      addBlock(listing.id, { from: date, to: date, note: '' })
      toast(`${formatDayShort(date)} blocked`)
    }
  }
  return (
    <>
      <BackLink to={`/provider/prop/${l.id}`} label={l.name} />
      <h1 className="mb-3 text-xl font-bold text-fg">Availability</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="p-4">
          <MonthNav view={view} onView={setView} className="mb-3" />
          <MonthCalendar
            variant="compact"
            view={view}
            onDay={(date) => tap(date, l)}
            cell={(date) => {
              const d = dayLayers(l, orders, holds, date)
              return {
                disabled: date < today,
                className: cn(date < today && 'opacity-40', d.blocked.length ? 'bg-surface-3 text-muted line-through' : d.booked.length ? 'bg-accent-soft text-accent-soft-fg' : 'hover:bg-surface-2'),
              }
            }}
          />
          <p className="mt-2 text-xs text-muted">Tap a day to block or free it.</p>
        </Card>
        <Card>
          <CardHeader title="Bookings on this prop" />
          {bookings.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-muted">None</p>
          ) : (
            <ul className="divide-y divide-line">
              {bookings.map((o) => (
                <li key={o.id} className="px-4 py-2.5 text-[13px]">
                  <span className="block font-semibold text-fg">{o.renter.company}</span>
                  <span className="text-muted">
                    {formatDateRangeShort(o.from, o.to)} · {o.qty} pc
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <a {...linkProps(to)} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-fg">
      <ArrowLeftIcon size={14} /> {label}
    </a>
  )
}
