import {
  ArrowRightIcon,
  ArrowUUpLeftIcon,
  CalendarXIcon,
  CaretRightIcon,
  ChatCircleTextIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  CurrencyInrIcon,
  HandCoinsIcon,
  PackageIcon,
  PlusCircleIcon,
  QrCodeIcon,
  QuestionIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  StarIcon,
  SwapIcon,
  TimerIcon,
  TruckIcon,
  WarningIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { PROMOTION } from '@/data/owner'
import { cn } from '@/lib/cn'
import { formatDateLong, formatDayShort, todayISO } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import {
  activeHolds,
  ANSWER_META,
  answerNow,
  ATTENTION_META,
  attention,
  inRepair,
  lateFee,
  movingToday,
  nextPayoutDate,
  orderMoney,
  payoutSummary,
  piecesBooked,
  ratingSummary,
  type AnswerKind,
  type Listing,
  type Order,
} from '@/lib/owner'
import { useFeeRate, useOwner } from '@/store/owner'
import { plural } from '~/lib/data'
import { fromOwnerPath, linkProps, navigate } from '~/router'
import { Button } from '~/ui/controls'
import { Card, CardHeader, CountBadge, DueTag, PageHeader, ProgressBar, Stat, Tag, Thumb } from '~/ui/display'

const ANSWER_ICON: Record<AnswerKind, Icon> = { booking: CalendarXIcon, question: QuestionIcon, change: SwapIcon, damage: WarningIcon, deposit: ShieldCheckIcon }

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/** TODAY: money, KPIs, promotion, quick actions, answer now, moving today, reservations, stock to fix. */
export default function Today() {
  const listings = useOwner((s) => s.listings)
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  const requests = useOwner((s) => s.requests)
  const reviews = useOwner((s) => s.reviews)
  const owner = useOwner((s) => s.business.owner)
  const fee = useFeeRate()
  const now = useNow(30_000).getTime()
  const today = todayISO()
  const listingOf = (id: string) => listings.find((l) => l.id === id)
  const nameOf = (id: string) => listingOf(id)?.name ?? 'Listing'

  const month = today.slice(0, 7)
  const earned = orders.filter((o) => ['out', 'returned', 'closed'].includes(o.status) && o.from.slice(0, 7) === month).reduce((n, o) => n + orderMoney(o, listingOf(o.listingId)!, fee).net + o.claim, 0)
  const payout = payoutSummary(orders, listingOf, fee)
  const activeBookings = orders.filter((o) => o.status === 'confirmed' || o.status === 'out')
  const totalPieces = listings.filter((l) => !l.review).reduce((n, l) => n + l.pieces.length - inRepair(l), 0)
  const outToday = listings.reduce((n, l) => n + piecesBooked(l.id, orders, today), 0)
  const utilisation = totalPieces ? Math.round((outToday / totalPieces) * 100) : 0
  const rating = ratingSummary(reviews)
  const live = listings.filter((l) => l.listed && !l.review).length
  const answers = answerNow(orders, requests, nameOf)
  const moving = movingToday(orders, today)
  const held = activeHolds(holds, now).sort((a, b) => a.until - b.until)
  const expiring = held.filter((h) => h.until - now < 6 * 3_600_000)
  const fix = attention(listings, orders)
  const messages = requests.filter((r) => r.status === 'open').length + orders.filter((o) => o.status === 'request').length

  const quick: { label: string; hint: string; icon: Icon; to: string; badge?: number }[] = [
    { label: 'Add stock', hint: 'Rapid capture, one item or a list', icon: PlusCircleIcon, to: '/add' },
    { label: 'Block dates', hint: 'Pick a listing, then the days', icon: CalendarXIcon, to: '/diary?block=1' },
    { label: 'Scan a code', hint: 'Handover: pack or check in', icon: QrCodeIcon, to: '/handover' },
    { label: 'Messages', hint: 'Bookings, questions, changes', icon: ChatCircleTextIcon, to: '/requests', badge: messages },
  ]

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${owner.split(' ')[0]}`}
        subtitle={
          <>
            {formatDateLong(today)} · {answers.length ? <span className="font-semibold text-fg-2">{plural(answers.length, 'thing')} waiting on you</span> : 'Nothing waiting on you'}
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon={QrCodeIcon} onClick={() => navigate('/handover')}>
              Scan a code
            </Button>
            <Button icon={PlusCircleIcon} onClick={() => navigate('/add')}>
              Add stock
            </Button>
          </>
        }
      />

      {/* Earned this month · KPIs */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <a {...linkProps('/profile/payouts')} className="group relative flex flex-col overflow-hidden rounded-xl bg-accent p-5 text-accent-fg shadow-float xl:col-span-5">
          <CurrencyInrIcon aria-hidden size={150} weight="fill" className="absolute -right-6 -top-8 opacity-10" />
          <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-80">Earned this month</p>
          <p className="mt-1 font-display text-[34px] font-extrabold leading-tight tabular-nums tracking-[-0.02em]">{formatINR(earned)}</p>
          <div className="my-4 grid grid-cols-3 divide-x divide-white/20 rounded-lg bg-white/10 py-2.5">
            {(
              [
                ['Coming to you', payout.coming],
                ['Settled so far', payout.settled],
                ['Deposits held', payout.deposits],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className="min-w-0 px-3">
                <p className="truncate text-[15px] font-bold tabular-nums">{formatINR(v)}</p>
                <p className="truncate text-[11px] opacity-80">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-[13px] transition-colors group-hover:bg-white/20">
            <HandCoinsIcon size={17} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              Next payout <span className="font-bold">{formatINR(payout.next)}</span> on {formatDayShort(nextPayoutDate(today))}
            </span>
            <span className="flex shrink-0 items-center gap-1 font-semibold">
              Payouts <ArrowRightIcon size={14} weight="bold" />
            </span>
          </div>
        </a>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:col-span-7 xl:grid-cols-2 min-[1600px]:grid-cols-4">
          <Stat label="Active bookings" value={activeBookings.length} hint={`${activeBookings.filter((o) => o.status === 'out').length} out now`} icon={PackageIcon} onClick={() => navigate('/requests')} />
          <Stat
            label="Utilisation"
            value={`${utilisation}%`}
            hint={
              <span className="flex items-center gap-2">
                <ProgressBar value={utilisation} className="flex-1" /> {outToday}/{totalPieces}
              </span>
            }
            icon={TimerIcon}
            tone="info"
            onClick={() => navigate('/diary')}
          />
          <Stat
            label="Rating"
            value={
              <span className="flex items-center gap-1.5">
                {rating.avg.toFixed(1)} <StarIcon size={18} weight="fill" className="text-amber-500" />
              </span>
            }
            hint={`${reviews.length} reviews · ${rating.unreplied} to reply`}
            icon={StarIcon}
            tone="warning"
            onClick={() => navigate('/profile/reviews')}
          />
          <Stat label="Listed / live" value={`${live}/${listings.length}`} hint={`${listings.filter((l) => !l.listed).length} paused · ${listings.filter((l) => l.review).length} in review`} icon={CheckCircleIcon} tone="success" onClick={() => navigate('/stock')} />
        </div>
      </div>

      {/* Promotion strip */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-accent/15 bg-accent-soft px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg">
          <RocketLaunchIcon size={18} weight="fill" />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-sm font-bold text-accent-soft-fg">{PROMOTION.title}</p>
          <p className="text-[13px] text-fg-2">{PROMOTION.text}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => navigate('/profile/promote')}>
          Boost a listing
        </Button>
      </div>

      {/* Quick actions */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {quick.map((q) => (
          <a key={q.label} {...linkProps(q.to)} className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-card transition-[border-color,box-shadow] hover:border-accent/40 hover:shadow-float">
            <span className="relative grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
              <q.icon size={21} weight="duotone" />
              {q.badge ? <CountBadge n={q.badge} className="absolute -right-1.5 -top-1.5 ring-2 ring-surface" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-fg">{q.label}</span>
              <span className="hidden truncate text-xs text-muted sm:block">{q.hint}</span>
            </span>
            <CaretRightIcon size={14} weight="bold" className="hidden shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent sm:block" />
          </a>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          {/* Answer now */}
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  Answer now <CountBadge n={answers.length} />
                </span>
              }
              subtitle="24-hour clock · most overdue first"
              actions={
                <Button size="sm" variant="ghost" iconRight={ArrowRightIcon} onClick={() => navigate('/requests')}>
                  All messages
                </Button>
              }
            />
            {answers.length === 0 ? (
              <AllClear text="Nothing waiting on you. Nice." />
            ) : (
              <ul className="divide-y divide-line">
                {answers.map((a) => {
                  const AIcon = ANSWER_ICON[a.kind]
                  return (
                    <li key={a.id}>
                      <a {...linkProps(fromOwnerPath(a.to))} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/70">
                        <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', a.kind === 'damage' ? 'bg-danger-soft text-danger' : a.kind === 'deposit' ? 'bg-success-soft text-success' : 'bg-accent-soft text-accent')}>
                          <AIcon size={18} weight="duotone" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted">{ANSWER_META[a.kind].label}</span>
                          </span>
                          <span className="block truncate text-sm font-semibold text-fg">{a.title}</span>
                          <span className="block truncate text-[13px] text-muted">{a.detail}</span>
                        </span>
                        <DueTag due={a.due} />
                        <span className="hidden shrink-0 rounded-md border border-line-strong px-2.5 py-1 text-xs font-semibold text-fg-2 transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-accent-fg sm:inline">{a.kind === 'booking' ? 'Review' : a.kind === 'deposit' ? 'Settle' : 'Reply'}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {/* Moving today */}
          <Card>
            <CardHeader
              title="Moving today"
              subtitle="Pack what’s going out, check what’s coming back"
              actions={
                <Button size="sm" variant="secondary" icon={QrCodeIcon} onClick={() => navigate('/handover')}>
                  Scan
                </Button>
              }
            />
            {moving.overdue.length + moving.out.length + moving.back.length === 0 ? (
              <AllClear text="Nothing going out or coming back today." />
            ) : (
              <div className="grid grid-cols-1 divide-y divide-line">
                <MoveGroup title="Overdue returns" note="Late fee running" icon={ClockCountdownIcon} tone="danger" orders={moving.overdue} listingOf={listingOf} today={today} />
                <MoveGroup title="Going out" note="Pack list" icon={TruckIcon} tone="brand" orders={moving.out} listingOf={listingOf} today={today} />
                <MoveGroup title="Coming back" note="Check against out photos" icon={ArrowUUpLeftIcon} tone="warning" orders={moving.back} listingOf={listingOf} today={today} />
              </div>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {/* Reservations */}
          <Card>
            <CardHeader
              title="Reservations"
              subtitle="Renters holding pieces for 24 hours"
              actions={
                <Button size="sm" variant="ghost" iconRight={ArrowRightIcon} onClick={() => navigate('/diary')}>
                  Diary
                </Button>
              }
            />
            <div className="grid grid-cols-3 divide-x divide-line border-b border-line py-3 text-center">
              <Mini value={held.reduce((n, h) => n + h.qty, 0)} label="Pieces held" />
              <Mini value={new Set(held.map((h) => h.renter.company)).size} label="Renters" />
              <Mini value={expiring.length} label="Expiring soon" tone={expiring.length ? 'text-warning' : undefined} />
            </div>
            {held.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-muted">No holds right now.</p>
            ) : (
              <ul className="divide-y divide-line">
                {held.map((h) => {
                  const l = listingOf(h.listingId)
                  const left = h.until - now
                  return (
                    <li key={h.id}>
                      <a {...linkProps(`/stock/${h.listingId}`)} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/70">
                        {l && <Thumb listing={l} className="size-9 rounded-lg" iconSize={16} />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-fg">
                            {l?.name} × {h.qty}
                          </span>
                          <span className="block truncate text-xs text-muted">{h.renter.company}</span>
                        </span>
                        <Tag tone={left < 6 * 3_600_000 ? 'warning' : 'neutral'}>{Math.max(0, Math.floor(left / 3_600_000))}h left</Tag>
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {/* Stock needs attention */}
          <Card>
            <CardHeader
              title="Stock needs attention"
              subtitle={fix.length ? `${plural(fix.reduce((n, g) => n + g.listings.length, 0), 'listing')} to look at` : 'All your stock looks good'}
              actions={
                <Button size="sm" variant="ghost" iconRight={ArrowRightIcon} onClick={() => navigate('/stock')}>
                  Stock
                </Button>
              }
            />
            {fix.length === 0 ? (
              <AllClear text="Every listing has what renters need." />
            ) : (
              <div className="divide-y divide-line">
                {fix.map((g) => (
                  <div key={g.kind} className="px-4 py-3">
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
                      <span className="min-w-0 flex-1">{ATTENTION_META[g.kind].title}</span>
                      <CountBadge n={g.listings.length} tone="neutral" />
                    </p>
                    <p className="text-xs text-muted">{ATTENTION_META[g.kind].hint}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {g.listings.map((l) => (
                        <a key={l.id} {...linkProps(`/stock/${l.id}`)} className="flex max-w-full items-center gap-2 rounded-lg border border-line bg-surface-2/60 py-1 pl-1 pr-2.5 transition-colors hover:border-accent/40 hover:bg-accent-soft">
                          <Thumb listing={l} className="size-6 rounded-md" iconSize={13} />
                          <span className="truncate text-xs font-semibold text-fg">{l.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

function AllClear({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 px-4 py-4 text-sm text-muted">
      <CheckCircleIcon size={18} weight="fill" className="shrink-0 text-success" /> {text}
    </p>
  )
}

function Mini({ value, label, tone }: { value: ReactNode; label: string; tone?: string }) {
  return (
    <span className="px-1">
      <span className={cn('block font-display text-xl font-extrabold tabular-nums text-fg', tone)}>{value}</span>
      <span className="block text-[11px] text-muted">{label}</span>
    </span>
  )
}

function MoveGroup({ title, note, icon: GIcon, tone, orders, listingOf, today }: { title: string; note: string; icon: Icon; tone: 'danger' | 'brand' | 'warning'; orders: Order[]; listingOf: (id: string) => Listing | undefined; today: string }) {
  if (!orders.length) return null
  return (
    <div className="py-1">
      <p className={cn('flex items-center gap-2 px-4 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-[0.08em]', tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-accent')}>
        <GIcon size={14} weight="bold" /> {title} · {orders.length}
        <span className="ml-auto font-semibold normal-case tracking-normal text-muted">{note}</span>
      </p>
      {orders.map((o) => {
        const l = listingOf(o.listingId)
        const late = l && tone === 'danger' ? lateFee(o, l, today) : null
        return (
          <a key={o.id} {...linkProps(`/handover/${o.id}`)} className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-surface-2/70">
            {l && <Thumb listing={l} className="size-10 rounded-lg" iconSize={18} />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-fg">
                {l?.name} × {o.qty}
              </span>
              <span className="block truncate text-xs text-muted">
                {o.renter.company} · {o.id} · {o.delivery ? 'you deliver' : 'they collect'}
              </span>
            </span>
            {late ? (
              <Tag tone="danger">
                {late.days}d late · {formatINR(late.amount)}
              </Tag>
            ) : (
              <span className="hidden text-xs font-semibold text-accent group-hover:inline">{tone === 'brand' ? 'Pack list' : 'Check in'}</span>
            )}
            <CaretRightIcon size={14} weight="bold" className="shrink-0 text-subtle" />
          </a>
        )
      })}
    </div>
  )
}
