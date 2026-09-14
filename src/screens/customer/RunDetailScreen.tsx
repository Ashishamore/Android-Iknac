import {
  CalendarBlankIcon,
  CameraIcon,
  ChatTeardropDotsIcon,
  CheckCircleIcon,
  CheckIcon,
  FastForwardIcon,
  LockSimpleIcon,
  MapPinIcon,
  NavigationArrowIcon,
  PackageIcon,
  PhoneIcon,
  ScanIcon,
  SignatureIcon,
  StarIcon,
  TimerIcon,
  TruckIcon,
  WarningIcon,
  type Icon,
} from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { ChangeSheet, DamageSheet, ExtendSheet, PhotosSheet, RescheduleSheet, ScanSheet, SignSheet } from '@/components/ops/RunSheets'
import { PropThumb } from '@/components/PropCard'
import { CHECK_STAGE, STAGES, TRANSPORT_MODES } from '@/data/ops'
import { propById, vendorById } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatDayShort } from '@/lib/dates'
import { formatPhone } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useNow } from '@/lib/hooks'
import { EASE_OUT } from '@/lib/motion'
import { locationName, runTitle, type Run } from '@/lib/ops'
import { nav, useParams } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useProjectOps, useRunById } from '@/store/projectOps'
import { useProject, type Project } from '@/store/projects'
import { useDisplayName } from '@/store/session'
import { AppBar, Avatar, Button, Card, EmptyState, Screen, SectionHeader, Tag } from '@/ui'

const WINDOW_MS = 30 * 60_000

export default function RunDetailScreen() {
  const { id, runId } = useParams<{ id: string; runId: string }>()
  const project = useProject(id)
  const run = useRunById(runId)
  if (!project || !run) {
    return (
      <Screen header={<AppBar title="Delivery" />}>
        <EmptyState icon={PackageIcon} title="Delivery not found" action={<Button onClick={() => nav.pop()}>Go back</Button>} />
      </Screen>
    )
  }
  return <RunDetail project={project} run={run} />
}

type SheetKind = 'scan' | 'photos' | 'damage' | 'sign' | 'change' | 'reschedule' | 'extend'

/** DELIVERY / RETURN DETAIL */
function RunDetail({ project, run }: { project: Project; run: Run }) {
  const popup = usePopup()
  const myName = useDisplayName()
  const updateRun = useProjectOps((s) => s.updateRun)
  const advanceRun = useProjectOps((s) => s.advanceRun)
  const extendBooking = useProjectOps((s) => s.extendBooking)
  const booking = useProjectOps((s) => s.bookings.find((b) => b.id === run.bookingId))
  const board = useProjectOps((s) => s.boards.find((b) => b.id === booking?.boardId))
  const [sheet, setSheet] = useState<{ kind: SheetKind | null; key: number }>({ kind: null, key: 0 })
  const openSheet = (kind: SheetKind) => setSheet((s) => ({ kind, key: s.key + 1 }))
  const closeSheet = () => setSheet((s) => ({ ...s, kind: null }))

  const lines = (board?.lines ?? []).filter((l) => run.lineIds.includes(l.id))
  const stages = STAGES[run.kind]
  const checkAt = CHECK_STAGE[run.kind]
  const checkOpen = run.stage >= checkAt
  const windowActive = run.kind === 'delivery' && run.stage === 4 && !!run.arrivedAt && !run.check.lockedAt && !run.confirmedAt
  const now = useNow(windowActive ? 1000 : 60_000).getTime()
  const left = run.arrivedAt ? run.arrivedAt + WINDOW_MS - now : WINDOW_MS
  const windowClosed = run.kind === 'delivery' && !!run.arrivedAt && left <= 0
  const locked = !!run.check.lockedAt || windowClosed
  const vendor = run.vendorId ? vendorById(run.vendorId) : null
  const mode = TRANSPORT_MODES.find((m) => m.id === run.mode)
  const loc = project.locations.find((l) => l.id === (run.kind === 'move' ? run.toLocationId : run.locationId))
  const allScanned = lines.length > 0 && lines.every((l) => run.check.scanned.includes(l.id))
  const photoCount = lines.filter((l) => run.check.photos[l.id]?.length).length
  const damageCount = Object.keys(run.check.damage).length
  const perDay = lines.reduce((n, l) => n + (propById(l.propId)?.pricePerDay ?? 0) * l.qty, 0)
  const setCheck = (patch: Partial<Run['check']>) => updateRun(run.id, { check: { ...run.check, ...patch } })

  const confirm = async () => {
    if (!run.check.lockedAt && !windowClosed) {
      const ok = await popup.confirm({
        title: 'Confirm without a photo check?',
        message: 'You won’t be able to report damage that was already there. We recommend scanning, photographing and signing first.',
        confirmText: 'Confirm anyway',
        icon: WarningIcon,
      })
      if (!ok) return
    }
    if (run.kind === 'return') {
      updateRun(run.id, { stage: Math.max(run.stage, 2), stageTimes: run.stageTimes.map((t, i) => (i === 2 && !t ? Date.now() : t)) })
      popup.toast('Handover confirmed · props on their way back', { tone: 'success' })
    } else {
      updateRun(run.id, {
        stage: 5,
        confirmedAt: Date.now(),
        stageTimes: run.stageTimes.map((t, i) => (i === 5 ? Date.now() : t)),
        check: run.check.lockedAt ? run.check : { ...run.check, lockedAt: Date.now() },
      })
      popup.toast(run.kind === 'move' ? 'Move confirmed' : 'Receipt confirmed · enjoy the shoot', { tone: 'success' })
    }
    haptic('success')
  }

  const confirmLabel = run.kind === 'return' ? 'Confirm handover' : run.kind === 'move' ? 'Confirm arrival' : 'Confirm receipt'
  const finished = run.kind === 'return' ? run.stage >= 2 : run.stage >= 5

  return (
    <Screen
      header={<AppBar title={runTitle(run)} subtitle={`${formatDayShort(run.date)} · ${run.window}`} />}
      footer={
        <div className="space-y-2.5 @medium:mx-auto @medium:max-w-xl">
          <div className="flex gap-2.5">
            <Button variant="secondary" className="flex-1" disabled={run.stage >= 5} onClick={() => openSheet('reschedule')}>
              Reschedule
            </Button>
            {run.kind !== 'move' && booking && (
              <Button variant="secondary" className="flex-1" onClick={() => openSheet('extend')}>
                Extend
              </Button>
            )}
          </div>
          <Button size="lg" block icon={finished ? CheckCircleIcon : undefined} disabled={!checkOpen || finished} onClick={confirm}>
            {finished ? (run.kind === 'return' ? 'Handed over' : 'Received') : checkOpen ? confirmLabel : `${confirmLabel} · after it arrives`}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 px-4 pb-6 pt-3 @medium:mx-auto @medium:max-w-xl">
        {/* 30-min deposit window */}
        {windowActive && left > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl bg-warning-soft p-3.5" role="timer">
            <TimerIcon size={26} weight="duotone" className="shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold tabular-nums text-warning">
                {Math.floor(left / 60_000)}:{String(Math.floor((left % 60_000) / 1000)).padStart(2, '0')} left to check
              </p>
              <p className="text-[13px] leading-snug text-fg-2">Your deposit is safe if you scan, photograph and sign within 30 minutes of arrival.</p>
            </div>
          </motion.div>
        )}
        {windowClosed && !run.check.lockedAt && (
          <p className="flex items-start gap-2 rounded-2xl bg-surface-2 p-3.5 text-[13px] leading-snug text-fg-2">
            <LockSimpleIcon size={17} className="mt-px shrink-0 text-muted" />
            The 30-minute window has closed. The condition is recorded as received.
          </p>
        )}
        {run.kind === 'return' && run.stage === 1 && !run.check.lockedAt && (
          <p className="flex items-start gap-2 rounded-2xl bg-warning-soft p-3.5 text-[13px] leading-snug text-fg-2">
            <CameraIcon size={17} className="mt-px shrink-0 text-warning" />
            Do a photo check before the driver leaves. It protects your deposit.
          </p>
        )}

        {/* Tracking (6 stages) */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">Tracking</p>
            <Tag tone={run.stage >= 5 ? 'success' : 'info'} dot>
              {stages[run.stage]}
            </Tag>
          </div>
          {run.stage === 3 && <OnTheWay />}
          <ol className="mt-3">
            {stages.map((s, i) => {
              const done = i <= run.stage
              const current = i === run.stage
              const t = run.stageTimes[i]
              return (
                <li key={s} className="relative flex gap-3 pb-3.5 last:pb-0">
                  {i < stages.length - 1 && <span aria-hidden className={cn('absolute left-[9px] top-5 h-full w-0.5', i < run.stage ? 'bg-success' : 'bg-line')} />}
                  <span
                    className={cn(
                      'relative z-10 grid size-5 shrink-0 place-items-center rounded-full',
                      done ? 'bg-success text-white' : 'border-2 border-line-strong bg-surface',
                      current && run.stage < 5 && 'ring-4 ring-success/20',
                    )}
                  >
                    {done && <CheckIcon size={11} weight="bold" />}
                  </span>
                  <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                    <span className={cn('text-sm', current ? 'font-bold text-fg' : done ? 'font-medium text-fg-2' : 'text-muted')}>{s}</span>
                    {t && <span className="shrink-0 text-xs text-muted">{new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>}
                  </span>
                </li>
              )
            })}
          </ol>
          {run.stage < 5 && (
            <button
              type="button"
              onClick={() => {
                advanceRun(run.id)
                haptic()
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-2.5 py-1 text-xs font-semibold text-muted"
            >
              <FastForwardIcon size={13} weight="fill" /> Demo: next stage
            </button>
          )}
        </Card>

        {/* Driver · Call · Request a change */}
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">{run.mode === 'self' ? 'Your team collects' : 'Driver'}</p>
          <div className="mt-2.5 flex items-center gap-3">
            <Avatar name={run.mode === 'self' ? (booking?.contact.name ?? myName) : run.driver.name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-fg">{run.mode === 'self' ? (booking?.contact.name ?? myName) : run.driver.name}</p>
              <p className="truncate text-[13px] text-muted">
                {run.mode === 'self' ? formatPhone(booking?.contact.phone) : run.driver.vehicle}
              </p>
              {run.mode !== 'self' && (
                <p className="flex items-center gap-1 text-xs text-muted">
                  <StarIcon size={12} weight="fill" className="text-amber-500" /> {run.driver.rating} · {mode?.label}
                  {vendor && run.mode === 'vendor' ? ` · ${vendor.name}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="tonal"
              icon={PhoneIcon}
              className="px-4"
              onClick={() => {
                window.location.href = `tel:+91${run.mode === 'self' ? booking?.contact.phone : run.driver.phone}`
              }}
            >
              Call
            </Button>
            <Button size="sm" variant="secondary" icon={ChatTeardropDotsIcon} className="flex-1 whitespace-nowrap" disabled={run.stage >= 5} onClick={() => openSheet('change')}>
              Request a change
            </Button>
          </div>
          {run.requests.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
              {run.requests.map((r) => (
                <li key={r.at} className="flex items-start gap-2 text-[13px] text-fg-2">
                  <CheckCircleIcon size={15} weight="fill" className="mt-0.5 shrink-0 text-success" />
                  {r.text}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Location · Items */}
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">{run.kind === 'return' ? 'Pickup from' : run.kind === 'move' ? 'Moving to' : 'Delivering to'}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[15px] font-semibold text-fg">
            <MapPinIcon size={16} weight="fill" className="shrink-0 text-accent" />
            {loc?.name ?? 'Location not set'}
          </p>
          {run.kind === 'move' && <p className="mt-0.5 text-[13px] text-muted">From {locationName(project, run.locationId)}</p>}
          {loc && <p className="mt-0.5 text-[13px] leading-snug text-muted">{loc.address}</p>}
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-fg-2">
            <CalendarBlankIcon size={15} className="text-muted" /> {formatDayShort(run.date)} · {run.window}
          </p>
          {loc && (
            <button
              type="button"
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`, '_blank', 'noopener')}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
            >
              <NavigationArrowIcon size={15} weight="fill" /> Directions
            </button>
          )}
        </Card>

        <SectionHeader title="Items" subtitle={`${lines.length} on this run`} className="px-0 pb-2 pt-3" />
        <Card className="overflow-hidden">
          {lines.map((l) => {
            const p = propById(l.propId)
            const photos = run.check.photos[l.id]?.length ?? 0
            return (
              <div key={l.id} className="group relative flex items-center gap-3 px-3 py-2.5">
                <PropThumb item={p} iconSize={18} className="size-11 shrink-0 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-fg">{p.name}</span>
                  <span className="block text-xs text-muted">
                    Qty {l.qty}
                    {l.vendorNote && ' · note sent'}
                    {l.paint && ` · paint: ${l.paint.colour}`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-muted">
                  {run.check.scanned.includes(l.id) && <ScanIcon size={16} className="text-success" aria-label="Scanned" />}
                  {photos > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-success">
                      <CameraIcon size={16} /> {photos}
                    </span>
                  )}
                  {run.check.damage[l.id] && <WarningIcon size={16} weight="fill" className="text-danger" aria-label="Damage reported" />}
                </span>
                <span aria-hidden className="absolute bottom-0 left-[68px] right-0 h-px bg-line group-last:hidden" />
              </div>
            )
          })}
        </Card>

        {/* Photo check → Scan · Photos · Damage · Sign · Locked */}
        <div className="flex items-center justify-between px-1 pt-4">
          <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-fg">Photo check</h2>
          {locked && (
            <Tag tone="neutral">
              <LockSimpleIcon size={11} weight="fill" /> Locked
            </Tag>
          )}
        </div>
        {!checkOpen ? (
          <Card className="p-4 text-[13px] leading-snug text-muted">
            Opens when {run.kind === 'return' ? 'you’ve packed the props on set' : 'the delivery arrives'}. You’ll scan tags, take photos, flag damage and sign.
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CheckRow icon={ScanIcon} title="Scan" detail={`${run.check.scanned.length} of ${lines.length} tags scanned`} done={allScanned} disabled={locked} onClick={() => openSheet('scan')} />
            <CheckRow icon={CameraIcon} title="Photos" detail={`${photoCount} of ${lines.length} items photographed`} done={photoCount === lines.length && lines.length > 0} disabled={locked} onClick={() => openSheet('photos')} />
            <CheckRow icon={WarningIcon} title="Damage" detail={damageCount ? `${damageCount} reported` : 'None reported'} done={false} warn={damageCount > 0} disabled={locked} onClick={() => openSheet('damage')} />
            <CheckRow
              icon={SignatureIcon}
              title="Sign"
              detail={run.check.lockedAt && run.check.signedBy ? `Signed by ${run.check.signedBy}` : allScanned ? 'Sign to lock the check' : 'Scan every tag first'}
              done={!!run.check.signature}
              disabled={locked || !allScanned}
              onClick={() => openSheet('sign')}
            />
            {run.check.lockedAt && (
              <div className="flex items-center gap-3 border-t border-line bg-surface-2/60 px-4 py-3">
                <LockSimpleIcon size={18} weight="fill" className="shrink-0 text-muted" />
                <p className="min-w-0 flex-1 text-[13px] text-fg-2">
                  Locked at {new Date(run.check.lockedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                  {run.check.signedBy && ` · ${run.check.signedBy}`}
                </p>
                {run.check.signature && <img src={run.check.signature} alt="Signature" className="h-8 w-20 object-contain dark:invert" />}
              </div>
            )}
          </Card>
        )}
      </div>

      <ScanSheet
        open={sheet.kind === 'scan'}
        onClose={closeSheet}
        lines={lines}
        scanned={run.check.scanned}
        onScan={(lineId) => setCheck({ scanned: [...latestRun(run.id).check.scanned, lineId] })}
      />
      <PhotosSheet
        open={sheet.kind === 'photos'}
        onClose={closeSheet}
        lines={lines}
        photos={run.check.photos}
        onAdd={(lineId, url) => {
          const c = latestRun(run.id).check
          updateRun(run.id, { check: { ...c, photos: { ...c.photos, [lineId]: [...(c.photos[lineId] ?? []), url] } } })
          haptic('success')
        }}
        onRemove={(lineId, i) => {
          const c = latestRun(run.id).check
          updateRun(run.id, { check: { ...c, photos: { ...c.photos, [lineId]: (c.photos[lineId] ?? []).filter((_, j) => j !== i) } } })
        }}
      />
      <DamageSheet
        key={`damage-${sheet.key}`}
        open={sheet.kind === 'damage'}
        onClose={closeSheet}
        lines={lines}
        damage={run.check.damage}
        onReport={(lineId, type, note) => {
          setCheck({ damage: { ...run.check.damage, [lineId]: { type, note } } })
          popup.toast('Damage recorded with a timestamp', { tone: 'info' })
        }}
        onClear={(lineId) => {
          const rest = { ...run.check.damage }
          delete rest[lineId]
          setCheck({ damage: rest })
        }}
      />
      <SignSheet
        key={`sign-${sheet.key}`}
        open={sheet.kind === 'sign'}
        onClose={closeSheet}
        defaultName={myName}
        onSign={(signature, name) => {
          setCheck({ signature, signedBy: name, lockedAt: Date.now() })
          closeSheet()
          haptic('success')
          popup.toast('Signed · photo check locked', { tone: 'success' })
        }}
      />
      <ChangeSheet
        key={`change-${sheet.key}`}
        open={sheet.kind === 'change'}
        onClose={closeSheet}
        onSend={(text) => {
          updateRun(run.id, { requests: [...run.requests, { at: Date.now(), text }] })
          closeSheet()
          popup.toast(`Sent to ${run.mode === 'self' ? 'your team' : run.driver.name.split(' ')[0]}`, { tone: 'success' })
        }}
      />
      <RescheduleSheet
        key={`resched-${sheet.key}`}
        open={sheet.kind === 'reschedule'}
        onClose={closeSheet}
        date={run.date}
        window={run.window}
        onSave={(date, window) => {
          updateRun(run.id, { date, window })
          closeSheet()
          popup.toast(`Rescheduled to ${formatDayShort(date)} · ${window}`, { tone: 'success' })
        }}
      />
      {booking && (
        <ExtendSheet
          key={`extend-${sheet.key}`}
          open={sheet.kind === 'extend'}
          onClose={closeSheet}
          perDay={perDay}
          returnDate={booking.returnDate}
          onExtend={(days, amount) => {
            extendBooking(booking.id, days, amount)
            closeSheet()
            popup.toast(`Extended ${days} day${days === 1 ? '' : 's'} · added to your invoice`, { tone: 'success' })
          }}
        />
      )}
    </Screen>
  )
}

/** The latest run (sheet callbacks may run after several quick updates). */
function latestRun(runId: string) {
  return useProjectOps.getState().runs.find((r) => r.id === runId)!
}

function CheckRow({
  icon: CIcon,
  title,
  detail,
  done,
  warn,
  disabled,
  onClick,
}: {
  icon: Icon
  title: string
  detail: string
  done: boolean
  warn?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2 disabled:cursor-default disabled:active:bg-transparent"
    >
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', done ? 'bg-success-soft text-success' : warn ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-fg-2')}>
        {done ? <CheckIcon size={18} weight="bold" /> : <CIcon size={18} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-fg">{title}</span>
        <span className="block truncate text-[13px] text-muted">{detail}</span>
      </span>
      {!disabled && <span className="shrink-0 text-sm font-semibold text-accent">{done ? 'View' : 'Start'}</span>}
      <span aria-hidden className="absolute bottom-0 left-[64px] right-0 h-px bg-line group-last:hidden" />
    </button>
  )
}

/** "On the way": a truck moving along the route. */
function OnTheWay() {
  return (
    <div className="mt-3 rounded-xl bg-info-soft p-3">
      <p className="text-[13px] font-semibold text-info">Arriving in about 25 min</p>
      <div className="relative mt-2.5 h-1.5 rounded-full bg-info/20">
        <motion.span
          className="absolute -top-2.5 grid size-6 place-items-center rounded-full bg-info text-white shadow"
          initial={{ left: '5%' }}
          animate={{ left: '62%' }}
          transition={{ duration: 2.4, ease: EASE_OUT }}
        >
          <TruckIcon size={13} weight="fill" />
        </motion.span>
      </div>
    </div>
  )
}
