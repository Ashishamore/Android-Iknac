import { KanbanIcon, MagnifyingGlassIcon, PlusIcon, SparkleIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { NewBoardSheet } from '@/components/ops/NewBoardSheet'
import { ProjectBoardCard } from '@/components/ops/ProjectBoardCard'
import { useNow } from '@/lib/hooks'
import { EASE_OUT } from '@/lib/motion'
import { resultsPath } from '@/lib/search'
import { nav } from '@/navigation'
import { useProjectOps } from '@/store/projectOps'
import type { Project } from '@/store/projects'
import { Button, EmptyState } from '@/ui'

/** BOARDS → Board cards · New board */
export function BoardsTab({ project }: { project: Project }) {
  const now = useNow(60_000).getTime()
  const allBoards = useProjectOps((s) => s.boards)
  const createBoard = useProjectOps((s) => s.createBoard)
  const boards = useMemo(() => allBoards.filter((b) => b.projectId === project.id), [allBoards, project.id])
  const [sheet, setSheet] = useState({ key: 0, open: false })
  const openNew = () => setSheet((s) => ({ key: s.key + 1, open: true }))

  return (
    <div className="px-4 pb-8 pt-4 @medium:mx-auto @medium:max-w-2xl">
      {boards.length === 0 ? (
        <EmptyState
          icon={KanbanIcon}
          title="No boards yet"
          description="A board groups the props for one scene or set. Start one, or let AI Studio suggest one."
          action={
            <div className="flex flex-col gap-2.5">
              <Button icon={PlusIcon} onClick={openNew}>
                New board
              </Button>
              <Button variant="secondary" icon={SparkleIcon} onClick={() => nav.push(`/customer/ai-studio/new?project=${project.id}`)}>
                Ask AI
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3">
          {boards.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: EASE_OUT, delay: Math.min(i, 6) * 0.04 }}
            >
              <ProjectBoardCard board={b} project={project} now={now} />
            </motion.div>
          ))}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={openNew}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong py-3.5 text-sm font-semibold text-accent transition-colors hover:border-accent/50"
            >
              <PlusIcon size={17} weight="bold" /> New board
            </button>
            <button
              type="button"
              onClick={() => nav.push(resultsPath({ projectId: project.id }))}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong py-3.5 text-sm font-semibold text-fg-2 transition-colors hover:border-accent/50"
            >
              <MagnifyingGlassIcon size={17} weight="bold" /> Find props
            </button>
          </div>
        </div>
      )}

      <NewBoardSheet
        key={sheet.key}
        open={sheet.open}
        project={project}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSave={(input) => {
          const id = createBoard(project.id, input)
          nav.push(`/customer/projects/${project.id}/boards/${id}`)
        }}
      />
    </div>
  )
}
