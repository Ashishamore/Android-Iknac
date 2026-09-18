import {
  ArrowDownIcon,
  CheckIcon,
  CopyIcon,
  CurrencyInrIcon,
  DotsThreeIcon,
  EyeIcon,
  PauseIcon,
  PencilSimpleIcon,
  PlayIcon,
  PlusIcon,
  SortAscendingIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { EASE_OUT } from '@/lib/motion'
import { freeToday, inRepair, listingState, listingStats, needsInfo, needsText, STATE_META } from '@/lib/owner'
import { useFeeRate, useOwner } from '@/store/owner'
import { plural } from '~/lib/data'
import { navigate, useQuery } from '~/router'
import { Button, Checkbox, Chip, IconButton, SearchInput, Segmented } from '~/ui/controls'
import { Card, EmptyState, PageHeader, Stat, Tag, Thumb } from '~/ui/display'
import { toast } from '~/ui/feedback'
import { Dialog, Menu } from '~/ui/overlays'

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

/** STOCK: summary, search, filter, sort, rows, select many (pause/unpause, price). */
export default function Stock() {
  const query = useQuery()
  const listings = useOwner((s) => s.listings)
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  const setListed = useOwner((s) => s.setListed)
  const duplicate = useOwner((s) => s.duplicateListing)
  const fee = useFeeRate()
  const now = useNow(60_000).getTime()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>(() => (FILTERS.some((f) => f.id === query.get('filter')) ? (query.get('filter') as Filter) : 'all'))
  const [sort, setSort] = useState<Sort>('earning')
  const [picked, setPicked] = useState<string[]>([])
  const [priceDialog, setPriceDialog] = useState({ key: 0, open: false })

  const rows = listings.map((l) => ({ l, state: listingState(l, orders, holds, now), free: freeToday(l, orders, holds, now), stats: listingStats(l, orders, holds, fee, now), missing: needsInfo(l) }))
  const match = (r: (typeof rows)[number], f: Filter) =>
    f === 'all' || (f === 'live' && r.l.listed && !r.l.review) || (f === 'out' && r.state === 'out') || (f === 'reserved' && r.stats.held > 0) || (f === 'paused' && !r.l.listed) || (f === 'needs' && r.missing.length > 0)
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
  const shownIds = shown.map((r) => r.l.id)
  const allPicked = shownIds.length > 0 && shownIds.every((id) => picked.includes(id))
  const somePicked = shownIds.some((id) => picked.includes(id))

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const bulkListed = (listed: boolean, ids = picked) => {
    const before = listings.filter((l) => ids.includes(l.id)).map((l) => [l.id, l.listed] as const)
    setListed(ids, listed)
    setPicked([])
    toast(`${plural(ids.length, 'listing')} ${listed ? 'live' : 'paused'}`, {
      tone: 'success',
      action: { label: 'Undo', onClick: () => before.forEach(([id, was]) => useOwner.getState().setListed([id], was)) },
    })
  }

  const copy = (id: string) => {
    const draftId = duplicate(id)
    toast('Copied to “Waiting for details”', { tone: 'success', action: { label: 'Open', onClick: () => navigate(`/add/draft/${draftId}`) } })
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Stock' }]}
        title="Stock"
        subtitle="Everything you rent out, with what’s free today"
        actions={
          <Button icon={PlusIcon} onClick={() => navigate('/add')}>
            Add stock
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Listings" value={listings.length} hint={`${listings.filter((l) => l.listed && !l.review).length} live`} />
        <Stat label="Pieces" value={pieces} hint={`${listings.reduce((n, l) => n + inRepair(l), 0)} in repair`} />
        <Stat label="Free today" value={<span className="text-success">{free}</span>} hint={`of ${pieces} pieces`} />
      </div>

      <Card className="mt-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchInput value={q} placeholder="Search name, era or tag code" onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} className="min-w-0 flex-1 basis-56 sm:max-w-xs" />
          <Segmented size="sm" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f.id, label: f.label, count: rows.filter((r) => match(r, f.id)).length }))} className="order-3 w-full sm:order-none sm:w-auto" />
          <div className="ml-auto">
            <Menu items={[{ heading: 'Sort by' }, ...SORTS.map((s) => ({ label: s.label, icon: s.id === sort ? CheckIcon : undefined, onSelect: () => setSort(s.id) }))]} width={200}>
              <Button size="sm" variant="secondary" icon={SortAscendingIcon}>
                <span className="hidden sm:inline">{SORTS.find((s) => s.id === sort)!.label}</span>
              </Button>
            </Menu>
          </div>
        </div>

        {/* Bulk actions */}
        <AnimatePresence initial={false}>
          {picked.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18, ease: EASE_OUT }} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-accent/20 bg-accent-soft px-3 py-2">
                <span className="mr-auto text-[13px] font-semibold text-accent-soft-fg">{picked.length} selected</span>
                <Button size="sm" variant="secondary" icon={PauseIcon} onClick={() => bulkListed(false)}>
                  Pause
                </Button>
                <Button size="sm" variant="secondary" icon={PlayIcon} onClick={() => bulkListed(true)}>
                  Unpause
                </Button>
                <Button size="sm" icon={CurrencyInrIcon} onClick={() => setPriceDialog((s) => ({ key: s.key + 1, open: true }))}>
                  Price
                </Button>
                <IconButton icon={XIcon} size="sm" label="Clear selection" onClick={() => setPicked([])} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {shown.length === 0 ? (
          <EmptyState icon={WarningCircleIcon} title="Nothing here" description={term ? `No stock matches “${q}”.` : 'No listings in this filter.'} />
        ) : (
          <>
            {/* Table (tablet and up) */}
            <div className="thin-scroll hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                    <th className="w-10 py-2.5 pl-4">
                      <Checkbox checked={allPicked} indeterminate={!allPicked && somePicked} label="Select all" onChange={() => setPicked(allPicked ? picked.filter((id) => !shownIds.includes(id)) : [...new Set([...picked, ...shownIds])])} />
                    </th>
                    <th className="py-2.5 pr-3">Item</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">Day rate</th>
                    <th className="px-3 py-2.5">Free today</th>
                    <th className="hidden px-3 py-2.5 text-right lg:table-cell">
                      <span className={cn('inline-flex items-center gap-1', sort === 'never' && 'text-fg')}>Bookings {sort === 'never' && <ArrowDownIcon size={11} weight="bold" />}</span>
                    </th>
                    <th className="px-3 py-2.5 text-right">
                      <span className={cn('inline-flex items-center gap-1', sort === 'earning' && 'text-fg')}>Earned {sort === 'earning' && <ArrowDownIcon size={11} weight="bold" />}</span>
                    </th>
                    <th className="hidden px-3 py-2.5 text-right xl:table-cell">Saves</th>
                    <th className="hidden px-3 py-2.5 xl:table-cell">
                      <span className={cn('inline-flex items-center gap-1', sort === 'recent' && 'text-fg')}>Added {sort === 'recent' && <ArrowDownIcon size={11} weight="bold" />}</span>
                    </th>
                    <th className="w-12 py-2.5 pr-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((r) => {
                    const usable = r.l.pieces.length - inRepair(r.l)
                    const on = picked.includes(r.l.id)
                    return (
                      <tr key={r.l.id} onClick={() => navigate(`/stock/${r.l.id}`)} className={cn('cursor-pointer transition-colors', on ? 'bg-accent-soft/60' : 'hover:bg-surface-2/70')}>
                        <td className="py-2.5 pl-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={on} label={`Select ${r.l.name}`} onChange={() => toggle(r.l.id)} />
                        </td>
                        <td className="max-w-[320px] py-2.5 pr-3">
                          <div className="flex items-center gap-3">
                            <Thumb listing={r.l} className="size-10 rounded-lg" iconSize={18} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-fg">{r.l.name}</p>
                              <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                                {r.l.category} · {r.l.era}
                                {r.missing.length > 0 && (
                                  <span className="inline-flex items-center gap-0.5 font-semibold text-warning">
                                    · <WarningCircleIcon size={11} weight="fill" /> {needsText(r.missing)}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <Tag tone={STATE_META[r.state].tone} dot>
                            {STATE_META[r.state].label}
                          </Tag>
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-fg">{formatINR(r.l.dayRate)}</td>
                        <td className="px-3 py-2.5">
                          <FreeBar free={r.free} total={r.l.pieces.length} usable={usable} />
                        </td>
                        <td className="hidden px-3 py-2.5 text-right tabular-nums text-fg-2 lg:table-cell">{r.stats.bookings}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-fg">{formatINR(r.stats.earned)}</td>
                        <td className="hidden px-3 py-2.5 text-right tabular-nums text-fg-2 xl:table-cell">{r.l.saves}</td>
                        <td className="hidden whitespace-nowrap px-3 py-2.5 text-muted xl:table-cell">{timeAgo(r.l.addedAt)}</td>
                        <td className="py-2.5 pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <RowMenu id={r.l.id} listed={r.l.listed} onListed={(on) => bulkListed(on, [r.l.id])} onCopy={() => copy(r.l.id)} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards (phones) */}
            <ul className="divide-y divide-line md:hidden">
              {shown.map((r) => {
                const on = picked.includes(r.l.id)
                return (
                  <li key={r.l.id} className={cn('flex items-center gap-3 px-3 py-3', on && 'bg-accent-soft/60')}>
                    <Checkbox checked={on} label={`Select ${r.l.name}`} onChange={() => toggle(r.l.id)} />
                    <button type="button" onClick={() => navigate(`/stock/${r.l.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <Thumb listing={r.l} className="size-14 rounded-lg" iconSize={22} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-fg">{r.l.name}</span>
                        <span className="block text-[13px] text-fg-2">
                          <span className="font-bold tabular-nums text-fg">{formatINR(r.l.dayRate)}</span>/day · <FreeText free={r.free} total={r.l.pieces.length} usable={r.l.pieces.length - inRepair(r.l)} />
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          <Tag tone={STATE_META[r.state].tone} dot>
                            {STATE_META[r.state].label}
                          </Tag>
                          {r.missing.length > 0 && <Tag tone="warning">{needsText(r.missing)}</Tag>}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
        <div className="border-t border-line px-4 py-2.5 text-xs text-muted">
          {shown.length} of {listings.length} shown · sorted by {SORTS.find((s) => s.id === sort)!.label.toLowerCase()}
        </div>
      </Card>

      <BulkPriceDialog
        key={priceDialog.key}
        open={priceDialog.open}
        count={picked.length}
        onClose={() => setPriceDialog((s) => ({ ...s, open: false }))}
        onApply={(pct) => {
          const ids = picked
          const before = listings.filter((l) => ids.includes(l.id)).map((l) => [l.id, l.dayRate] as const)
          useOwner.getState().bulkPrice(ids, pct)
          setPriceDialog((s) => ({ ...s, open: false }))
          setPicked([])
          toast(`Day rates ${pct > 0 ? 'raised' : 'lowered'} ${Math.abs(pct)}% on ${plural(ids.length, 'listing')}`, {
            tone: 'success',
            action: { label: 'Undo', onClick: () => before.forEach(([id, dayRate]) => useOwner.getState().updateListing(id, { dayRate })) },
          })
        }}
      />
    </>
  )
}

function freeTone(free: number, usable: number) {
  return free === 0 ? 'danger' : free <= Math.max(1, Math.floor(usable / 3)) ? 'warning' : 'success'
}

function FreeText({ free, total, usable }: { free: number; total: number; usable: number }) {
  const tone = freeTone(free, usable)
  return <span className={cn('font-semibold', tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-success')}>{free} of {total} free</span>
}

function FreeBar({ free, total, usable }: { free: number; total: number; usable: number }) {
  const tone = freeTone(free, usable)
  return (
    <div className="w-28">
      <FreeText free={free} total={total} usable={usable} />
      <span className="mt-1 flex h-1.5 gap-0.5">
        {Array.from({ length: Math.min(total, 12) }, (_, i) => (
          <span key={i} className={cn('h-full flex-1 rounded-full', i < Math.round((free / Math.max(1, total)) * Math.min(total, 12)) ? (tone === 'danger' ? 'bg-danger' : tone === 'warning' ? 'bg-warning' : 'bg-success') : 'bg-surface-3')} />
        ))}
      </span>
    </div>
  )
}

function RowMenu({ id, listed, onListed, onCopy }: { id: string; listed: boolean; onListed: (on: boolean) => void; onCopy: () => void }) {
  return (
    <Menu
      items={[
        { label: 'Open listing', icon: EyeIcon, onSelect: () => navigate(`/stock/${id}`) },
        { label: 'Edit details', icon: PencilSimpleIcon, onSelect: () => navigate(`/stock/${id}?edit=1`) },
        { label: 'Change the day rate', icon: CurrencyInrIcon, onSelect: () => navigate(`/stock/${id}?rate=1`) },
        'divider',
        listed ? { label: 'Pause', icon: PauseIcon, onSelect: () => onListed(false) } : { label: 'Unpause', icon: PlayIcon, onSelect: () => onListed(true) },
        { label: 'Duplicate', icon: CopyIcon, onSelect: onCopy },
      ]}
    >
      <IconButton icon={DotsThreeIcon} weight="bold" size="sm" label="More actions" />
    </Menu>
  )
}

function BulkPriceDialog({ open, count, onClose, onApply }: { open: boolean; count: number; onClose: () => void; onApply: (pct: number) => void }) {
  const [dir, setDir] = useState<'down' | 'up'>('down')
  const [pct, setPct] = useState(10)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Change day rates"
      description={`${plural(count, 'listing')} selected. The 3–6 and 7+ day rates follow.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onApply(dir === 'down' ? -pct : pct)}>
            {dir === 'down' ? 'Lower' : 'Raise'} by {pct}%
          </Button>
        </>
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
    </Dialog>
  )
}
