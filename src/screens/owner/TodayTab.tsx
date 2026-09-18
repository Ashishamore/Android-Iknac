import {
  ArrowRightIcon,
  CalendarXIcon,
  CaretRightIcon,
  ChatCircleTextIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  CurrencyInrIcon,
  PackageIcon,
  PlusCircleIcon,
  QrCodeIcon,
  QuestionIcon,
  ShieldCheckIcon,
  SwapIcon,
  TruckIcon,
  ArrowUUpLeftIcon,
  WarningIcon,
  type Icon,
} from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { ListingThumb, OwnerAppBar, DueTag, StatTile } from '@/components/owner/OwnerUI'
import { PROMOTION } from '@/data/owner'
import { cn } from '@/lib/cn'
import { formatDayShort, todayISO } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { EASE_OUT } from '@/lib/motion'
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
import { nav } from '@/navigation'
import { useFeeRate, useOwner, useOwnerUi } from '@/store/owner'
import { LargeTitle, Screen, SectionHeader, Tag } from '@/ui'
import { CampaignStrip } from '@/components/platform/Promo'
import type { Campaign } from '@/lib/platform'
import { usePlatform, useSlotCampaign } from '@/store/platform'

const ANSWER_ICON: Record<AnswerKind, Icon> = {
  booking: CalendarXIcon,
  question: QuestionIcon,
  change: SwapIcon,
  damage: WarningIcon,
  deposit: ShieldCheckIcon,
}

/** TODAY: money, KPIs, what needs answering, today's handovers, holds and stock to fix. */
export default function TodayTab() {
  const listings = useOwner((s) => s.listings)
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  const requests = useOwner((s) => s.requests)
  const reviews = useOwner((s) => s.reviews)
  const fee = useFeeRate()
  const setBlockPicker = useOwnerUi((s) => s.setBlockPicker)
  const now = useNow(30_000).getTime()
  const today = todayISO()
  const listingOf = (id: string) => listings.find((l) => l.id === id)
  const nameOf = (id: string) => listingOf(id)?.name ?? 'Listing'

  const month = today.slice(0, 7)
  const earned = orders
    .filter((o) => ['out', 'returned', 'closed'].includes(o.status) && o.from.slice(0, 7) === month)
    .reduce((n, o) => n + orderMoney(o, listingOf(o.listingId)!, fee).net + o.claim, 0)
  const payout = payoutSummary(orders, listingOf, fee)
  const activeBookings = orders.filter((o) => o.status === 'confirmed' || o.status === 'out').length
  const totalPieces = listings.filter((l) => !l.review).reduce((n, l) => n + l.pieces.length - inRepair(l), 0)
  const outToday = listings.reduce((n, l) => n + piecesBooked(l.id, orders, today), 0)
  const utilisation = totalPieces ? Math.round((outToday / totalPieces) * 100) : 0
  const rating = ratingSummary(reviews)
  const live = listings.filter((l) => l.listed && !l.review).length
  const answers = answerNow(orders, requests, nameOf)
  const moving = movingToday(orders, today)
  const held = activeHolds(holds, now)
  const expiring = held.filter((h) => h.until - now < 6 * 3_600_000)
  const fix = attention(listings, orders)
  const openRequests = requests.filter((r) => r.status === 'open').length + orders.filter((o) => o.status === 'request').length

  const quick: { label: string; icon: Icon; badge?: number; onClick: () => void }[] = [
    { label: 'Add stock', icon: PlusCircleIcon, onClick: () => nav.switchTab('add') },
    {
      label: 'Block dates',
      icon: CalendarXIcon,
      onClick: () => {
        setBlockPicker(true)
        nav.switchTab('diary')
      },
    },
    { label: 'Scan a code', icon: QrCodeIcon, onClick: () => nav.push('/renter/handover') },
    { label: 'Messages', icon: ChatCircleTextIcon, badge: openRequests, onClick: () => nav.push('/renter/requests') },
  ]

  return (
    <Screen header={<OwnerAppBar />}>
      <LargeTitle title="Today" subtitle={formatDayShort(today)} className="@medium:mx-auto @medium:max-w-2xl" />

      {/* Earned this month → Payouts */}
      <div className="px-4 @medium:mx-auto @medium:max-w-2xl">
        <motion.button
          type="button"
          onClick={() => nav.push('/renter/profile/payouts')}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="pressable relative w-full overflow-hidden rounded-3xl bg-accent p-4 text-left text-accent-fg shadow-float"
        >
          <CurrencyInrIcon aria-hidden size={110} weight="fill" className="absolute -right-5 -top-4 opacity-10" />
          <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-80">Earned this month</p>
          <p className="mt-1 font-display text-[30px] font-extrabold leading-tight tabular-nums">{formatINR(earned)}</p>
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">
              Next payout <span className="font-bold">{formatINR(payout.next)}</span> on {formatDayShort(nextPayoutDate(today))}
            </span>
            <ArrowRightIcon size={16} weight="bold" className="shrink-0" />
          </div>
        </motion.button>

        {/* KPIs */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <StatTile value={activeBookings} label="Active" hint="bookings" onClick={() => nav.push('/renter/requests?tab=bookings')} />
          <StatTile value={`${utilisation}%`} label="Utilised" hint="today" onClick={() => nav.switchTab('diary')} />
          <StatTile value={rating.avg.toFixed(1)} label="Rating" hint={`${reviews.length} reviews`} onClick={() => nav.push('/renter/profile/reviews')} />
          <StatTile value={`${live}/${listings.length}`} label="Live" hint="of listed" onClick={() => nav.switchTab('stock')} />
        </div>

        {/* Promotion strip · the Provider Today advertising slot */}
        <TodayPromo />

        {/* Quick actions */}
        <div className="mt-5 grid grid-cols-4 gap-2">
          {quick.map((q) => (
            <button key={q.label} type="button" onClick={q.onClick} aria-label={q.badge ? `${q.label} (${q.badge})` : q.label} className="pressable flex flex-col items-center gap-1.5 outline-none">
              <span className="relative grid size-14 place-items-center rounded-2xl bg-surface text-accent shadow-card">
                <q.icon size={26} weight="duotone" />
                {q.badge ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white ring-2 ring-bg">{q.badge}</span>
                ) : null}
              </span>
              <span className="text-center text-xs font-medium leading-tight text-fg-2">{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pb-8 @medium:mx-auto @medium:max-w-2xl">
        {/* Answer now */}
        <SectionHeader title="Answer now" subtitle={answers.length ? '24-hour clock · most overdue first' : undefined} className="pt-7" />
        {answers.length === 0 ? (
          <Done text="Nothing waiting on you. Nice." />
        ) : (
          <div className="mx-4 overflow-hidden rounded-2xl bg-surface shadow-card">
            {answers.map((a) => {
              const AIcon = ANSWER_ICON[a.kind]
              return (
                <button key={a.id} type="button" onClick={() => nav.push(a.to)} className="group relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2">
                  <span className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl', a.kind === 'damage' ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent')}>
                    <AIcon size={18} weight="duotone" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-muted">{ANSWER_META[a.kind].label}</span>
                      <DueTag due={a.due} />
                    </span>
                    <span className="block truncate text-[15px] font-semibold text-fg">{a.title}</span>
                    <span className="block truncate text-[13px] text-muted">{a.detail}</span>
                  </span>
                  <span aria-hidden className="absolute bottom-0 left-16 right-0 h-px bg-line group-last:hidden" />
                </button>
              )
            })}
          </div>
        )}

        {/* Moving today */}
        <SectionHeader title="Moving today" subtitle="Tap one to pack or check it" action="Scan" onAction={() => nav.push('/renter/handover')} className="pt-7" />
        {moving.overdue.length + moving.out.length + moving.back.length === 0 ? (
          <Done text="Nothing going out or coming back today." />
        ) : (
          <div className="mx-4 space-y-2.5">
            <MoveGroup title="Overdue returns" note="Late fee running" icon={ClockCountdownIcon} tone="danger" orders={moving.overdue} listingOf={listingOf} today={today} />
            <MoveGroup title="Going out" note="Pack list" icon={TruckIcon} tone="brand" orders={moving.out} listingOf={listingOf} today={today} />
            <MoveGroup title="Coming back" note="Check against out photos" icon={ArrowUUpLeftIcon} tone="warning" orders={moving.back} listingOf={listingOf} today={today} />
          </div>
        )}

        {/* Reservations */}
        <SectionHeader title="Reservations" subtitle="Renters holding pieces for 24 hours" action="Diary" onAction={() => nav.switchTab('diary')} className="pt-7" />
        <button type="button" onClick={() => nav.switchTab('diary')} className="pressable mx-4 grid w-[calc(100%-2rem)] grid-cols-3 divide-x divide-line rounded-2xl bg-surface py-3 text-center shadow-card">
          <Mini value={held.reduce((n, h) => n + h.qty, 0)} label="Pieces held" />
          <Mini value={new Set(held.map((h) => h.renter.company)).size} label="Renters" />
          <Mini value={expiring.length} label="Expiring soon" tone={expiring.length ? 'text-warning' : undefined} />
        </button>

        {/* Stock needs attention */}
        <SectionHeader title="Stock needs attention" subtitle={fix.length ? undefined : 'All your stock looks good'} action="Stock" onAction={() => nav.switchTab('stock')} className="pt-7" />
        <div className="mx-4 space-y-2.5">
          {fix.map((g) => (
            <div key={g.kind} className="rounded-2xl bg-surface p-3.5 shadow-card">
              <p className="text-[15px] font-semibold text-fg">
                {ATTENTION_META[g.kind].title} <span className="font-normal text-muted">· {g.listings.length}</span>
              </p>
              <p className="text-[13px] text-muted">{ATTENTION_META[g.kind].hint}</p>
              <div className="no-scrollbar -mx-3.5 mt-2.5 flex gap-2 overflow-x-auto px-3.5">
                {g.listings.map((l) => (
                  <button key={l.id} type="button" onClick={() => nav.push(`/renter/stock/${l.id}`)} className="pressable flex shrink-0 items-center gap-2 rounded-xl bg-surface-2 py-1.5 pl-1.5 pr-3">
                    <ListingThumb listing={l} className="size-8 rounded-lg" iconSize={16} />
                    <span className="max-w-40 truncate text-[13px] font-semibold text-fg">{l.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  )
}

function Done({ text }: { text: string }) {
  return (
    <p className="mx-4 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3.5 text-sm text-muted shadow-card">
      <CheckCircleIcon size={18} weight="fill" className="shrink-0 text-success" /> {text}
    </p>
  )
}

function Mini({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <span className="px-1">
      <span className={cn('block font-display text-xl font-extrabold tabular-nums text-fg', tone)}>{value}</span>
      <span className="block text-xs text-muted">{label}</span>
    </span>
  )
}

function MoveGroup({
  title,
  note,
  icon: GIcon,
  tone,
  orders,
  listingOf,
  today,
}: {
  title: string
  note: string
  icon: Icon
  tone: 'danger' | 'brand' | 'warning'
  orders: Order[]
  listingOf: (id: string) => Listing | undefined
  today: string
}) {
  if (!orders.length) return null
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
      <p className={cn('flex items-center gap-2 px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-[0.07em]', tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-accent')}>
        <GIcon size={15} weight="bold" /> {title} · {orders.length}
        <span className="ml-auto font-semibold normal-case tracking-normal text-muted">{note}</span>
      </p>
      {orders.map((o) => {
        const l = listingOf(o.listingId)
        const fee = l && tone === 'danger' ? lateFee(o, l, today) : null
        return (
          <button key={o.id} type="button" onClick={() => nav.push(`/renter/handover/${o.id}`)} className="group relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-surface-2">
            {l ? <ListingThumb listing={l} className="size-10 shrink-0 rounded-xl" iconSize={18} /> : <PackageIcon size={20} />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-fg">
                {l?.name} × {o.qty}
              </span>
              <span className="block truncate text-[13px] text-muted">
                {o.renter.company} · {o.id}
              </span>
            </span>
            {fee ? (
              <Tag tone="danger">
                {fee.days}d late · {formatINR(fee.amount)}
              </Tag>
            ) : (
              <CaretRightIcon size={15} weight="bold" className="shrink-0 text-subtle" />
            )}
            <span aria-hidden className="absolute bottom-0 left-[68px] right-0 h-px bg-line group-last:hidden" />
          </button>
        )
      })}
    </div>
  )
}

/** The "Provider Today" slot: whatever campaign the Control Centre has running. */
function TodayPromo() {
  const campaign = useSlotCampaign('provider-today')
  const tap = usePlatform((s) => s.tapCampaign)
  const promo: Campaign = campaign ?? {
    id: 'house',
    name: 'House',
    slot: 'provider-today',
    headline: PROMOTION.title,
    sub: PROMOTION.text,
    button: '',
    propId: null,
    to: '/renter/profile/promote',
    starts: '',
    ends: '',
    priority: 0,
    sponsored: false,
    ratePerDay: 0,
    shown: 0,
    taps: 0,
    live: true,
  }
  return (
    <CampaignStrip
      className="mt-3"
      campaign={promo}
      onOpen={() => {
        if (campaign) tap(campaign.id)
        nav.push(promo.to)
      }}
    />
  )
}
