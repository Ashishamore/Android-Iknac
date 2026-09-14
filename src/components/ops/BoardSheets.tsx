import { CheckIcon, HeartIcon, KanbanIcon, PlusIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { PROPS, propById, vendorById } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatDateRangeShort } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import type { BoardLine, ProjectBoard } from '@/lib/ops'
import { clashOn, distanceLabel, isFreeOn, similarity } from '@/lib/search'
import { BottomSheet } from '@/overlays/BottomSheet'
import { useSaved } from '@/store/saved'
import { Button, CheckboxVisual, EmptyState } from '@/ui'
import { PropThumb } from '../PropCard'

/** Conflict banner → "See alternatives": props free on the item's dates, most alike first. */
export function AlternativesSheet({
  open,
  onClose,
  lines,
  onSwap,
}: {
  open: boolean
  onClose: () => void
  /** The unavailable items to find alternatives for. */
  lines: BoardLine[]
  onSwap: (line: BoardLine, propId: string) => void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Alternatives" description="Free on your dates, most alike first">
      <div className="space-y-5">
        {lines.map((l) => {
          const prop = propById(l.propId)
          const clash = clashOn(prop, l.from, l.to)
          const options = PROPS.filter((p) => p.id !== prop.id && p.category === prop.category && isFreeOn(p, l.from, l.to))
            .sort((a, b) => similarity(b, prop) - similarity(a, prop) || vendorById(a.vendorId).distanceKm - vendorById(b.vendorId).distanceKm)
            .slice(0, 4)
          return (
            <section key={l.id}>
              <p className="flex items-start gap-2 text-sm font-semibold text-fg">
                <WarningCircleIcon size={17} weight="fill" className="mt-px shrink-0 text-danger" />
                <span>
                  {prop.name}
                  <span className="block text-xs font-normal text-muted">
                    Booked {clash ? formatDateRangeShort(clash[0], clash[1]) : 'on your dates'} · you need {formatDateRangeShort(l.from, l.to)}
                  </span>
                </span>
              </p>
              {options.length === 0 ? (
                <p className="mt-2 text-[13px] text-muted">Nothing similar is free. Try other dates.</p>
              ) : (
                <ul className="-mx-2 mt-1.5">
                  {options.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => onSwap(l, p.id)}
                        className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
                      >
                        <PropThumb item={p} iconSize={20} className="size-12 shrink-0 rounded-xl" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-fg">{p.name}</span>
                          <span className="block truncate text-xs text-muted">
                            {distanceLabel(p)} · {p.era} · <span className="text-success">Free</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-bold text-fg">{formatINR(p.pricePerDay)}</span>
                          <span className="text-xs font-semibold text-accent">Swap in</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </BottomSheet>
  )
}

/** "Add from saved": hearted props not on the board yet. */
export function AddFromSavedSheet({
  open,
  onClose,
  board,
  onAdd,
  onBrowse,
}: {
  open: boolean
  onClose: () => void
  board: ProjectBoard
  onAdd: (propIds: string[]) => void
  onBrowse: () => void
}) {
  const saved = useSaved((s) => s.saved)
  const list = useMemo(() => PROPS.filter((p) => saved[p.id] && !board.lines.some((l) => l.propId === p.id)), [saved, board.lines])
  const [picked, setPicked] = useState<string[]>([])
  const toggle = (id: string) => setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Add from saved"
      description="Props you’ve saved with ♥"
      footer={
        list.length > 0 && (
          <Button size="lg" block disabled={!picked.length} onClick={() => onAdd(picked)}>
            {picked.length ? `Add ${picked.length} to ${board.name}` : 'Pick props to add'}
          </Button>
        )
      }
    >
      {list.length === 0 ? (
        <EmptyState
          icon={HeartIcon}
          title="Nothing saved yet"
          description="Tap ♥ on any prop in Discover to keep it handy here."
          action={<Button onClick={onBrowse}>Browse props</Button>}
          className="py-6"
        />
      ) : (
        <ul className="-mx-2">
          {list.map((p) => {
            const on = picked.includes(p.id)
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => {
                    haptic()
                    toggle(p.id)
                  }}
                  className={cn('flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors', on ? 'bg-accent-soft' : 'active:bg-surface-2')}
                >
                  <PropThumb item={p} iconSize={20} className="size-12 shrink-0 rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-fg">{p.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {formatINR(p.pricePerDay)}/day · {distanceLabel(p)}
                    </span>
                  </span>
                  <CheckboxVisual checked={on} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </BottomSheet>
  )
}

/** "Move to board": the project's other boards (or a new one). */
export function MoveToBoardSheet({
  open,
  onClose,
  boards,
  currentId,
  onMove,
  onNew,
}: {
  open: boolean
  onClose: () => void
  boards: ProjectBoard[]
  currentId: string
  onMove: (boardId: string) => void
  onNew: () => void
}) {
  const others = boards.filter((b) => b.id !== currentId)
  return (
    <BottomSheet open={open} onClose={onClose} title="Move to board">
      <ul className="-mx-2">
        {others.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => onMove(b.id)}
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
                <KanbanIcon size={18} weight="fill" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-fg">{b.name}</span>
                <span className="block text-xs text-muted">
                  {b.lines.length} item{b.lines.length === 1 ? '' : 's'}
                </span>
              </span>
              <CheckIcon size={16} className="text-transparent" />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={onNew}
            className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left text-sm font-semibold text-accent transition-colors hover:bg-surface-2/60 active:bg-surface-2"
          >
            <span className="grid size-9 place-items-center rounded-xl border-2 border-dashed border-accent/40">
              <PlusIcon size={16} weight="bold" />
            </span>
            New board
          </button>
        </li>
      </ul>
    </BottomSheet>
  )
}
