import {
  ArrowSquareOutIcon,
  ArrowsLeftRightIcon,
  CheckIcon,
  ClockCountdownIcon,
  KanbanIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  MinusIcon,
  NoteIcon,
  PaintBrushIcon,
  PlusIcon,
  TrashIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { propById, vendorById } from '@/data/props'
import { PAINT_COLOURS } from '@/data/ops'
import { cn } from '@/lib/cn'
import { formatDateRangeShort } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useNow } from '@/lib/hooks'
import { HOUR, holdLeft, lineCost, lineDays, lineStatus, STATUS_META, type BoardLine } from '@/lib/ops'
import { clashOn } from '@/lib/search'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useProjectOps } from '@/store/projectOps'
import type { Project } from '@/store/projects'
import { Button, DateField, Switch, Tag, TextArea } from '@/ui'
import { PropThumb } from '../PropCard'

interface ItemOptionsSheetProps {
  open: boolean
  onClose: () => void
  project: Project
  boardId: string
  line: BoardLine | null
  onAlternatives: (line: BoardLine) => void
  onMove: (line: BoardLine) => void
  onRemove: (line: BoardLine) => void
  onOpenListing: (propId: string) => void
}

/**
 * Item options: dates, quantity, same piece on all days · reserve 24h,
 * extend 48h, release · move to board, note for vendor, ask to paint ·
 * open listing, remove. Changes apply straight away.
 */
export function ItemOptionsSheet(props: ItemOptionsSheetProps) {
  const { open, onClose, line } = props
  return (
    <BottomSheet open={open} onClose={onClose} title={line ? propById(line.propId).name : 'Item'}>
      {line && <Body key={line.id} {...props} line={line} />}
    </BottomSheet>
  )
}

function Body({ project, boardId, line, onAlternatives, onMove, onRemove, onOpenListing, onClose }: ItemOptionsSheetProps & { line: BoardLine }) {
  const popup = usePopup()
  const now = useNow(30_000).getTime()
  const updateLine = useProjectOps((s) => s.updateLine)
  const [note, setNote] = useState(line.vendorNote)
  const [paintOpen, setPaintOpen] = useState(false)
  const [colour, setColour] = useState(PAINT_COLOURS[0])
  const [paintNote, setPaintNote] = useState('')
  const prop = propById(line.propId)
  const vendor = vendorById(prop.vendorId)
  const status = lineStatus(line, now)
  const booked = status === 'booked'
  const set = (patch: Partial<BoardLine>) => updateLine(boardId, line.id, patch)
  const clash = clashOn(prop, line.from, line.to)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <PropThumb item={prop} iconSize={22} className="size-14 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-muted">
            {vendor.name} · {formatINR(prop.pricePerDay)}/day
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Tag tone={STATUS_META[status].tone} dot>
              {STATUS_META[status].label}
            </Tag>
            {status === 'reserved' && line.holdUntil && <span className="text-xs font-medium text-info">{holdLeft(line.holdUntil, now)}</span>}
            {booked && <span className="text-xs text-muted">{line.bookingId}</span>}
          </div>
        </div>
        <p className="shrink-0 text-right text-sm font-bold tabular-nums text-fg">{formatINR(lineCost(line))}</p>
      </div>

      {/* Dates · Quantity · Same piece on all days */}
      <section>
        <Label>Dates</Label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <DateField
            label="From"
            format="short"
            value={line.from}
            min={project.startDate}
            max={project.endDate}
            disabled={booked}
            onChange={(from) => set({ from, to: line.to >= from ? line.to : from })}
          />
          <DateField label="To" format="short" value={line.to} min={line.from} max={project.endDate} disabled={booked} onChange={(to) => set({ to })} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-medium text-fg">Quantity</p>
            <p className="text-[13px] text-muted">
              {lineDays(line)} day{lineDays(line) === 1 ? '' : 's'} × {line.qty}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
            <StepButton label="Fewer" disabled={booked || line.qty <= 1} onClick={() => set({ qty: line.qty - 1 })}>
              <MinusIcon size={16} weight="bold" />
            </StepButton>
            <span className="w-8 text-center text-[15px] font-bold tabular-nums text-fg" aria-live="polite">
              {line.qty}
            </span>
            <StepButton label="More" disabled={booked || line.qty >= 20} onClick={() => set({ qty: line.qty + 1 })}>
              <PlusIcon size={16} weight="bold" />
            </StepButton>
          </div>
        </div>
        <label className={cn('mt-3 flex items-center gap-3', (booked || lineDays(line) < 2) && 'opacity-60')}>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium text-fg">Same piece on all days</span>
            <span className="block text-[13px] text-muted">
              {lineDays(line) < 2 ? 'Only matters for multi-day rentals' : 'For continuity: no swaps between days'}
            </span>
          </span>
          <Switch checked={line.samePiece} disabled={booked || lineDays(line) < 2} onChange={(samePiece) => set({ samePiece })} label="Same piece on all days" />
        </label>
      </section>

      {/* Reserve 24h · Extend 48h · Release */}
      <section className="rounded-2xl bg-surface-2 p-3.5">
        {status === 'unavailable' ? (
          <>
            <p className="flex items-start gap-2 text-[13px] font-medium leading-snug text-danger">
              <WarningCircleIcon size={17} weight="fill" className="mt-px shrink-0" />
              Booked by someone else {clash ? `on ${formatDateRangeShort(clash[0], clash[1])}` : 'on these dates'}. Change the dates or pick an alternative.
            </p>
            <Button size="sm" className="mt-3" icon={ArrowsLeftRightIcon} onClick={() => onAlternatives(line)}>
              See alternatives
            </Button>
          </>
        ) : booked ? (
          <p className="flex items-start gap-2 text-[13px] leading-snug text-fg-2">
            <CheckIcon size={17} weight="bold" className="mt-px shrink-0 text-success" />
            Booked under {line.bookingId}. Track it in Deliveries; to change dates, extend from the delivery.
          </p>
        ) : status === 'reserved' ? (
          <>
            <p className="flex items-center gap-2 text-[13px] font-medium text-info">
              <ClockCountdownIcon size={17} weight="fill" /> Held for you · {holdLeft(line.holdUntil!, now)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="tonal"
                className="flex-1"
                icon={ClockCountdownIcon}
                onClick={() => {
                  set({ holdUntil: (line.holdUntil ?? now) + 48 * HOUR })
                  haptic('success')
                  popup.toast('Hold extended by 48 hours', { tone: 'success' })
                }}
              >
                Extend 48h
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                icon={LockSimpleOpenIcon}
                onClick={() => {
                  set({ holdUntil: null })
                  popup.toast('Hold released')
                }}
              >
                Release
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[13px] leading-snug text-muted">Hold it free for 24 hours while you finalise. Others can’t book it meanwhile.</p>
            <Button
              size="sm"
              className="mt-3"
              icon={LockSimpleIcon}
              onClick={() => {
                set({ holdUntil: now + 24 * HOUR })
                haptic('success')
                popup.toast(`${prop.name} reserved for 24 hours`, { tone: 'success' })
              }}
            >
              Reserve 24h
            </Button>
          </>
        )}
      </section>

      {/* Move to board · Note for vendor · Ask to paint */}
      <section className="-mx-2">
        <Row icon={KanbanIcon} title="Move to board" subtitle="Put it on another board in this project" onClick={() => onMove(line)} disabled={booked} />
        <div className="px-2 pt-2">
          <p className="flex items-center gap-2 text-[15px] font-medium text-fg">
            <NoteIcon size={19} className="text-muted" /> Note for vendor
          </p>
          <TextArea
            className="mt-2"
            label="What should the vendor know?"
            rows={2}
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== line.vendorNote && set({ vendorNote: note.trim() })}
          />
          {note.trim() !== line.vendorNote && (
            <Button
              size="sm"
              variant="tonal"
              className="mt-2"
              onClick={() => {
                set({ vendorNote: note.trim() })
                popup.toast('Note saved · sent with the booking', { tone: 'success' })
              }}
            >
              Save note
            </Button>
          )}
        </div>
        <div className="px-2 pt-4">
          <p className="flex items-center gap-2 text-[15px] font-medium text-fg">
            <PaintBrushIcon size={19} className="text-muted" /> Ask to paint
          </p>
          {!prop.modifiable ? (
            <p className="mt-1 text-[13px] text-muted">The owner doesn’t allow changes to this piece.</p>
          ) : line.paint ? (
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-line p-3">
              <span className="size-8 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: line.paint.hex }} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-fg">Request sent · {line.paint.colour}</span>
                <span className="block truncate text-xs text-muted">{line.paint.note || 'Waiting for the owner’s OK'}</span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => set({ paint: null })}>
                Withdraw
              </Button>
            </div>
          ) : paintOpen ? (
            <div className="mt-2 rounded-2xl border border-line p-3">
              <div className="flex gap-2.5" role="radiogroup" aria-label="Colour">
                {PAINT_COLOURS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    role="radio"
                    aria-checked={colour.name === c.name}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => setColour(c)}
                    className={cn(
                      'grid size-9 place-items-center rounded-full ring-1 ring-black/10 transition-transform',
                      colour.name === c.name && 'scale-110 ring-2 ring-accent ring-offset-2 ring-offset-surface',
                    )}
                    style={{ background: c.hex }}
                  >
                    {colour.name === c.name && <CheckIcon size={14} weight="bold" className="text-white mix-blend-difference" />}
                  </button>
                ))}
              </div>
              <TextArea className="mt-3" label={`Paint it ${colour.name.toLowerCase()} — details`} rows={2} value={paintNote} maxLength={160} onChange={(e) => setPaintNote(e.target.value)} />
              <Button
                size="sm"
                className="mt-2.5"
                onClick={() => {
                  set({ paint: { colour: colour.name, hex: colour.hex, note: paintNote.trim() } })
                  setPaintOpen(false)
                  popup.toast(`Paint request sent to ${vendor.name}`, { tone: 'success' })
                }}
              >
                Send request
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="secondary" className="mt-2" icon={PaintBrushIcon} onClick={() => setPaintOpen(true)}>
              Choose a colour
            </Button>
          )}
        </div>
      </section>

      {/* Open listing · Remove */}
      <div className="flex gap-3 border-t border-line pt-4">
        <Button variant="secondary" className="flex-1" icon={ArrowSquareOutIcon} onClick={() => onOpenListing(prop.id)}>
          Open listing
        </Button>
        <Button
          variant="danger-soft"
          className="flex-1"
          icon={TrashIcon}
          disabled={booked}
          onClick={() => {
            onClose()
            onRemove(line)
          }}
        >
          Remove
        </Button>
      </div>
    </div>
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
      className="pressable grid size-8 place-items-center rounded-full bg-surface text-fg shadow-card disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function Row({ icon: RIcon, title, subtitle, onClick, disabled }: { icon: typeof KanbanIcon; title: string; subtitle: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2 disabled:opacity-45"
    >
      <RIcon size={19} className="shrink-0 text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-fg">{title}</span>
        <span className="block text-[13px] text-muted">{subtitle}</span>
      </span>
    </button>
  )
}
