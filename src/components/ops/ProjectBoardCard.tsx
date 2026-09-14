import { CaretRightIcon, KanbanIcon, SparkleIcon } from '@phosphor-icons/react'
import { PropThumb } from '@/components/PropCard'
import { propById } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { blockSummary, boardStats, STATUS_META, STATUS_ORDER, type ProjectBoard } from '@/lib/ops'
import { TONE_SOLID } from '@/lib/tones'
import { nav } from '@/navigation'
import type { Project } from '@/store/projects'
import { Card, IconTile, Tag } from '@/ui'

/** Board card: name, what it's for, item thumbnails, status counts and cost. Opens the board. */
export function ProjectBoardCard({ board, project, now }: { board: ProjectBoard; project: Project; now: number }) {
  const st = boardStats(board, now)
  const thumbs = board.lines.slice(0, 4).map((l) => propById(l.propId))
  return (
    <Card onClick={() => nav.push(`/customer/projects/${project.id}/boards/${board.id}`)} className="p-3.5">
      <div className="flex items-start gap-3">
        <IconTile icon={KanbanIcon} tone="brand" size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <span className="truncate">{board.name}</span>
            {board.aiBoardId && (
              <Tag tone="brand" className="shrink-0">
                <SparkleIcon size={11} weight="fill" /> AI
              </Tag>
            )}
          </p>
          <p className="truncate text-[13px] text-muted">{blockSummary(board.block, project)}</p>
        </div>
        <CaretRightIcon size={15} weight="bold" className="mt-1.5 shrink-0 text-subtle" />
      </div>
      {thumbs.length > 0 && (
        <div className="mt-3 flex gap-1.5">
          {thumbs.map((p, j) => (
            <PropThumb key={j} item={p} iconSize={18} className="size-12 rounded-lg" />
          ))}
          {board.lines.length > 4 && (
            <span className="grid size-12 place-items-center rounded-lg bg-surface-2 text-xs font-bold text-muted">+{board.lines.length - 4}</span>
          )}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2.5 text-xs">
        {board.lines.length === 0 && <span className="font-medium text-muted">No items yet</span>}
        {STATUS_ORDER.filter((s) => st.counts[s]).map((s) => (
          <span key={s} className="flex items-center gap-1 font-medium text-fg-2">
            <span className={cn('size-2 rounded-full', TONE_SOLID[STATUS_META[s].tone])} />
            {st.counts[s]} {STATUS_META[s].label.toLowerCase()}
          </span>
        ))}
        <span className="ml-auto font-bold text-fg">{formatINR(st.cost)}</span>
      </div>
    </Card>
  )
}
