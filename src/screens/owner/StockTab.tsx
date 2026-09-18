import { CheckIcon, CheckSquareIcon, CurrencyInrIcon, PauseIcon, PlayIcon, SortAscendingIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { ListingThumb, OwnerAppBar, StatTile } from '@/components/owner/OwnerUI'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useNow } from '@/lib/hooks'
import { EASE_OUT } from '@/lib/motion'
import { freeToday, inRepair, listingState, listingStats, needsInfo, needsText, STATE_META, type Listing } from '@/lib/owner'
import { nav } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { Menu } from '@/overlays/Menu'
import { usePopup } from '@/overlays/popupContext'
import { useFeeRate, useOwner } from '@/store/owner'
import { Button, CheckboxVisual, Chip, ChipRow, EmptyState, IconButton, LargeTitle, Screen, SearchField, Segmented, Tag } from '@/ui'

type Filter = 'all' | 'live' | 'out' | 'reserved' | 'paused' | 'needs'
type Sort = 'earning' | 'never' | 'recent' | 'low'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'out', label: 'Out now' },
  { id: 'reserved', label: 'Reserved' },
  { id: 'paused', label: 'Paused' },
  { id: 'needs', label: 'Needs info' },
]
const SORTS: { id: Sort; label: string }[] = [
  { id: 'earning', label: 'Earning most' },
  { id: 'never', label: 'Never booked' },
  { id: 'recent', label: 'Recently added' },
  { id: 'low', label: 'Low stock' },
]

/** STOCK: summary, search, filter, sort, rows, select many. */
export default function StockTab() {
  const popup = usePopup()
  const listings = useOwner((s) => s.listings)
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  const setListed = useOwner((s) => s.setListed)
  const fee = useFeeRate()
  const now = useNow(60_000).getTime()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('earning')
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [priceSheet, setPriceSheet] = useState({ key: 0, open: false })

  const rows = listings.map((l) => ({ l, state: listingState(l, orders, holds, now), free: freeToday(l, orders, holds, now), stats: listingStats(l, orders, holds, fee, now), missing: needsInfo(l) }))
  const match = (r: (typeof rows)[number], f: Filter) =>
    f === 'all' ||
    (f === 'live' && r.l.listed && !r.l.review) ||
    (f === 'out' && r.state === 'out') ||
    (f === 'reserved' && r.stats.held > 0) ||
    (f === 'paused' && !r.l.listed) ||
    (f === 'needs' && r.missing.length > 0)
  const term = q.trim().toLowerCase()
  const shown = rows
    .filter((r) => match(r, filter) && (!term || `${r.l.name} ${r.l.category} ${r.l.era} ${r.l.pieces.map((p) => p.code).join(' ')}`.toLowerCase().includes(term)))
    .sort((a, b) =>
      sort === 'earning'
        ? b.stats.earned - a.stats.earned
        : sort === 'never'
          ? a.stats.bookings - b.stats.bookings || b.l.saves - a.l.saves
          : sort === 'recent'
            ? b.l.addedAt - a.l.addedAt
            : a.free / Math.max(1, a.l.pieces.length) - b.free / Math.max(1, b.l.pieces.length),
    )
  const pieces = listings.reduce((n, l) => n + l.pieces.length, 0)
  const free = rows.reduce((n, r) => n + r.free, 0)

  const exitSelect = () => {
    setSelecting(false)
    setPicked([])
  }
  const bulkListed = (listed: boolean) => {
    const ids = picked
    const before = listings.filter((l) => ids.includes(l.id)).map((l) => [l.id, l.listed] as const)
    setListed(ids, listed)
    haptic('success')
    exitSelect()
    popup.toast(`${ids.length} listing${ids.length === 1 ? '' : 's'} ${listed ? 'live' : 'paused'}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          const s = useOwner.getState()
          before.forEach(([id, was]) => s.setListed([id], was))
        },
      },
    })
  }

  return (
    <Screen
      header={<OwnerAppBar />}
      footer={
        selecting ? (
          <div className="flex items-center gap-2 @medium:mx-auto @medium:max-w-xl">
            <span className="min-w-0 flex-1 text-sm font-semibold text-fg">{picked.length} selected</span>
            <Button size="sm" variant="secondary" icon={PauseIcon} disabled={!picked.length} onClick={() => bulkListed(false)}>
              Pause
            </Button>
            <Button size="sm" variant="secondary" icon={PlayIcon} disabled={!picked.length} onClick={() => bulkListed(true)}>
              Unpause
            </Button>
            <Button size="sm" icon={CurrencyInrIcon} disabled={!picked.length} onClick={() => setPriceSheet((s) => ({ key: s.key + 1, open: true }))}>
              Price
            </Button>
          </div>
        ) : undefined
      }
    >
      <LargeTitle
        title="Stock"
        className="@medium:mx-auto @medium:max-w-2xl"
        action={
          selecting ? (
            <Button size="sm" variant="ghost" icon={XIcon} onClick={exitSelect}>
              Done
            </Button>
          ) : (
            <Button size="sm" variant="tonal" icon={CheckSquareIcon} onClick={() => setSelecting(true)}>
              Select
            </Button>
          )
        }
      />
      <div className="px-4 @medium:mx-auto @medium:max-w-2xl">
        <div className="grid grid-cols-3 gap-2">
          <StatTile value={listings.length} label="Listings" />
          <StatTile value={pieces} label="Pieces" />
          <StatTile value={free} label="Free today" tone="text-success" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <SearchField value={q} placeholder="Search name, era or tag code" onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} className="min-w-0 flex-1" />
          <Menu items={SORTS.map((s) => ({ label: s.label, icon: s.id === sort ? CheckIcon : undefined, onSelect: () => setSort(s.id) }))}>
            <IconButton icon={SortAscendingIcon} label={`Sort: ${SORTS.find((s) => s.id === sort)!.label}`} variant="surface" />
          </Menu>
        </div>
      </div>
      <ChipRow className="pb-1 pt-3 @medium:mx-auto @medium:max-w-2xl">
        {FILTERS.map((f) => (
          <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label} · {rows.filter((r) => match(r, f.id)).length}
          </Chip>
        ))}
      </ChipRow>
      <p className="px-5 pt-2 text-xs text-muted @medium:mx-auto @medium:max-w-2xl">
        {shown.length} shown · sorted by {SORTS.find((s) => s.id === sort)!.label.toLowerCase()}
      </p>

      {shown.length === 0 ? (
        <EmptyState icon={WarningCircleIcon} title="Nothing here" description={term ? `No stock matches “${q}”.` : 'No listings in this filter.'} />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 px-4 pb-8 pt-2 @medium:mx-auto @medium:max-w-2xl">
          {shown.map((r, i) => (
            <motion.div key={r.l.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE_OUT, delay: Math.min(i, 8) * 0.025 }}>
              <StockRow
                listing={r.l}
                stateLabel={STATE_META[r.state]}
                free={r.free}
                missing={r.missing}
                selecting={selecting}
                selected={picked.includes(r.l.id)}
                onClick={() => (selecting ? setPicked((p) => (p.includes(r.l.id) ? p.filter((x) => x !== r.l.id) : [...p, r.l.id])) : nav.push(`/renter/stock/${r.l.id}`))}
              />
            </motion.div>
          ))}
        </div>
      )}

      <BulkPriceSheet
        key={priceSheet.key}
        open={priceSheet.open}
        count={picked.length}
        onClose={() => setPriceSheet((s) => ({ ...s, open: false }))}
        onApply={(pct) => {
          const ids = picked
          const before = listings.filter((l) => ids.includes(l.id)).map((l) => [l.id, l.dayRate] as const)
          useOwner.getState().bulkPrice(ids, pct)
          setPriceSheet((s) => ({ ...s, open: false }))
          exitSelect()
          haptic('success')
          popup.toast(`Day rates ${pct > 0 ? 'raised' : 'lowered'} ${Math.abs(pct)}% on ${ids.length} listing${ids.length === 1 ? '' : 's'}`, {
            action: { label: 'Undo', onClick: () => before.forEach(([id, dayRate]) => useOwner.getState().updateListing(id, { dayRate })) },
          })
        }}
      />
    </Screen>
  )
}

function StockRow({
  listing: l,
  stateLabel,
  free,
  missing,
  selecting,
  selected,
  onClick,
}: {
  listing: Listing
  stateLabel: { label: string; tone: 'brand' | 'neutral' | 'success' | 'danger' | 'warning' | 'info' }
  free: number
  missing: string[]
  selecting?: boolean
  selected?: boolean
  onClick: () => void
}) {
  const usable = l.pieces.length - inRepair(l)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecting ? selected : undefined}
      className={cn('pressable flex w-full items-center gap-3 rounded-2xl bg-surface p-2.5 text-left shadow-card outline-none focus-visible:ring-4 focus-visible:ring-accent/25', selected && 'ring-2 ring-accent')}
    >
      <AnimatePresence initial={false}>
        {selecting && (
          <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: 22, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="shrink-0 overflow-hidden">
            <CheckboxVisual checked={!!selected} />
          </motion.span>
        )}
      </AnimatePresence>
      <ListingThumb listing={l} className="size-16 shrink-0 rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-fg">{l.name}</span>
        <span className="mt-0.5 block truncate text-[13px] text-fg-2">
          <span className="font-bold tabular-nums text-fg">{formatINR(l.dayRate)}</span>/day ·{' '}
          <span className={cn('font-semibold', free === 0 ? 'text-danger' : free <= Math.max(1, Math.floor(usable / 3)) ? 'text-warning' : 'text-success')}>
            {free} of {l.pieces.length} free
          </span>
        </span>
        <span className="mt-1.5 flex flex-wrap gap-1">
          <Tag tone={stateLabel.tone} dot>
            {stateLabel.label}
          </Tag>
          {missing.length > 0 && (
            <Tag tone="warning">
              <WarningCircleIcon size={11} weight="fill" /> {needsText(missing)}
            </Tag>
          )}
        </span>
      </span>
    </button>
  )
}

function BulkPriceSheet({ open, count, onClose, onApply }: { open: boolean; count: number; onClose: () => void; onApply: (pct: number) => void }) {
  const [dir, setDir] = useState<'down' | 'up'>('down')
  const [pct, setPct] = useState(10)
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Change day rates"
      description={`${count} listing${count === 1 ? '' : 's'} selected. The 3–6 and 7+ day rates follow.`}
      footer={
        <Button size="lg" block onClick={() => onApply(dir === 'down' ? -pct : pct)}>
          {dir === 'down' ? 'Lower' : 'Raise'} by {pct}%
        </Button>
      }
    >
      <Segmented
        options={[
          { value: 'down', label: 'Lower' },
          { value: 'up', label: 'Raise' },
        ]}
        value={dir}
        onChange={setDir}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {[5, 10, 15, 20, 25].map((n) => (
          <Chip key={n} selected={pct === n} onClick={() => setPct(n)}>
            {n}%
          </Chip>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-muted">Rates are rounded to the nearest ₹10. You can undo from the message that appears.</p>
    </BottomSheet>
  )
}
