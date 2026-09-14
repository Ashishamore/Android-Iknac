import { useState, type ReactNode } from 'react'
import { formatDayShort } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { shootDays, type ProjectBoard, type ScheduleBlock } from '@/lib/ops'
import { BottomSheet } from '@/overlays/BottomSheet'
import type { Project } from '@/store/projects'
import { Button, Chip, TextField } from '@/ui'

const TIMES = ['All day', '6 AM – 12 PM', '7 AM – 7 PM', '2 – 10 PM', 'Night shoot']

interface NewBoardSheetProps {
  open: boolean
  onClose: () => void
  project: Project
  /** Board being edited, or undefined to create one. */
  board?: ProjectBoard
  onSave: (input: { name: string; block: ScheduleBlock }) => void
}

/**
 * Create a board, or edit "what this board is for": its name and schedule
 * block (shoot day, location, time, scene). Give it a new `key` each time it opens.
 */
export function NewBoardSheet({ open, onClose, project, board, onSave }: NewBoardSheetProps) {
  const [name, setName] = useState(board?.name ?? '')
  const [scene, setScene] = useState(board?.block.scene ?? '')
  const [date, setDate] = useState<string | null>(board ? board.block.date : null)
  const [locationId, setLocationId] = useState<string | null>(board?.block.locationId ?? null)
  const [time, setTime] = useState(board?.block.time ?? 'All day')
  const [error, setError] = useState<string>()
  const days = shootDays(project)

  const save = () => {
    if (name.trim().length < 2) {
      haptic('warning')
      return setError('Name the board, e.g. “Café interior”')
    }
    onSave({ name: name.trim(), block: { date, locationId, time, scene: scene.trim() } })
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={board ? 'Edit board' : 'New board'}
      description="Group props by scene, set or location"
      footer={
        <Button size="lg" block onClick={save}>
          {board ? 'Save' : 'Create board'}
        </Button>
      }
    >
      <div className="space-y-4">
        <TextField
          label="Board name"
          value={name}
          maxLength={40}
          autoComplete="off"
          error={error}
          onChange={(e) => {
            setName(e.target.value)
            setError(undefined)
          }}
        />
        <TextField label="What it’s for (scene)" value={scene} maxLength={80} autoComplete="off" hint="e.g. Ravi waits out the rain over chai" onChange={(e) => setScene(e.target.value)} />
        <Group title="Shoot day">
          <Chip selected={date === null} onClick={() => setDate(null)}>
            Whole shoot
          </Chip>
          {days.map((d, i) => (
            <Chip
              key={d}
              selected={date === d}
              onClick={() => {
                setDate(d)
                // Pick the location scheduled that day, if there is one.
                const loc = project.locations.find((l) => l.date === d)
                if (loc) setLocationId(loc.id)
              }}
            >
              Day {i + 1} · {formatDayShort(d)}
            </Chip>
          ))}
        </Group>
        {project.locations.length > 0 && (
          <Group title="Location">
            <Chip selected={locationId === null} onClick={() => setLocationId(null)}>
              Not set
            </Chip>
            {project.locations.map((l) => (
              <Chip key={l.id} selected={locationId === l.id} onClick={() => setLocationId(l.id)}>
                {l.name}
              </Chip>
            ))}
          </Group>
        )}
        <Group title="Time">
          {TIMES.map((t) => (
            <Chip key={t} selected={time === t} onClick={() => setTime(t)}>
              {t}
            </Chip>
          ))}
        </Group>
      </div>
    </BottomSheet>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="px-1 text-xs font-bold uppercase tracking-[0.07em] text-muted">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
