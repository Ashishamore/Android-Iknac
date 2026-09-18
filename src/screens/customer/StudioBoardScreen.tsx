import {
  ArrowsClockwiseIcon,
  ArrowsLeftRightIcon,
  ClockCounterClockwiseIcon,
  DotsThreeVerticalIcon,
  EnvelopeSimpleIcon,
  FolderSimpleIcon,
  InfoIcon,
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  PaperPlaneRightIcon,
  PencilSimpleIcon,
  PlusIcon,
  ShareNetworkIcon,
  SparkleIcon,
  TrashIcon,
  WhatsappLogoIcon,
  type Icon,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { BoardSheet } from '@/components/discover/BoardSheet'
import { PropThumb } from '@/components/PropCard'
import { CreditsSheet } from '@/components/studio/CreditsSheet'
import { HistorySheet } from '@/components/studio/HistorySheet'
import { SceneCanvas } from '@/components/studio/SceneCanvas'
import { SwapSheet } from '@/components/studio/SwapSheet'
import { CATEGORY_ICON, propById, vendorById, type RentalProp } from '@/data/props'
import { VERSION_META, type VersionId } from '@/data/studio'
import { cn } from '@/lib/cn'
import { formatDateRangeShort, timeAgo } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { EASE_OUT } from '@/lib/motion'
import { SCOPE_SHORT, distanceLabel, isFreeOn, resultsPath } from '@/lib/search'
import { buildVersions, candidatesFor, sceneItems, versionCost, type Slot } from '@/lib/studio'
import { nav, useBackHandler, useParams } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { Menu } from '@/overlays/Menu'
import { usePopup } from '@/overlays/popupContext'
import { useProjectOps } from '@/store/projectOps'
import { activeProjects, useProject, useProjects } from '@/store/projects'
import { useTrackBoard } from '@/store/recent'
import { useDisplayName } from '@/store/session'
import { useBoard, useStudio, type Board } from '@/store/studio'
import { AppBar, Avatar, Button, Card, EmptyState, IconButton, OptionList, ProgressBar, Screen, SectionHeader, Segmented, Spinner, TextField } from '@/ui'

export default function StudioBoardScreen() {
  const { id } = useParams<{ id: string }>()
  const board = useBoard(id)
  if (!board) {
    return (
      <Screen header={<AppBar title="Board" />}>
        <EmptyState
          icon={SparkleIcon}
          title="Board not found"
          description="It may have been deleted."
          action={<Button onClick={() => nav.pop()}>Go back</Button>}
        />
      </Screen>
    )
  }
  return <BoardView board={board} />
}

type SheetKind = 'swap' | 'history' | 'credits' | 'rename' | 'move' | 'add'
const noop = () => {}

function BoardView({ board }: { board: Board }) {
  const popup = usePopup()
  useTrackBoard('ai', board.id)
  const myName = useDisplayName()
  const credits = useStudio((s) => s.credits)
  const updateBoard = useStudio((s) => s.updateBoard)
  const setItem = useStudio((s) => s.setItem)
  const spend = useStudio((s) => s.spend)
  const deleteBoard = useStudio((s) => s.deleteBoard)
  const project = useProject(board.limits.projectId ?? undefined)
  const ensureAiBoard = useProjectOps((s) => s.ensureAiBoard)
  const addLines = useProjectOps((s) => s.addLines)
  const linkAiBoard = useProjectOps((s) => s.updateBoard)

  const [activeSlot, setActiveSlot] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ kind: SheetKind | null; slotId: string | null; key: number }>({ kind: null, slotId: null, key: 0 })
  const [rebuilding, setRebuilding] = useState(false)
  useBackHandler(rebuilding, noop)

  const version = board.versions.find((v) => v.id === board.active) ?? board.versions[0]
  const items = useMemo(() => sceneItems(board.slots, version), [board.slots, version])
  const cost = versionCost(version, board.limits)
  const propIn = (slotId: string) => version.items.find((it) => it.slotId === slotId)?.propId ?? null
  const versionA = board.versions.find((v) => v.id === 'A')
  const sameAsA =
    version.id !== 'A' &&
    !!versionA &&
    version.items.every((it) => it.propId === versionA.items.find((x) => x.slotId === it.slotId)?.propId)
  /** Latest state (undo callbacks run later). */
  const latest = () => useStudio.getState().boards.find((b) => b.id === board.id)

  const openSheet = (kind: SheetKind, slotId: string | null = null) => setSheet((s) => ({ kind, slotId, key: s.key + 1 }))
  const closeSheet = () => setSheet((s) => ({ ...s, kind: null }))

  /** Toast with Undo that puts versions and history back exactly as they were. */
  const undoable = (message: string, before: Board) =>
    popup.toast(message, {
      action: { label: 'Undo', onClick: () => updateBoard(before.id, { versions: before.versions, history: before.history }) },
    })

  const swapTo = (slot: Slot, propId: string) => {
    const before = latest()
    const prop = propById(propId)
    if (!before) return
    setItem(board.id, version.id, slot.id, propId, { kind: 'swap', label: `Swapped ${slot.name} for ${prop.name} (${version.id})` })
    closeSheet()
    haptic('success')
    undoable(`Swapped to ${prop.name}`, before)
  }

  const remove = (slot: Slot, prop: RentalProp) => {
    const before = latest()
    if (!before) return
    setItem(board.id, version.id, slot.id, null, { kind: 'remove', label: `Removed ${prop.name} from ${version.id}` })
    setActiveSlot(null)
    undoable(`${prop.name} removed`, before)
  }

  const sourceIt = (slot: Slot) => {
    const b = latest()
    if (!b) return
    const top = candidatesFor({ ...slot, haveIt: false }, b.limits)[0]?.prop.id ?? null
    updateBoard(
      b.id,
      {
        slots: b.slots.map((s) => (s.id === slot.id ? { ...s, haveIt: false } : s)),
        versions: b.versions.map((v) => ({ ...v, items: v.items.map((it) => (it.slotId === slot.id ? { ...it, propId: top } : it)) })),
      },
      { kind: 'swap', label: `Sourcing ${slot.name}` },
    )
  }

  const rebuild = async () => {
    if (credits < 1) return openSheet('credits')
    const ok = await popup.confirm({
      title: 'Rebuild this board?',
      message: `We’ll pick fresh props for versions A, B and C. Uses 1 credit (you have ${credits}).`,
      confirmText: 'Rebuild',
      icon: ArrowsClockwiseIcon,
    })
    if (!ok) return
    if (!spend(`Rebuilt “${board.name}”`)) return openSheet('credits')
    setRebuilding(true)
    await sleep(1800)
    const b = latest()
    if (b) {
      const seed = b.seed + 1
      updateBoard(b.id, { versions: buildVersions(b.slots, b.limits, seed), seed }, { kind: 'rebuild', label: 'Rebuilt versions A, B and C' })
    }
    setRebuilding(false)
    setActiveSlot(null)
    popup.toast(`Board rebuilt · ${useStudio.getState().credits} credits left`, { tone: 'success' })
  }

  const addAll = () => {
    const ids = version.items.map((it) => it.propId).filter((x): x is string => !!x)
    if (!ids.length) return popup.toast('No props in this version yet', { tone: 'info' })
    if (!project) return openSheet('add')
    // The board that asked for this ("Ask AI"), else a project board of the same name (created the first time).
    const asked = useProjectOps.getState().boards.find((b) => b.id === board.projectBoardId && b.projectId === project.id)
    if (asked && !asked.aiBoardId) linkAiBoard(asked.id, { aiBoardId: board.id })
    const boardId = asked?.id ?? ensureAiBoard(project.id, { id: board.id, name: board.name, date: board.limits.from })
    const added = addLines(boardId, ids)
    haptic('success')
    if (added) updateBoard(board.id, {}, { kind: 'project', label: `Added ${added} props to ${project.name}` })
    popup.toast(added ? `${added} prop${added === 1 ? '' : 's'} added to ${project.name}` : `Already on ${project.name}`, {
      tone: added ? 'success' : 'default',
      action: { label: 'View', onClick: () => nav.push(`/customer/projects/${project.id}/boards/${boardId}`) },
    })
  }

  const share = async () => {
    const url = `${window.location.origin}/customer/ai-studio/boards/${board.id}`
    const message = `${board.name}: prop board, ${cost.count} items, ${formatINR(cost.total)}. ${url}`
    const choice = await popup.actionSheet({
      title: 'Share board',
      description: board.name,
      options: [
        { id: 'link', label: 'Copy link', icon: LinkSimpleIcon },
        { id: 'whatsapp', label: 'WhatsApp', icon: WhatsappLogoIcon },
        { id: 'email', label: 'Email', icon: EnvelopeSimpleIcon },
      ],
    })
    if (choice === 'link') {
      try {
        await navigator.clipboard.writeText(url)
        popup.toast('Link copied', { tone: 'success' })
      } catch {
        popup.toast(url)
      }
    } else if (choice === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
    } else if (choice === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(board.name)}&body=${encodeURIComponent(message)}`
    }
  }

  const removeBoard = async () => {
    const ok = await popup.confirm({
      title: 'Delete board?',
      message: `“${board.name}” and its versions will be removed.`,
      confirmText: 'Delete',
      tone: 'danger',
      icon: TrashIcon,
    })
    if (!ok) return
    nav.pop()
    await sleep(380)
    const undo = deleteBoard(board.id)
    popup.toast('Board deleted', { action: { label: 'Undo', onClick: undo } })
  }

  const swapSlot = board.slots.find((s) => s.id === sheet.slotId) ?? null
  const meta = [
    project?.name,
    board.limits.from && board.limits.to ? formatDateRangeShort(board.limits.from, board.limits.to) : 'Any dates',
    board.limits.era ?? 'Any era',
    SCOPE_SHORT[board.limits.scope],
  ].filter(Boolean)

  return (
    <>
      <Screen
        header={
          <AppBar
            title={board.name}
            subtitle={project?.name ?? 'No project'}
            actions={
              <>
                <IconButton icon={ShareNetworkIcon} label="Share" onClick={share} />
                <Menu
                  items={[
                    { label: 'Version history', icon: ClockCounterClockwiseIcon, onSelect: () => openSheet('history') },
                    { label: 'Rename board', icon: PencilSimpleIcon, onSelect: () => openSheet('rename') },
                    { label: 'Move to project', icon: FolderSimpleIcon, onSelect: () => openSheet('move') },
                    { label: 'Delete board', icon: TrashIcon, destructive: true, onSelect: removeBoard },
                  ]}
                >
                  <IconButton icon={DotsThreeVerticalIcon} weight="bold" label="More options" />
                </Menu>
              </>
            }
          />
        }
        footer={
          <div className="flex gap-3 @medium:mx-auto @medium:max-w-2xl">
            <Button size="lg" variant="secondary" icon={ArrowsClockwiseIcon} className="flex-1 px-4" onClick={rebuild}>
              Rebuild
            </Button>
            <Button size="lg" className="flex-[1.5] whitespace-nowrap px-4" onClick={addAll}>
              Add all to project
            </Button>
          </div>
        }
      >
        <div className="@medium:mx-auto @medium:max-w-2xl">
          {/* Scene image with item markers */}
          <div className="px-4 pt-3">
            <SceneCanvas
              items={items}
              era={board.limits.era}
              photo={board.photo}
              activeSlot={activeSlot}
              onSelect={setActiveSlot}
              onSwap={(slotId) => openSheet('swap', slotId)}
            />
            <p className="mt-2 text-center text-xs text-subtle">Tap a numbered marker to see the item</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 px-4">
            {meta.map((m) => (
              <span key={m} className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-fg-2 shadow-card">
                {m}
              </span>
            ))}
          </div>
          {board.prompt && <p className="mt-2.5 line-clamp-2 px-4 text-[13px] leading-snug text-muted">“{board.prompt}”</p>}

          {/* Version A/B/C · Budget bar */}
          <div className="px-4 pt-5">
            <Segmented
              options={(['A', 'B', 'C'] as VersionId[]).map((v) => ({ value: v, label: `${v} · ${VERSION_META[v].label}` }))}
              value={board.active}
              onChange={(active) => {
                setActiveSlot(null)
                updateBoard(board.id, { active })
              }}
              className="[&_button]:text-[13px]"
            />
            <BudgetBar spent={cost.total} budget={board.limits.budget} perDay={cost.perDay} days={cost.days} blurb={VERSION_META[board.active].blurb} />
            {sameAsA && (
              <p className="mt-2.5 flex items-start gap-1.5 px-1 text-[13px] leading-snug text-muted">
                <InfoIcon size={16} className="mt-px shrink-0" />
                {version.id === 'B'
                  ? 'Same picks as A: they’re already the lowest cost that fits.'
                  : 'Same picks as A: nothing pricier fits your limits. Widen the distance or era for more options.'}
              </p>
            )}
          </div>

          {/* Items used */}
          <SectionHeader
            title="Items used"
            subtitle={`${cost.count} to hire · ${board.slots.filter((s) => s.haveIt).length} already in hand`}
            className="pt-6"
          />
          <ul className="space-y-2.5 px-4">
            {board.slots.map((slot, i) => (
              <ItemRow
                key={slot.id}
                n={i + 1}
                slot={slot}
                prop={propIn(slot.id) ? propById(propIn(slot.id)!) : null}
                limits={board.limits}
                active={activeSlot === slot.id}
                onSelect={() => setActiveSlot(activeSlot === slot.id ? null : slot.id)}
                onSwap={() => openSheet('swap', slot.id)}
                onSimilar={(prop) =>
                  nav.push(resultsPath({ similarTo: prop.id, scope: board.limits.scope, projectId: board.limits.projectId }))
                }
                onRemove={(prop) => remove(slot, prop)}
                onSourceIt={() => sourceIt(slot)}
              />
            ))}
          </ul>

          <Comments board={board} myName={myName} />
          <div className="h-6" />
        </div>

        <SwapSheet
          key={`swap-${sheet.key}`}
          open={sheet.kind === 'swap'}
          onClose={closeSheet}
          slot={swapSlot}
          currentId={swapSlot ? propIn(swapSlot.id) : null}
          limits={board.limits}
          onPick={(propId) => swapSlot && swapTo(swapSlot, propId)}
          onBrowse={() => {
            closeSheet()
            if (swapSlot)
              nav.push(
                resultsPath({
                  categories: [swapSlot.category],
                  eras: board.limits.era ? [board.limits.era] : [],
                  scope: board.limits.scope,
                  projectId: board.limits.projectId,
                }),
              )
          }}
        />
        <HistorySheet
          open={sheet.kind === 'history'}
          onClose={closeSheet}
          history={board.history}
          onRestore={(entry) => {
            updateBoard(board.id, { versions: entry.versions }, { kind: 'restore', label: `Restored: ${entry.label}` })
            closeSheet()
            setActiveSlot(null)
            popup.toast('Earlier version restored', { tone: 'success' })
          }}
        />
        <RenameSheet
          key={`rename-${sheet.key}`}
          open={sheet.kind === 'rename'}
          onClose={closeSheet}
          name={board.name}
          onSave={(name) => {
            updateBoard(board.id, { name })
            closeSheet()
            popup.toast('Board renamed', { tone: 'success' })
          }}
        />
        <MoveSheet
          open={sheet.kind === 'move'}
          onClose={closeSheet}
          current={project ? project.id : null}
          onSelect={(projectId, name, dates) => {
            updateBoard(
              board.id,
              { limits: { ...board.limits, projectId, ...(dates ?? {}) } },
              { kind: 'project', label: projectId ? `Moved to ${name}` : 'Removed from project' },
            )
            closeSheet()
            popup.toast(projectId ? `Moved to ${name}` : 'Removed from project', { tone: 'success' })
          }}
        />
        <BoardSheet
          open={sheet.kind === 'add'}
          onClose={closeSheet}
          propIds={version.items.map((it) => it.propId).filter((x): x is string => !!x)}
          title="Add all to project"
          description={`Put ${cost.count} props from version ${version.id} on a project board`}
          onAdded={(projectId) => {
            const p = useProjects.getState().projects.find((x) => x.id === projectId)
            if (p)
              updateBoard(
                board.id,
                { limits: { ...board.limits, projectId, from: p.startDate, to: p.endDate } },
                { kind: 'project', label: `Added to ${p.name}` },
              )
          }}
        />
        <CreditsSheet
          open={sheet.kind === 'credits'}
          onClose={closeSheet}
          reason={credits < 1 ? 'You’re out of credits. Top up to rebuild this board.' : undefined}
        />
      </Screen>
      <AnimatePresence>
        {rebuilding && (
          <motion.div
            className="absolute inset-0 z-50 grid place-items-center bg-surface/85 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
          >
            <div className="flex flex-col items-center gap-3">
              <Spinner className="size-9 text-accent" />
              <p className="font-display text-base font-bold text-fg">Rebuilding your board…</p>
              <p className="text-sm text-muted">Picking fresh props for A, B and C</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ── Budget bar ──────────────────────────────────────────────────────────── */

function BudgetBar({ spent, budget, perDay, days, blurb }: { spent: number; budget: number; perDay: number; days: number; blurb: string }) {
  const ratio = budget ? spent / budget : 0
  const tone = ratio > 1 ? 'danger' : ratio > 0.85 ? 'warning' : 'success'
  return (
    <Card className="mt-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">Budget</p>
        <p className={cn('text-[13px] font-semibold', ratio > 1 ? 'text-danger' : ratio > 0.85 ? 'text-warning' : 'text-success')}>
          {ratio > 1 ? `${formatINR(spent - budget)} over` : `${formatINR(budget - spent)} left`}
        </p>
      </div>
      <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-fg">
        {formatINR(spent)} <span className="text-sm font-semibold text-muted">of {formatINR(budget)}</span>
      </p>
      <ProgressBar value={ratio * 100} tone={tone} className="mt-3 h-2" />
      <p className="mt-2 text-xs text-muted">
        {formatINR(perDay)}/day × {days} day{days === 1 ? '' : 's'} · {blurb}
      </p>
    </Card>
  )
}

/* ── Items used → Swap · Show similar · Remove ───────────────────────────── */

function SmallButton({ icon: BIcon, children, onClick }: { icon: Icon; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="pressable inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface-2 px-3 text-[13px] font-semibold text-fg-2 hover:bg-surface-3"
    >
      <BIcon size={15} weight="bold" />
      {children}
    </button>
  )
}

function ItemRow({
  n,
  slot,
  prop,
  limits,
  active,
  onSelect,
  onSwap,
  onSimilar,
  onRemove,
  onSourceIt,
}: {
  n: number
  slot: Slot
  prop: RentalProp | null
  limits: Board['limits']
  active: boolean
  onSelect: () => void
  onSwap: () => void
  onSimilar: (prop: RentalProp) => void
  onRemove: (prop: RentalProp) => void
  onSourceIt: () => void
}) {
  const CIcon = CATEGORY_ICON[slot.category]
  const free = prop && limits.from && limits.to ? isFreeOn(prop, limits.from, limits.to) : null
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT, delay: Math.min(n, 8) * 0.03 }}
      onClick={onSelect}
      className={cn('cursor-pointer rounded-2xl bg-surface p-3 shadow-card transition-shadow', active && 'ring-2 ring-accent')}
    >
      <div className="flex gap-3">
        <span className="relative shrink-0">
          {prop ? (
            <PropThumb item={prop} iconSize={24} className="size-16 rounded-xl" />
          ) : (
            <span className="grid size-16 place-items-center rounded-xl border-2 border-dashed border-line-strong text-subtle">
              <CIcon size={24} weight="light" />
            </span>
          )}
          <span
            className={cn(
              'absolute -left-1.5 -top-1.5 grid size-6 place-items-center rounded-full text-[11px] font-bold ring-2 ring-surface',
              active ? 'bg-accent text-accent-fg' : 'bg-fg text-bg',
            )}
          >
            {n}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xs font-bold uppercase tracking-[0.06em] text-accent">
            {slot.name}
            {slot.periodCorrect && <span className="text-muted"> · Period-correct</span>}
          </p>
          {prop ? (
            <>
              <p className="mt-0.5 truncate text-[15px] font-semibold text-fg">{prop.name}</p>
              <p className="truncate text-xs text-muted">
                {vendorById(prop.vendorId).name} · {distanceLabel(prop)}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm">
                <span>
                  <b className="font-bold tabular-nums text-fg">{formatINR(prop.pricePerDay)}</b>
                  <span className="text-muted">/day</span>
                </span>
                {free !== null && (
                  <span className={cn('text-xs font-medium', free ? 'text-success' : 'text-warning')}>
                    ● {free ? 'Free' : 'Booked on your dates'}
                  </span>
                )}
              </p>
            </>
          ) : slot.haveIt ? (
            <>
              <p className="mt-0.5 text-[15px] font-semibold text-fg-2">We already have this</p>
              <p className="text-xs text-muted">Not sourced · no cost</p>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-[15px] font-semibold text-fg-2">Nothing in this version</p>
              <p className="text-xs text-muted">Removed, or nothing fits your limits</p>
            </>
          )}
          {slot.note && <p className="mt-1 text-xs italic text-muted">Note: {slot.note}</p>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {slot.haveIt ? (
          <SmallButton icon={MagnifyingGlassIcon} onClick={onSourceIt}>
            Source it instead
          </SmallButton>
        ) : prop ? (
          <>
            <SmallButton icon={ArrowsLeftRightIcon} onClick={onSwap}>
              Swap
            </SmallButton>
            <SmallButton icon={MagnifyingGlassIcon} onClick={() => onSimilar(prop)}>
              Show similar
            </SmallButton>
            <IconButton
              icon={TrashIcon}
              label={`Remove ${prop.name}`}
              size="sm"
              className="ml-auto text-muted"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(prop)
              }}
            />
          </>
        ) : (
          <SmallButton icon={PlusIcon} onClick={onSwap}>
            Pick a prop
          </SmallButton>
        )}
      </div>
    </motion.li>
  )
}

/* ── Comments ────────────────────────────────────────────────────────────── */

function Comments({ board, myName }: { board: Board; myName: string }) {
  const addComment = useStudio((s) => s.addComment)
  const [draft, setDraft] = useState('')

  const send = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    addComment(board.id, text, myName)
    setDraft('')
    haptic()
  }

  return (
    <section>
      <SectionHeader
        title="Comments"
        subtitle={board.comments.length ? `${board.comments.length} from your team` : 'Share the board to get feedback'}
        className="pt-7"
      />
      <Card className="mx-4 overflow-hidden">
        <AnimatePresence initial={false}>
          {board.comments.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="flex gap-3 border-b border-line px-4 py-3"
            >
              <Avatar name={c.author} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px]">
                  <b className="font-semibold text-fg">{c.mine ? 'You' : c.author}</b>
                  <span className="text-muted">
                    {' '}
                    · {c.role} · {timeAgo(c.at)}
                  </span>
                </p>
                <p className="mt-0.5 text-sm leading-snug text-fg-2">{c.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <form onSubmit={send} className="flex items-center gap-2 py-2 pl-4 pr-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment…"
            aria-label="Add a comment"
            maxLength={280}
            enterKeyHint="send"
            className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-subtle"
          />
          <IconButton type="submit" icon={PaperPlaneRightIcon} weight="fill" label="Send comment" size="sm" variant="solid" disabled={!draft.trim()} className="disabled:opacity-40" />
        </form>
      </Card>
    </section>
  )
}

/* ── Rename · Move to project ────────────────────────────────────────────── */

function RenameSheet({ open, onClose, name, onSave }: { open: boolean; onClose: () => void; name: string; onSave: (name: string) => void }) {
  const [value, setValue] = useState(name)
  const [error, setError] = useState<string>()
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Rename board"
      footer={
        <Button
          size="lg"
          block
          onClick={() => (value.trim().length < 2 ? setError('Give the board a name') : onSave(value.trim()))}
        >
          Save
        </Button>
      }
    >
      <TextField
        label="Board name"
        value={value}
        maxLength={48}
        autoComplete="off"
        error={error}
        onChange={(e) => {
          setValue(e.target.value)
          setError(undefined)
        }}
      />
    </BottomSheet>
  )
}

function MoveSheet({
  open,
  onClose,
  current,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  current: string | null
  onSelect: (projectId: string | null, name: string, dates?: { from: string; to: string }) => void
}) {
  const projects = activeProjects(useProjects((s) => s.projects))
  const options = [
    ...projects.map((p) => ({ value: p.id, label: p.name, description: formatDateRangeShort(p.startDate, p.endDate), icon: FolderSimpleIcon })),
    { value: 'none', label: 'No project', description: 'Keep it in My boards only' },
  ]
  return (
    <BottomSheet open={open} onClose={onClose} title="Move to project" description="Boards are filed and filtered by project">
      <OptionList
        options={options}
        value={current ?? 'none'}
        onSelect={(v) => {
          const p = projects.find((x) => x.id === v)
          onSelect(p ? p.id : null, p?.name ?? '', p ? { from: p.startDate, to: p.endDate } : undefined)
        }}
      />
    </BottomSheet>
  )
}
