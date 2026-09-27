import { CheckCircleIcon, MinusIcon, PlusIcon, ShoppingCartSimpleIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { propById, vendorById, type RentalProp } from '@/data/props'
import { cn } from '@/lib/cn'
import { addDays, daysInclusive, formatDateRangeShort, todayISO } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { clashOn, isFreeOn } from '@/lib/search'
import { nav } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { nextRentDates, useCart, type CartItem, type RentDates } from '@/store/cart'
import { Button, Checkbox, DateField } from '@/ui'
import { PropThumb } from './PropCard'

interface RentSheetProps {
  open: boolean
  onClose: () => void
  propId: string
  /** Editing an item already in the cart (from the cart screen). */
  item?: CartItem | null
}

/** The next dates of the same length that the prop is free on (within two months). */
function nextFree(prop: RentalProp, { from, to }: RentDates): RentDates | null {
  const extra = daysInclusive(from, to) - 1
  for (let i = 1; i <= 60; i++) {
    const f = addDays(from, i)
    if (isFreeOn(prop, f, addDays(f, extra))) return { from: f, to: addDays(f, extra) }
  }
  return null
}

/**
 * Rent a prop without a project: dates, quantity and the rent, then
 * "Add to cart" or "Rent now" (straight to checkout). From the cart it edits the item.
 * Give it a new `key` each time it opens so it starts from the cart's latest dates.
 */
export function RentSheet({ open, onClose, propId, item = null }: RentSheetProps) {
  const popup = usePopup()
  const inCart = useCart((s) => s.items.find((it) => it.propId === propId))
  const others = useCart((s) => s.items.filter((it) => it.propId !== propId).length)
  const add = useCart((s) => s.add)
  const update = useCart((s) => s.update)
  const remove = useCart((s) => s.remove)
  const setAllDates = useCart((s) => s.setAllDates)
  const [start] = useState(() => item ?? inCart ?? { ...nextRentDates(useCart.getState().dates), qty: 1 })
  const [from, setFrom] = useState(start.from)
  const [to, setTo] = useState(start.to)
  const [qty, setQty] = useState(start.qty)
  const [allDates, setAllDatesOn] = useState(false)
  const prop = propById(propId) as RentalProp | undefined
  if (!prop) return <BottomSheet open={false} onClose={onClose} />

  const vendor = vendorById(prop.vendorId)
  const days = daysInclusive(from, to)
  const rent = prop.pricePerDay * days * qty
  const discount = days >= 3 ? Math.round(rent * 0.05) : 0
  const clash = clashOn(prop, from, to)
  const free = clash ? nextFree(prop, { from, to }) : null

  const addToCart = () => {
    const result = add(prop.id, { from, to, qty })
    haptic('success')
    onClose()
    popup.toast(result === 'added' ? `${prop.name} added to your cart` : 'Cart updated', {
      tone: 'success',
      action: { label: 'View cart', onClick: () => nav.push('/customer/cart') },
    })
  }

  const rentNow = () => {
    haptic()
    onClose()
    nav.push(`/customer/checkout?prop=${encodeURIComponent(prop.id)}&from=${from}&to=${to}&qty=${qty}`)
  }

  const save = () => {
    if (!item) return
    if (allDates) setAllDates({ from, to })
    update(item.id, { from, to, qty })
    haptic('success')
    onClose()
    popup.toast(allDates ? 'Dates changed for the whole cart' : 'Cart updated', { tone: 'success' })
  }

  const removeItem = () => {
    if (!item) return
    const undo = remove(item.id)
    onClose()
    popup.toast(`${prop.name} removed from your cart`, { action: { label: 'Undo', onClick: undo } })
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={item ? 'Edit rental' : 'Rent this prop'}
      description={item ? undefined : 'No project needed. The order goes straight to My orders.'}
      footer={
        item ? (
          <div className="flex gap-3">
            <Button size="lg" variant="danger-soft" className="flex-1" onClick={removeItem}>
              Remove
            </Button>
            <Button size="lg" className="flex-1" disabled={!!clash} onClick={save}>
              Save
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button size="lg" variant="secondary" icon={ShoppingCartSimpleIcon} className="flex-1 px-4" disabled={!!clash} onClick={addToCart}>
              {inCart ? 'Update cart' : 'Add to cart'}
            </Button>
            <Button size="lg" className="flex-1 px-4" disabled={!!clash} onClick={rentNow}>
              Rent now
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <PropThumb item={prop} iconSize={22} className="size-14 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-fg">{prop.name}</p>
            <p className="truncate text-[13px] text-muted">
              {vendor.name} · {formatINR(prop.pricePerDay)}/day
            </p>
          </div>
        </div>

        <section>
          <Label>Dates</Label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <DateField
              label="From"
              format="short"
              value={from}
              min={todayISO()}
              onChange={(f) => {
                setFrom(f)
                if (to < f) setTo(f)
              }}
            />
            <DateField label="To" format="short" value={to} min={from} onChange={setTo} />
          </div>
          {clash ? (
            <div className="mt-2.5 rounded-2xl bg-danger-soft px-3.5 py-2.5 text-[13px] leading-snug text-danger" role="alert">
              <p className="flex items-start gap-2">
                <WarningCircleIcon size={16} weight="fill" className="mt-px shrink-0" />
                Booked {formatDateRangeShort(clash[0], clash[1])}. Pick other dates.
              </p>
              {free && (
                <button
                  type="button"
                  onClick={() => {
                    haptic()
                    setFrom(free.from)
                    setTo(free.to)
                  }}
                  className="pressable ml-6 mt-1.5 inline-flex h-8 items-center rounded-full bg-surface px-3 text-[13px] font-semibold text-accent shadow-card"
                >
                  Next free: {formatDateRangeShort(free.from, free.to)}
                </button>
              )}
            </div>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-success">
              <CheckCircleIcon size={15} weight="fill" /> Free on these dates
            </p>
          )}
          {item && others > 0 && (
            <div className="mt-3">
              <Checkbox
                checked={allDates}
                onChange={setAllDatesOn}
                label="Use these dates for the whole cart"
                description={`Moves the other ${others} prop${others === 1 ? '' : 's'} too`}
              />
            </div>
          )}
        </section>

        <section className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-medium text-fg">Quantity</p>
            <p className="text-[13px] text-muted">How many pieces</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1" role="group" aria-label="Quantity">
            <StepButton label="Fewer" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>
              <MinusIcon size={16} weight="bold" />
            </StepButton>
            <span className="w-8 text-center text-[15px] font-bold tabular-nums text-fg" aria-live="polite">
              {qty}
            </span>
            <StepButton label="More" disabled={qty >= 20} onClick={() => setQty(qty + 1)}>
              <PlusIcon size={16} weight="bold" />
            </StepButton>
          </div>
        </section>

        <section className="rounded-2xl bg-surface-2 p-3.5">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">
                {formatINR(prop.pricePerDay)} × {days} day{days === 1 ? '' : 's'}
                {qty > 1 && ` × ${qty}`}
              </dt>
              <dd className="font-medium tabular-nums text-fg">{formatINR(rent)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">3+ day discount (5%)</dt>
                <dd className="font-medium tabular-nums text-success">−{formatINR(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3 border-t border-line pt-2 text-[15px] font-bold text-fg">
              <dt>Rent</dt>
              <dd className="tabular-nums">{formatINR(rent - discount)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">Transport, GST and a refundable deposit are added at checkout.</p>
        </section>
      </div>
    </BottomSheet>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">{children}</p>
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        haptic()
        onClick()
      }}
      className={cn('pressable grid size-9 place-items-center rounded-full bg-surface text-fg shadow-card', disabled && 'pointer-events-none opacity-40')}
    >
      {children}
    </button>
  )
}
