import { CheckIcon, KanbanIcon, PlusIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { formatDateRangeShort } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { blockSummary, type ProjectBoard } from '@/lib/ops'
import { nav } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useProjectOps } from '@/store/projectOps'
import { sortProjects, useProjects, type Project } from '@/store/projects'
import { Button, IconTile } from '@/ui'
import { NewBoardSheet } from '../ops/NewBoardSheet'

interface BoardSheetProps {
  open: boolean
  onClose: () => void
  propIds: string[]
  /** Called after the props were added (e.g. to leave selection mode). */
  onAdded?: (projectId: string, boardId: string) => void
  title?: string
  description?: string
}

/** "Add to board": pick a board in any project (or create one) for these props. */
export function BoardSheet({ open, onClose, propIds, onAdded, title = 'Add to board', description }: BoardSheetProps) {
  const popup = usePopup()
  const projects = sortProjects(useProjects((s) => s.projects))
  const boards = useProjectOps((s) => s.boards)
  const addLines = useProjectOps((s) => s.addLines)
  const createBoard = useProjectOps((s) => s.createBoard)
  const [creating, setCreating] = useState<{ key: number; open: boolean; project: Project | null }>({ key: 0, open: false, project: null })
  const n = propIds.length

  const add = (board: ProjectBoard) => {
    const added = addLines(board.id, propIds)
    haptic('success')
    onClose()
    onAdded?.(board.projectId, board.id)
    popup.toast(added ? `${added} prop${added === 1 ? '' : 's'} added to ${board.name}` : `Already on ${board.name}`, {
      tone: added ? 'success' : 'default',
      action: { label: 'View', onClick: () => nav.push(`/customer/projects/${board.projectId}/boards/${board.id}`) },
    })
  }

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={title}
        description={description ?? `Put ${n} prop${n === 1 ? '' : 's'} on a project board`}
        footer={
          <Button
            variant="secondary"
            size="lg"
            block
            icon={PlusIcon}
            onClick={() => {
              onClose()
              nav.push('/customer/projects/new')
            }}
          >
            New project
          </Button>
        }
      >
        {projects.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Create a project first. Each project has its own boards.</p>
        ) : (
          <div className="-mx-2 space-y-4">
            {projects.map((p) => {
              const list = boards.filter((b) => b.projectId === p.id)
              return (
                <section key={p.id}>
                  <p className="px-3 text-xs font-bold uppercase tracking-[0.07em] text-muted">
                    {p.name} · {formatDateRangeShort(p.startDate, p.endDate)}
                  </p>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {list.map((b) => {
                      const all = propIds.every((id) => b.lines.some((l) => l.propId === id))
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => add(b)}
                          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
                        >
                          <IconTile icon={KanbanIcon} tone="brand" size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-semibold text-fg">{b.name}</span>
                            <span className="block truncate text-[13px] text-muted">
                              {blockSummary(b.block, p)} · {b.lines.length} item{b.lines.length === 1 ? '' : 's'}
                            </span>
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                              all ? 'bg-success-soft text-success' : 'text-accent',
                            )}
                          >
                            {all ? (
                              <>
                                <CheckIcon size={12} weight="bold" /> Added
                              </>
                            ) : (
                              'Add'
                            )}
                          </span>
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => setCreating((c) => ({ key: c.key + 1, open: true, project: p }))}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-accent transition-colors hover:bg-surface-2/60 active:bg-surface-2"
                    >
                      <span className="grid size-9 place-items-center rounded-xl border-2 border-dashed border-accent/40">
                        <PlusIcon size={16} weight="bold" />
                      </span>
                      New board in {p.name}
                    </button>
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </BottomSheet>
      {creating.project && (
        <NewBoardSheet
          key={creating.key}
          open={creating.open}
          project={creating.project}
          onClose={() => setCreating((c) => ({ ...c, open: false }))}
          onSave={(input) => {
            const id = createBoard(creating.project!.id, input)
            const board = useProjectOps.getState().boards.find((b) => b.id === id)
            if (board) add(board)
          }}
        />
      )}
    </>
  )
}
