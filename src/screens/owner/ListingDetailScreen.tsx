import {
  CalendarBlankIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  InfoIcon,
  PackageIcon,
  PencilSimpleIcon,
  RocketLaunchIcon,
  WarningCircleIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { ListingThumb, Stepper } from '@/components/owner/OwnerUI'
import { CONDITIONS, PLATFORM } from '@/data/owner'
import { cn } from '@/lib/cn'
import { addDays, formatDayShort, todayISO, toISODate } from '@/lib/dates'
import { formatINR, formatSize } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useNow } from '@/lib/hooks'
import { listingStats, needsInfo, needsText, STATE_META, listingState, tierRates, youKeep, type Listing } from '@/lib/owner'
import { nav, useParams } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { Menu } from '@/overlays/Menu'
import { usePopup } from '@/overlays/popupContext'
import { useFeeRate, useListing, useOwner } from '@/store/owner'
import { usePrefs } from '@/store/prefs'
import { AppBar, Button, Card, EmptyState, IconButton, ListItem, Screen, Tag, TextField } from '@/ui'

export default function ListingDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const listing = useListing(id)
  if (!listing) {
    return (
      <Screen header={<AppBar title="Listing" />}>
        <EmptyState icon={PackageIcon} title="Listing not found" action={<Button onClick={() => nav.pop()}>Go back</Button>} />
      </Screen>
    )
  }
  return <ListingDetail l={listing} />
}

/** LISTING DETAIL */
function ListingDetail({ l }: { l: Listing }) {
  const popup = usePopup()
  usePrefs((s) => s.sizeUnit) // re-render when units change
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  const updateListing = useOwner((s) => s.updateListing)
  const setListed = useOwner((s) => s.setListed)
  const setRepair = useOwner((s) => s.setRepair)
  const approve = useOwner((s) => s.approveListing)
  const duplicate = useOwner((s) => s.duplicateListing)
  const fee = useFeeRate()
  const now = useNow(60_000).getTime()
  const [rateSheet, setRateSheet] = useState({ key: 0, open: false })
  const stats = listingStats(l, orders, holds, fee, now)
  const state = listingState(l, orders, holds, now)
  const missing = needsInfo(l)
  const tiers = tierRates(l.dayRate)
  const today = todayISO()

  const toggleListed = (on: boolean) => {
    setListed([l.id], on)
    haptic()
    popup.toast(on ? `${l.name} is live` : `${l.name} paused`, { action: { label: 'Undo', onClick: () => useOwner.getState().setListed([l.id], !on) } })
  }

  const copy = () => {
    const draftId = duplicate(l.id)
    popup.toast('Copied to “Waiting for details”', { tone: 'success', action: { label: 'Open', onClick: () => nav.push(`/renter/add/draft/${draftId}`) } })
  }

  const pieceAction = async (pieceId: string, inRepair: boolean) => {
    if (inRepair) {
      setRepair(l.id, pieceId, false)
      haptic('success')
      return popup.toast('Back in service', { tone: 'success' })
    }
    const choice = await popup.actionSheet({
      title: 'Send for repair',
      description: 'It won’t be bookable until it’s back',
      options: [
        { id: '3', label: 'Back in 3 days' },
        { id: '7', label: 'Back in a week' },
        { id: 'none', label: 'No return date yet' },
      ],
    })
    if (!choice) return
    setRepair(l.id, pieceId, choice === 'none' ? null : addDays(today, Number(choice)))
    popup.toast('Sent for repair', { action: { label: 'Undo', onClick: () => useOwner.getState().setRepair(l.id, pieceId, false) } })
  }

  const condition = async (pieceId: string) => {
    const choice = await popup.actionSheet({ title: 'Condition', options: CONDITIONS.map((c) => ({ id: c, label: c })) })
    if (!choice) return
    updateListing(l.id, { pieces: l.pieces.map((p) => (p.id === pieceId ? { ...p, condition: choice } : p)) })
  }

  return (
    <Screen
      header={
        <AppBar
          title={l.name}
          titleOnScroll
          actions={
            <Menu
              items={[
                { label: 'Edit details', icon: PencilSimpleIcon, onSelect: () => nav.push(`/renter/stock/${l.id}/edit`) },
                { label: 'Duplicate', icon: CopyIcon, onSelect: copy },
                { label: 'As a renter sees it', icon: EyeIcon, onSelect: () => nav.push(`/renter/stock/${l.id}/preview`) },
                { label: 'Boost listing', icon: RocketLaunchIcon, onSelect: () => nav.push(`/renter/profile/promote?listing=${l.id}`) },
              ]}
            >
              <IconButton icon={DotsThreeVerticalIcon} weight="bold" label="More options" />
            </Menu>
          }
        />
      }
    >
      <div className="space-y-3 px-4 pb-10 pt-1 @medium:mx-auto @medium:max-w-2xl">
        {/* Photo · description, as renters read it */}
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4">
          {(l.photos.length ? l.photos : ['none']).map((p, i) => (
            <ListingThumb key={i} listing={{ ...l, photos: p === 'none' ? [] : [p] }} className={cn('aspect-[4/3] shrink-0 snap-center rounded-3xl', l.photos.length > 1 ? 'w-[85%]' : 'w-full')} iconSize={56} />
          ))}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag tone={STATE_META[state].tone} dot>
              {STATE_META[state].label}
            </Tag>
            {l.boostedUntil && l.boostedUntil > now && (
              <Tag tone="brand">
                <RocketLaunchIcon size={11} weight="fill" /> Boosted till {formatDayShort(toISODate(new Date(l.boostedUntil)))}
              </Tag>
            )}
          </div>
          <h1 className="mt-1.5 font-display text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-fg">{l.name}</h1>
          <p className="text-sm text-muted">
            {l.category} · {l.era}
            {l.material ? ` · ${l.material}` : ''}
          </p>
          <p className={cn('mt-2 text-[15px] leading-relaxed', l.description ? 'text-fg-2' : 'italic text-muted')}>{l.description || 'No description yet. Renters see this under the photos.'}</p>
        </div>

        {l.review && (
          <div className="flex items-start gap-3 rounded-2xl bg-info-soft p-3.5">
            <InfoIcon size={20} weight="fill" className="mt-0.5 shrink-0 text-info" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">In review</p>
              <p className="text-[13px] text-fg-2">Our team checks photos, size and price, usually within 2 hours.</p>
              <button
                type="button"
                onClick={() => {
                  approve(l.id)
                  haptic('success')
                  popup.toast('Approved · it’s live', { tone: 'success' })
                }}
                className="mt-1.5 text-[13px] font-semibold text-info underline"
              >
                Demo: approve now
              </button>
            </div>
          </div>
        )}
        {missing.length > 0 && (
          <button type="button" onClick={() => nav.push(`/renter/stock/${l.id}/edit`)} className="flex w-full items-center gap-3 rounded-2xl bg-warning-soft p-3.5 text-left">
            <WarningCircleIcon size={20} weight="fill" className="shrink-0 text-warning" />
            <span className="min-w-0 flex-1 text-sm">
              <span className="font-semibold text-fg">{needsText(missing)}</span>
              <span className="block text-[13px] text-fg-2">Renters skip props they can’t plan for. Add it now.</span>
            </span>
            <PencilSimpleIcon size={17} className="shrink-0 text-warning" />
          </button>
        )}

        {/* Listed / Paused */}
        <Card className="overflow-hidden">
          <ListItem
            title={l.listed ? 'Listed' : 'Paused'}
            subtitle={l.listed ? 'Renters can find and book it' : l.saves ? `${l.saves} renters saved it. They’ll see it again when you list it.` : 'Hidden from renters'}
            toggle={{ checked: l.listed, onChange: toggleListed }}
          />
        </Card>

        {/* How it's doing */}
        <Section title="How it’s doing">
          <div className="grid grid-cols-5 divide-x divide-line py-3 text-center">
            <Stat value={stats.bookings} label="Bookings" />
            <Stat value={stats.held} label="Held now" />
            <Stat value={stats.saves} label="Saves" />
            <Stat value={stats.earned >= 1000 ? `₹${Math.round(stats.earned / 1000)}k` : formatINR(stats.earned)} label="Earned" />
            <Stat value={stats.daysOut} label="Days out" />
          </div>
        </Section>

        {/* Pricing */}
        <Section title="Pricing" action={<Button size="sm" variant="ghost" onClick={() => setRateSheet((s) => ({ key: s.key + 1, open: true }))}>Change the day rate</Button>}>
          <dl className="divide-y divide-line px-4">
            <Row label="1–2 days" value={`${formatINR(tiers.short)}/day`} />
            <Row label="3–6 days" value={`${formatINR(tiers.mid)}/day`} note="10% off" />
            <Row label="7+ days" value={`${formatINR(tiers.long)}/day`} note="20% off" />
            <Row label="Deposit" value={`${formatINR(l.deposit)} a piece`} note="Refunded after the return check" />
          </dl>
        </Section>

        {/* Pieces */}
        <Section title={`Pieces · ${l.pieces.length}`}>
          {l.pieces.map((p) => {
            const out = orders.find((o) => o.status === 'out' && o.pieceIds.includes(p.id))
            const where = p.repair
              ? p.repair.until
                ? `In repair · back ${formatDayShort(p.repair.until)}`
                : 'In repair · no return date'
              : out
                ? `With ${out.renter.company} till ${formatDayShort(out.to)}`
                : 'In yard'
            return (
              <div key={p.id} className="group relative flex items-center gap-3 py-2.5 pl-4 pr-1.5">
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', p.repair ? 'bg-warning-soft text-warning' : out ? 'bg-info-soft text-info' : 'bg-success-soft text-success')}>
                  {p.repair ? <WrenchIcon size={17} weight="bold" /> : <PackageIcon size={17} weight="bold" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-semibold tracking-wide text-fg">{p.code}</span>
                    <Tag tone={p.condition === 'Worn' ? 'warning' : 'neutral'}>{p.condition}</Tag>
                  </span>
                  <span className="block truncate text-[13px] text-muted">{where}</span>
                </span>
                <Menu
                  items={[
                    p.repair
                      ? { label: 'Return to service', icon: PackageIcon, onSelect: () => pieceAction(p.id, true) }
                      : { label: 'Send for repair', icon: WrenchIcon, onSelect: () => pieceAction(p.id, false) },
                    { label: 'Change condition', icon: PencilSimpleIcon, onSelect: () => condition(p.id) },
                  ]}
                >
                  <IconButton icon={DotsThreeVerticalIcon} weight="bold" size="sm" label={`Options for ${p.code}`} />
                </Menu>
                <span aria-hidden className="absolute bottom-0 left-16 right-0 h-px bg-line group-last:hidden" />
              </div>
            )
          })}
        </Section>

        {/* Rules */}
        <Section title="Rules">
          <div className="group relative flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-fg">Days needed either side</span>
              <span className="block text-[13px] text-muted">Kept free before and after each booking</span>
            </span>
            <Stepper value={l.bufferDays} min={0} max={3} onChange={(bufferDays) => updateListing(l.id, { bufferDays })} label="Days either side" />
            <span aria-hidden className="absolute bottom-0 left-4 right-0 h-px bg-line" />
          </div>
          <ListItem title="Can be modified" subtitle="Renters may repaint or alter it on request" toggle={{ checked: l.modifiable, onChange: (modifiable) => updateListing(l.id, { modifiable }) }} />
          <ListItem icon={CalendarBlankIcon} title="Availability" subtitle="Block dates, see bookings" value={l.blocks.length ? `${l.blocks.length} block${l.blocks.length === 1 ? '' : 's'}` : undefined} onClick={() => nav.push(`/renter/stock/${l.id}/availability`)} />
        </Section>

        {/* Specs */}
        <Section title="Specs" action={<Button size="sm" variant="ghost" icon={PencilSimpleIcon} onClick={() => nav.push(`/renter/stock/${l.id}/edit`)}>Edit details</Button>}>
          <dl className="divide-y divide-line px-4">
            <Row label="Category" value={l.category} />
            <Row label="Era" value={l.era} />
            <Row label="Size" value={l.size ? formatSize(l.size) : 'Missing'} warn={!l.size && missing.includes('size')} />
            <Row label="Weight" value={l.weight ? `${l.weight} kg` : 'Missing'} warn={!l.weight && missing.includes('weight')} />
            <Row label="Material" value={l.material ?? '—'} />
            <Row label="Condition" value={l.condition} />
          </dl>
        </Section>

        <Card className="mt-3 overflow-hidden">
          <ListItem icon={CopyIcon} title="Duplicate" subtitle="Start a new listing from this one" onClick={copy} />
          <ListItem icon={EyeIcon} title="As a renter sees it" subtitle="Open the item page" onClick={() => nav.push(`/renter/stock/${l.id}/preview`)} />
        </Card>
      </div>

      <RateSheet
        key={rateSheet.key}
        open={rateSheet.open}
        listing={l}
        feeRate={fee}
        onClose={() => setRateSheet((s) => ({ ...s, open: false }))}
        onSave={(dayRate, deposit) => {
          const before = { dayRate: l.dayRate, deposit: l.deposit }
          updateListing(l.id, { dayRate, deposit })
          setRateSheet((s) => ({ ...s, open: false }))
          haptic('success')
          popup.toast(`Day rate ${formatINR(dayRate)}`, { tone: 'success', action: { label: 'Undo', onClick: () => useOwner.getState().updateListing(l.id, before) } })
        }}
      />
    </Screen>
  )
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-2 px-1 pb-1.5 pt-3">
        <h2 className="font-display text-[16px] font-bold text-fg">{title}</h2>
        {action}
      </div>
      <Card className="overflow-hidden">{children}</Card>
    </section>
  )
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="min-w-0 px-0.5">
      <p className="truncate font-display text-base font-extrabold tabular-nums text-fg">{value}</p>
      <p className="truncate text-[11px] text-muted">{label}</p>
    </div>
  )
}

function Row({ label, value, note, warn }: { label: string; value: string; note?: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="min-w-0">
        <span className="block text-sm text-fg-2">{label}</span>
        {note && <span className="block text-xs text-subtle">{note}</span>}
      </dt>
      <dd className={cn('shrink-0 text-right text-sm font-semibold tabular-nums', warn ? 'text-warning' : 'text-fg')}>{value}</dd>
    </div>
  )
}

function RateSheet({ open, listing, feeRate, onClose, onSave }: { open: boolean; listing: Listing; feeRate: number; onClose: () => void; onSave: (dayRate: number, deposit: number) => void }) {
  const [rate, setRate] = useState(String(listing.dayRate))
  const [deposit, setDeposit] = useState(String(listing.deposit))
  const [error, setError] = useState<string>()
  const r = Number(rate) || 0
  const t = tierRates(r)
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Change the day rate"
      description="Longer rentals get the lower rates automatically"
      footer={
        <Button
          size="lg"
          block
          onClick={() => {
            if (r < 50) return setError('Enter at least ₹50')
            onSave(r, Number(deposit) || 0)
          }}
        >
          Save
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Day rate"
          prefix="₹"
          inputMode="numeric"
          value={rate}
          error={error}
          onChange={(e) => {
            setRate(e.target.value.replace(/\D/g, '').slice(0, 6))
            setError(undefined)
          }}
        />
        <TextField label="Deposit a piece" prefix="₹" inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value.replace(/\D/g, '').slice(0, 7))} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ['1–2 days', t.short],
          ['3–6 days', t.mid],
          ['7+ days', t.long],
        ].map(([label, v]) => (
          <div key={label} className="rounded-xl bg-surface-2 py-2">
            <p className="text-sm font-bold tabular-nums text-fg">{formatINR(Number(v))}</p>
            <p className="text-[11px] text-muted">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-success-soft px-4 py-3 text-sm text-fg">
        You keep <span className="font-bold">{formatINR(youKeep(r, feeRate))}</span> a day after {PLATFORM}’s {Math.round(feeRate * 100)}%.
      </p>
    </BottomSheet>
  )
}
