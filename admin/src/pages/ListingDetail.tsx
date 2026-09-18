import {
  CalendarBlankIcon,
  CalendarXIcon,
  CheckIcon,
  CopyIcon,
  CurrencyInrIcon,
  DotsThreeIcon,
  EyeIcon,
  InfoIcon,
  PackageIcon,
  PencilSimpleIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  StarIcon,
  TruckIcon,
  WarningCircleIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import { useEffect, useState, type ReactNode } from 'react'
import { CONDITIONS, PLATFORM } from '@/data/owner'
import { cn } from '@/lib/cn'
import { addDays, formatDateRangeShort, formatDayShort, todayISO, toISODate } from '@/lib/dates'
import { formatINR, formatSize } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { dayLayers, formMissing, inRepair, listingState, listingStats, needsInfo, needsText, STATE_META, tierRates, youKeep, type Condition, type FormValues, type Listing } from '@/lib/owner'
import { useFeeRate, useListing, useOwner } from '@/store/owner'
import { plural } from '~/lib/data'
import { linkProps, navigate, useLocation, useQuery } from '~/router'
import { MonthCalendar, MonthNav } from '~/ui/Calendar'
import { thisMonth } from '~/ui/month'
import { Button, Chip, IconButton, Stepper, Switch, TextField } from '~/ui/controls'
import { Avatar, Banner, Card, CardHeader, EmptyState, KV, PageHeader, Tag, Thumb } from '~/ui/display'
import { confirm, toast } from '~/ui/feedback'
import { Dialog, Menu } from '~/ui/overlays'
import { ListingForm } from './add/ListingForm'

export default function ListingDetail({ id }: { id: string }) {
  const listing = useListing(id)
  if (!listing) {
    return (
      <>
        <PageHeader crumbs={[{ label: 'Stock', to: '/stock' }, { label: 'Not found' }]} title="Listing not found" />
        <Card>
          <EmptyState icon={PackageIcon} title="This listing doesn’t exist" description="It may have been removed, or the link is wrong." action={<Button onClick={() => navigate('/stock')}>Back to stock</Button>} />
        </Card>
      </>
    )
  }
  return <Detail l={listing} />
}

/** LISTING DETAIL */
function Detail({ l }: { l: Listing }) {
  const query = useQuery()
  const { path } = useLocation()
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  const updateListing = useOwner((s) => s.updateListing)
  const setListed = useOwner((s) => s.setListed)
  const setRepair = useOwner((s) => s.setRepair)
  const approve = useOwner((s) => s.approveListing)
  const duplicate = useOwner((s) => s.duplicateListing)
  const fee = useFeeRate()
  const now = useNow(60_000).getTime()
  const [rate, setRate] = useState(() => ({ key: 0, open: query.get('rate') === '1' }))
  const [edit, setEdit] = useState(() => ({ key: 0, open: query.get('edit') === '1' }))
  const [preview, setPreview] = useState(false)
  const [photo, setPhoto] = useState(0)
  const stats = listingStats(l, orders, holds, fee, now)
  const state = listingState(l, orders, holds, now)
  const missing = needsInfo(l)
  const tiers = tierRates(l.dayRate)
  const today = todayISO()

  const tab = query.get('tab')
  useEffect(() => {
    if (tab === 'availability') document.getElementById('availability')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [path, tab])

  const toggleListed = (on: boolean) => {
    setListed([l.id], on)
    toast(on ? `${l.name} is live` : `${l.name} paused`, { tone: 'success', action: { label: 'Undo', onClick: () => useOwner.getState().setListed([l.id], !on) } })
  }

  const copy = () => {
    const draftId = duplicate(l.id)
    toast('Copied to “Waiting for details”', { tone: 'success', action: { label: 'Open', onClick: () => navigate(`/add/draft/${draftId}`) } })
  }

  const sendForRepair = (pieceId: string, days: number | null) => {
    setRepair(l.id, pieceId, days === null ? null : addDays(today, days))
    toast('Sent for repair', { action: { label: 'Undo', onClick: () => useOwner.getState().setRepair(l.id, pieceId, false) } })
  }

  const photos = l.photos.length ? l.photos : []
  const boosted = l.boostedUntil && l.boostedUntil > now

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Stock', to: '/stock' }, { label: l.name }]}
        title={l.name}
        meta={
          <>
            <Tag tone={STATE_META[state].tone} dot>
              {STATE_META[state].label}
            </Tag>
            {boosted && (
              <Tag tone="brand">
                <RocketLaunchIcon size={11} weight="fill" /> Boosted till {formatDayShort(toISODate(new Date(l.boostedUntil!)))}
              </Tag>
            )}
            <span className="text-[13px] text-muted">
              {l.category} · {l.era}
              {l.material ? ` · ${l.material}` : ''} · {plural(l.pieces.length, 'piece')}
            </span>
          </>
        }
        actions={
          <>
            <label className="flex h-9 items-center gap-2.5 rounded-lg border border-line-strong bg-surface px-3 text-[13px] font-semibold text-fg">
              {l.listed ? 'Listed' : 'Paused'}
              <Switch checked={l.listed} onChange={toggleListed} label={l.listed ? 'Pause listing' : 'List it'} />
            </label>
            <Button variant="secondary" icon={EyeIcon} onClick={() => setPreview(true)}>
              <span className="hidden sm:inline">As a renter sees it</span>
            </Button>
            <Button variant="secondary" icon={PencilSimpleIcon} onClick={() => setEdit((s) => ({ key: s.key + 1, open: true }))}>
              Edit details
            </Button>
            <Menu
              items={[
                { label: 'Change the day rate', icon: CurrencyInrIcon, onSelect: () => setRate((s) => ({ key: s.key + 1, open: true })) },
                { label: 'Block dates', icon: CalendarXIcon, onSelect: () => document.getElementById('availability')?.scrollIntoView({ behavior: 'smooth' }) },
                'divider',
                { label: 'Duplicate', icon: CopyIcon, onSelect: copy },
                { label: 'Boost listing', icon: RocketLaunchIcon, onSelect: () => navigate(`/profile/promote?listing=${l.id}`) },
              ]}
            >
              <IconButton icon={DotsThreeIcon} weight="bold" label="More actions" className="border border-line-strong bg-surface" />
            </Menu>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          {l.review && (
            <Banner
              tone="info"
              icon={InfoIcon}
              title="In review"
              actions={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    approve(l.id)
                    toast('Approved · it’s live', { tone: 'success' })
                  }}
                >
                  Demo: approve now
                </Button>
              }
            >
              Our team checks photos, size and price, usually within 2 hours.
            </Banner>
          )}
          {missing.length > 0 && (
            <Banner
              tone="warning"
              icon={WarningCircleIcon}
              title={needsText(missing)}
              actions={
                <Button size="sm" variant="secondary" icon={PencilSimpleIcon} onClick={() => setEdit((s) => ({ key: s.key + 1, open: true }))}>
                  Add it now
                </Button>
              }
            >
              Renters skip props they can’t plan for.
            </Banner>
          )}

          {/* Photo · description, as renters read it */}
          <Card className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="border-b border-line p-3 md:border-b-0 md:border-r">
                <Thumb listing={{ ...l, photos: photos.length ? [photos[Math.min(photo, photos.length - 1)]] : [] }} className="aspect-[4/3] w-full rounded-lg" iconSize={72} />
                {photos.length > 1 && (
                  <div className="-mx-1 mt-1 flex gap-2 overflow-x-auto p-1 no-scrollbar">
                    {photos.map((p, i) => (
                      <button key={i} type="button" aria-label={`Photo ${i + 1}`} onClick={() => setPhoto(i)} className={cn('shrink-0 rounded-md ring-offset-2 ring-offset-surface', i === photo ? 'ring-2 ring-accent' : 'opacity-70 hover:opacity-100')}>
                        <Thumb listing={{ ...l, photos: [p] }} className="size-14 rounded-md" iconSize={20} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-subtle">As renters read it</p>
                <p className={cn('mt-2 flex-1 text-sm leading-relaxed', l.description ? 'text-fg-2' : 'italic text-muted')}>{l.description || 'No description yet. Renters see this under the photos.'}</p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-t border-line pt-3">
                  <p>
                    <span className="font-display text-2xl font-extrabold tabular-nums text-fg">{formatINR(l.dayRate)}</span>
                    <span className="text-sm text-muted"> / day</span>
                  </p>
                  <Button size="sm" variant="ghost" icon={EyeIcon} onClick={() => setPreview(true)}>
                    Item page
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Pieces */}
          <Card>
            <CardHeader title={`Pieces · ${l.pieces.length}`} subtitle={`${l.pieces.length - inRepair(l)} usable · ${inRepair(l)} in repair`} icon={PackageIcon} />
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                    <th className="py-2 pl-4 pr-3">Tag code</th>
                    <th className="px-3 py-2">Condition</th>
                    <th className="px-3 py-2">Where</th>
                    <th className="py-2 pl-3 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {l.pieces.map((p) => {
                    const out = orders.find((o) => o.status === 'out' && o.pieceIds.includes(p.id))
                    return (
                      <tr key={p.id}>
                        <td className="py-2.5 pl-4 pr-3">
                          <span className="flex items-center gap-2.5">
                            <span className={cn('grid size-7 place-items-center rounded-md', p.repair ? 'bg-warning-soft text-warning' : out ? 'bg-info-soft text-info' : 'bg-success-soft text-success')}>
                              {p.repair ? <WrenchIcon size={14} weight="bold" /> : out ? <TruckIcon size={14} weight="bold" /> : <PackageIcon size={14} weight="bold" />}
                            </span>
                            <span className="font-mono text-[13px] font-semibold tracking-wide text-fg">{p.code}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Menu items={CONDITIONS.map((c) => ({ label: c, checked: p.condition === c, icon: p.condition === c ? CheckIcon : undefined, onSelect: () => updateListing(l.id, { pieces: l.pieces.map((x) => (x.id === p.id ? { ...x, condition: c as Condition } : x)) }) }))} align="start" width={160}>
                            <button type="button" className="rounded-md outline-offset-2">
                              <Tag tone={p.condition === 'Worn' ? 'warning' : p.condition === 'Excellent' ? 'success' : 'neutral'}>{p.condition} ▾</Tag>
                            </button>
                          </Menu>
                        </td>
                        <td className="px-3 py-2.5 text-fg-2">
                          {p.repair ? (p.repair.until ? `In repair · back ${formatDayShort(p.repair.until)}` : <span className="text-warning">In repair · no return date</span>) : out ? (
                            <a {...linkProps(`/orders/${out.id}`)} className="hover:text-accent hover:underline">
                              With production · {out.renter.company} till {formatDayShort(out.to)}
                            </a>
                          ) : (
                            'In yard'
                          )}
                        </td>
                        <td className="py-2.5 pl-3 pr-4 text-right">
                          {p.repair ? (
                            <Button
                              size="xs"
                              variant="tonal"
                              icon={PackageIcon}
                              onClick={() => {
                                setRepair(l.id, p.id, false)
                                toast(`${p.code} back in service`, { tone: 'success' })
                              }}
                            >
                              Return to service
                            </Button>
                          ) : (
                            <Menu
                              items={[
                                { heading: 'Send for repair' },
                                { label: 'Back in 3 days', onSelect: () => sendForRepair(p.id, 3) },
                                { label: 'Back in a week', onSelect: () => sendForRepair(p.id, 7) },
                                { label: 'No return date yet', onSelect: () => sendForRepair(p.id, null) },
                              ]}
                              width={200}
                            >
                              <Button size="xs" variant="secondary" icon={WrenchIcon} disabled={!!out}>
                                Repair
                              </Button>
                            </Menu>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Availability l={l} />
        </div>

        {/* Right rail */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader title="How it’s doing" />
            <div className="grid grid-cols-3 gap-px bg-line">
              <Metric value={stats.bookings} label="Bookings" />
              <Metric value={stats.held} label="Held now" />
              <Metric value={stats.saves} label="Saves" />
              <Metric value={formatINR(stats.earned)} label="Earned" className="col-span-2" />
              <Metric value={stats.daysOut} label="Days out" />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Pricing"
              actions={
                <Button size="xs" variant="ghost" icon={PencilSimpleIcon} onClick={() => setRate((s) => ({ key: s.key + 1, open: true }))}>
                  Change the day rate
                </Button>
              }
            />
            <dl className="divide-y divide-line px-4">
              <KV label="1–2 days" value={`${formatINR(tiers.short)}/day`} />
              <KV label="3–6 days" note="10% off" value={`${formatINR(tiers.mid)}/day`} />
              <KV label="7+ days" note="20% off" value={`${formatINR(tiers.long)}/day`} />
              <KV label="Deposit" note="Refunded after the return check" value={`${formatINR(l.deposit)} a piece`} />
              <KV label="You keep" note={`After ${PLATFORM}’s ${Math.round(fee * 100)}%`} value={<span className="text-success">{formatINR(youKeep(l.dayRate, fee))}/day</span>} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Rules" />
            <div className="divide-y divide-line">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-fg">Days needed either side</span>
                  <span className="block text-xs text-muted">Kept free before and after each booking</span>
                </span>
                <Stepper value={l.bufferDays} min={0} max={3} onChange={(bufferDays) => updateListing(l.id, { bufferDays })} label="Days either side" />
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-fg">Can be modified</span>
                  <span className="block text-xs text-muted">Renters may repaint or alter it on request</span>
                </span>
                <Switch checked={l.modifiable} onChange={(modifiable) => updateListing(l.id, { modifiable })} label="Can be modified" />
              </div>
              <button type="button" onClick={() => document.getElementById('availability')?.scrollIntoView({ behavior: 'smooth' })} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/70">
                <CalendarBlankIcon size={18} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-fg">Availability</span>
                  <span className="block text-xs text-muted">Block dates, see bookings</span>
                </span>
                <span className="text-xs font-semibold text-muted">{l.blocks.length ? plural(l.blocks.length, 'block') : 'No blocks'}</span>
              </button>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Specs"
              actions={
                <Button size="xs" variant="ghost" icon={PencilSimpleIcon} onClick={() => setEdit((s) => ({ key: s.key + 1, open: true }))}>
                  Edit details
                </Button>
              }
            />
            <dl className="divide-y divide-line px-4">
              <KV label="Category" value={l.category} />
              <KV label="Era" value={l.era} />
              <KV label="Size" value={l.size ? formatSize(l.size) : 'Missing'} warn={!l.size && missing.includes('size')} />
              <KV label="Weight" value={l.weight ? `${l.weight} kg` : 'Missing'} warn={!l.weight && missing.includes('weight')} />
              <KV label="Material" value={l.material ?? '—'} />
              <KV label="Condition" value={l.condition} />
            </dl>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" icon={CopyIcon} onClick={copy}>
              Duplicate
            </Button>
            <Button variant="secondary" icon={EyeIcon} onClick={() => setPreview(true)}>
              Renter view
            </Button>
          </div>
        </div>
      </div>

      <RateDialog
        key={`rate-${rate.key}`}
        open={rate.open}
        listing={l}
        feeRate={fee}
        onClose={() => setRate((s) => ({ ...s, open: false }))}
        onSave={(dayRate, deposit) => {
          const before = { dayRate: l.dayRate, deposit: l.deposit }
          updateListing(l.id, { dayRate, deposit })
          setRate((s) => ({ ...s, open: false }))
          toast(`Day rate ${formatINR(dayRate)}`, { tone: 'success', action: { label: 'Undo', onClick: () => useOwner.getState().updateListing(l.id, before) } })
        }}
      />
      <EditDialog key={`edit-${edit.key}`} open={edit.open} listing={l} onClose={() => setEdit((s) => ({ ...s, open: false }))} />
      <RenterPreview open={preview} listing={l} onClose={() => setPreview(false)} />
    </>
  )
}

function Metric({ value, label, className }: { value: ReactNode; label: string; className?: string }) {
  return (
    <div className={cn('bg-surface px-3 py-3 text-center', className)}>
      <p className="truncate font-display text-lg font-extrabold tabular-nums text-fg">{value}</p>
      <p className="truncate text-[11px] text-muted">{label}</p>
    </div>
  )
}

/* ── Availability: calendar, blocks, bookings on this prop ───────────────── */

const BOOKING_TAG = { request: ['Request', 'warning'], confirmed: ['Booked', 'brand'], out: ['Out now', 'info'] } as const

function Availability({ l }: { l: Listing }) {
  const orders = useOwner((s) => s.orders)
  const holds = useOwner((s) => s.holds)
  const removeBlock = useOwner((s) => s.removeBlock)
  const addBlock = useOwner((s) => s.addBlock)
  const today = todayISO()
  const [view, setView] = useState(thisMonth)
  const [sheet, setSheet] = useState<{ key: number; open: boolean; date: string }>({ key: 0, open: false, date: today })
  const usable = l.pieces.length - inRepair(l)
  const bookings = orders.filter((o) => o.listingId === l.id && (o.status === 'request' || o.status === 'confirmed' || o.status === 'out')).sort((a, b) => a.from.localeCompare(b.from))

  const free = (blockId: string, label: string) => {
    const undo = removeBlock(l.id, blockId)
    toast(`${label} freed`, { tone: 'success', action: { label: 'Undo', onClick: undo } })
  }

  const tap = async (date: string) => {
    const d = dayLayers(l, orders, holds, date)
    if (d.blocked.length) {
      const b = d.blocked[0]
      if (await confirm({ title: `Free ${formatDateRangeShort(b.from, b.to)}?`, message: b.note ? `Blocked for “${b.note}”.` : undefined, confirmText: 'Free it', icon: CalendarXIcon })) free(b.id, formatDateRangeShort(b.from, b.to))
      return
    }
    if (d.booked.length) {
      const booked = d.booked.reduce((n, o) => n + o.qty, 0)
      const ok = await confirm({
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
    <section id="availability" className="scroll-mt-4">
      <Card>
        <CardHeader title="Availability" subtitle="Click a free day to block it, or a blocked day to free it" icon={CalendarBlankIcon} />
        <div className="grid grid-cols-1 gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <MonthNav view={view} onView={setView} />
              <div className="flex flex-wrap gap-3 text-xs font-medium text-fg-2">
                <Legend className="bg-accent-soft" label="Booked" />
                <Legend className="bg-warning-soft" label="Buffer" />
                <Legend className="bg-surface-3" label="Blocked" />
                <Legend className="border border-line-strong" label="Free" />
              </div>
            </div>
            <MonthCalendar
              variant="compact"
              view={view}
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
            <p className="mt-2 text-xs text-muted">{l.bufferDays ? `${plural(l.bufferDays, 'day')} kept free either side of bookings.` : 'No turnaround days between bookings.'}</p>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Blocks</p>
              {l.blocks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line-strong px-3 py-3 text-[13px] text-muted">No blocks. Click a day to add one.</p>
              ) : (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {l.blocks.map((b) => (
                    <li key={b.id} className="flex items-center gap-2 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-fg">{formatDateRangeShort(b.from, b.to)}</span>
                        <span className="block truncate text-xs text-muted">{b.note || 'No reason given'}</span>
                      </span>
                      <Button size="xs" variant="tonal" onClick={() => free(b.id, formatDateRangeShort(b.from, b.to))}>
                        Free it
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Bookings on this prop</p>
              {bookings.length === 0 ? (
                <p className="text-[13px] text-muted">Nothing booked yet.</p>
              ) : (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {bookings.map((o) => {
                    const [label, tone] = BOOKING_TAG[o.status as keyof typeof BOOKING_TAG]
                    return (
                      <li key={o.id}>
                        <a {...linkProps(`/orders/${o.id}`)} className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-surface-2/70">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-fg">{o.renter.company}</span>
                            <span className="block truncate text-xs text-muted">
                              {formatDateRangeShort(o.from, o.to)} · {o.qty} pc · {o.id}
                            </span>
                          </span>
                          <Tag tone={tone} dot>
                            {label}
                          </Tag>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </Card>

      <BlockDialog
        key={sheet.key}
        open={sheet.open}
        from={sheet.date}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onBlock={(days, note) => {
          const to = addDays(sheet.date, days - 1)
          addBlock(l.id, { from: sheet.date, to, note })
          setSheet((s) => ({ ...s, open: false }))
          toast(`Blocked ${formatDateRangeShort(sheet.date, to)}`, { tone: 'success' })
        }}
      />
    </section>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-3 rounded', className)} />
      {label}
    </span>
  )
}

function BlockDialog({ open, from, onClose, onBlock }: { open: boolean; from: string; onClose: () => void; onBlock: (days: number, note: string) => void }) {
  const [days, setDays] = useState(1)
  const [note, setNote] = useState('')
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={`Block from ${formatDayShort(from)}`}
      description={`Until ${formatDayShort(addDays(from, days - 1))}. Renters can’t book it on these days.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={CalendarXIcon} onClick={() => onBlock(days, note.trim())}>
            Block {days === 1 ? 'this day' : `${days} days`}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 7, 14].map((n) => (
          <Chip key={n} selected={days === n} onClick={() => setDays(n)}>
            {n === 1 ? '1 day' : n === 7 ? '1 week' : n === 14 ? '2 weeks' : `${n} days`}
          </Chip>
        ))}
      </div>
      <TextField className="mt-4" label="Reason" optional value={note} onChange={(e) => setNote(e.target.value)} hint="Only you see it, e.g. polishing, own use, photo shoot" />
    </Dialog>
  )
}

/* ── Dialogs ─────────────────────────────────────────────────────────────── */

function RateDialog({ open, listing, feeRate, onClose, onSave }: { open: boolean; listing: Listing; feeRate: number; onClose: () => void; onSave: (dayRate: number, deposit: number) => void }) {
  const [rate, setRate] = useState(String(listing.dayRate))
  const [deposit, setDeposit] = useState(String(listing.deposit))
  const [error, setError] = useState<string>()
  const r = Number(rate) || 0
  const t = tierRates(r)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change the day rate"
      description="Longer rentals get the lower rates automatically"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (r < 50) return setError('Enter at least ₹50')
              onSave(r, Number(deposit) || 0)
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Day rate"
          prefix="₹"
          inputMode="numeric"
          autoFocus
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
        {(
          [
            ['1–2 days', t.short],
            ['3–6 days', t.mid],
            ['7+ days', t.long],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="rounded-lg border border-line bg-surface-2/60 py-2">
            <p className="text-sm font-bold tabular-nums text-fg">{formatINR(v)}</p>
            <p className="text-[11px] text-muted">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-lg bg-success-soft px-4 py-3 text-sm text-fg">
        You keep <span className="font-bold">{formatINR(youKeep(r, feeRate))}</span> a day after {PLATFORM}’s {Math.round(feeRate * 100)}%.
      </p>
    </Dialog>
  )
}

function EditDialog({ open, listing, onClose }: { open: boolean; listing: Listing; onClose: () => void }) {
  const updateListing = useOwner((s) => s.updateListing)
  const [values, setValues] = useState<FormValues>(() => ({ ...listing, pieces: listing.pieces.length }))
  const [errors, setErrors] = useState<string[]>([])
  const save = () => {
    const missing = formMissing(values, false)
    setErrors(missing)
    if (missing.length) return toast(`Still needs ${missing.join(', ')}`, { tone: 'error' })
    const before = { name: listing.name, category: listing.category, era: listing.era, material: listing.material, size: listing.size, weight: listing.weight, condition: listing.condition, description: listing.description, photos: listing.photos }
    updateListing(listing.id, { name: values.name.trim(), category: values.category!, era: values.era!, material: values.material, size: values.size, weight: values.weight, condition: values.condition, description: values.description.trim(), photos: values.photos })
    onClose()
    toast('Details saved', { tone: 'success', action: { label: 'Undo', onClick: () => useOwner.getState().updateListing(listing.id, before) } })
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Edit details"
      description={listing.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save details</Button>
        </>
      }
    >
      <ListingForm
        mode="edit"
        values={values}
        aiFilled={[]}
        errors={errors}
        onChange={(patch) => {
          setValues((v) => ({ ...v, ...patch }))
          setErrors((e) => e.filter((f) => !(f in patch)))
        }}
      />
    </Dialog>
  )
}

/** "As a renter sees it": the item page, built from the owner's data. */
function RenterPreview({ open, listing: l, onClose }: { open: boolean; listing: Listing; onClose: () => void }) {
  const business = useOwner((s) => s.business)
  const reviews = useOwner((s) => s.reviews)
  const delivery = useOwner((s) => s.delivery)
  const mine = reviews.filter((r) => r.listingId === l.id)
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0
  const tiers = tierRates(l.dayRate)
  return (
    <Dialog open={open} onClose={onClose} size="xl" title="As a renter sees it" description="A preview of your item page in the renter app" bodyClassName="bg-bg p-0">
      <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
        <div className="p-5">
          <Thumb listing={l} className="aspect-square w-full rounded-2xl" iconSize={96} />
          <div className="mt-2 flex gap-2">
            {l.photos.slice(0, 4).map((p, i) => (
              <Thumb key={i} listing={{ ...l, photos: [p] }} className="size-16 rounded-lg" iconSize={20} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 p-5 md:pl-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {l.category} · {l.era}
            </p>
            <h3 className="mt-1 font-display text-2xl font-extrabold leading-tight text-fg">{l.name}</h3>
            <p className="mt-1 flex items-center gap-1 text-[13px] text-muted">
              <StarIcon size={13} weight="fill" className="text-amber-500" /> {avg.toFixed(1)} · {mine.length ? plural(mine.length, 'review') : 'New'}
            </p>
          </div>
          <p>
            <span className="font-display text-3xl font-extrabold tabular-nums text-fg">{formatINR(l.dayRate)}</span>
            <span className="text-muted"> / day</span>
            <span className="ml-2 text-[13px] text-success">
              {formatINR(tiers.mid)} for 3–6 days · {formatINR(tiers.long)} for 7+
            </span>
          </p>
          <p className="text-sm leading-relaxed text-fg-2">{l.description || 'The owner hasn’t added a description yet.'}</p>
          <div className="grid grid-cols-2 gap-2 text-[13px]">
            <SpecTile label="Size" value={l.size ? formatSize(l.size) : '—'} />
            <SpecTile label="Weight" value={l.weight ? `${l.weight} kg` : '—'} />
            <SpecTile label="Condition" value={l.condition} />
            <SpecTile label="Modifications" value={l.modifiable ? 'On request' : 'Not allowed'} />
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
            <Avatar name={business.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">{business.name}</p>
              <p className="text-xs text-muted">
                Andheri West · {delivery.enabled ? `Delivers within ${delivery.radiusKm} km` : 'Pickup only'}
              </p>
            </div>
            <ShieldCheckIcon size={20} weight="fill" className="text-accent" />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" size="lg" disabled>
              Check dates
            </Button>
            <Button className="flex-1" size="lg" variant="secondary" disabled>
              Add to board
            </Button>
          </div>
          <p className="text-xs text-muted">Deposit {formatINR(l.deposit)} a piece, refunded after the return check.</p>
        </div>
      </div>
    </Dialog>
  )
}

function SpecTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="font-semibold text-fg">{value}</p>
    </div>
  )
}
