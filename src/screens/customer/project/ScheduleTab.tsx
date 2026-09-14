import { KanbanIcon, MapPinIcon, MapPinPlusIcon, NavigationArrowIcon, PlusIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { LocationSheet } from '@/components/LocationSheet'
import { RUN_ICON } from '@/data/ops'
import { DateBadge } from '@/components/project'
import { daysInclusive, formatDayShort, todayISO } from '@/lib/dates'
import { runTitle, shootDays } from '@/lib/ops'
import { nav } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useProjectOps } from '@/store/projectOps'
import { useProjects, type Project, type ShootLocation } from '@/store/projects'
import { Button, Card, SectionHeader, Tag } from '@/ui'

const inputOf = (p: Project) => ({ name: p.name, startDate: p.startDate, endDate: p.endDate, budget: p.budget, locations: p.locations })

/** SCHEDULE → Shoot days · Locations timeline · Add location */
export function ScheduleTab({ project }: { project: Project }) {
  const popup = usePopup()
  const updateProject = useProjects((s) => s.updateProject)
  const allBoards = useProjectOps((s) => s.boards)
  const allRuns = useProjectOps((s) => s.runs)
  const boards = useMemo(() => allBoards.filter((b) => b.projectId === project.id), [allBoards, project.id])
  const runs = useMemo(() => allRuns.filter((r) => r.projectId === project.id), [allRuns, project.id])
  const [sheet, setSheet] = useState<{ key: number; open: boolean; editing: ShootLocation | null }>({ key: 0, open: false, editing: null })
  const openSheet = (editing: ShootLocation | null) => setSheet((s) => ({ key: s.key + 1, open: true, editing }))
  const latest = () => useProjects.getState().projects.find((p) => p.id === project.id)
  const today = todayISO()

  const saveLocation = (loc: ShootLocation) => {
    const current = latest()
    if (!current) return
    const exists = current.locations.some((l) => l.id === loc.id)
    updateProject(current.id, {
      ...inputOf(current),
      locations: exists ? current.locations.map((l) => (l.id === loc.id ? loc : l)) : [...current.locations, loc],
    })
    popup.toast(exists ? 'Location updated' : 'Location added', { tone: 'success' })
  }
  const removeLocation = (locationId: string) => {
    const current = latest()
    const removed = current?.locations.find((l) => l.id === locationId)
    if (!current || !removed) return
    updateProject(current.id, { ...inputOf(current), locations: current.locations.filter((l) => l.id !== locationId) })
    popup.toast('Location removed', {
      action: {
        label: 'Undo',
        onClick: () => {
          const now = latest()
          if (now) updateProject(now.id, { ...inputOf(now), locations: [...now.locations, removed] })
        },
      },
    })
  }
  const directions = (address: string) =>
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener')

  return (
    <div className="pb-8 @medium:mx-auto @medium:max-w-2xl">
      {/* Shoot days */}
      <SectionHeader title="Shoot days" subtitle="Locations, boards and deliveries by day" className="pt-4" />
      <div className="space-y-2.5 px-4">
        {shootDays(project).map((d, i) => {
          const locs = project.locations.filter((l) => l.date === d)
          const dayBoards = boards.filter((b) => b.block.date === d)
          const dayRuns = runs.filter((r) => r.date === d)
          return (
            <Card key={d} className="flex gap-3 p-3.5">
              <DateBadge iso={d} className="self-start" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.08em] text-accent">
                  Day {i + 1} · {formatDayShort(d)}
                  {d === today && <Tag tone="success">Today</Tag>}
                </p>
                {locs.length ? (
                  locs.map((l) => (
                    <p key={l.id} className="mt-1 flex items-center gap-1.5 text-[15px] font-semibold text-fg">
                      <MapPinIcon size={15} weight="fill" className="shrink-0 text-muted" />
                      <span className="truncate">{l.name}</span>
                    </p>
                  ))
                ) : (
                  <p className="mt-1 text-[13px] text-muted">No location set</p>
                )}
                {(dayBoards.length > 0 || dayRuns.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {dayBoards.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => nav.push(`/customer/projects/${project.id}/boards/${b.id}`)}
                        className="pressable inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2 py-1 text-xs font-semibold text-accent-soft-fg"
                      >
                        <KanbanIcon size={13} weight="bold" /> {b.name}
                      </button>
                    ))}
                    {dayRuns.map((r) => {
                      const RIcon = RUN_ICON[r.kind]
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => nav.push(`/customer/projects/${project.id}/runs/${r.id}`)}
                          className="pressable inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-xs font-semibold text-fg-2"
                        >
                          <RIcon size={13} weight="bold" /> {r.window} · {runTitle(r).split(' · ')[0]}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Locations timeline */}
      <div className="flex items-end justify-between gap-3 px-4 pb-3 pt-7">
        <div>
          <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-fg">Locations</h2>
          {project.locations.length > 0 && <p className="mt-0.5 text-xs text-muted">In shoot order · tap one to edit</p>}
        </div>
        <Button size="sm" variant="tonal" icon={PlusIcon} onClick={() => openSheet(null)}>
          Add location
        </Button>
      </div>
      {project.locations.length === 0 ? (
        <button
          type="button"
          onClick={() => openSheet(null)}
          className="mx-4 flex w-[calc(100%-2rem)] flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong px-4 py-6 text-sm font-medium text-muted transition-colors hover:border-accent/50"
        >
          <MapPinPlusIcon size={26} weight="duotone" className="text-accent" />
          Add where you’ll be shooting
        </button>
      ) : (
        <ol className="px-4">
          {project.locations.map((l, i) => (
            <li key={l.id} className="relative flex gap-3 pb-3 last:pb-0">
              {i < project.locations.length - 1 && (
                <span aria-hidden className="absolute bottom-0 left-6 top-[60px] w-px -translate-x-1/2 bg-line-strong" />
              )}
              <DateBadge iso={l.date} className="self-start" />
              <Card onClick={() => openSheet(l)} className="min-w-0 flex-1 p-3.5">
                <p className="text-2xs font-bold uppercase tracking-[0.08em] text-accent">
                  Day {daysInclusive(project.startDate, l.date)} · {formatDayShort(l.date)}
                </p>
                <p className="mt-1 text-[15px] font-semibold text-fg">{l.name}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-muted">{l.address}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    directions(l.address)
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-accent"
                >
                  <NavigationArrowIcon size={16} weight="fill" />
                  Directions
                </button>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <LocationSheet
        key={sheet.key}
        open={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        initial={sheet.editing}
        min={project.startDate}
        max={project.endDate}
        onSave={saveLocation}
        onRemove={removeLocation}
      />
    </div>
  )
}
