import {
  CalendarBlankIcon,
  DotsThreeVerticalIcon,
  HeartIcon,
  KanbanIcon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  NoteIcon,
  PaintBrushIcon,
  PencilSimpleIcon,
  SealCheckIcon,
  ShoppingCartIcon,
  SparkleIcon,
  TrashIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { AddFromSavedSheet, AlternativesSheet, MoveToBoardSheet } from '@/components/ops/BoardSheets'
import { ItemOptionsSheet } from '@/components/ops/ItemOptionsSheet'
import { NewBoardSheet } from '@/components/ops/NewBoardSheet'
import { PropThumb } from '@/components/PropCard'
import { DateBadge } from '@/components/project'
import { HOME_CITY, propById, vendorById } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatDateRangeShort, formatDayShort } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useNow } from '@/lib/hooks'
import { EASE_OUT } from '@/lib/motion'
import {
  FILTER_ORDER,
  HOUR,
  STATUS_META,
  STATUS_ORDER,
  dayLabel,
  holdLeft,
  lineCost,
  lineStatus,
  type BoardLine,
  type LineStatus,
  type ProjectBoard,
} from '@/lib/ops'
import { resultsPath } from '@/lib/search'
import { TONE_SOLID } from '@/lib/tones'
import { nav, useParams } from '@/navigation'
import { Menu } from '@/overlays/Menu'
import { usePopup } from '@/overlays/popupContext'
import { useBoardById, useProjectOps } from '@/store/projectOps'
import { useProject, type Project } from '@/store/projects'
import { useTrackBoard } from '@/store/recent'
import { useStudio } from '@/store/studio'
import { AppBar, Button, Card, EmptyState, IconButton, Screen, Segmented, Tag } from '@/ui'

export default function ProjectBoardScreen() {
  const { id, boardId } = useParams<{ id: string; boardId: string }>()
  const project = useProject(id)
  const board = useBoardById(boardId)
  if (!project || !board) {
    return (
      <Screen header={<AppBar title="Board" />}>
        <EmptyState icon={KanbanIcon} title="Board not found" description="It may have been deleted." action={<Button onClick={() => nav.pop()}>Go back</Button>} />
      </Screen>
    )
  }
  return <BoardDetail project={project} board={board} />
}

type GroupBy = 'vendor' | 'day' | 'status'
type SheetKind = 'item' | 'alts' | 'saved' | 'edit' | 'move' | 'new'

/** BOARD DETAIL: conflicts, schedule block, filter, group by, item options, add, book. */
function BoardDetail({ project, board }: { project: Project; board: ProjectBoard }) {
  const popup = usePopup()
  useTrackBoard('project', board.id)
  const now = useNow(30_000).getTime()
  const allBoards = useProjectOps((s) => s.boards)
  const updateBoard = useProjectOps((s) => s.updateBoard)
  const updateLine = useProjectOps((s) => s.updateLine)
  const removeLines = useProjectOps((s) => s.removeLines)
  const addLines = useProjectOps((s) => s.addLines)
  const moveLine = useProjectOps((s) => s.moveLine)
  const createBoard = useProjectOps((s) => s.createBoard)
  const deleteBoard = useProjectOps((s) => s.deleteBoard)
  const aiBoardExists = useStudio((s) => s.boards.some((b) => b.id === board.aiBoardId))
  const projectBoards = useMemo(() => allBoards.filter((b) => b.projectId === project.id), [allBoards, project.id])

  const [filters, setFilters] = useState<LineStatus[]>([])
  const [groupBy, setGroupBy] = useState<GroupBy>('vendor')
  const [sheet, setSheet] = useState<{ kind: SheetKind | null; lineId: string | null; key: number }>({ kind: null, lineId: null, key: 0 })
  const openSheet = (kind: SheetKind, lineId: string | null = null) => setSheet((s) => ({ kind, lineId, key: s.key + 1 }))
  const closeSheet = () => setSheet((s) => ({ ...s, kind: null }))

  const statusOf = (l: BoardLine) => lineStatus(l, now)
  const counts = FILTER_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: board.lines.filter((l) => statusOf(l) === s).length }),
    {} as Record<LineStatus, number>,
  )
  const unavailable = board.lines.filter((l) => statusOf(l) === 'unavailable')
  const bookable = board.lines.filter((l) => ['reserved', 'not-reserved'].includes(statusOf(l)))
  const bookCost = bookable.reduce((n, l) => n + lineCost(l), 0)
  const shown = filters.length ? board.lines.filter((l) => filters.includes(statusOf(l))) : board.lines
  const groups = groupLines(shown, groupBy, project, statusOf)
  const activeLine = board.lines.find((l) => l.id === sheet.lineId) ?? null
  const altLines = sheet.lineId ? unavailable.filter((l) => l.id === sheet.lineId) : unavailable
  const loc = project.locations.find((l) => l.id === board.block.locationId)

  const removeWithUndo = (lines: BoardLine[]) => {
    const undo = removeLines(board.id, lines.map((l) => l.id))
    popup.toast(lines.length === 1 ? `${propById(lines[0].propId).name} removed` : `${lines.length} items removed`, {
      action: { label: 'Undo', onClick: undo },
    })
  }

  const reserveAll = () => {
    const open = board.lines.filter((l) => statusOf(l) === 'not-reserved')
    if (!open.length) return popup.toast('Nothing left to reserve', { tone: 'info' })
    open.forEach((l) => updateLine(board.id, l.id, { holdUntil: now + 24 * HOUR }))
    haptic('success')
    popup.toast(`${open.length} item${open.length === 1 ? '' : 's'} reserved for 24 hours`, { tone: 'success' })
  }

  const removeBoard = async () => {
    if (board.lines.some((l) => l.bookingId)) {
      return popup.alert({ title: 'This board has bookings', message: 'Booked items can’t be deleted. Remove the other items instead.', icon: WarningCircleIcon })
    }
    const ok = await popup.confirm({ title: 'Delete board?', message: `“${board.name}” and its ${board.lines.length} items will be removed.`, confirmText: 'Delete', tone: 'danger', icon: TrashIcon })
    if (!ok) return
    nav.pop()
    const undo = deleteBoard(board.id)
    popup.toast('Board deleted', { action: { label: 'Undo', onClick: undo } })
  }

  const askAI = () =>
    aiBoardExists && board.aiBoardId
      ? nav.push(`/customer/ai-studio/boards/${board.aiBoardId}`)
      : nav.push(`/customer/ai-studio/new?project=${project.id}&board=${board.id}`)

  return (
    <Screen
      header={
        <AppBar
          title={board.name}
          subtitle={project.name}
          actions={
            <Menu
              items={[
                { label: 'Edit board', icon: PencilSimpleIcon, onSelect: () => openSheet('edit') },
                { label: 'Reserve all for 24h', icon: LockSimpleIcon, onSelect: reserveAll },
                { label: 'Delete board', icon: TrashIcon, destructive: true, onSelect: removeBoard },
              ]}
            >
              <IconButton icon={DotsThreeVerticalIcon} weight="bold" label="More options" />
            </Menu>
          }
        />
      }
      footer={
        <div className="@medium:mx-auto @medium:max-w-md">
          <Button
            size="lg"
            block
            icon={ShoppingCartIcon}
            disabled={!bookable.length}
            onClick={() => nav.push(`/customer/projects/${project.id}/boards/${board.id}/book`)}
          >
            {bookable.length ? `Book ${bookable.length} item${bookable.length === 1 ? '' : 's'} · ${formatINR(bookCost)}` : board.lines.length ? 'Everything is booked' : 'Add props to book'}
          </Button>
        </div>
      }
    >
      <div className="@medium:mx-auto @medium:max-w-2xl">
        {/* Conflict banner */}
        <AnimatePresence initial={false}>
          {unavailable.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="mx-4 mt-3 overflow-hidden rounded-2xl bg-danger-soft p-3.5"
              role="alert"
            >
              <p className="flex items-start gap-2 text-sm font-semibold text-danger">
                <WarningCircleIcon size={18} weight="fill" className="mt-px shrink-0" />
                <span>
                  {unavailable.length} item{unavailable.length === 1 ? ' is' : 's are'} unavailable on your dates
                  <span className="block text-[13px] font-normal text-fg-2">{unavailable.map((l) => propById(l.propId).name).join(', ')}</span>
                </span>
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="danger" className="flex-1" onClick={() => openSheet('alts')}>
                  See alternatives
                </Button>
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => removeWithUndo(unavailable)}>
                  Remove
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* What this board is for (schedule block) */}
        <Card className="mx-4 mt-3 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-2xs font-bold uppercase tracking-[0.08em] text-muted">What this board is for</p>
            <button type="button" onClick={() => openSheet('edit')} className="-mr-1 -mt-1 rounded-lg px-1.5 py-0.5 text-sm font-semibold text-accent">
              Edit
            </button>
          </div>
          <div className="mt-2 flex gap-3">
            {board.block.date ? (
              <DateBadge iso={board.block.date} className="self-start" />
            ) : (
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <CalendarBlankIcon size={22} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-fg">
                {board.block.date ? dayLabel(project.startDate, board.block.date) : `Whole shoot · ${formatDateRangeShort(project.startDate, project.endDate)}`}
              </p>
              <p className="text-[13px] text-muted">{board.block.time}</p>
              <p className="mt-1 flex items-center gap-1 text-[13px] text-fg-2">
                <MapPinIcon size={14} weight="fill" className="shrink-0 text-muted" />
                <span className="truncate">{loc ? loc.name : 'Location not set'}</span>
              </p>
              {board.block.scene && <p className="mt-1.5 text-sm italic leading-snug text-fg-2">“{board.block.scene}”</p>}
            </div>
          </div>
          {board.aiBoardId && aiBoardExists && (
            <button
              type="button"
              onClick={() => nav.push(`/customer/ai-studio/boards/${board.aiBoardId}`)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-soft-fg"
            >
              <SparkleIcon size={13} weight="fill" /> Made in AI Studio · open scene
            </button>
          )}
        </Card>

        {/* Filter · Group by */}
        {board.lines.length > 0 && (
          <div className="px-4 pt-4">
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {FILTER_ORDER.map((s) => {
                const on = filters.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      haptic()
                      setFilters((f) => (on ? f.filter((x) => x !== s) : [...f, s]))
                    }}
                    className={cn(
                      'pressable inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-semibold transition-colors',
                      on ? 'border-accent/40 bg-accent-soft text-accent-soft-fg' : 'border-line-strong bg-surface text-fg-2',
                    )}
                  >
                    <span className={cn('size-2 rounded-full', TONE_SOLID[STATUS_META[s].tone])} />
                    {STATUS_META[s].label}
                    <span className="tabular-nums text-muted">{counts[s]}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="shrink-0 text-xs font-bold uppercase tracking-[0.07em] text-muted">Group by</span>
              <Segmented<GroupBy>
                className="flex-1 [&_button]:h-8 [&_button]:text-[13px]"
                options={[
                  { value: 'vendor', label: 'Vendor' },
                  { value: 'day', label: 'Shoot day' },
                  { value: 'status', label: 'Status' },
                ]}
                value={groupBy}
                onChange={setGroupBy}
              />
            </div>
          </div>
        )}

        {/* Items */}
        {board.lines.length === 0 ? (
          <EmptyState icon={KanbanIcon} title="No props on this board" description="Add from your saved props, find more in Discover, or ask AI Studio." className="py-10" />
        ) : shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">No items match these filters.</p>
        ) : (
          <div className="space-y-4 pt-4">
            {groups.map((g) => (
              <section key={g.key}>
                <div className="flex items-baseline justify-between gap-3 px-5 pb-2">
                  <p className="flex min-w-0 items-center gap-1.5 truncate text-xs font-bold uppercase tracking-[0.07em] text-muted">
                    {g.title}
                    {g.verified && <SealCheckIcon size={13} weight="fill" className="shrink-0 text-accent" />}
                  </p>
                  <p className="shrink-0 text-xs text-muted">{g.meta}</p>
                </div>
                <Card className="mx-4 overflow-hidden">
                  {g.lines.map((l) => (
                    <LineRow key={l.id} line={l} status={statusOf(l)} now={now} showVendor={groupBy !== 'vendor'} onClick={() => openSheet('item', l.id)} />
                  ))}
                </Card>
              </section>
            ))}
          </div>
        )}

        {/* Add from saved · Add more · Ask AI */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-6 pt-5">
          <AddButton icon={HeartIcon} label="Add from saved" onClick={() => openSheet('saved')} />
          <AddButton icon={MagnifyingGlassIcon} label="Add more" onClick={() => nav.push(resultsPath({ projectId: project.id }))} />
          <AddButton icon={SparkleIcon} label={aiBoardExists ? 'Open AI board' : 'Ask AI'} onClick={askAI} />
        </div>
      </div>

      <ItemOptionsSheet
        open={sheet.kind === 'item'}
        onClose={closeSheet}
        project={project}
        boardId={board.id}
        line={activeLine}
        onAlternatives={(l) => openSheet('alts', l.id)}
        onMove={(l) => openSheet('move', l.id)}
        onRemove={(l) => removeWithUndo([l])}
        onOpenListing={(propId) => nav.push(`/customer/props/${propId}`)}
      />
      <AlternativesSheet
        key={`alts-${sheet.key}`}
        open={sheet.kind === 'alts'}
        onClose={closeSheet}
        lines={altLines}
        onSwap={(l, propId) => {
          const before = propById(l.propId).name
          updateLine(board.id, l.id, { propId, holdUntil: null, paint: null })
          haptic('success')
          popup.toast(`${before} → ${propById(propId).name}`, {
            tone: 'success',
            action: { label: 'Undo', onClick: () => updateLine(board.id, l.id, { propId: l.propId }) },
          })
          if (altLines.length <= 1) closeSheet()
        }}
      />
      <AddFromSavedSheet
        key={`saved-${sheet.key}`}
        open={sheet.kind === 'saved'}
        onClose={closeSheet}
        board={board}
        onBrowse={() => {
          closeSheet()
          nav.push(resultsPath({ projectId: project.id }))
        }}
        onAdd={(ids) => {
          const n = addLines(board.id, ids)
          closeSheet()
          popup.toast(`${n} prop${n === 1 ? '' : 's'} added`, { tone: 'success' })
        }}
      />
      <MoveToBoardSheet
        open={sheet.kind === 'move'}
        onClose={closeSheet}
        boards={projectBoards}
        currentId={board.id}
        onNew={() => openSheet('new', sheet.lineId)}
        onMove={(to) => {
          if (!sheet.lineId) return
          moveLine(board.id, sheet.lineId, to)
          closeSheet()
          popup.toast(`Moved to ${projectBoards.find((b) => b.id === to)?.name}`, { tone: 'success' })
        }}
      />
      <NewBoardSheet
        key={`edit-${sheet.key}`}
        open={sheet.kind === 'edit' || sheet.kind === 'new'}
        onClose={closeSheet}
        project={project}
        board={sheet.kind === 'edit' ? board : undefined}
        onSave={(input) => {
          if (sheet.kind === 'edit') {
            updateBoard(board.id, input)
            popup.toast('Board updated', { tone: 'success' })
          } else if (sheet.lineId) {
            const to = createBoard(project.id, input)
            moveLine(board.id, sheet.lineId, to)
            popup.toast(`Moved to ${input.name}`, { tone: 'success' })
          }
        }}
      />
    </Screen>
  )
}

/* ── Grouping ────────────────────────────────────────────────────────────── */

function groupLines(lines: BoardLine[], by: GroupBy, project: Project, statusOf: (l: BoardLine) => LineStatus) {
  const map = new Map<string, BoardLine[]>()
  const keyOf = (l: BoardLine) => (by === 'vendor' ? propById(l.propId).vendorId : by === 'day' ? l.from : statusOf(l))
  for (const l of lines) map.set(keyOf(l), [...(map.get(keyOf(l)) ?? []), l])
  let keys = [...map.keys()]
  if (by === 'day') keys.sort()
  if (by === 'status') keys = STATUS_ORDER.filter((s) => map.has(s))
  return keys.map((key) => {
    const group = map.get(key)!
    const cost = group.reduce((n, l) => n + lineCost(l), 0)
    if (by === 'vendor') {
      const v = vendorById(key)
      return { key, title: v.name, verified: v.verified, meta: `${v.city === HOME_CITY ? v.area : v.city} · ${formatINR(cost)}`, lines: group }
    }
    if (by === 'day') {
      const inShoot = key >= project.startDate && key <= project.endDate
      return { key, title: inShoot ? dayLabel(project.startDate, key) : formatDayShort(key), verified: false, meta: formatINR(cost), lines: group }
    }
    return { key, title: STATUS_META[key as LineStatus].label, verified: false, meta: formatINR(cost), lines: group }
  })
}

/* ── Rows ────────────────────────────────────────────────────────────────── */

function LineRow({ line, status, now, showVendor, onClick }: { line: BoardLine; status: LineStatus; now: number; showVendor: boolean; onClick: () => void }) {
  const prop = propById(line.propId)
  return (
    <button type="button" onClick={onClick} className="group relative flex w-full items-center gap-3 px-3 py-3 text-left transition-colors active:bg-surface-2">
      <PropThumb item={prop} iconSize={20} className="size-14 shrink-0 rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-fg">{prop.name}</span>
        <span className="block truncate text-[13px] text-muted">
          {line.qty > 1 && `${line.qty} × `}
          {formatDateRangeShort(line.from, line.to)}
          {showVendor && ` · ${vendorById(prop.vendorId).name}`}
        </span>
        <span className="mt-1 flex items-center gap-1.5">
          <Tag tone={STATUS_META[status].tone} dot>
            {STATUS_META[status].label}
            {status === 'reserved' && line.holdUntil ? ` · ${holdLeft(line.holdUntil, now)}` : ''}
          </Tag>
          {line.vendorNote && <NoteIcon size={14} className="text-muted" aria-label="Has a note for the vendor" />}
          {line.paint && <PaintBrushIcon size={14} className="text-muted" aria-label={`Paint request: ${line.paint.colour}`} />}
        </span>
      </span>
      <span className="shrink-0 text-sm font-bold tabular-nums text-fg">{formatINR(lineCost(line))}</span>
      <span aria-hidden className="absolute bottom-0 left-[80px] right-0 h-px bg-line group-last:hidden" />
    </button>
  )
}

function AddButton({ icon: AIcon, label, onClick }: { icon: typeof HeartIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable flex flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-line-strong px-2 py-3 text-center text-[13px] font-semibold text-fg-2 transition-colors hover:border-accent/50"
    >
      <AIcon size={20} weight="duotone" className="text-accent" />
      {label}
    </button>
  )
}
