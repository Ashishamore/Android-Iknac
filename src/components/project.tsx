import { CalendarBlankIcon, KanbanIcon, MapPinIcon, WalletIcon, XIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { daysInclusive, formatDateRange, fromISODate, monthShort } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { TONE_SOFT } from '@/lib/tones'
import { useProjectOps } from '@/store/projectOps'
import { projectStatus, type Project, type ShootLocation } from '@/store/projects'
import { Card, IconButton, Tag } from '@/ui'

/** Calendar-style date tile: day number over short month. */
export function DateBadge({ iso, invalid, className }: { iso: string; invalid?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'flex w-12 shrink-0 flex-col items-center justify-center rounded-xl py-1.5',
        invalid ? TONE_SOFT.danger : TONE_SOFT.brand,
        className,
      )}
    >
      <span className="text-lg font-bold leading-none tabular-nums">{fromISODate(iso).getDate()}</span>
      <span className="mt-0.5 text-[10px] font-bold tracking-wide">{monthShort(iso)}</span>
    </span>
  )
}

/** Project summary card for the Projects list. */
export function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const status = projectStatus(project)
  const days = daysInclusive(project.startDate, project.endDate)
  const locations = project.locations.length
  const allBoards = useProjectOps((s) => s.boards)
  const boards = allBoards.filter((b) => b.projectId === project.id)
  const booked = boards.reduce((n, b) => n + b.lines.filter((l) => l.bookingId).length, 0)
  const items = boards.reduce((n, b) => n + b.lines.length, 0)
  return (
    <Card onClick={onClick} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 min-w-0 flex-1 font-display text-[17px] font-bold leading-snug text-fg">{project.name}</h3>
        <Tag tone={status.tone} dot className="mt-0.5 shrink-0">
          {status.label}
        </Tag>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
        <CalendarBlankIcon size={16} className="shrink-0" />
        <span className="truncate">
          {formatDateRange(project.startDate, project.endDate)} · {days} day{days === 1 ? '' : 's'}
        </span>
      </p>
      <div className="mt-3.5 flex items-center gap-5 border-t border-line pt-3 text-sm">
        <span className="flex items-center gap-1.5">
          <WalletIcon size={17} className="text-muted" />
          <span className="font-semibold tabular-nums text-fg">{formatINR(project.budget)}</span>
        </span>
        <span className="flex items-center gap-1.5 text-fg-2">
          <MapPinIcon size={17} className="text-muted" />
          {locations ? `${locations} location${locations === 1 ? '' : 's'}` : 'No locations'}
        </span>
      </div>
      {boards.length > 0 && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-muted">
          <KanbanIcon size={16} className="shrink-0" />
          {boards.length} board{boards.length === 1 ? '' : 's'} · {items} item{items === 1 ? '' : 's'} ·{' '}
          <span className="font-semibold text-success">{booked} booked</span>
        </p>
      )}
    </Card>
  )
}

/** Location inside the project form: tap to edit, ✕ to remove. */
export function LocationRow({
  location,
  invalid,
  onEdit,
  onRemove,
}: {
  location: ShootLocation
  invalid?: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border bg-surface p-3 transition-colors',
        invalid ? 'border-danger' : 'border-line',
      )}
    >
      <DateBadge iso={location.date} invalid={invalid} />
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[15px] font-semibold text-fg">{location.name}</span>
        <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-muted">{location.address}</span>
        {invalid && (
          <span className="mt-1 block text-xs font-medium text-danger">Outside the shoot dates — tap to change</span>
        )}
      </button>
      <IconButton icon={XIcon} label={`Remove ${location.name}`} size="sm" onClick={onRemove} className="-mr-1 -mt-1 text-muted" />
    </div>
  )
}
