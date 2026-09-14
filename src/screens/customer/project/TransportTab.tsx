import { PathIcon, PlusIcon, TruckIcon } from '@phosphor-icons/react'
import { useMemo, useState, type ReactNode } from 'react'
import { RunRow } from '@/components/ops/RunRow'
import { formatDayShort } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { shootDays, type Run } from '@/lib/ops'
import { nav } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useProjectOps } from '@/store/projectOps'
import type { Project } from '@/store/projects'
import { Button, Card, Chip, EmptyState, SectionHeader } from '@/ui'

/** TRANSPORT → Getting it · Between locations · Returning it · Cost */
export function TransportTab({ project, onTab }: { project: Project; onTab: (tab: string) => void }) {
  const popup = usePopup()
  const allRuns = useProjectOps((s) => s.runs)
  const planMove = useProjectOps((s) => s.planMove)
  const runs = useMemo(
    () => allRuns.filter((r) => r.projectId === project.id).sort((a, b) => a.date.localeCompare(b.date)),
    [allRuns, project.id],
  )
  const [moveOpen, setMoveOpen] = useState({ key: 0, open: false })
  const groups = {
    delivery: runs.filter((r) => r.kind === 'delivery'),
    move: runs.filter((r) => r.kind === 'move'),
    return: runs.filter((r) => r.kind === 'return'),
  }
  const sum = (list: Run[]) => list.reduce((n, r) => n + r.cost, 0)
  const open = (r: Run) => nav.push(`/customer/projects/${project.id}/runs/${r.id}`)

  if (!runs.length) {
    return (
      <EmptyState
        icon={TruckIcon}
        title="No transport yet"
        description="When you book items, deliveries, moves and returns are planned here."
        action={<Button onClick={() => onTab('boards')}>Go to boards</Button>}
      />
    )
  }

  return (
    <div className="pb-8 @medium:mx-auto @medium:max-w-2xl">
      {/* Cost */}
      <Card className="mx-4 mt-4 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">Transport cost</p>
        <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-fg">{formatINR(sum(runs))}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
          <CostCell label="Getting it" value={sum(groups.delivery)} />
          <CostCell label="Between" value={sum(groups.move)} />
          <CostCell label="Returning" value={sum(groups.return)} />
        </div>
      </Card>

      <Group title="Getting it" subtitle="Deliveries to set">
        {groups.delivery.map((r) => (
          <RunRow key={r.id} run={r} project={project} onClick={() => open(r)} showDate showCost />
        ))}
      </Group>

      <SectionHeader title="Between locations" subtitle="Moving props from one set to the next" className="pt-6" />
      {groups.move.length > 0 && (
        <Card className="mx-4 overflow-hidden">
          {groups.move.map((r) => (
            <RunRow key={r.id} run={r} project={project} onClick={() => open(r)} showDate showCost />
          ))}
        </Card>
      )}
      {project.locations.length >= 2 ? (
        <div className="px-4 pt-2.5">
          <button
            type="button"
            onClick={() => setMoveOpen((s) => ({ key: s.key + 1, open: true }))}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong py-3 text-sm font-semibold text-accent transition-colors hover:border-accent/50"
          >
            <PlusIcon size={16} weight="bold" /> Plan a move
          </button>
        </div>
      ) : (
        <p className="px-4 text-[13px] text-muted">Add a second location to plan moves between sets.</p>
      )}

      <Group title="Returning it" subtitle="Pickups after the shoot">
        {groups.return.map((r) => (
          <RunRow key={r.id} run={r} project={project} onClick={() => open(r)} showDate showCost />
        ))}
      </Group>

      <MoveSheet
        key={moveOpen.key}
        open={moveOpen.open}
        project={project}
        onClose={() => setMoveOpen((s) => ({ ...s, open: false }))}
        onPlan={(move) => {
          const id = planMove(project.id, move)
          setMoveOpen((s) => ({ ...s, open: false }))
          if (id) popup.toast('Move planned · partner vehicle booked', { tone: 'success' })
          else popup.toast('Book some items first, then plan the move', { tone: 'info' })
        }}
      />
    </div>
  )
}

function CostCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-fg">{value ? formatINR(value) : 'Free'}</p>
    </div>
  )
}

function Group({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode[] }) {
  return (
    <>
      <SectionHeader title={title} subtitle={subtitle} className="pt-6" />
      {children.length ? (
        <Card className="mx-4 overflow-hidden">{children}</Card>
      ) : (
        <p className="px-4 text-[13px] text-muted">Nothing planned yet.</p>
      )}
    </>
  )
}

function MoveSheet({
  open,
  onClose,
  project,
  onPlan,
}: {
  open: boolean
  onClose: () => void
  project: Project
  onPlan: (move: { from: string; to: string; date: string; mode: 'tempo' | 'truck' }) => void
}) {
  const locs = project.locations
  const [from, setFrom] = useState(locs[0]?.id ?? '')
  const [to, setTo] = useState(locs[1]?.id ?? '')
  const [date, setDate] = useState(locs[1]?.date ?? project.startDate)
  const [mode, setMode] = useState<'tempo' | 'truck'>('tempo')
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Plan a move"
      description="A partner vehicle moves your booked props between sets"
      footer={
        <Button size="lg" block icon={PathIcon} disabled={!from || !to || from === to} onClick={() => onPlan({ from, to, date, mode })}>
          Plan move · {formatINR(mode === 'truck' ? 2800 : 1500)}
        </Button>
      }
    >
      <div className="space-y-4">
        <Pick title="From">
          {locs.map((l) => (
            <Chip key={l.id} selected={from === l.id} onClick={() => setFrom(l.id)}>
              {l.name}
            </Chip>
          ))}
        </Pick>
        <Pick title="To">
          {locs.map((l) => (
            <Chip
              key={l.id}
              selected={to === l.id}
              onClick={() => {
                setTo(l.id)
                setDate(l.date)
              }}
            >
              {l.name}
            </Chip>
          ))}
        </Pick>
        <Pick title="Day">
          {shootDays(project).map((d, i) => (
            <Chip key={d} selected={date === d} onClick={() => setDate(d)}>
              Day {i + 1} · {formatDayShort(d)}
            </Chip>
          ))}
        </Pick>
        <Pick title="Vehicle">
          <Chip selected={mode === 'tempo'} onClick={() => setMode('tempo')}>
            Tempo · {formatINR(1500)}
          </Chip>
          <Chip selected={mode === 'truck'} onClick={() => setMode('truck')}>
            Truck · {formatINR(2800)}
          </Chip>
        </Pick>
      </div>
    </BottomSheet>
  )
}

function Pick({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="px-1 text-xs font-bold uppercase tracking-[0.07em] text-muted">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
