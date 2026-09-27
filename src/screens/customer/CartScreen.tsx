import { CalendarBlankIcon, CaretRightIcon, FilmSlateIcon, ReceiptIcon, ShoppingCartSimpleIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { BoardSheet } from '@/components/discover/BoardSheet'
import { PropThumb } from '@/components/PropCard'
import { RentSheet } from '@/components/RentSheet'
import { VerifiedTick } from '@/components/platform/VerifiedTick'
import { HOME_CITY, propById } from '@/data/props'
import { daysInclusive, formatDateRangeShort, todayISO } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { EASE_OUT } from '@/lib/motion'
import { byVendor, computeAmounts, lineCost, lineStatus } from '@/lib/ops'
import { clashOn } from '@/lib/search'
import { nav } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { cartLines, useCart, type CartItem, type RentDates } from '@/store/cart'
import { AppBar, Button, Card, DateField, EmptyState, IconButton, Screen } from '@/ui'

/**
 * The cart: props to rent straight away, without a project. Each has its own dates
 * and quantity; checkout turns them into one order in My orders.
 */
export default function CartScreen() {
  const popup = usePopup()
  const items = useCart((s) => s.items)
  const remove = useCart((s) => s.remove)
  const setAllDates = useCart((s) => s.setAllDates)
  const [edit, setEdit] = useState<{ key: number; open: boolean; item: CartItem | null }>({ key: 0, open: false, item: null })
  const [datesSheet, setDatesSheet] = useState({ key: 0, open: false })
  const [boardOpen, setBoardOpen] = useState(false)

  const lines = cartLines(items)
  const ready = lines.filter((l) => lineStatus(l) !== 'unavailable')
  const blocked = lines.length - ready.length
  const amounts = computeAmounts(ready, 0)
  const sameDates = items.every((it) => it.from === items[0]?.from && it.to === items[0]?.to)
  const first = items.reduce((d, it) => (it.from < d ? it.from : d), items[0]?.from ?? todayISO())
  const last = items.reduce((d, it) => (it.to > d ? it.to : d), items[0]?.to ?? first)
  const itemFor = (lineId: string) => items.find((it) => `ln-${it.id}` === lineId)!

  if (!items.length) {
    return (
      <Screen header={<AppBar title="Cart" />}>
        <EmptyState
          icon={ShoppingCartSimpleIcon}
          title="Your cart is empty"
          description="Rent props straight away, no project needed. Tap Rent now on any listing, or add a few and check out together."
          action={
            <div className="flex flex-col items-center gap-2">
              <Button onClick={() => nav.switchTab('discover')}>Browse props</Button>
              <Button variant="ghost" icon={ReceiptIcon} onClick={() => nav.replace('/customer/orders')}>
                My orders
              </Button>
            </div>
          }
        />
      </Screen>
    )
  }

  return (
    <Screen
      header={<AppBar title="Cart" subtitle={`${items.length} prop${items.length === 1 ? '' : 's'} · no project needed`} />}
      footer={
        <div className="@medium:mx-auto @medium:max-w-xl">
          {blocked > 0 && (
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-danger">
              <WarningCircleIcon size={16} weight="fill" className="shrink-0" />
              {blocked} booked on your dates · {blocked === 1 ? 'it stays' : 'they stay'} in the cart
            </p>
          )}
          <Button size="lg" block disabled={!ready.length} onClick={() => nav.push('/customer/checkout')}>
            {ready.length ? `Checkout · ${ready.length} item${ready.length === 1 ? '' : 's'} · ${formatINR(amounts.items - amounts.discount)}` : 'Change dates to check out'}
          </Button>
        </div>
      }
    >
      <div className="px-4 pb-8 pt-3 @medium:mx-auto @medium:max-w-2xl">
        {/* Rental dates for the whole cart */}
        <Card onClick={() => setDatesSheet((s) => ({ key: s.key + 1, open: true }))} className="flex items-center gap-3 p-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <CalendarBlankIcon size={20} weight="fill" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-muted">{sameDates ? 'Rental dates' : 'Dates differ by prop'}</span>
            <span className="block truncate text-[15px] font-semibold text-fg">
              {formatDateRangeShort(first, last)}
              <span className="font-normal text-muted"> · {daysInclusive(first, last)} day{daysInclusive(first, last) === 1 ? '' : 's'}</span>
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-accent">{sameDates ? 'Change' : 'Make the same'}</span>
        </Card>

        {byVendor(lines).map(({ vendor, items: group }) => (
          <Card key={vendor.id} className="mt-3 overflow-hidden">
            <p className="flex items-center gap-1.5 border-b border-line px-4 py-2.5 text-sm font-semibold text-fg">
              {vendor.name}
              <VerifiedTick vendorId={vendor.id} size={14} />
              <span className="ml-auto text-xs font-normal text-muted">{vendor.city === HOME_CITY ? vendor.area : vendor.city}</span>
            </p>
            <AnimatePresence initial={false}>
              {group.map((l) => {
                const prop = propById(l.propId)
                const clash = clashOn(prop, l.from, l.to)
                return (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: EASE_OUT }}
                    className="group relative flex items-center"
                  >
                    <button
                      type="button"
                      onClick={() => setEdit((s) => ({ key: s.key + 1, open: true, item: itemFor(l.id) }))}
                      className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-4 pr-1 text-left transition-colors active:bg-surface-2"
                    >
                      <PropThumb item={prop} iconSize={18} className="size-12 shrink-0 rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-fg">{prop.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {l.qty > 1 && `${l.qty} × `}
                          {formatDateRangeShort(l.from, l.to)} · {formatINR(prop.pricePerDay)}/day
                        </span>
                        {clash ? (
                          <span className="mt-0.5 block text-xs font-semibold text-danger">Booked {formatDateRangeShort(clash[0], clash[1])} · change dates</span>
                        ) : (
                          <span className="mt-0.5 block text-sm font-semibold tabular-nums text-fg">{formatINR(lineCost(l))}</span>
                        )}
                      </span>
                      <CaretRightIcon size={14} weight="bold" className="shrink-0 text-subtle" />
                    </button>
                    <IconButton
                      icon={XIcon}
                      size="sm"
                      label={`Remove ${prop.name}`}
                      className="mr-2 text-muted"
                      onClick={() => {
                        haptic()
                        const undo = remove(itemFor(l.id).id)
                        popup.toast(`${prop.name} removed`, { action: { label: 'Undo', onClick: undo } })
                      }}
                    />
                    <span aria-hidden className="absolute bottom-0 left-[76px] right-0 h-px bg-line group-last:hidden" />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </Card>
        ))}

        <Card className="mt-4 p-4">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Rent</dt>
              <dd className="font-medium tabular-nums text-fg">{formatINR(amounts.items)}</dd>
            </div>
            {amounts.discount > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">3+ day discount</dt>
                <dd className="font-medium tabular-nums text-success">−{formatINR(amounts.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3 border-t border-line pt-2 text-[15px] font-bold text-fg">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatINR(amounts.items - amounts.discount)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">Transport, 18% GST and a refundable deposit are added at checkout.</p>
        </Card>

        {/* The other way: plan these in a project instead */}
        <button
          type="button"
          onClick={() => setBoardOpen(true)}
          className="pressable mt-4 flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong p-3.5 text-left outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
        >
          <FilmSlateIcon size={22} weight="duotone" className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-fg">Planning a whole shoot?</span>
            <span className="block text-[13px] text-muted">Put these on a project board to hold them, share with the team and book later.</span>
          </span>
          <CaretRightIcon size={14} weight="bold" className="shrink-0 text-subtle" />
        </button>
      </div>

      {edit.item && <RentSheet key={edit.key} open={edit.open} onClose={() => setEdit((s) => ({ ...s, open: false }))} propId={edit.item.propId} item={edit.item} />}
      <DatesSheet
        key={`dates-${datesSheet.key}`}
        open={datesSheet.open}
        initial={{ from: first, to: sameDates ? last : first }}
        onClose={() => setDatesSheet((s) => ({ ...s, open: false }))}
        onSave={(dates) => {
          setAllDates(dates)
          setDatesSheet((s) => ({ ...s, open: false }))
          haptic('success')
          popup.toast('Dates changed for every prop', { tone: 'success' })
        }}
      />
      <BoardSheet
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
        propIds={items.map((it) => it.propId)}
        title="Plan in a project"
        description={`Put ${items.length} prop${items.length === 1 ? '' : 's'} on a project board. They stay in your cart too.`}
      />
    </Screen>
  )
}

/** One set of dates for everything in the cart. */
function DatesSheet({ open, initial, onClose, onSave }: { open: boolean; initial: RentDates; onClose: () => void; onSave: (dates: RentDates) => void }) {
  const today = todayISO()
  const [from, setFrom] = useState(initial.from < today ? today : initial.from)
  const [to, setTo] = useState(initial.to < from ? from : initial.to)
  const days = daysInclusive(from, to)
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Rental dates"
      description="Every prop in the cart moves to these dates"
      footer={
        <Button size="lg" block onClick={() => onSave({ from, to })}>
          Use these dates · {days} day{days === 1 ? '' : 's'}
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <DateField
          label="From"
          format="short"
          value={from}
          min={today}
          onChange={(f) => {
            setFrom(f)
            if (to < f) setTo(f)
          }}
        />
        <DateField label="To" format="short" value={to} min={from} onChange={setTo} />
      </div>
      <p className="mt-3 text-[13px] text-muted">Delivery is the evening before or the morning of the first day; pickup is after the last. You pick at checkout.</p>
    </BottomSheet>
  )
}
