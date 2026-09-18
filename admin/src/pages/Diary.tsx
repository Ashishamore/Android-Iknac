import { CalendarPlusIcon, CalendarXIcon, CaretRightIcon, WarningIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { formatDateLong, formatDateRangeShort, isoFromParts, todayISO } from '@/lib/dates'
import { useNow } from '@/lib/hooks'
import { conflicts, dayLayers, LAYER_META, type Layer, type Listing } from '@/lib/owner'
import { TONE_SOLID } from '@/lib/tones'
import { useOwner } from '@/store/owner'
import { plural } from '~/lib/data'
import { linkProps, navigate, useQuery } from '~/router'
import { MonthCalendar, MonthNav } from '~/ui/Calendar'
import { thisMonth } from '~/ui/month'
import { Button, SearchInput, Select } from '~/ui/controls'
import { Banner, Card, CardHeader, PageHeader, Thumb } from '~/ui/display'
import { toast } from '~/ui/feedback'
import { Dialog } from '~/ui/overlays'

const LAYERS: Layer[] = ['booked', 'reserved', 'buffer', 'blocked']
const LAYER_CHIP: Record<Layer, string> = {
  booked: 'border-accent bg-accent-soft text-accent-soft-fg',
  reserved: 'border-info bg-info-soft text-info',
  buffer: 'border-warning bg-warning-soft text-warning',
  blocked: 'border-subtle bg-surface-3 text-fg-2',
}

interface DayItem {
  key: string
  layer: Layer
  l: Listing
  text: string
  short: string
  to: string
  blockId?: string
}

/** DIARY: conflicts, layers, month calendar with pieces out per day, day detail, block dates. */
export default function Diary() {
  const query = useQuery()
  const listings = useOwner((s) => s.listings)
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  const removeBlock = useOwner((s) => s.removeBlock)
  const now = useNow(60_000).getTime()
  const today = todayISO()
  const [view, setView] = useState(thisMonth)
  const [layers, setLayers] = useState<Layer[]>(LAYERS)
  const [only, setOnly] = useState<string>('all')
  const [selected, setSelected] = useState(today)
  const [picker, setPicker] = useState(() => query.get('block') === '1')
  const clashes = conflicts(listings, orders)
  const stock = listings.filter((l) => !l.review && (only === 'all' || l.id === only))

  const compute = (date: string) => {
    let out = 0
    const items: DayItem[] = []
    for (const l of stock) {
      const d = dayLayers(l, orders, holds, date, now)
      out += d.booked.reduce((n, o) => n + o.qty, 0)
      d.booked.forEach((o) => items.push({ key: `${o.id}`, layer: 'booked', l, short: `${l.name} ×${o.qty}`, text: `${o.renter.company} · ${plural(o.qty, 'piece')} · ${o.status === 'out' ? 'out now' : 'confirmed'}`, to: `/orders/${o.id}` }))
      d.reserved.forEach((h) => items.push({ key: h.id, layer: 'reserved', l, short: `${l.name} held`, text: `${h.renter.company} is holding ${h.qty}`, to: `/stock/${l.id}` }))
      d.buffer.forEach((o) => items.push({ key: `${o.id}-buf`, layer: 'buffer', l, short: `${l.name} turnaround`, text: `Turnaround around ${o.renter.company}’s booking`, to: `/stock/${l.id}` }))
      d.blocked.forEach((b) => items.push({ key: b.id, layer: 'blocked', l, short: `${l.name} blocked`, text: b.note || 'Blocked', blockId: b.id, to: `/stock/${l.id}?tab=availability` }))
    }
    return { out, items }
  }
  const monthDays = useMemo(() => {
    const n = new Date(view.year, view.month + 1, 0).getDate()
    return Array.from({ length: n }, (_, i) => isoFromParts(view.year, view.month, i + 1))
  }, [view])
  const byDate = new Map(monthDays.map((d) => [d, compute(d)]))
  const itemsOn = (date: string) => byDate.get(date) ?? compute(date)

  const free = (l: Listing, blockId: string) => {
    const undo = removeBlock(l.id, blockId)
    toast(`${l.name} freed`, { tone: 'success', action: { label: 'Undo', onClick: undo } })
  }

  const day = itemsOn(selected)
  const dayItems = day.items.filter((it) => layers.includes(it.layer))

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Diary' }]}
        title="Diary"
        subtitle="Every booking, hold and block across your stock"
        actions={
          <Button icon={CalendarPlusIcon} onClick={() => setPicker(true)}>
            Block dates
          </Button>
        }
      />

      {/* Conflict banner */}
      {clashes.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {clashes.map(({ listing, block, order }) => (
            <Banner
              key={`${block.id}-${order.id}`}
              tone="danger"
              icon={WarningIcon}
              title="Blocked over a booking"
              actions={
                <>
                  <Button size="sm" variant="danger" onClick={() => free(listing, block.id)}>
                    Free it
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/orders/${order.id}`)}>
                    See booking
                  </Button>
                </>
              }
            >
              <span className="font-semibold text-fg">{listing.name}</span> is blocked {formatDateRangeShort(block.from, block.to)}
              {block.note ? ` (${block.note})` : ''}, but {order.renter.company} has it booked {formatDateRangeShort(order.from, order.to)}.
            </Banner>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <MonthNav view={view} onView={setView} />
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Layers">
          {LAYERS.map((l) => {
            const on = layers.includes(l)
            return (
              <button
                key={l}
                type="button"
                aria-pressed={on}
                onClick={() => setLayers((x) => (on ? x.filter((y) => y !== l) : [...x, l]))}
                className={cn('inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-[13px] font-semibold transition-colors', on ? 'border-line-strong bg-surface text-fg shadow-card' : 'border-dashed border-line-strong text-muted hover:text-fg')}
              >
                <span className={cn('size-2.5 rounded-sm', on ? TONE_SOLID[LAYER_META[l].tone] : 'bg-line-strong')} />
                {LAYER_META[l].label}
              </button>
            )
          })}
        </div>
        <Select value={only} onChange={(e) => setOnly(e.target.value)} aria-label="Show stock" className="ml-auto w-full sm:w-56">
          <option value="all">All stock</option>
          {listings
            .filter((l) => !l.review)
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Month calendar */}
        <div className="min-w-0">
          <MonthCalendar
            view={view}
            selected={selected}
            onDay={setSelected}
            cell={(date) => {
              const s = itemsOn(date)
              const shown = s.items.filter((it) => layers.includes(it.layer))
              const showOut = layers.includes('booked') && s.out > 0
              return {
                label: `${formatDateLong(date)}${s.out ? `, ${s.out} pieces out` : ''}`,
                className: date < today ? 'bg-surface-2/30' : undefined,
                content: (
                  <>
                    {showOut && <span className={cn('absolute right-1.5 top-1.5 rounded px-1 text-[10px] font-bold tabular-nums sm:right-2 sm:top-2', s.out >= 4 ? 'bg-accent text-accent-fg' : 'bg-accent-soft text-accent-soft-fg')}>{s.out} out</span>}
                    <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                      {shown.slice(0, 3).map((it) => (
                        <span key={it.key} className={cn('truncate rounded-sm border-l-2 px-1 py-px text-[11px] font-medium leading-tight', LAYER_CHIP[it.layer])}>
                          {it.short}
                        </span>
                      ))}
                      {shown.length > 3 && <span className="px-1 text-[11px] font-semibold text-muted">+{shown.length - 3} more</span>}
                    </span>
                    {shown.length > 0 && (
                      <span className="flex gap-0.5 sm:hidden">
                        {LAYERS.filter((l) => shown.some((it) => it.layer === l)).map((l) => (
                          <span key={l} className={cn('size-1.5 rounded-full', TONE_SOLID[LAYER_META[l].tone])} />
                        ))}
                      </span>
                    )}
                  </>
                ),
              }
            }}
          />
          <p className="mt-2 text-xs text-muted">Numbers are pieces out that day. Click a day to see what’s on it.</p>
        </div>

        {/* Day detail */}
        <Card className="h-fit xl:sticky xl:top-4">
          <CardHeader title={formatDateLong(selected)} subtitle={dayItems.length ? `${day.out} pieces out · ${plural(dayItems.length, 'entry', 'entries')}` : 'Nothing booked, held or blocked'} />
          <div className="flex flex-col gap-4 p-4">
            {LAYERS.filter((layer) => layers.includes(layer)).map((layer) => {
              const items = dayItems.filter((it) => it.layer === layer)
              if (!items.length) return null
              return (
                <div key={layer}>
                  <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                    <span className={cn('size-2 rounded-sm', TONE_SOLID[LAYER_META[layer].tone])} />
                    {LAYER_META[layer].label} · {items.length}
                  </p>
                  <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                    {items.map((it) => (
                      <li key={it.key} className="flex items-center gap-2 pr-2">
                        <a {...linkProps(it.to)} className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-2.5 transition-colors hover:text-accent">
                          <Thumb listing={it.l} className="size-9 rounded-md" iconSize={16} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-fg">{it.l.name}</span>
                            <span className="block truncate text-xs text-muted">{it.text}</span>
                          </span>
                        </a>
                        {it.blockId ? (
                          <Button size="xs" variant="tonal" onClick={() => free(it.l, it.blockId!)}>
                            Free it
                          </Button>
                        ) : (
                          <CaretRightIcon size={13} weight="bold" className="shrink-0 text-subtle" />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {dayItems.length === 0 && <p className="text-[13px] text-muted">Every piece is free this day.</p>}
            <Button variant="secondary" icon={CalendarXIcon} onClick={() => setPicker(true)}>
              Block dates
            </Button>
          </div>
        </Card>
      </div>

      <PickListingDialog open={picker} listings={listings.filter((l) => !l.review)} onClose={() => setPicker(false)} />
    </>
  )
}

/** Block dates → pick a listing → its page (availability). */
function PickListingDialog({ open, listings, onClose }: { open: boolean; listings: Listing[]; onClose: () => void }) {
  const [q, setQ] = useState('')
  const shown = listings.filter((l) => l.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <Dialog open={open} onClose={onClose} title="Block dates" description="Pick a listing, then click the days to block" bodyClassName="p-0">
      <div className="border-b border-line p-3">
        <SearchInput autoFocus value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search your stock" />
      </div>
      <ul className="p-1.5">
        {shown.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate(`/stock/${l.id}?tab=availability`)
              }}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2"
            >
              <Thumb listing={l} className="size-10 rounded-lg" iconSize={18} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{l.name}</span>
                <span className="block text-xs text-muted">
                  {plural(l.pieces.length, 'piece')} · {l.blocks.length ? plural(l.blocks.length, 'block') : 'no blocks'}
                </span>
              </span>
              <CaretRightIcon size={14} weight="bold" className="shrink-0 text-subtle" />
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No stock matches “{q}”</li>}
      </ul>
    </Dialog>
  )
}
