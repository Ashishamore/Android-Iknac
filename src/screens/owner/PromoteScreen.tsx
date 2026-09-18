import { MegaphoneIcon, RocketLaunchIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { ListingThumb } from '@/components/owner/OwnerUI'
import { BOOST_OPTIONS } from '@/data/owner'
import { cn } from '@/lib/cn'
import { formatDayShort, toISODate } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep, useNow } from '@/lib/hooks'
import type { Listing } from '@/lib/owner'
import { useQuery } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useOwner } from '@/store/owner'
import { AppBar, Button, Card, Chip, Screen, SectionHeader, Tag, TextArea } from '@/ui'

/** Promote → Followers · Tell them · Boost listing */
export default function PromoteScreen() {
  const popup = usePopup()
  const query = useQuery()
  const followers = useOwner((s) => s.followers)
  const listings = useOwner((s) => s.listings)
  const boost = useOwner((s) => s.boost)
  const tell = useOwner((s) => s.tellFollowers)
  const now = useNow(60_000).getTime()
  const [tellOpen, setTellOpen] = useState({ key: 0, open: false })
  const [boostSheet, setBoostSheet] = useState(() => ({ key: 1, open: !!query.get('listing'), listingId: query.get('listing') }))
  const live = listings.filter((l) => l.listed && !l.review)
  const boosted = listings.filter((l) => l.boostedUntil && l.boostedUntil > now)

  return (
    <Screen header={<AppBar title="Promote" />}>
      <div className="px-4 pb-10 pt-1 @medium:mx-auto @medium:max-w-2xl">
        <Card className="flex items-center gap-4 p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
            <UsersThreeIcon size={26} weight="duotone" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-extrabold tabular-nums text-fg">{followers.toLocaleString('en-IN')}</p>
            <p className="text-[13px] text-muted">followers · 36 new this month</p>
          </div>
        </Card>

        <div className="mt-3 grid grid-cols-1 gap-3 @medium:grid-cols-2">
          <Card className="p-4">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
              <MegaphoneIcon size={18} className="text-accent" /> Tell them
            </p>
            <p className="mt-1 text-[13px] text-muted">Send your followers news: new stock, a festive offer, dates you’re free.</p>
            <Button size="sm" className="mt-3" onClick={() => setTellOpen((s) => ({ key: s.key + 1, open: true }))}>
              Write an update
            </Button>
          </Card>
          <Card className="p-4">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
              <RocketLaunchIcon size={18} className="text-accent" /> Boost listing
            </p>
            <p className="mt-1 text-[13px] text-muted">Show a listing at the top of search and on renters’ Home for a few days.</p>
            <Button size="sm" className="mt-3" onClick={() => setBoostSheet((s) => ({ key: s.key + 1, open: true, listingId: null }))}>
              Boost a listing
            </Button>
          </Card>
        </div>

        <SectionHeader title="Boosts running" subtitle={boosted.length ? undefined : 'None right now'} className="px-0 pt-6" />
        {boosted.length > 0 && (
          <Card className="overflow-hidden">
            {boosted.map((l) => (
              <div key={l.id} className="group relative flex items-center gap-3 px-4 py-3">
                <ListingThumb listing={l} className="size-11 shrink-0 rounded-xl" iconSize={18} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-fg">{l.name}</span>
                  <span className="block text-[13px] text-muted">Until {formatDayShort(toISODate(new Date(l.boostedUntil!)))}</span>
                </span>
                <Tag tone="brand">
                  <RocketLaunchIcon size={11} weight="fill" /> Boosted
                </Tag>
                <span aria-hidden className="absolute bottom-0 left-[68px] right-0 h-px bg-line group-last:hidden" />
              </div>
            ))}
          </Card>
        )}
      </div>

      <TellSheet
        key={`tell-${tellOpen.key}`}
        open={tellOpen.open}
        followers={followers}
        onClose={() => setTellOpen((s) => ({ ...s, open: false }))}
        onSend={async (text) => {
          setTellOpen((s) => ({ ...s, open: false }))
          const hide = popup.loading('Sending…')
          await sleep(900)
          hide()
          tell(text)
          haptic('success')
          popup.toast(`Sent to ${followers.toLocaleString('en-IN')} followers`, { tone: 'success' })
        }}
      />
      <BoostSheet
        key={`boost-${boostSheet.key}`}
        open={boostSheet.open}
        listings={live}
        initial={boostSheet.listingId}
        onClose={() => setBoostSheet((s) => ({ ...s, open: false }))}
        onBoost={async (listingId, days, price) => {
          setBoostSheet((s) => ({ ...s, open: false }))
          const hide = popup.loading(`Paying ${formatINR(price)}…`)
          await sleep(1100)
          hide()
          boost(listingId, days)
          haptic('success')
          popup.toast(`Boosted for ${days} days`, { tone: 'success' })
        }}
      />
    </Screen>
  )
}

function TellSheet({ open, followers, onClose, onSend }: { open: boolean; followers: number; onClose: () => void; onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  const ideas = ['New in: brass lamps and lanterns for Diwali shoots.', 'Free this weekend: Irani café set and wingback chairs.', '10% off 7+ day rentals this month.']
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Tell your followers"
      description={`Goes to ${followers.toLocaleString('en-IN')} art directors as a notification`}
      footer={
        <Button size="lg" block icon={MegaphoneIcon} disabled={text.trim().length < 5} onClick={() => onSend(text.trim())}>
          Send update
        </Button>
      }
    >
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {ideas.map((i) => (
          <Chip key={i} onClick={() => setText(i)}>
            {i.length > 34 ? `${i.slice(0, 32)}…` : i}
          </Chip>
        ))}
      </div>
      <TextArea className="mt-4" label="Your update" rows={3} value={text} maxLength={160} hint={`${text.length}/160`} onChange={(e) => setText(e.target.value)} />
    </BottomSheet>
  )
}

function BoostSheet({
  open,
  listings,
  initial,
  onClose,
  onBoost,
}: {
  open: boolean
  listings: Listing[]
  initial: string | null
  onClose: () => void
  onBoost: (listingId: string, days: number, price: number) => void
}) {
  const [pick, setPick] = useState<string | null>(initial ?? listings[0]?.id ?? null)
  const [option, setOption] = useState(BOOST_OPTIONS[1])
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Boost a listing"
      description="Shown first in search and on Home for renters near you"
      footer={
        <Button size="lg" block icon={RocketLaunchIcon} disabled={!pick} onClick={() => pick && onBoost(pick, option.days, option.price)}>
          Pay {formatINR(option.price)} · {option.days} days
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        {BOOST_OPTIONS.map((o) => (
          <Chip key={o.days} selected={option.days === o.days} onClick={() => setOption(o)}>
            {o.days} days · {formatINR(o.price)}
          </Chip>
        ))}
      </div>
      <p className="mb-2 mt-4 px-1 text-xs font-bold uppercase tracking-[0.07em] text-muted">Listing</p>
      <div className="-mx-2 flex flex-col">
        {listings.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={pick === l.id} onClick={() => setPick(l.id)} className={cn('flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors', pick === l.id ? 'bg-accent-soft' : 'active:bg-surface-2')}>
            <ListingThumb listing={l} className="size-10 shrink-0 rounded-lg" iconSize={16} />
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-fg">{l.name}</span>
            <span className={cn('size-5 shrink-0 rounded-full border-2', pick === l.id ? 'border-accent bg-accent ring-2 ring-inset ring-surface' : 'border-line-strong')} />
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}
