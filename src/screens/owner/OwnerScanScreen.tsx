import { ArrowUUpLeftIcon, CheckCircleIcon, ClockCountdownIcon, KeyboardIcon, QrCodeIcon, ScanIcon, TruckIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { ListingThumb } from '@/components/owner/OwnerUI'
import { cn } from '@/lib/cn'
import { formatDayShort, todayISO } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import type { Order } from '@/lib/owner'
import { nav } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { useOwner } from '@/store/owner'
import { Button, EmptyState, Screen, Tag, TextField } from '@/ui'

type Phase = 'idle' | 'scanning' | 'matched'

/** Scan a code → Handover. The camera is simulated: tap a handover (or Scan) to read its code. */
export default function OwnerScanScreen() {
  const orders = useOwner((s) => s.orders)
  const listings = useOwner((s) => s.listings)
  const today = todayISO()
  const [phase, setPhase] = useState<Phase>('idle')
  const [matched, setMatched] = useState<Order | null>(null)
  const [codeSheet, setCodeSheet] = useState({ key: 0, open: false })
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const rank = (o: Order) => (o.status === 'out' && o.to < today ? 0 : o.status === 'out' && o.to === today ? 1 : o.status === 'confirmed' && o.from <= today ? 2 : 3)
  const list = orders.filter((o) => o.status === 'out' || o.status === 'confirmed').sort((a, b) => rank(a) - rank(b) || a.from.localeCompare(b.from))
  const listingOf = (id: string) => listings.find((l) => l.id === id)!

  const scan = async (o: Order) => {
    if (phase !== 'idle') return
    setPhase('scanning')
    await sleep(1000)
    if (!alive.current) return
    setMatched(o)
    setPhase('matched')
    haptic('success')
    await sleep(800)
    if (!alive.current) return
    nav.replace(`/renter/handover/${o.id}`)
  }

  const find = (code: string) => {
    const c = code.trim().toUpperCase()
    return list.find((o) => o.id === c || listingOf(o.listingId).pieces.some((p) => p.code === c && (o.pieceIds.includes(p.id) || o.status === 'confirmed'))) ?? null
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
      <div className="relative flex min-h-[340px] flex-col bg-[#101318] pb-9 pt-[calc(var(--sat)+8px)] text-white">
        <div className="flex h-12 items-center gap-1 px-2">
          <button type="button" aria-label="Close" onClick={() => nav.pop()} className="grid size-10 place-items-center rounded-full hover:bg-white/10">
            <XIcon size={22} />
          </button>
          <h1 className="flex-1 px-1 font-display text-[17px] font-bold">Scan a code</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="relative grid size-52 place-items-center">
            {['left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl'].map((c) => (
              <span key={c} aria-hidden className={cn('absolute size-10 transition-colors duration-300', phase === 'matched' ? 'border-success' : 'border-white/85', c)} />
            ))}
            <AnimatePresence>
              {phase === 'matched' && matched ? (
                <motion.div key="ok" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center px-4 text-center">
                  <CheckCircleIcon size={60} weight="fill" className="text-success" />
                  <p className="mt-2 text-sm font-semibold">{matched.id}</p>
                  <p className="text-xs text-white/70">{listingOf(matched.listingId).name}</p>
                </motion.div>
              ) : (
                <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <QrCodeIcon size={92} weight="thin" className="text-white/20" />
                </motion.div>
              )}
            </AnimatePresence>
            {phase !== 'matched' && (
              <motion.span
                aria-hidden
                className="absolute inset-x-3 h-0.5 rounded-full bg-accent shadow-[0_0_16px_4px_var(--color-accent)]"
                initial={{ top: '8%' }}
                animate={{ top: ['8%', '92%', '8%'] }}
                transition={{ duration: phase === 'scanning' ? 1 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>
          <p className="mt-5 max-w-72 text-center text-sm text-white/75" aria-live="polite">
            {phase === 'scanning' ? 'Reading the code…' : phase === 'matched' ? 'Matched · opening the handover' : 'Scan the piece tag, or the renter’s booking code'}
          </p>
        </div>
      </div>

      <div className="relative -mt-6 rounded-t-3xl bg-surface pb-4 pt-5">
        <div className="px-4 @medium:mx-auto @medium:max-w-xl">
          <h2 className="font-display text-[17px] font-bold text-fg">Handovers</h2>
          <p className="text-xs text-muted">Tap one to read its code</p>
          {list.length === 0 ? (
            <EmptyState icon={QrCodeIcon} title="Nothing to hand over" className="py-8" />
          ) : (
            <div className="mt-3 overflow-hidden rounded-2xl border border-line">
              {list.map((o) => {
                const l = listingOf(o.listingId)
                const r = rank(o)
                return (
                  <button key={o.id} type="button" disabled={phase !== 'idle'} onClick={() => scan(o)} className="group relative flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-surface-2 disabled:opacity-60">
                    <ListingThumb listing={l} className="size-10 shrink-0 rounded-xl" iconSize={18} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-fg">
                        {l.name} × {o.qty}
                      </span>
                      <span className="block truncate text-[13px] text-muted">
                        {o.id} · {o.renter.company}
                      </span>
                    </span>
                    {r === 0 ? (
                      <Tag tone="danger">
                        <ClockCountdownIcon size={11} weight="bold" /> Overdue
                      </Tag>
                    ) : r === 1 ? (
                      <Tag tone="warning">
                        <ArrowUUpLeftIcon size={11} weight="bold" /> Back today
                      </Tag>
                    ) : r === 2 ? (
                      <Tag tone="brand">
                        <TruckIcon size={11} weight="bold" /> Out today
                      </Tag>
                    ) : (
                      <Tag tone="neutral">{o.status === 'out' ? `Back ${formatDayShort(o.to)}` : `Out ${formatDayShort(o.from)}`}</Tag>
                    )}
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
        find={find}
        onFound={(o) => {
          setCodeSheet((s) => ({ ...s, open: false }))
          void scan(o)
        }}
      />
    </Screen>
  )
}

function CodeSheet({ open, onClose, find, onFound }: { open: boolean; onClose: () => void; find: (code: string) => Order | null; onFound: (o: Order) => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const submit = () => {
    const o = find(code)
    if (!o) {
      haptic('warning')
      return setError('No handover for that code. Try an order ID (OR-2049) or a tag (KP-VW-01).')
    }
    onFound(o)
  }
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Type the code"
      description="The order ID, or the tag code on a piece"
      footer={
        <Button size="lg" block onClick={submit}>
          Find handover
        </Button>
      }
    >
      <TextField
        label="Order ID or tag code"
        value={code}
        autoComplete="off"
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
