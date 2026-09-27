import {
  BankIcon,
  BuildingOfficeIcon,
  CheckIcon,
  CreditCardIcon,
  MapPinIcon,
  PackageIcon,
  PlusIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  WarningCircleIcon,
  type Icon,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { AddressSheet } from '@/components/AddressSheet'
import { LocationSheet } from '@/components/LocationSheet'
import { PropThumb } from '@/components/PropCard'
import { VerifiedTick } from '@/components/platform/VerifiedTick'
import { HOME_CITY, propById } from '@/data/props'
import { BANKS, TRANSPORT_MODES, VENDOR_TERMS, WINDOWS, type TransportMode } from '@/data/ops'
import { cn } from '@/lib/cn'
import { addDays, formatDateRangeShort, formatDayShort, todayISO } from '@/lib/dates'
import { formatDistance, formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep, useNow } from '@/lib/hooks'
import { EASE_OUT, T } from '@/lib/motion'
import {
  DEFAULT_SETTINGS,
  MOVE_COST,
  byVendor,
  computeAmounts,
  defaultMode,
  lineCost,
  lineStatus,
  runCost,
  runPath,
  type BoardLine,
  type Booking,
  type PaymentMethod,
  type Place,
  type ProjectBoard,
} from '@/lib/ops'
import { nav, useBackHandler } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useFlag } from '@/store/platform'
import { useProfile } from '@/store/profile'
import { useProjectOps } from '@/store/projectOps'
import { useProjects, type Project, type ShootLocation } from '@/store/projects'
import { useAccount, useDisplayName } from '@/store/session'
import { AppBar, Button, Card, CheckboxVisual, Chip, FadeSwitch, Screen, Switch, TextField } from '@/ui'

type StepId = 'items' | 'when' | 'transport' | 'pay' | 'terms'
const STEP_TITLE: Record<StepId, string> = { items: 'Items', when: 'Where and when', transport: 'Transport', pay: 'Payment', terms: 'Vendor terms' }

const PAYMENTS: { id: PaymentMethod; label: string; description: string; icon: Icon }[] = [
  { id: 'upi', label: 'UPI', description: 'GPay, PhonePe, Paytm or any UPI app', icon: QrCodeIcon },
  { id: 'card', label: 'Card', description: 'Credit or debit card', icon: CreditCardIcon },
  { id: 'netbanking', label: 'Net banking', description: 'All major banks', icon: BankIcon },
  { id: 'po', label: 'Company PO', description: 'Pay against invoice within 30 days', icon: BuildingOfficeIcon },
]

interface BookingFlowProps {
  /** The project and board being booked, or null for a direct order (cart or "Rent now"). */
  project: Project | null
  board: ProjectBoard | null
  /** What can be booked: the board's lines, or the cart's. */
  lines: BoardLine[]
  /** After it's booked (e.g. take the props out of the cart). */
  onBooked?: (booking: Booking) => void
}

/**
 * Booking in steps: (Items →) Where and when → Transport → Payment → Vendor terms → Confirmed.
 * A project books a board's items to its shoot locations; a direct order skips "Items"
 * (the cart was the review) and delivers to a saved address.
 */
export function BookingFlow({ project, board, lines: all, onBooked }: BookingFlowProps) {
  const popup = usePopup()
  const myName = useDisplayName()
  const myPhone = useAccount()?.phone
  const settings = useProjectOps((s) => (project ? s.settings[project.id] : undefined)) ?? DEFAULT_SETTINGS
  const book = useProjectOps((s) => s.book)
  const updateProject = useProjects((s) => s.updateProject)
  const addresses = useProfile((s) => s.addresses)
  const saveAddress = useProfile((s) => s.saveAddress)
  const now = useNow(60_000).getTime()
  const direct = !project || !board

  const steps: StepId[] = direct ? ['when', 'transport', 'pay', 'terms'] : ['items', 'when', 'transport', 'pay', 'terms']
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const step = steps[index]
  const last = index === steps.length - 1
  const [done, setDone] = useState<Booking | null>(null)
  // "Instant booking", from the Control Centre's feature flags.
  const instant = useFlag('instantBooking')

  const bookable = all.filter((l) => ['reserved', 'not-reserved'].includes(lineStatus(l, now)))
  const blocked = all.filter((l) => lineStatus(l, now) === 'unavailable')
  const [selected, setSelected] = useState<string[]>(() => bookable.map((l) => l.id))
  const lines = all.filter((l) => selected.includes(l.id))
  const firstDay = lines.reduce((d, l) => (l.from < d ? l.from : d), lines[0]?.from ?? project?.startDate ?? todayISO())
  const lastDay = lines.reduce((d, l) => (l.to > d ? l.to : d), lines[0]?.to ?? project?.endDate ?? firstDay)

  // Where and when: a project's shoot locations, or your saved addresses.
  const places: (Place & { label?: string })[] = direct
    ? addresses.map((a) => ({ id: a.id, name: a.name, address: a.line, label: a.label }))
    : project.locations
  const [deliverTo, setDeliverTo] = useState<string | null>(() =>
    direct ? (addresses.find((a) => a.isDefault) ?? addresses[0])?.id ?? null : (board.block.locationId ?? project.locations[0]?.id ?? null),
  )
  const dayBefore = addDays(firstDay, -1) < todayISO() ? firstDay : addDays(firstDay, -1)
  const [deliveryDate, setDeliveryDate] = useState(settings.timing === 'day-before' ? dayBefore : firstDay)
  const [deliveryWindow, setDeliveryWindow] = useState(settings.timing === 'day-before' ? '5–7 PM' : '6–8 AM')
  const [returnDate, setReturnDate] = useState(lastDay)
  const [returnWindow, setReturnWindow] = useState('8–10 PM')
  const [contact, setContact] = useState({ name: myName, phone: myPhone ?? '9876543210' })
  const [placeSheet, setPlaceSheet] = useState({ key: 0, open: false })
  const openPlaceSheet = () => setPlaceSheet((s) => ({ key: s.key + 1, open: true }))

  // Transport
  const vendors = byVendor(lines)
  const [modes, setModes] = useState<Record<string, TransportMode>>({})
  const modeOf = (vendorId: string) => modes[vendorId] ?? defaultMode(vendors.find((v) => v.vendor.id === vendorId)!.vendor)
  const canMove = !direct && project.locations.length >= 2
  const [move, setMove] = useState(false)
  const moveFrom = project?.locations.find((l) => l.id === deliverTo) ?? project?.locations[0]
  const moveTo = project?.locations.find((l) => l.id !== moveFrom?.id)
  const each = vendors.map(({ vendor }) => ({ vendor, cost: runCost(vendor, modes[vendor.id] ?? defaultMode(vendor)) }))
  const getting = each.reduce((n, e) => n + e.cost, 0)
  const between = move && canMove ? MOVE_COST : 0
  const transport = { each, getting, between, returning: getting, total: getting * 2 + between }
  const amounts = computeAmounts(lines, transport.total)

  // Payment · Vendor terms
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [upi, setUpi] = useState('rohan@okicici')
  const [bank, setBank] = useState(BANKS[0])
  const [po, setPo] = useState('')
  const [agreed, setAgreed] = useState<string[]>([])
  const [error, setError] = useState<string>()

  const go = (to: number) => {
    setDir(to > index ? 1 : -1)
    setIndex(to)
    setError(undefined)
  }
  useBackHandler(!done && index === 1, () => go(0))
  useBackHandler(!done && index === 2, () => go(1))
  useBackHandler(!done && index === 3, () => go(2))
  useBackHandler(!done && index === 4, () => go(3))

  const next = () => {
    if (step === 'items' && !lines.length) return setError('Pick at least one item')
    if (step === 'when') {
      if (!deliverTo) return setError(direct ? 'Add a delivery address' : 'Add a delivery location')
      if (contact.phone.replace(/\D/g, '').length !== 10) return setError('Enter a 10-digit number for the on-set contact')
    }
    if (step === 'pay') {
      if (method === 'upi' && !/^[\w.-]+@[\w]+$/.test(upi.trim())) return setError('Enter a UPI ID like name@bank')
      if (method === 'po' && po.trim().length < 3) return setError('Enter your purchase order number')
    }
    if (!last) go(index + 1)
  }

  const confirm = async () => {
    if (agreed.length < vendors.length) return setError('Agree to every vendor’s terms to continue')
    const hide = popup.loading(!instant ? 'Sending the request…' : method === 'po' ? 'Raising the order…' : 'Processing payment…')
    await sleep(1600)
    hide()
    const place = places.find((p) => p.id === deliverTo)
    const booking = book(
      {
        projectId: project?.id ?? null,
        boardId: direct ? null : board.id,
        lineIds: lines.map((l) => l.id),
        place: direct && place ? { id: place.id, name: place.name, address: place.address } : null,
        deliverTo,
        deliveryDate,
        deliveryWindow,
        returnDate,
        returnWindow,
        contact,
        transport: Object.fromEntries(vendors.map(({ vendor }) => [vendor.id, modeOf(vendor.id)])),
        move: move && canMove && moveFrom && moveTo ? { from: moveFrom.id, to: moveTo.id, date: moveTo.date } : null,
        payment: { method, ref: method === 'upi' ? upi.trim() : method === 'po' ? po.trim() : method === 'netbanking' ? bank : 'HDFC •••• 4242' },
        amounts,
        paid: method === 'po' ? 0 : amounts.total,
      },
      lines,
    )
    haptic('success')
    onBooked?.(booking)
    setDone(booking)
  }

  if (done) {
    const trackDelivery = () => {
      const run = useProjectOps.getState().runs.find((r) => r.bookingId === done.id && r.kind === 'delivery')
      nav.replace(run && project ? runPath(run) : project ? `/customer/projects/${project.id}?tab=deliveries` : `/customer/orders/${done.id}`)
    }
    return (
      <Confirmed
        booking={done}
        placeName={places.find((p) => p.id === done.deliverTo)?.name ?? '—'}
        instant={instant}
        actions={
          direct ? (
            <>
              <Button size="lg" variant="secondary" className="flex-1" onClick={() => nav.pop()}>
                Done
              </Button>
              <Button size="lg" className="flex-1" icon={PackageIcon} onClick={trackDelivery}>
                Track order
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" variant="secondary" className="flex-1" onClick={() => nav.pop()}>
                Done
              </Button>
              <Button size="lg" className="flex-1" icon={PackageIcon} onClick={trackDelivery}>
                Track delivery
              </Button>
            </>
          )
        }
        note={
          direct
            ? instant
              ? 'Track it any time from My orders: every delivery, return and the invoice. We’ll message you when each delivery is on the way.'
              : 'Track it any time from My orders. Each vendor has 24 hours to accept, and nothing is charged until they have.'
            : undefined
        }
      />
    )
  }

  const title = direct ? 'Checkout' : 'Book items'
  const footer = (
    <div>
      {error && (
        <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-danger" role="alert">
          <WarningCircleIcon size={16} weight="fill" /> {error}
        </p>
      )}
      <div className="flex gap-3">
        {index > 0 && (
          <Button size="lg" variant="secondary" onClick={() => go(index - 1)}>
            Back
          </Button>
        )}
        {!last ? (
          <Button size="lg" className="flex-1" onClick={next}>
            {step === 'items' ? `Continue · ${lines.length} item${lines.length === 1 ? '' : 's'}` : 'Continue'}
          </Button>
        ) : (
          <Button size="lg" className="flex-1" disabled={agreed.length < vendors.length} onClick={confirm}>
            {!instant ? 'Agree & send the request' : method === 'po' ? 'Agree & place order' : `Agree & pay ${formatINR(amounts.total)}`}
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <Screen
      surface
      resetScrollOn={step}
      header={
        <AppBar close title={title} subtitle={`Step ${index + 1} of ${steps.length} · ${STEP_TITLE[step]}`}>
          <div className="flex gap-1.5 px-4 pb-3" aria-hidden>
            {steps.map((s, i) => (
              <span key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                <motion.span className="block h-full rounded-full bg-accent" initial={false} animate={{ width: i <= index ? '100%' : '0%' }} transition={{ duration: 0.35, ease: EASE_OUT }} />
              </span>
            ))}
          </div>
        </AppBar>
      }
      footer={footer}
    >
      <FadeSwitch id={step} dir={dir}>
        <div className="px-4 pb-6 pt-3 @medium:mx-auto @medium:max-w-xl">
          {step === 'items' && board && (
            <>
              <StepTitle title="Items" subtitle={`From ${board.name}. Untick anything you’re not booking yet.`} />
              {byVendor(bookable).map(({ vendor, items }) => (
                <Card key={vendor.id} className="mt-3 overflow-hidden">
                  <p className="flex items-center gap-1.5 border-b border-line px-4 py-2.5 text-sm font-semibold text-fg">
                    {vendor.name}
                    <VerifiedTick vendorId={vendor.id} size={14} />
                    <span className="ml-auto text-xs font-normal text-muted">{vendor.city === HOME_CITY ? vendor.area : vendor.city}</span>
                  </p>
                  {items.map((l) => {
                    const on = selected.includes(l.id)
                    const prop = propById(l.propId)
                    return (
                      <button
                        key={l.id}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => {
                          haptic()
                          setSelected((s) => (on ? s.filter((x) => x !== l.id) : [...s, l.id]))
                          setError(undefined)
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-surface-2"
                      >
                        <CheckboxVisual checked={on} />
                        <PropThumb item={prop} iconSize={18} className="size-11 shrink-0 rounded-lg" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium text-fg">{prop.name}</span>
                          <span className="block text-xs text-muted">
                            {l.qty > 1 && `${l.qty} × `}
                            {formatDateRangeShort(l.from, l.to)}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">{formatINR(lineCost(l))}</span>
                      </button>
                    )
                  })}
                </Card>
              ))}
              {blocked.length > 0 && (
                <p className="mt-3 flex items-start gap-2 rounded-2xl bg-danger-soft px-3.5 py-2.5 text-[13px] leading-snug text-danger">
                  <WarningCircleIcon size={16} weight="fill" className="mt-px shrink-0" />
                  {blocked.length} unavailable item{blocked.length === 1 ? '' : 's'} can’t be booked. Swap {blocked.length === 1 ? 'it' : 'them'} on the board.
                </p>
              )}
              <p className="mt-4 text-right text-sm text-muted">
                Rent <b className="text-fg">{formatINR(amounts.items)}</b>
              </p>
            </>
          )}

          {step === 'when' && (
            <>
              <StepTitle title="Where and when" subtitle="Drop-off, return pickup and who to call on set" />
              {direct && <OrderItems lines={lines} rent={amounts.items} />}
              <Section title="Deliver to">
                {places.length === 0 ? (
                  <Button variant="tonal" icon={MapPinIcon} onClick={openPlaceSheet}>
                    {direct ? 'Add an address' : 'Add a location'}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    {places.map((l) => (
                      <RadioCard
                        key={l.id}
                        selected={deliverTo === l.id}
                        onClick={() => {
                          setDeliverTo(l.id)
                          setError(undefined)
                        }}
                        title={l.label ? `${l.label} · ${l.name}` : l.name}
                        subtitle={l.address}
                      />
                    ))}
                    {direct && (
                      <Button variant="ghost" size="sm" icon={PlusIcon} onClick={openPlaceSheet}>
                        Add an address
                      </Button>
                    )}
                  </div>
                )}
              </Section>
              <Section title="Delivery">
                <div className="flex flex-wrap gap-2">
                  {[...new Set([dayBefore, firstDay])].map((d) => (
                    <Chip key={d} selected={deliveryDate === d} onClick={() => setDeliveryDate(d)}>
                      {d === firstDay ? 'Morning of' : 'Evening before'} · {formatDayShort(d)}
                    </Chip>
                  ))}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {WINDOWS.map((w) => (
                    <Chip key={w} selected={deliveryWindow === w} onClick={() => setDeliveryWindow(w)}>
                      {w}
                    </Chip>
                  ))}
                </div>
              </Section>
              <Section title="Return pickup">
                <div className="flex flex-wrap gap-2">
                  {[lastDay, addDays(lastDay, 1)].map((d, i) => (
                    <Chip key={d} selected={returnDate === d} onClick={() => setReturnDate(d)}>
                      {i === 0 ? (direct ? 'Last day' : 'After wrap') : 'Next day'} · {formatDayShort(d)}
                    </Chip>
                  ))}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {WINDOWS.map((w) => (
                    <Chip key={w} selected={returnWindow === w} onClick={() => setReturnWindow(w)}>
                      {w}
                    </Chip>
                  ))}
                </div>
              </Section>
              <Section title={direct ? 'Who to call' : 'On-set contact'}>
                <div className="grid gap-3">
                  <TextField label="Name" value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} />
                  <TextField
                    label="Mobile"
                    prefix="+91"
                    inputMode="numeric"
                    value={contact.phone}
                    onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  />
                </div>
              </Section>
            </>
          )}

          {step === 'transport' && (
            <>
              <StepTitle title="Transport" subtitle={canMove ? 'Getting it, between locations and returning it' : 'Getting it there and back'} />
              {transport.each.map(({ vendor }) => {
                const far = vendor.city !== HOME_CITY
                return (
                  <Card key={vendor.id} className="mt-3 p-3.5">
                    <p className="text-sm font-semibold text-fg">{vendor.name}</p>
                    <p className="text-xs text-muted">
                      {vendor.city === HOME_CITY ? vendor.area : `${vendor.city} · road freight ${vendor.freight ?? ''}`} · {formatDistance(vendor.distanceKm)}
                    </p>
                    <div className="mt-2.5 space-y-1.5">
                      {TRANSPORT_MODES.filter((m) => (m.id === 'vendor' ? vendor.delivery : !far || m.id !== 'tempo')).map((m) => {
                        const cost = runCost(vendor, m.id)
                        return (
                          <RadioCard
                            key={m.id}
                            compact
                            icon={m.icon}
                            selected={modeOf(vendor.id) === m.id}
                            onClick={() => setModes((s) => ({ ...s, [vendor.id]: m.id }))}
                            title={far && m.id !== 'self' ? `${m.label} · road freight` : m.label}
                            subtitle={m.description}
                            trailing={cost ? `${formatINR(cost)} each way` : 'Free'}
                          />
                        )
                      })}
                    </div>
                  </Card>
                )
              })}
              {canMove && moveFrom && moveTo && (
                <label className="mt-3 flex items-center gap-3 rounded-2xl bg-surface-2 p-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-fg">Move between locations</span>
                    <span className="block text-[13px] text-muted">
                      {moveFrom.name} → {moveTo.name} on {formatDayShort(moveTo.date)} · {formatINR(MOVE_COST)}
                    </span>
                  </span>
                  <Switch checked={move} onChange={setMove} label="Move between locations" />
                </label>
              )}
              <Card className="mt-4 p-4">
                <Summary
                  rows={[
                    ['Getting it', transport.getting],
                    ...(canMove ? [['Between locations', transport.between] as [string, number]] : []),
                    ['Returning it', transport.returning],
                  ]}
                  total={['Transport', transport.total]}
                />
              </Card>
            </>
          )}

          {step === 'pay' && (
            <>
              <StepTitle title="Payment" subtitle="Rent, transport, GST and a refundable deposit" />
              <Card className="mt-3 p-4">
                <Summary
                  rows={[
                    ['Items', amounts.items],
                    ['Transport', amounts.transport],
                    ...(amounts.discount ? [[direct ? '3+ day discount' : 'Long-shoot discount', -amounts.discount] as [string, number]] : []),
                    ['GST (18%)', amounts.gst],
                    ['Deposit · refundable', amounts.deposit],
                  ]}
                  total={['Total', amounts.total]}
                />
              </Card>
              <div className="mt-4 space-y-2">
                {PAYMENTS.map((p) => (
                  <div key={p.id}>
                    <RadioCard
                      icon={p.icon}
                      selected={method === p.id}
                      onClick={() => {
                        setMethod(p.id)
                        setError(undefined)
                      }}
                      title={p.label}
                      subtitle={p.description}
                    />
                    <AnimatePresence initial={false}>
                      {method === p.id && p.id !== 'card' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <div className="px-1 pb-1 pt-2.5">
                            {p.id === 'upi' && (
                              <TextField
                                label="UPI ID"
                                value={upi}
                                autoComplete="off"
                                onChange={(e) => {
                                  setUpi(e.target.value)
                                  setError(undefined)
                                }}
                              />
                            )}
                            {p.id === 'netbanking' && (
                              <div className="flex flex-wrap gap-2">
                                {BANKS.map((b) => (
                                  <Chip key={b} selected={bank === b} onClick={() => setBank(b)}>
                                    {b}
                                  </Chip>
                                ))}
                              </div>
                            )}
                            {p.id === 'po' && (
                              <TextField
                                label="Purchase order number"
                                value={po}
                                autoComplete="off"
                                hint="The invoice is raised against this PO"
                                onChange={(e) => {
                                  setPo(e.target.value)
                                  setError(undefined)
                                }}
                              />
                            )}
                          </div>
                        </motion.div>
                      )}
                      {method === 'card' && p.id === 'card' && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-2 pt-2 text-[13px] text-muted">
                          Saved card: HDFC Bank •••• 4242
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 'terms' && (
            <>
              <StepTitle title="Vendor terms" subtitle={`Each vendor’s rules for this ${direct ? 'order' : 'booking'}`} />
              {vendors.map(({ vendor }) => {
                const on = agreed.includes(vendor.id)
                return (
                  <Card key={vendor.id} className="mt-3 p-4">
                    <p className="text-[15px] font-semibold text-fg">{vendor.name}</p>
                    <ul className="mt-2 space-y-2">
                      {VENDOR_TERMS.map((t) => (
                        <li key={t.title} className="text-[13px] leading-snug text-fg-2">
                          <b className="font-semibold text-fg">{t.title}.</b> {t.text}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => {
                        haptic()
                        setAgreed((s) => (on ? s.filter((x) => x !== vendor.id) : [...s, vendor.id]))
                        setError(undefined)
                      }}
                      className="mt-3 flex w-full items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-left text-sm font-medium text-fg"
                    >
                      <CheckboxVisual checked={on} />I agree to {vendor.name}’s terms
                    </button>
                  </Card>
                )
              })}
              <p className="mt-4 flex items-start gap-2 text-[13px] leading-snug text-muted">
                <ShieldCheckIcon size={17} className="mt-px shrink-0 text-success" />
                Your {formatINR(amounts.deposit)} deposit is refunded once everything is back with the vendors and checked.
              </p>
            </>
          )}
        </div>
      </FadeSwitch>

      {direct ? (
        <AddressSheet
          key={placeSheet.key}
          open={placeSheet.open}
          address={null}
          first={addresses.length === 0}
          onClose={() => setPlaceSheet((s) => ({ ...s, open: false }))}
          onSave={(a) => {
            saveAddress(a)
            setDeliverTo(a.id)
            setPlaceSheet((s) => ({ ...s, open: false }))
            setError(undefined)
            haptic('success')
          }}
        />
      ) : (
        <LocationSheet
          key={placeSheet.key}
          open={placeSheet.open}
          onClose={() => setPlaceSheet((s) => ({ ...s, open: false }))}
          initial={null}
          min={project.startDate}
          max={project.endDate}
          onSave={(loc: ShootLocation) => {
            updateProject(project.id, { name: project.name, startDate: project.startDate, endDate: project.endDate, budget: project.budget, locations: [...project.locations, loc] })
            setDeliverTo(loc.id)
            setError(undefined)
          }}
        />
      )}
    </Screen>
  )
}

/* ── A direct order's items (there's no "Items" step) ────────────────────── */

function OrderItems({ lines, rent }: { lines: BoardLine[]; rent: number }) {
  return (
    <Card className="mt-3 overflow-hidden">
      {lines.map((l) => {
        const prop = propById(l.propId)
        return (
          <div key={l.id} className="group relative flex items-center gap-3 px-3.5 py-2.5">
            <PropThumb item={prop} iconSize={16} className="size-10 shrink-0 rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-fg">{prop.name}</span>
              <span className="block text-xs text-muted">
                {l.qty > 1 && `${l.qty} × `}
                {formatDateRangeShort(l.from, l.to)}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">{formatINR(lineCost(l))}</span>
            <span aria-hidden className="absolute bottom-0 left-[66px] right-0 h-px bg-line group-last:hidden" />
          </div>
        )
      })}
      <p className="flex justify-between border-t border-line bg-surface-2 px-3.5 py-2 text-[13px] text-muted">
        {lines.length} item{lines.length === 1 ? '' : 's'}
        <span>
          Rent <b className="tabular-nums text-fg">{formatINR(rent)}</b>
        </span>
      </p>
    </Card>
  )
}

/* ── Confirmed ───────────────────────────────────────────────────────────── */

function Confirmed({ booking, placeName, instant, actions, note }: { booking: Booking; placeName: string; instant: boolean; actions: ReactNode; note?: string }) {
  const direct = !booking.projectId
  return (
    <Screen
      surface
      header={<AppBar close title={instant ? (direct ? 'Order placed' : 'Booking confirmed') : 'Request sent'} />}
      footer={<div className="flex gap-3">{actions}</div>}
    >
      <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center @medium:mx-auto @medium:max-w-xl">
        <motion.span
          className="grid size-20 place-items-center rounded-full bg-success text-white shadow-float"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={T.pop_in}
        >
          <CheckIcon size={40} weight="bold" />
        </motion.span>
        <h1 className="mt-5 font-display text-2xl font-extrabold tracking-[-0.02em] text-fg">
          {instant ? (direct ? 'Your order is placed' : 'You’re booked') : 'Sent to the vendors'}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {booking.id} · {booking.invoiceNo}
        </p>
        <Card className="mt-6 w-full p-4 text-left">
          <Summary
            rows={[
              ['Items', String(booking.lineIds.length)],
              ['Delivery', `${formatDayShort(booking.deliveryDate)} · ${booking.deliveryWindow}`],
              ['To', placeName],
              ['Return pickup', `${formatDayShort(booking.returnDate)} · ${booking.returnWindow}`],
              [booking.payment.method === 'po' ? 'On PO' : 'Paid', formatINR(booking.payment.method === 'po' ? booking.amounts.total : booking.paid)],
            ]}
          />
        </Card>
        <p className="mt-4 text-[13px] text-muted">
          {note ??
            (instant
              ? 'Vendors have your notes and paint requests. We’ll message you when each delivery is on the way.'
              : 'Each vendor has 24 hours to accept. We’ll message you the moment they do, and nothing is charged until they have.')}
        </p>
      </div>
    </Screen>
  )
}

/* ── Bits ────────────────────────────────────────────────────────────────── */

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-fg">{title}</h2>
      <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line py-4 last:border-0">
      <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.07em] text-muted">{title}</p>
      {children}
    </section>
  )
}

function RadioCard({
  selected,
  onClick,
  title,
  subtitle,
  icon: RIcon,
  trailing,
  compact,
}: {
  selected: boolean
  onClick: () => void
  title: string
  subtitle?: string
  icon?: Icon
  trailing?: string
  compact?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => {
        haptic()
        onClick()
      }}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border-2 text-left transition-colors',
        compact ? 'px-3 py-2' : 'px-3.5 py-3',
        selected ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
      )}
    >
      {RIcon && <RIcon size={20} className={selected ? 'shrink-0 text-accent' : 'shrink-0 text-muted'} />}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('text-[15px] font-semibold', selected ? 'text-accent-soft-fg' : 'text-fg')}>{title}</span>
          {trailing && <span className="shrink-0 text-[13px] font-semibold text-fg-2">{trailing}</span>}
        </span>
        {subtitle && <span className="block truncate text-[13px] text-muted">{subtitle}</span>}
      </span>
      <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2', selected ? 'border-accent' : 'border-line-strong')}>
        {selected && <span className="size-2.5 rounded-full bg-accent" />}
      </span>
    </button>
  )
}

function Summary({ rows, total }: { rows: [string, number | string][]; total?: [string, number] }) {
  return (
    <dl className="space-y-1.5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3">
          <dt className="text-muted">{k}</dt>
          <dd className={cn('text-right font-medium tabular-nums', typeof v === 'number' && v < 0 ? 'text-success' : 'text-fg')}>
            {typeof v === 'number' ? (v < 0 ? `−${formatINR(-v)}` : v === 0 ? 'Free' : formatINR(v)) : v}
          </dd>
        </div>
      ))}
      {total && (
        <div className="flex justify-between gap-3 border-t border-line pt-2 text-[15px] font-bold text-fg">
          <dt>{total[0]}</dt>
          <dd className="tabular-nums">{formatINR(total[1])}</dd>
        </div>
      )}
    </dl>
  )
}
