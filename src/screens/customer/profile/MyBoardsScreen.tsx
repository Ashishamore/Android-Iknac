import { KanbanIcon, PlusIcon, SparkleIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { ProjectBoardCard } from '@/components/ops/ProjectBoardCard'
import { BoardCard } from '@/components/studio/BoardCard'
import { useNow } from '@/lib/hooks'
import { nav, useQuery } from '@/navigation'
import { useProjectOps } from '@/store/projectOps'
import { projectStatus, sortProjects, useProjects } from '@/store/projects'
import { useStudio } from '@/store/studio'
import { AppBar, Button, Chip, ChipRow, EmptyState, Fab, Screen, Tabs, Tag } from '@/ui'

type Tab = 'project' | 'ai'

/** My boards: project boards grouped by project, and AI Studio boards. */
export default function MyBoardsScreen() {
  const query = useQuery()
  const now = useNow(60_000).getTime()
  const [tab, setTab] = useState<Tab>(() => (query.get('tab') === 'ai' ? 'ai' : 'project'))
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const projects = useProjects((s) => s.projects)
  const boards = useProjectOps((s) => s.boards)
  const aiBoards = useStudio((s) => s.boards)
  const groups = useMemo(
    () => sortProjects(projects).map((p) => ({ project: p, boards: boards.filter((b) => b.projectId === p.id) })).filter((g) => g.boards.length),
    [projects, boards],
  )
  const aiProjects = projects.filter((p) => aiBoards.some((b) => b.limits.projectId === p.id))
  const shownAi = projectFilter ? aiBoards.filter((b) => b.limits.projectId === projectFilter) : aiBoards

  return (
    <Screen
      resetScrollOn={tab}
      header={
        <AppBar title="My boards">
          <Tabs
            tabs={[
              { value: 'project', label: 'Project boards', count: boards.length },
              { value: 'ai', label: 'AI boards', count: aiBoards.length },
            ]}
            value={tab}
            onChange={setTab}
          />
        </AppBar>
      }
      fab={tab === 'ai' && aiBoards.length > 0 ? <Fab icon={SparkleIcon} label="New AI board" onClick={() => nav.push('/customer/ai-studio/new')} /> : undefined}
    >
      {tab === 'project' &&
        (groups.length ? (
          <div className="space-y-6 px-4 pb-8 pt-4 @medium:mx-auto @medium:max-w-2xl">
            {groups.map(({ project, boards: list }) => {
              const status = projectStatus(project)
              return (
                <section key={project.id}>
                  <button
                    type="button"
                    onClick={() => nav.push(`/customer/projects/${project.id}?tab=boards`)}
                    className="mb-2.5 flex w-full items-center gap-2 px-1 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate font-display text-[16px] font-bold text-fg">{project.name}</span>
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  </button>
                  <div className="grid grid-cols-1 gap-3">
                    {list.map((b) => (
                      <ProjectBoardCard key={b.id} board={b} project={project} now={now} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={KanbanIcon}
            title="No project boards yet"
            description="Open a project and start a board for each scene or set."
            action={<Button onClick={() => nav.switchTab('projects')}>Go to projects</Button>}
          />
        ))}

      {tab === 'ai' &&
        (aiBoards.length ? (
          <div className="pb-24 pt-3 @medium:mx-auto @medium:max-w-2xl">
            {aiProjects.length > 0 && (
              <ChipRow className="pb-3">
                <Chip selected={!projectFilter} onClick={() => setProjectFilter(null)}>
                  All
                </Chip>
                {aiProjects.map((p) => (
                  <Chip key={p.id} selected={projectFilter === p.id} onClick={() => setProjectFilter(projectFilter === p.id ? null : p.id)}>
                    {p.name}
                  </Chip>
                ))}
              </ChipRow>
            )}
            <div className="grid grid-cols-1 gap-2.5 px-4">
              {shownAi.map((b) => (
                <BoardCard key={b.id} board={b} onClick={() => nav.push(`/customer/ai-studio/boards/${b.id}`)} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={SparkleIcon}
            title="No AI boards yet"
            description="Describe a scene in AI Studio and it builds a board of props within your budget."
            action={
              <Button icon={PlusIcon} onClick={() => nav.push('/customer/ai-studio/new')}>
                New AI board
              </Button>
            }
          />
        ))}
    </Screen>
  )
}
