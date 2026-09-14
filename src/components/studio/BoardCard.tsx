import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { sceneItems, versionCost } from '@/lib/studio'
import { useProject } from '@/store/projects'
import type { Board } from '@/store/studio'
import { SceneCanvas } from './SceneCanvas'

/** A saved board in "My boards": scene thumbnail, name, project, cost. */
export function BoardCard({ board, onClick, className }: { board: Board; onClick: () => void; className?: string }) {
  const project = useProject(board.limits.projectId ?? undefined)
  const version = board.versions.find((v) => v.id === board.active) ?? board.versions[0]
  const items = useMemo(() => sceneItems(board.slots, version), [board.slots, version])
  const cost = versionCost(version, board.limits)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'pressable flex w-full items-center gap-3 rounded-2xl bg-surface p-2.5 text-left shadow-card outline-none focus-visible:ring-4 focus-visible:ring-accent/25',
        className,
      )}
    >
      <SceneCanvas compact items={items} era={board.limits.era} photo={board.photo} className="w-[116px] shrink-0 rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-fg">{board.name}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          {project?.name ?? 'No project'} · {board.limits.era ?? 'Any era'}
        </span>
        <span className="mt-1.5 block text-[13px] text-fg-2">
          <b className="font-bold text-fg">{formatINR(cost.total)}</b> · {cost.count} item{cost.count === 1 ? '' : 's'} · Version{' '}
          {board.active}
        </span>
        <span className="mt-0.5 block text-xs text-subtle">Updated {timeAgo(board.updatedAt)}</span>
      </span>
    </button>
  )
}
