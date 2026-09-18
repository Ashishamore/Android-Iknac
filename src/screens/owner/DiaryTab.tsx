import { CalendarPlusIcon, CaretRightIcon, WarningIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { ListingThumb, MonthGrid, OwnerAppBar } from '@/components/owner/OwnerUI'
import { cn } from '@/lib/cn'
import { formatDateRangeShort, formatDayShort, fromISODate, todayISO } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { useNow } from '@/lib/hooks'
import { conflicts, dayLayers, LAYER_META, type Layer, type Listing } from '@/lib/owner'
import { TONE_SOLID } from '@/lib/tones'
import { nav } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useOwner, useOwnerUi } from '@/store/owner'
import { Button, Card, LargeTitle, Screen } from '@/ui'

const LAYERS: Layer[] = ['booked', 'reserved', 'buffer', 'blocked']

interface DayItem {
  key: string
  l: Listing
  text: string
  to: string
  blockId?: string
}

/** DIARY: conflicts, layers, month calendar with pieces out per day, day detail, block dates. */
export default function DiaryTab() {
  const popup = usePopup()
  const listings = useOwner((s) => s.listings)
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  const removeBlock = useOwner((s) => s.removeBlock)
  const picker = useOwnerUi((s) => s.blockPicker)
  const setPicker = useOwnerUi((s) => s.setBlockPicker)
  const now = useNow(60_000).getTime()
  const today = todayISO()
  const t = fromISODate(today)
  const [view, setView] = useState({ year: t.getFullYear(), month: t.getMonth() })
  const [layers, setLayers] = useState<Layer[]>(LAYERS)
  const [daySheet, setDaySheet] = useState<{ key: number; open: boolean; date: string | null }>({ key: 0, open: false, date: null })
  const clashes = conflicts(listings, orders)
  const stock = listings.filter((l) => !l.review)

  const summary = (date: string) => {
    let out = 0
    const on = { booked: false, reserved: false, buffer: false, blocked: false }
    for (const l of stock) {
      const d = dayLayers(l, orders, holds, date, now)
      out += d.booked.reduce((n, o) => n + o.qty, 0)
      on.booked ||= d.booked.length > 0
      on.reserved ||= d.reserved.length > 0
      on.buffer ||= d.buffer.length > 0
      on.blocked ||= d.blocked.length > 0
    }
    return { out, on }
  }

  const free = (listingId: string, blockId: string, label: string) => {
    const undo = removeBlock(listingId, blockId)
    haptic('success')
    popup.toast(`${label} freed`, { action: { label: 'Undo', onClick: undo } })
  }

  return (
    <Screen header={<OwnerAppBar />}>
      <LargeTitle
        title="Diary"
        className="@medium:mx-auto @medium:max-w-2xl"
        subtitle="Every booking, hold and block across your stock"
        action={
          <Button size="sm" variant="tonal" icon={CalendarPlusIcon} onClick={() => setPicker(true)}>
            Block dates
          </Button>
        }
      />
      <div className="space-y-3 px-4 pb-10 @medium:mx-auto @medium:max-w-2xl">
        {/* Conflict banner */}
        {clashes.map(({ listing, block, order }) => (
          <div key={`${block.id}-${order.id}`} role="alert" className="rounded-2xl bg-danger-soft p-3.5">
            <p className="flex items-center gap-2 text-sm font-bold text-danger">
              <WarningIcon size={17} weight="fill" /> Blocked over a booking
            </p>
            <p className="mt-1 text-[13px] leading-snug text-fg-2">
              <span className="font-semibold text-fg">{listing.name}</span> is blocked {formatDateRangeShort(block.from, block.to)}
              {block.note ? ` (${block.note})` : ''}, but {order.renter.company} has it booked {formatDateRangeShort(order.from, order.to)}.
            </p>
            <div className="mt-2.5 flex gap-2">
              <Button size="sm" variant="danger" onClick={() => free(listing.id, block.id, 'Block')}>
                Free it
              </Button>
              <Button size="sm" variant="secondary" onClick={() => nav.push(`/renter/orders/${order.id}`)}>
                See booking
              </Button>
            </div>
          </div>
        ))}

        {/* Layers */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Layers">
          {LAYERS.map((l) => {
            const on = layers.includes(l)
            return (
              <button
                key={l}
                type="button"
                aria-pressed={on}
                onClick={() => setLayers((x) => (on ? x.filter((y) => y !== l) : [...x, l]))}
                className={cn('inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors', on ? 'border-transparent bg-surface text-fg shadow-card' : 'border-line text-muted')}
              >
                <span className={cn('size-2.5 rounded-full', on ? TONE_SOLID[LAYER_META[l].tone] : 'bg-line-strong')} />
                {LAYER_META[l].label}
              </button>
            )
          })}
        </div>

        {/* Month calendar */}
        <Card className="p-3">
          <MonthGrid
            view={view}
            onView={setView}
            onDay={(date) => setDaySheet((s) => ({ key: s.key + 1, open: true, date }))}
            cell={(date) => {
              const s = summary(date)
              const showOut = layers.includes('booked') && s.out > 0
              const dots = LAYERS.filter((l) => l !== 'booked' && layers.includes(l) && s.on[l])
              return {
                label: `${formatDayShort(date)}${s.out ? `, ${s.out} pieces out` : ''}`,
                className: showOut ? (s.out >= 4 ? 'bg-accent text-accent-fg' : 'bg-accent-soft text-accent-soft-fg') : 'text-fg-2 hover:bg-surface-2',
                content: (
                  <>
                    {showOut && <span className="mt-0.5 text-[10px] font-bold leading-none">{s.out} out</span>}
                    {dots.length > 0 && (
                      <span className="absolute right-1 top-1 flex gap-0.5">
                        {dots.map((l) => (
                          <span key={l} className={cn('size-1.5 rounded-full', TONE_SOLID[LAYER_META[l].tone])} />
                        ))}
                      </span>
                    )}
                  </>
                ),
              }
            }}
          />
          <p className="mt-2 px-1 text-xs text-muted">Numbers are pieces out that day. Tap a day to see what’s on it.</p>
        </Card>
      </div>

      <DaySheet
        key={daySheet.key}
        open={daySheet.open}
        date={daySheet.date}
        layers={layers}
        onClose={() => setDaySheet((s) => ({ ...s, open: false }))}
        onFree={(listing, blockId) => free(listing.id, blockId, `${listing.name}`)}
        onBlock={() => {
          setDaySheet((s) => ({ ...s, open: false }))
          setPicker(true)
        }}
      />
      <PickListingSheet open={picker} listings={stock} onClose={() => setPicker(false)} />
    </Screen>
  )
}

function DaySheet({
  open,
  date,
  layers,
  onClose,
  onFree,
  onBlock,
}: {
  open: boolean
  date: string | null
  layers: Layer[]
  onClose: () => void
  onFree: (l: Listing, blockId: string) => void
  onBlock: () => void
}) {
  const listings = useOwner((s) => s.listings)
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  if (!date) return <BottomSheet open={false} onClose={onClose} />
  const rows = listings.filter((l) => !l.review).map((l) => ({ l, d: dayLayers(l, orders, holds, date) }))
  const go = (path: string) => {
    onClose()
    nav.push(path)
  }
  const sections = layers.map((layer) => ({
    layer,
    items: rows.flatMap(({ l, d }): DayItem[] =>
      layer === 'booked'
        ? d.booked.map((o) => ({ key: o.id, l, text: `${o.renter.company} · ${o.qty} piece${o.qty === 1 ? '' : 's'}`, to: `/renter/orders/${o.id}` }))
        : layer === 'reserved'
          ? d.reserved.map((h) => ({ key: h.id, l, text: `${h.renter.company} is holding ${h.qty}`, to: `/renter/stock/${l.id}` }))
          : layer === 'buffer'
            ? d.buffer.map((o) => ({ key: `${o.id}-buf`, l, text: `Turnaround around ${o.renter.company}’s booking`, to: `/renter/stock/${l.id}` }))
            : d.blocked.map((b) => ({ key: b.id, l, text: b.note || 'Blocked', blockId: b.id, to: `/renter/stock/${l.id}/availability` })),
    ),
  }))
  const empty = sections.every((s) => !s.items.length)

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={formatDayShort(date)}
      description={empty ? 'Nothing booked, held or blocked' : 'Listings per layer'}
      footer={
        <Button size="lg" block variant="secondary" icon={CalendarPlusIcon} onClick={onBlock}>
          Block dates
        </Button>
      }
    >
      <div className="space-y-4">
        {sections
          .filter((s) => s.items.length)
          .map((s) => (
            <div key={s.layer}>
              <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.07em] text-muted">
                <span className={cn('size-2 rounded-full', TONE_SOLID[LAYER_META[s.layer].tone])} />
                {LAYER_META[s.layer].label} · {s.items.length}
              </p>
              <div className="overflow-hidden rounded-2xl border border-line">
                {s.items.map((it) => (
                  <div key={it.key} className="group relative flex items-center gap-3 py-2.5 pl-3 pr-2">
                    <button type="button" onClick={() => go(it.to)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <ListingThumb listing={it.l} className="size-10 shrink-0 rounded-lg" iconSize={18} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-fg">{it.l.name}</span>
                        <span className="block truncate text-xs text-muted">{it.text}</span>
                      </span>
                    </button>
                    {it.blockId ? (
                      <Button size="sm" variant="tonal" onClick={() => onFree(it.l, it.blockId!)}>
                        Free it
                      </Button>
                    ) : (
                      <CaretRightIcon size={14} weight="bold" className="shrink-0 text-subtle" />
                    )}
                    <span aria-hidden className="absolute bottom-0 left-3 right-0 h-px bg-line group-last:hidden" />
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </BottomSheet>
  )
}

/** Block dates → pick a listing → its availability page. */
function PickListingSheet({ open, listings, onClose }: { open: boolean; listings: Listing[]; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Block dates" description="Pick a listing, then tap the days to block">
      <div className="-mx-2 flex flex-col">
        {listings.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => {
              onClose()
              nav.push(`/renter/stock/${l.id}/availability`)
            }}
            className="flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors active:bg-surface-2"
          >
            <ListingThumb listing={l} className="size-11 shrink-0 rounded-xl" iconSize={18} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-fg">{l.name}</span>
              <span className="block text-xs text-muted">
                {l.pieces.length} piece{l.pieces.length === 1 ? '' : 's'} · {l.blocks.length ? `${l.blocks.length} block${l.blocks.length === 1 ? '' : 's'}` : 'no blocks'}
              </span>
            </span>
            <CaretRightIcon size={15} weight="bold" className="shrink-0 text-subtle" />
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}
