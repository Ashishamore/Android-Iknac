import { CameraIcon, CheckCircleIcon, EraserIcon, ScanIcon, TrashIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { propById } from '@/data/props'
import { DAMAGE_TYPES, WINDOWS } from '@/data/ops'
import { cn } from '@/lib/cn'
import { addDays, formatDayShort } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { downscaleImage } from '@/lib/image'
import type { BoardLine, PhotoCheck } from '@/lib/ops'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { Button, Chip, IconButton, TextArea, TextField } from '@/ui'
import { PropThumb } from '../PropCard'
import { usePhotoPicker } from '../usePhotoPicker'

/* ── Scan tags ───────────────────────────────────────────────────────────── */

export function ScanSheet({
  open,
  onClose,
  lines,
  scanned,
  onScan,
}: {
  open: boolean
  onClose: () => void
  lines: BoardLine[]
  scanned: string[]
  onScan: (lineId: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const next = lines.find((l) => !scanned.includes(l.id))

  const scanNext = async () => {
    if (!next || busy) return
    setBusy(true)
    await sleep(900)
    onScan(next.id)
    haptic('success')
    setBusy(false)
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Scan tags"
      description="Point the camera at the QR tag on each item"
      footer={
        next ? (
          <Button size="lg" block icon={ScanIcon} loading={busy} onClick={scanNext}>
            Scan {propById(next.propId).name}
          </Button>
        ) : (
          <Button size="lg" block icon={CheckCircleIcon} onClick={onClose}>
            All {lines.length} scanned · done
          </Button>
        )
      }
    >
      <div className="relative mx-auto grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl bg-[#101318]">
        {['left-4 top-4 border-l-[3px] border-t-[3px] rounded-tl-xl', 'right-4 top-4 border-r-[3px] border-t-[3px] rounded-tr-xl', 'bottom-4 left-4 border-b-[3px] border-l-[3px] rounded-bl-xl', 'bottom-4 right-4 border-b-[3px] border-r-[3px] rounded-br-xl'].map((c) => (
          <span key={c} aria-hidden className={`absolute size-8 border-white/80 ${c}`} />
        ))}
        {next ? (
          <PropThumb item={propById(next.propId)} iconSize={48} className="size-28 rounded-2xl bg-white/10 [&_svg]:text-white" />
        ) : (
          <CheckCircleIcon size={64} weight="fill" className="text-success" />
        )}
        {busy && (
          <motion.span
            aria-hidden
            className="absolute inset-x-0 h-16 bg-linear-to-b from-transparent via-white/40 to-transparent"
            initial={{ top: '-20%' }}
            animate={{ top: '100%' }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
          />
        )}
      </div>
      <ul className="mt-4 space-y-1.5">
        {lines.map((l) => {
          const done = scanned.includes(l.id)
          return (
            <li key={l.id} className="flex items-center gap-2.5 text-sm">
              <CheckCircleIcon size={18} weight={done ? 'fill' : 'regular'} className={done ? 'text-success' : 'text-line-strong'} />
              <span className={cn('truncate', done ? 'text-fg' : 'text-muted')}>{propById(l.propId).name}</span>
            </li>
          )
        })}
      </ul>
    </BottomSheet>
  )
}

/* ── Photos ──────────────────────────────────────────────────────────────── */

const TEST_PHOTO = { url: '/banners/recreate-era-latch.webp', label: 'A test photo' }

export function PhotosSheet({
  open,
  onClose,
  lines,
  photos,
  onAdd,
  onRemove,
}: {
  open: boolean
  onClose: () => void
  lines: BoardLine[]
  photos: PhotoCheck['photos']
  onAdd: (lineId: string, dataUrl: string) => void
  onRemove: (lineId: string, index: number) => void
}) {
  const popup = usePopup()
  const target = useRef<string | null>(null)
  const picker = usePhotoPicker({
    title: 'Add a photo',
    description: 'Show the item’s condition clearly',
    sample: TEST_PHOTO,
    onPick: async ({ url, file }) => {
      const lineId = target.current
      if (!lineId) return
      try {
        onAdd(lineId, file ? await downscaleImage(file, 360, 0.72) : url)
      } catch {
        popup.toast('Couldn’t read that photo', { tone: 'error' })
      } finally {
        if (file) URL.revokeObjectURL(url)
      }
    },
  })

  return (
    <BottomSheet open={open} onClose={onClose} title="Photos" description="At least one photo of each item, from a few angles if you can">
      <ul className="space-y-4">
        {lines.map((l) => {
          const list = photos[l.id] ?? []
          return (
            <li key={l.id}>
              <p className="flex items-center justify-between gap-2 text-sm font-semibold text-fg">
                <span className="truncate">{propById(l.propId).name}</span>
                <span className="shrink-0 text-xs font-normal text-muted">
                  {list.length} photo{list.length === 1 ? '' : 's'}
                </span>
              </p>
              <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
                {list.map((src, i) => (
                  <span key={i} className="relative shrink-0">
                    <img src={src} alt={`Photo ${i + 1}`} className="size-20 rounded-xl object-cover" />
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => onRemove(l.id, i)}
                      className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/55 text-white"
                    >
                      <XIcon size={12} weight="bold" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    target.current = l.id
                    picker.pick()
                  }}
                  className="grid size-20 shrink-0 place-items-center rounded-xl border-2 border-dashed border-line-strong text-accent"
                  aria-label={`Add photo of ${propById(l.propId).name}`}
                >
                  <CameraIcon size={24} weight="duotone" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {picker.element}
    </BottomSheet>
  )
}

/* ── Damage ──────────────────────────────────────────────────────────────── */

export function DamageSheet({
  open,
  onClose,
  lines,
  damage,
  onReport,
  onClear,
}: {
  open: boolean
  onClose: () => void
  lines: BoardLine[]
  damage: PhotoCheck['damage']
  onReport: (lineId: string, type: string, note: string) => void
  onClear: (lineId: string) => void
}) {
  const [lineId, setLineId] = useState(lines[0]?.id ?? '')
  const [type, setType] = useState(DAMAGE_TYPES[0])
  const [note, setNote] = useState('')
  const reported = lines.filter((l) => damage[l.id])

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Report damage"
      description="Anything already damaged when it reached you"
      footer={
        <Button
          size="lg"
          block
          variant="danger"
          onClick={() => {
            onReport(lineId, type, note.trim())
            setNote('')
          }}
        >
          Report {type.toLowerCase()}
        </Button>
      }
    >
      {reported.length > 0 && (
        <ul className="mb-4 space-y-2">
          {reported.map((l) => (
            <li key={l.id} className="flex items-center gap-3 rounded-2xl bg-danger-soft px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-danger">
                  {propById(l.propId).name} · {damage[l.id].type}
                </span>
                {damage[l.id].note && <span className="block truncate text-xs text-fg-2">{damage[l.id].note}</span>}
              </span>
              <IconButton icon={TrashIcon} label="Clear report" size="sm" onClick={() => onClear(l.id)} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">Item</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {lines.map((l) => (
          <Chip key={l.id} selected={lineId === l.id} onClick={() => setLineId(l.id)}>
            {propById(l.propId).name}
          </Chip>
        ))}
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.07em] text-muted">What’s wrong</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {DAMAGE_TYPES.map((t) => (
          <Chip key={t} selected={type === t} onClick={() => setType(t)}>
            {t}
          </Chip>
        ))}
      </div>
      <TextArea className="mt-4" label="Where and how bad (optional)" rows={2} value={note} maxLength={160} onChange={(e) => setNote(e.target.value)} />
    </BottomSheet>
  )
}

/* ── Sign ────────────────────────────────────────────────────────────────── */

export function SignSheet({ open, onClose, defaultName, onSign }: { open: boolean; onClose: () => void; defaultName: string; onSign: (dataUrl: string, name: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [inked, setInked] = useState(false)
  const [name, setName] = useState(defaultName)

  // Match the canvas resolution to its layout size (unaffected by the desktop frame's scale).
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      const c = canvasRef.current
      if (!c) return
      c.width = c.offsetWidth * 2
      c.height = c.offsetHeight * 2
      const ctx = c.getContext('2d')!
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = getComputedStyle(c).color
    }, 50)
    return () => clearTimeout(t)
  }, [open])

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget
    const r = c.getBoundingClientRect()
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height }
  }
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    last.current = point(e)
  }
  const moveTo = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return
    const ctx = e.currentTarget.getContext('2d')!
    const p = point(e)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
    if (!inked) setInked(true)
  }
  const up = () => {
    drawing.current = false
    last.current = null
  }
  const clear = () => {
    const c = canvasRef.current
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
    setInked(false)
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Sign to confirm"
      description="Signing locks the photo check. It becomes the record of condition."
      dismissible
      footer={
        <Button size="lg" block disabled={!inked || name.trim().length < 2} onClick={() => canvasRef.current && onSign(canvasRef.current.toDataURL('image/png'), name.trim())}>
          Sign &amp; lock
        </Button>
      }
    >
      <div className="relative rounded-2xl border-2 border-dashed border-line-strong bg-surface-2">
        <canvas
          ref={canvasRef}
          aria-label="Signature pad"
          className="block h-40 w-full touch-none text-fg"
          onPointerDown={down}
          onPointerMove={moveTo}
          onPointerUp={up}
          onPointerCancel={up}
        />
        <AnimatePresence>
          {!inked && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-subtle">
              Sign here with your finger
            </motion.span>
          )}
        </AnimatePresence>
        <span aria-hidden className="pointer-events-none absolute inset-x-6 bottom-8 h-px bg-line-strong" />
      </div>
      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="ghost" icon={EraserIcon} onClick={clear} disabled={!inked}>
          Clear
        </Button>
      </div>
      <TextField className="mt-2" label="Signed by" value={name} onChange={(e) => setName(e.target.value)} />
    </BottomSheet>
  )
}

/* ── Request a change · Reschedule · Extend ──────────────────────────────── */

const CHANGES = ['Arriving later than planned', 'Use the service lift / back gate', 'Call before reaching', 'Need extra helpers to unload']

export function ChangeSheet({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (text: string) => void }) {
  const [pick, setPick] = useState<string | null>(null)
  const [text, setText] = useState('')
  const message = [pick, text.trim()].filter(Boolean).join('. ')
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Request a change"
      description="The driver and vendor get this right away"
      footer={
        <Button size="lg" block disabled={!message} onClick={() => onSend(message)}>
          Send request
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        {CHANGES.map((c) => (
          <Chip key={c} selected={pick === c} onClick={() => setPick(pick === c ? null : c)}>
            {c}
          </Chip>
        ))}
      </div>
      <TextArea className="mt-4" label="Anything else?" rows={3} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />
    </BottomSheet>
  )
}

export function RescheduleSheet({
  open,
  onClose,
  date,
  window,
  onSave,
}: {
  open: boolean
  onClose: () => void
  date: string
  window: string
  onSave: (date: string, window: string) => void
}) {
  const [d, setD] = useState(date)
  const [w, setW] = useState(window)
  const dates = [-1, 0, 1, 2].map((n) => addDays(date, n))
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Reschedule"
      description="Free up to 48 hours before; the vendor confirms the new slot"
      footer={
        <Button size="lg" block disabled={d === date && w === window} onClick={() => onSave(d, w)}>
          Request {formatDayShort(d)} · {w}
        </Button>
      }
    >
      <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">Day</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {dates.map((x) => (
          <Chip key={x} selected={d === x} onClick={() => setD(x)}>
            {formatDayShort(x)}
          </Chip>
        ))}
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.07em] text-muted">Window</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {WINDOWS.map((x) => (
          <Chip key={x} selected={w === x} onClick={() => setW(x)}>
            {x}
          </Chip>
        ))}
      </div>
    </BottomSheet>
  )
}

export function ExtendSheet({
  open,
  onClose,
  perDay,
  returnDate,
  onExtend,
}: {
  open: boolean
  onClose: () => void
  perDay: number
  returnDate: string
  onExtend: (days: number, amount: number) => void
}) {
  const [days, setDays] = useState(1)
  const amount = perDay * days
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Extend rental"
      description={`Keep everything longer. Return moves from ${formatDayShort(returnDate)}.`}
      footer={
        <Button size="lg" block onClick={() => onExtend(days, amount)}>
          Extend {days} day{days === 1 ? '' : 's'} · {formatINR(amount)}
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={days === n}
            onClick={() => {
              haptic()
              setDays(n)
            }}
            className={cn('rounded-2xl border-2 px-2 py-3 text-center transition-colors', days === n ? 'border-accent bg-accent-soft' : 'border-line')}
          >
            <span className="block font-display text-xl font-extrabold text-fg">+{n}</span>
            <span className="block text-xs text-muted">day{n === 1 ? '' : 's'}</span>
            <span className="mt-1 block text-sm font-semibold text-fg">{formatINR(perDay * n)}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-muted">
        New return pickup: {formatDayShort(addDays(returnDate, days))}. Added to your invoice as pending.
      </p>
    </BottomSheet>
  )
}
