import {
  ArrowCounterClockwiseIcon,
  ArrowsClockwiseIcon,
  ArrowsLeftRightIcon,
  FolderSimpleIcon,
  SparkleIcon,
  TrashIcon,
  type Icon,
} from '@phosphor-icons/react'
import { timeAgo } from '@/lib/dates'
import { BottomSheet } from '@/overlays/BottomSheet'
import type { HistoryEntry, HistoryKind } from '@/store/studio'
import { Button, Tag } from '@/ui'

const KIND_ICON: Record<HistoryKind, Icon> = {
  generate: SparkleIcon,
  rebuild: ArrowsClockwiseIcon,
  swap: ArrowsLeftRightIcon,
  remove: TrashIcon,
  restore: ArrowCounterClockwiseIcon,
  project: FolderSimpleIcon,
}

/** Every change to the board, newest first; restore any earlier state. */
export function HistorySheet({
  open,
  onClose,
  history,
  onRestore,
}: {
  open: boolean
  onClose: () => void
  history: HistoryEntry[]
  onRestore: (entry: HistoryEntry) => void
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Version history"
      description={`${history.length} change${history.length === 1 ? '' : 's'} · restore any earlier state`}
    >
      <ol className="relative">
        {history.map((e, i) => {
          const KIcon = KIND_ICON[e.kind]
          return (
            <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
              {i < history.length - 1 && <span aria-hidden className="absolute bottom-0 left-[17px] top-10 w-px bg-line-strong" />}
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-2">
                <KIcon size={17} />
              </span>
              <span className="min-w-0 flex-1 pt-0.5">
                <span className="block text-sm font-medium text-fg">{e.label}</span>
                <span className="block text-xs text-muted">{timeAgo(e.at)}</span>
              </span>
              {i === 0 ? (
                <Tag tone="brand" className="mt-1 self-start">
                  Current
                </Tag>
              ) : (
                <Button size="sm" variant="ghost" className="-mr-2 self-start" onClick={() => onRestore(e)}>
                  Restore
                </Button>
              )}
            </li>
          )
        })}
      </ol>
    </BottomSheet>
  )
}
