import { CaretRightIcon } from '@phosphor-icons/react'
import { RUN_ICON, STAGES, TRANSPORT_MODES } from '@/data/ops'
import { cn } from '@/lib/cn'
import { formatDayShort } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { runPlace, runTitle, stageTone, type Run } from '@/lib/ops'
import type { Project } from '@/store/projects'
import { IconTile, Tag } from '@/ui'

/** A delivery, return or move in a list: what, when, where, stage and cost. */
export function RunRow({
  run,
  project,
  onClick,
  showDate,
  showCost,
  className,
}: {
  run: Run
  project: Pick<Project, 'locations'>
  onClick: () => void
  showDate?: boolean
  showCost?: boolean
  className?: string
}) {
  const mode = TRANSPORT_MODES.find((m) => m.id === run.mode)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2', className)}
    >
      <IconTile icon={RUN_ICON[run.kind]} tone={run.kind === 'return' ? 'warning' : run.kind === 'move' ? 'info' : 'brand'} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-fg">{runTitle(run)}</span>
        <span className="block truncate text-[13px] text-muted">
          {showDate && `${formatDayShort(run.date)} · `}
          {run.window} · {runPlace(run, project)}
        </span>
        <span className="mt-1 flex items-center gap-2">
          <Tag tone={stageTone(run)} dot>
            {STAGES[run.kind][run.stage]}
          </Tag>
          {showCost && (
            <span className="text-xs text-muted">
              {mode?.label} · {run.cost ? formatINR(run.cost) : 'Free'}
            </span>
          )}
        </span>
      </span>
      <CaretRightIcon size={15} weight="bold" className="shrink-0 text-subtle" />
      <span aria-hidden className="absolute bottom-0 left-[66px] right-0 h-px bg-line group-last:hidden" />
    </button>
  )
}
