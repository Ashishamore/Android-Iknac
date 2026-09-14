import { ArchiveIcon, FilmSlateIcon, PlusIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { ProjectCard } from '@/components/project'
import { EASE_OUT } from '@/lib/motion'
import { nav } from '@/navigation'
import { projectStatus, sortProjects, useProjects } from '@/store/projects'
import { AppBar, Button, EmptyState, Fab, FadeSwitch, Screen, Tabs } from '@/ui'

const newProject = () => nav.push('/customer/projects/new')

type Tab = 'active' | 'past'

export default function ProjectsTab() {
  const projects = useProjects((s) => s.projects)
  const [tab, setTab] = useState<Tab>('active')
  const { active, past } = useMemo(() => {
    const sorted = sortProjects(projects)
    return {
      active: sorted.filter((p) => projectStatus(p).label !== 'Completed'),
      past: sorted.filter((p) => projectStatus(p).label === 'Completed'),
    }
  }, [projects])
  const list = tab === 'active' ? active : past

  return (
    <Screen
      resetScrollOn={tab}
      header={
        <AppBar title="Projects" subtitle={`${active.length} active · ${past.length} past`}>
          <Tabs
            tabs={[
              { value: 'active', label: 'Active', count: active.length },
              { value: 'past', label: 'Past', count: past.length },
            ]}
            value={tab}
            onChange={setTab}
          />
        </AppBar>
      }
      fab={projects.length > 0 && <Fab block icon={PlusIcon} label="New project" onClick={newProject} />}
    >
      <FadeSwitch id={tab} dir={tab === 'past' ? 1 : -1}>
        {list.length === 0 ? (
          tab === 'active' ? (
            <EmptyState
              icon={FilmSlateIcon}
              title="No active projects"
              description="Create a project for your shoot to plan dates, budget, boards and deliveries."
              action={
                <Button icon={PlusIcon} onClick={newProject}>
                  Create project
                </Button>
              }
            />
          ) : (
            <EmptyState icon={ArchiveIcon} title="No past projects" description="Wrapped shoots move here, with their bookings and invoices." />
          )
        ) : (
          <div className="grid gap-3 px-4 pb-28 pt-4 @medium:grid-cols-2">
            {list.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE_OUT, delay: Math.min(i, 6) * 0.04 }}
              >
                <ProjectCard project={p} onClick={() => nav.push(`/customer/projects/${p.id}`)} />
              </motion.div>
            ))}
          </div>
        )}
      </FadeSwitch>
    </Screen>
  )
}
