import { ChatsCircleIcon, DotsThreeVerticalIcon, FolderIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { formatDateRangeShort } from '@/lib/dates'
import { sleep } from '@/lib/hooks'
import { nav, useParams, useQuery } from '@/navigation'
import { Menu } from '@/overlays/Menu'
import { usePopup } from '@/overlays/popupContext'
import { useProjectOps } from '@/store/projectOps'
import { projectStatus, useProject, useProjects, type Project } from '@/store/projects'
import { AppBar, Button, EmptyState, FadeSwitch, IconButton, Screen, Tabs } from '@/ui'
import { BoardsTab } from './project/BoardsTab'
import { DeliveriesTab } from './project/DeliveriesTab'
import { MoneyTab } from './project/MoneyTab'
import { OverviewTab } from './project/OverviewTab'
import { ScheduleTab } from './project/ScheduleTab'
import { TeamTab } from './project/TeamTab'
import { TransportTab } from './project/TransportTab'

const TABS = ['overview', 'boards', 'schedule', 'transport', 'deliveries', 'money', 'team'] as const
type TabId = (typeof TABS)[number]
const LABEL: Record<TabId, string> = {
  overview: 'Overview',
  boards: 'Boards',
  schedule: 'Schedule',
  transport: 'Transport',
  deliveries: 'Deliveries',
  money: 'Money',
  team: 'Team',
}
const parseTab = (t: string | null): TabId => (TABS as readonly string[]).includes(t ?? '') ? (t as TabId) : 'overview'

export default function ProjectDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const project = useProject(id)
  if (!project) {
    return (
      <Screen header={<AppBar title="Project" />}>
        <EmptyState
          icon={FolderIcon}
          title="Project not found"
          description="It may have been deleted."
          action={<Button onClick={() => nav.pop()}>Go back</Button>}
        />
      </Screen>
    )
  }
  return <ProjectDetail project={project} />
}

/** PROJECT DETAIL: Overview · Boards · Schedule · Transport · Deliveries · Money · Team */
function ProjectDetail({ project }: { project: Project }) {
  const query = useQuery()
  const popup = usePopup()
  const deleteProject = useProjects((s) => s.deleteProject)
  const [tab, setTab] = useState<TabId>(() => parseTab(query.get('tab')))
  const [dir, setDir] = useState(0)
  const boards = useProjectOps((s) => s.boards).filter((b) => b.projectId === project.id).length
  const runs = useProjectOps((s) => s.runs).filter((r) => r.projectId === project.id && r.stage < 5).length
  const status = projectStatus(project)

  const change = (next: string) => {
    const t = parseTab(next)
    setDir(TABS.indexOf(t) > TABS.indexOf(tab) ? 1 : -1)
    setTab(t)
  }

  const remove = async () => {
    const ok = await popup.confirm({
      title: 'Delete project?',
      message: `“${project.name}” with its boards and schedule will be removed.`,
      confirmText: 'Delete',
      tone: 'danger',
      icon: TrashIcon,
    })
    if (!ok) return
    nav.pop()
    // Let the pop animation finish before the data disappears.
    await sleep(380)
    const undo = deleteProject(project.id)
    popup.toast('Project deleted', { action: { label: 'Undo', onClick: undo } })
  }

  return (
    <Screen
      resetScrollOn={tab}
      header={
        <AppBar
          title={project.name}
          subtitle={`${status.label} · ${formatDateRangeShort(project.startDate, project.endDate)}`}
          actions={
            <>
              <IconButton icon={PencilSimpleIcon} label="Edit project" onClick={() => nav.push(`/customer/projects/${project.id}/edit`)} />
              <Menu
                items={[
                  { label: 'Project chat', icon: ChatsCircleIcon, onSelect: () => nav.push(`/customer/projects/${project.id}/chat`) },
                  { label: 'Delete project', icon: TrashIcon, destructive: true, onSelect: remove },
                ]}
              >
                <IconButton icon={DotsThreeVerticalIcon} weight="bold" label="More options" />
              </Menu>
            </>
          }
        >
          <Tabs
            variant="scroll"
            tabs={TABS.map((t) => ({
              value: t,
              label: LABEL[t],
              count: t === 'boards' ? boards : t === 'deliveries' ? runs : undefined,
            }))}
            value={tab}
            onChange={change}
          />
        </AppBar>
      }
    >
      <FadeSwitch id={tab} dir={dir}>
        {tab === 'overview' && <OverviewTab project={project} onTab={change} />}
        {tab === 'boards' && <BoardsTab project={project} />}
        {tab === 'schedule' && <ScheduleTab project={project} />}
        {tab === 'transport' && <TransportTab project={project} onTab={change} />}
        {tab === 'deliveries' && <DeliveriesTab project={project} onTab={change} />}
        {tab === 'money' && <MoneyTab project={project} onTab={change} />}
        {tab === 'team' && <TeamTab project={project} />}
      </FadeSwitch>
    </Screen>
  )
}
