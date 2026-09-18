import { CalendarXIcon, CaretRightIcon, PackageIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { MonthGrid } from '@/components/owner/OwnerUI'
import { cn } from '@/lib/cn'
import { addDays, formatDateRangeShort, formatDayShort, fromISODate, todayISO } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { dayLayers, inRepair, type Listing } from '@/lib/owner'
import { nav, useParams } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useListing, useOwner } from '@/store/owner'
import { AppBar, Button, Card, Chip, EmptyState, Screen, SectionHeader, Tag, TextField } from '@/ui'

const STATUS_TAG = { request: ['Request', 'warning'], confirmed: ['Booked', 'brand'], out: ['Out now', 'info'] } as const

export default function AvailabilityScreen() {
  const { id } = useParams<{ id: string }>()
  const listing = useListing(id)
  if (!listing) {
    return (
      <Screen header={<AppBar title="Availability" />}>
        <EmptyState icon={PackageIcon} title="Listing not found" action={<Button onClick={() => nav.pop()}>Go back</Button>} />
      </Screen>
    )
  }
  return <Availability l={listing} />
}

/** Availability: month calendar, tap to block or free, and the bookings on this prop. */
function Availability({ l }: { l: Listing }) {
  const popup = usePopup()
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  const removeBlock = useOwner((s) => s.removeBlock)
  const addBlock = useOwner((s) => s.addBlock)
  const today = todayISO()
  const t = fromISODate(today)
  const [view, setView] = useState({ year: t.getFullYear(), month: t.getMonth() })
  const [sheet, setSheet] = useState<{ key: number; open: boolean; date: string }>({ key: 0, open: false, date: today })
  const usable = l.pieces.length - inRepair(l)
  const bookings = orders.filter((o) => o.listingId === l.id && (o.status === 'request' || o.status === 'confirmed' || o.status === 'out')).sort((a, b) => a.from.localeCompare(b.from))

  const free = (blockId: string, label: string) => {
    const undo = removeBlock(l.id, blockId)
    haptic('success')
    popup.toast(`${label} freed`, { action: { label: 'Undo', onClick: undo } })
  }

  const tap = async (date: string) => {
    const d = dayLayers(l, orders, holds, date)
    if (d.blocked.length) {
      const b = d.blocked[0]
      const ok = await popup.confirm({ title: `Free ${formatDateRangeShort(b.from, b.to)}?`, message: b.note ? `Blocked for “${b.note}”.` : undefined, confirmText: 'Free it' })
      if (ok) free(b.id, formatDateRangeShort(b.from, b.to))
      return
    }
    if (d.booked.length) {
      const booked = d.booked.reduce((n, o) => n + o.qty, 0)
      const ok = await popup.confirm({
        title: 'This day is booked',
        message: `${d.booked.map((o) => o.renter.company).join(', ')} ${d.booked.length === 1 ? 'has' : 'have'} ${booked} of ${l.pieces.length} pieces. Blocking it will show as a conflict in your diary.`,
        confirmText: 'Block anyway',
        tone: 'danger',
      })
      if (!ok) return
    }
    setSheet((s) => ({ key: s.key + 1, open: true, date }))
  }

  return (
    <Screen header={<AppBar title="Availability" subtitle={l.name} />}>
      <div className="space-y-3 px-4 pb-10 pt-1 @medium:mx-auto @medium:max-w-2xl">
        <div className="flex flex-wrap gap-3 px-1 text-xs font-medium text-fg-2">
          <Legend className="bg-accent-soft" label="Booked" />
          <Legend className="bg-warning-soft" label="Buffer" />
          <Legend className="bg-surface-3 line-through" label="Blocked" />
          <Legend className="border border-line" label="Free" />
        </div>
        <Card className="p-3">
          <MonthGrid
            view={view}
            onView={setView}
            onDay={tap}
            cell={(date) => {
              const d = dayLayers(l, orders, holds, date)
              const booked = d.booked.reduce((n, o) => n + o.qty, 0)
              const past = date < today
              return {
                disabled: past,
                label: `${formatDayShort(date)}: ${d.blocked.length ? 'blocked' : booked ? `${booked} of ${usable} booked` : d.buffer.length ? 'buffer' : 'free'}`,
                className: cn(
                  past && 'opacity-40',
                  d.blocked.length ? 'bg-surface-3 text-muted line-through' : booked ? 'bg-accent-soft text-accent-soft-fg' : d.buffer.length ? 'bg-warning-soft text-warning' : 'text-fg-2 hover:bg-surface-2',
                ),
                content: booked && !d.blocked.length ? <span className="mt-0.5 text-[10px] font-bold leading-none">{booked}/{usable}</span> : undefined,
              }
            }}
          />
          <p className="mt-2 px-1 text-xs text-muted">Tap a free day to block it, or a blocked day to free it. {l.bufferDays ? `${l.bufferDays} day${l.bufferDays === 1 ? '' : 's'} are kept free either side of bookings.` : ''}</p>
        </Card>

        {l.blocks.length > 0 && (
          <>
            <SectionHeader title="Blocks" className="px-1 pt-3" />
            <Card className="overflow-hidden">
              {l.blocks.map((b) => (
                <div key={b.id} className="group relative flex items-center gap-3 py-3 pl-4 pr-2">
                  <CalendarXIcon size={20} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-fg">{formatDateRangeShort(b.from, b.to)}</span>
                    <span className="block truncate text-[13px] text-muted">{b.note || 'No reason given'}</span>
                  </span>
                  <Button size="sm" variant="tonal" onClick={() => free(b.id, formatDateRangeShort(b.from, b.to))}>
                    Free it
                  </Button>
                  <span aria-hidden className="absolute bottom-0 left-12 right-0 h-px bg-line group-last:hidden" />
                </div>
              ))}
            </Card>
          </>
        )}

        <SectionHeader title="Bookings on this prop" subtitle={bookings.length ? undefined : 'Nothing booked yet'} className="px-1 pt-3" />
        {bookings.length > 0 && (
          <Card className="overflow-hidden">
            {bookings.map((o) => {
              const [label, tone] = STATUS_TAG[o.status as keyof typeof STATUS_TAG]
              return (
                <button key={o.id} type="button" onClick={() => nav.push(`/renter/orders/${o.id}`)} className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-fg">{o.renter.company}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {formatDateRangeShort(o.from, o.to)} · {o.qty} piece{o.qty === 1 ? '' : 's'} · {o.id}
                    </span>
                  </span>
                  <Tag tone={tone} dot>
                    {label}
                  </Tag>
                  <CaretRightIcon size={14} weight="bold" className="shrink-0 text-subtle" />
                  <span aria-hidden className="absolute bottom-0 left-4 right-0 h-px bg-line group-last:hidden" />
                </button>
              )
            })}
          </Card>
        )}
      </div>

      <BlockSheet
        key={sheet.key}
        open={sheet.open}
        from={sheet.date}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onBlock={(days, note) => {
          const to = addDays(sheet.date, days - 1)
          addBlock(l.id, { from: sheet.date, to, note })
          setSheet((s) => ({ ...s, open: false }))
          haptic('success')
          popup.toast(`Blocked ${formatDateRangeShort(sheet.date, to)}`, { tone: 'success' })
        }}
      />
    </Screen>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-3.5 rounded', className)} />
      {label}
    </span>
  )
}

function BlockSheet({ open, from, onClose, onBlock }: { open: boolean; from: string; onClose: () => void; onBlock: (days: number, note: string) => void }) {
  const [days, setDays] = useState(1)
  const [note, setNote] = useState('')
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Block from ${formatDayShort(from)}`}
      description={`Until ${formatDayShort(addDays(from, days - 1))}. Renters can’t book it on these days.`}
      footer={
        <Button size="lg" block icon={CalendarXIcon} onClick={() => onBlock(days, note.trim())}>
          Block {days === 1 ? 'this day' : `${days} days`}
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 7, 14].map((n) => (
          <Chip key={n} selected={days === n} onClick={() => setDays(n)}>
            {n === 1 ? '1 day' : n === 7 ? '1 week' : n === 14 ? '2 weeks' : `${n} days`}
          </Chip>
        ))}
      </div>
      <TextField className="mt-4" label="Reason (only you see it)" value={note} onChange={(e) => setNote(e.target.value)} hint="e.g. Polishing, own use, photo shoot" />
    </BottomSheet>
  )
}
