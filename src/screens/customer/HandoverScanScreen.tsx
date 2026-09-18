import { CheckCircleIcon, FlashlightIcon, KeyboardIcon, QrCodeIcon, ScanIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { CHECK_STAGE, RUN_ICON, STAGES } from '@/data/ops'
import { cn } from '@/lib/cn'
import { formatDayShort } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { checkDue, handoverRuns, runTitle, type Run } from '@/lib/ops'
import { nav } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useProjectOps } from '@/store/projectOps'
import { useProjects } from '@/store/projects'
import { Button, EmptyState, IconTile, Screen, Tag, TextField } from '@/ui'

type Phase = 'idle' | 'scanning' | 'matched'

/**
 * Home → "Scan code at handover". Scanning the code on a prop tag or the
 * driver's app confirms the handover and opens that run's photo check.
 * The camera is simulated: tap a handover (or "Scan") to read its code.
 */
export default function HandoverScanScreen() {
  const popup = usePopup()
  const runs = useProjectOps((s) => s.runs)
  const updateRun = useProjectOps((s) => s.updateRun)
  const projects = useProjects((s) => s.projects)
  const [phase, setPhase] = useState<Phase>('idle')
  const [matched, setMatched] = useState<Run | null>(null)
  const [torch, setTorch] = useState(false)
  const [codeSheet, setCodeSheet] = useState({ key: 0, open: false })
  const list = handoverRuns(runs).slice(0, 5)
  // Closing mid-scan must not navigate afterwards.
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const projectName = (r: Run) => projects.find((p) => p.id === r.projectId)?.name ?? 'Project'

  const scan = async (run: Run) => {
    if (phase !== 'idle') return
    setPhase('scanning')
    await sleep(1100)
    if (!alive.current) return
    setMatched(run)
    setPhase('matched')
    haptic('success')
    await sleep(900)
    if (!alive.current) return
    // Scanning at the handover confirms the driver is here (or the props are packed for pickup),
    // which starts the photo check and, for deliveries, the 30-minute window.
    const at = CHECK_STAGE[run.kind]
    if (run.stage < at) {
      const now = Date.now()
      updateRun(run.id, {
        stage: at,
        // Fill in the skipped stages a few minutes apart, ending now.
        stageTimes: run.stageTimes.map((t, i) => (i <= at && !t ? now - (at - i) * 12 * 60_000 : t)),
        arrivedAt: run.kind === 'return' ? run.arrivedAt : now,
      })
      popup.toast(run.kind === 'return' ? 'Pickup confirmed · check the props before they leave' : 'Arrival confirmed · 30 minutes to check', { tone: 'success' })
    }
    nav.replace(`/customer/projects/${run.projectId}/runs/${run.id}?check=scan`)
  }

  return (
    <Screen
      surface
      footer={
        <div className="flex gap-2.5 @medium:mx-auto @medium:max-w-md">
          <Button size="lg" variant="secondary" icon={KeyboardIcon} className="flex-1" disabled={phase !== 'idle'} onClick={() => setCodeSheet((s) => ({ key: s.key + 1, open: true }))}>
            Type code
          </Button>
          <Button size="lg" icon={ScanIcon} className="flex-1" loading={phase === 'scanning'} disabled={!list.length || phase === 'matched'} onClick={() => list[0] && scan(list[0])}>
            Scan
          </Button>
        </div>
      }
    >
      {/* Camera (simulated) */}
      <div className="relative flex min-h-[360px] flex-col bg-[#101318] pb-9 pt-[calc(var(--sat)+8px)] text-white">
        <div className="flex h-12 items-center gap-1 px-2">
          <button type="button" aria-label="Close" onClick={() => nav.pop()} className="grid size-10 place-items-center rounded-full hover:bg-white/10">
            <XIcon size={22} />
          </button>
          <h1 className="flex-1 px-1 font-display text-[17px] font-bold">Scan at handover</h1>
          <button
            type="button"
            aria-label={torch ? 'Turn torch off' : 'Turn torch on'}
            aria-pressed={torch}
            onClick={() => {
              haptic()
              setTorch((t) => !t)
            }}
            className={cn('grid size-10 place-items-center rounded-full transition-colors', torch ? 'bg-white text-[#101318]' : 'hover:bg-white/10')}
          >
            <FlashlightIcon size={20} weight={torch ? 'fill' : 'regular'} />
          </button>
        </div>
        {torch && <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.14),transparent_60%)]" />}

        <div className="flex flex-1 flex-col items-center justify-center pt-2">
          <div className="relative grid size-56 place-items-center">
            {['left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl'].map((c) => (
              <span key={c} aria-hidden className={cn('absolute size-10 transition-colors duration-300', phase === 'matched' ? 'border-success' : 'border-white/85', c)} />
            ))}
            <AnimatePresence>
              {phase === 'matched' && matched ? (
                <motion.div key="ok" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center px-4 text-center">
                  <CheckCircleIcon size={64} weight="fill" className="text-success" />
                  <p className="mt-2 text-sm font-semibold">{matched.bookingId}</p>
                  <p className="text-xs text-white/70">{runTitle(matched)}</p>
                </motion.div>
              ) : (
                <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <QrCodeIcon size={96} weight="thin" className="text-white/20" />
                </motion.div>
              )}
            </AnimatePresence>
            {phase !== 'matched' && (
              <motion.span
                aria-hidden
                className="absolute inset-x-3 h-0.5 rounded-full bg-accent shadow-[0_0_16px_4px_var(--color-accent)]"
                initial={{ top: '8%' }}
                animate={{ top: ['8%', '92%', '8%'] }}
                transition={{ duration: phase === 'scanning' ? 1.1 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>
          <p className="mt-6 max-w-72 text-center text-sm text-white/75" aria-live="polite">
            {phase === 'scanning' ? 'Reading the code…' : phase === 'matched' ? 'Code matched · opening the photo check' : 'Point at the QR code on the prop tag or the driver’s app'}
          </p>
        </div>
      </div>

      {/* Handovers */}
      <div className="relative -mt-6 rounded-t-3xl bg-surface pb-4 pt-5">
        <div className="px-4 @medium:mx-auto @medium:max-w-xl">
          <h2 className="font-display text-[17px] font-bold text-fg">Handovers</h2>
          <p className="text-xs text-muted">Tap one to read its code</p>
          {list.length === 0 ? (
            <EmptyState icon={QrCodeIcon} title="Nothing to hand over" description="When you book props, their deliveries and returns show up here." className="py-8" />
          ) : (
            <div className="mt-3 overflow-hidden rounded-2xl border border-line">
              {list.map((r) => {
                const due = checkDue(r)
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={phase !== 'idle'}
                    onClick={() => scan(r)}
                    className="group relative flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-surface-2 disabled:opacity-60"
                  >
                    <IconTile icon={RUN_ICON[r.kind]} tone={r.kind === 'return' ? 'warning' : r.kind === 'move' ? 'info' : 'brand'} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-fg">{runTitle(r)}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {r.bookingId} · {formatDayShort(r.date)} · {projectName(r)}
                      </span>
                    </span>
                    <Tag tone={due ? 'warning' : 'neutral'} dot className="shrink-0">
                      {due ? 'Due now' : STAGES[r.kind][r.stage]}
                    </Tag>
                    <span aria-hidden className="absolute bottom-0 left-[62px] right-0 h-px bg-line group-last:hidden" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <CodeSheet
        key={codeSheet.key}
        open={codeSheet.open}
        onClose={() => setCodeSheet((s) => ({ ...s, open: false }))}
        find={(code) => list.find((r) => r.bookingId === code) ?? null}
        onFound={(run) => {
          setCodeSheet((s) => ({ ...s, open: false }))
          void scan(run)
        }}
      />
    </Screen>
  )
}

function CodeSheet({ open, onClose, find, onFound }: { open: boolean; onClose: () => void; find: (code: string) => Run | null; onFound: (run: Run) => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()

  const submit = () => {
    const run = find(code.trim().toUpperCase())
    if (!run) {
      haptic('warning')
      return setError('No open handover for that code. Try the booking ID, e.g. BK-1001')
    }
    onFound(run)
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Type the code"
      description="The booking ID printed under the QR code"
      footer={
        <Button size="lg" block onClick={submit}>
          Find handover
        </Button>
      }
    >
      <TextField
        label="Booking ID"
        value={code}
        autoComplete="off"
        autoCapitalize="characters"
        error={error}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase().replace(/\s/g, ''))
          setError(undefined)
        }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
    </BottomSheet>
  )
}
