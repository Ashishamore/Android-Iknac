import { ClockIcon, PackageIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { RunRow } from '@/components/ops/RunRow'
import { addDays, formatDayShort, todayISO } from '@/lib/dates'
import type { DeliveryTiming } from '@/lib/ops'
import { nav } from '@/navigation'
import { useProjectOps, useProjectSettings } from '@/store/projectOps'
import type { Project } from '@/store/projects'
import { Button, Card, Chip, EmptyState, SectionHeader, Segmented } from '@/ui'

const CALL_TIMES = ['5:00 AM', '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM']

/** DELIVERIES → Runs by date · Delivery timing */
export function DeliveriesTab({ project, onTab }: { project: Project; onTab: (tab: string) => void }) {
  const allRuns = useProjectOps((s) => s.runs)
  const setSettings = useProjectOps((s) => s.setSettings)
  const settings = useProjectSettings(project.id)
  const byDate = useMemo(() => {
    const runs = allRuns.filter((r) => r.projectId === project.id).sort((a, b) => a.date.localeCompare(b.date) || a.window.localeCompare(b.window))
    const map = new Map<string, typeof runs>()
    for (const r of runs) map.set(r.date, [...(map.get(r.date) ?? []), r])
    return [...map.entries()]
  }, [allRuns, project.id])
  const today = todayISO()
  const relative = (d: string) => (d === today ? 'Today' : d === addDays(today, 1) ? 'Tomorrow' : d < today ? 'Past' : null)

  return (
    <div className="pb-8 @medium:mx-auto @medium:max-w-2xl">
      {/* Delivery timing */}
      <SectionHeader title="Delivery timing" subtitle="Default for new bookings on this project" className="pt-4" />
      <Card className="mx-4 p-4">
        <Segmented<DeliveryTiming>
          options={[
            { value: 'day-before', label: 'Evening before' },
            { value: 'same-day', label: 'Before call time' },
          ]}
          value={settings.timing}
          onChange={(timing) => setSettings(project.id, { timing })}
        />
        <p className="mt-2.5 flex items-start gap-1.5 text-[13px] leading-snug text-muted">
          <ClockIcon size={16} className="mt-px shrink-0" />
          {settings.timing === 'day-before'
            ? 'Props arrive between 5 and 7 PM the day before each shoot day, so the set can be dressed early.'
            : `Props arrive two hours before the ${settings.callTime} call time on the shoot day.`}
        </p>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.07em] text-muted">Call time</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CALL_TIMES.map((t) => (
            <Chip key={t} selected={settings.callTime === t} onClick={() => setSettings(project.id, { callTime: t })}>
              {t}
            </Chip>
          ))}
        </div>
      </Card>

      {/* Runs by date */}
      <SectionHeader title="Runs by date" subtitle="Deliveries, moves and returns" className="pt-6" />
      {byDate.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="No deliveries yet"
          description="Book items on a board and the runs appear here, day by day."
          action={<Button onClick={() => onTab('boards')}>Go to boards</Button>}
          className="py-8"
        />
      ) : (
        <div className="space-y-4">
          {byDate.map(([date, runs]) => (
            <section key={date}>
              <p className="flex items-center gap-2 px-5 pb-2 text-xs font-bold uppercase tracking-[0.07em] text-muted">
                {formatDayShort(date)}
                {relative(date) && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent-soft-fg">{relative(date)}</span>}
              </p>
              <Card className="mx-4 overflow-hidden">
                {runs.map((r) => (
                  <RunRow key={r.id} run={r} project={project} onClick={() => nav.push(`/customer/projects/${project.id}/runs/${r.id}`)} />
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
