import { CheckIcon, SparkleIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { CREDIT_PACKS } from '@/data/studio'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useStudio } from '@/store/studio'
import { Button } from '@/ui'

/** Credit balance in the app bar; opens the Credits sheet. */
export function CreditsPill({ onClick, className }: { onClick: () => void; className?: string }) {
  const credits = useStudio((s) => s.credits)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${credits} credits. Top up`}
      className={cn(
        'pressable inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold',
        credits ? 'bg-accent-soft text-accent-soft-fg' : 'bg-danger-soft text-danger',
        className,
      )}
    >
      <SparkleIcon size={16} weight="fill" />
      <span className="tabular-nums">{credits}</span>
    </button>
  )
}

/** Balance, top-up packs (simulated payment) and recent credit activity. */
export function CreditsSheet({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: string }) {
  const popup = usePopup()
  const credits = useStudio((s) => s.credits)
  const log = useStudio((s) => s.log)
  const topUp = useStudio((s) => s.topUp)
  const [packId, setPackId] = useState(CREDIT_PACKS[1].id)
  const pack = CREDIT_PACKS.find((p) => p.id === packId)!

  const buy = async () => {
    const hide = popup.loading('Processing payment…')
    await sleep(1300)
    hide()
    topUp(pack.credits, `Top up · ${pack.credits} credits`)
    haptic('success')
    onClose()
    popup.toast(`${pack.credits} credits added`, { tone: 'success' })
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Credits"
      description="1 credit = 1 board generation or rebuild"
      footer={
        <Button size="lg" block onClick={buy}>
          Pay {formatINR(pack.price)} · UPI or card
        </Button>
      }
    >
      {reason && <p className="mb-3 rounded-xl bg-warning-soft px-3 py-2 text-[13px] font-medium text-warning">{reason}</p>}
      <div className="flex items-center gap-3 rounded-2xl bg-accent-soft p-4">
        <span className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-fg">
          <SparkleIcon size={24} weight="fill" />
        </span>
        <div>
          <p className="font-display text-2xl font-extrabold tabular-nums text-fg">{credits}</p>
          <p className="text-[13px] text-muted">credit{credits === 1 ? '' : 's'} left</p>
        </div>
      </div>

      <h3 className="mt-5 text-xs font-bold uppercase tracking-[0.07em] text-muted">Top up</h3>
      <div role="radiogroup" className="mt-2.5 grid grid-cols-3 gap-2">
        {CREDIT_PACKS.map((p) => {
          const selected = p.id === packId
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                haptic()
                setPackId(p.id)
              }}
              className={cn(
                'pressable relative flex flex-col items-center rounded-2xl border-2 px-2 pb-3 pt-4 text-center transition-colors',
                selected ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
              )}
            >
              {p.tag && (
                <span className="absolute -top-2.5 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-fg">
                  {p.tag}
                </span>
              )}
              <span className="font-display text-xl font-extrabold text-fg">{p.credits}</span>
              <span className="text-xs text-muted">credits</span>
              <span className="mt-1.5 text-sm font-bold text-fg">{formatINR(p.price)}</span>
              <span className="text-[11px] text-subtle">₹{Math.round(p.price / p.credits)} each</span>
              {selected && (
                <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-accent text-accent-fg">
                  <CheckIcon size={10} weight="bold" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {log.length > 0 && (
        <>
          <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.07em] text-muted">Recent activity</h3>
          <ul className="mt-1.5 divide-y divide-line">
            {log.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{e.label}</span>
                  <span className="block text-xs text-muted">{timeAgo(e.at)}</span>
                </span>
                <span className={cn('text-sm font-bold tabular-nums', e.delta > 0 ? 'text-success' : 'text-fg-2')}>
                  {e.delta > 0 ? `+${e.delta}` : `−${Math.abs(e.delta)}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </BottomSheet>
  )
}
