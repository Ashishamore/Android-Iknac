import {
  ArrowsClockwiseIcon,
  CalendarBlankIcon,
  CameraIcon,
  CheckIcon,
  DotsThreeVerticalIcon,
  ImageSquareIcon,
  MapPinIcon,
  NotePencilIcon,
  PencilSimpleIcon,
  PlusIcon,
  ScrollIcon,
  SparkleIcon,
  TextAaIcon,
  TrashIcon,
  WalletIcon,
  type Icon,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState, type ReactNode } from 'react'
import { CreditsPill, CreditsSheet } from '@/components/studio/CreditsSheet'
import { SlotSheet } from '@/components/studio/SlotSheet'
import { usePhotoPicker } from '@/components/usePhotoPicker'
import { ERAS } from '@/data/props'
import { SAMPLE_SCRIPT, SCENE_EXAMPLES, STUDIO_SAMPLE_PHOTO } from '@/data/studio'
import { cn } from '@/lib/cn'
import { addDays, formatDateRangeShort, todayISO } from '@/lib/dates'
import { amountInWords, formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { downscaleImage } from '@/lib/image'
import { EASE_OUT } from '@/lib/motion'
import { SCOPE_HINT, SCOPE_LABEL, SCOPE_SHORT, SCOPES } from '@/lib/search'
import {
  boardName,
  categoryIcon,
  detectEra,
  limitDays,
  suggestSlots,
  type Limits,
  type SceneSource,
  type Slot,
} from '@/lib/studio'
import { nav, useBackHandler, useQuery } from '@/navigation'
import { Menu } from '@/overlays/Menu'
import { usePopup } from '@/overlays/popupContext'
import { activeProjects, useProjects } from '@/store/projects'
import { useStudio } from '@/store/studio'
import { AppBar, Button, Chip, DateField, FadeSwitch, FieldMessage, IconButton, IconTile, Screen, Segmented, Skeleton, TextArea, TextField } from '@/ui'

type Step = 1 | 2 | 3
const STEP_TITLE: Record<Step, string> = { 1: 'Tell us the scene', 2: 'Set the limits', 3: 'What the scene needs' }

const SOURCES: { value: SceneSource; icon: Icon; label: string }[] = [
  { value: 'describe', icon: TextAaIcon, label: 'Describe it' },
  { value: 'photo', icon: ImageSquareIcon, label: 'Reference photo' },
  { value: 'script', icon: ScrollIcon, label: 'Script page' },
]

const BUDGETS = [
  { value: 25000, label: '₹25k' },
  { value: 50000, label: '₹50k' },
  { value: 100000, label: '₹1 lakh' },
  { value: 200000, label: '₹2 lakh' },
]

const parseSource = (m: string | null): SceneSource => (m === 'photo' || m === 'script' ? m : 'describe')
const noop = () => {}

/** New AI board: scene → limits → slots → generate (1 credit). */
export default function StudioBuilderScreen() {
  const query = useQuery()
  const popup = usePopup()
  const projects = useProjects((s) => s.projects)
  const upcoming = useMemo(() => activeProjects(projects), [projects])
  const credits = useStudio((s) => s.credits)
  const spend = useStudio((s) => s.spend)
  const createBoard = useStudio((s) => s.createBoard)

  const [step, setStep] = useState<Step>(1)
  const [dir, setDir] = useState(1)
  // 1 · Tell us the scene
  const [source, setSource] = useState<SceneSource>(() => parseSource(query.get('mode')))
  // Home's "Describe the scene" can hand over a brief.
  const [text, setText] = useState(() => query.get('brief') ?? '')
  const [script, setScript] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoNote, setPhotoNote] = useState('')
  const [sceneError, setSceneError] = useState<string>()
  // 2 · Set the limits
  const [limits, setLimits] = useState<Limits>(() => {
    const p = projects.find((x) => x.id === query.get('project')) ?? upcoming[0]
    return { projectId: p?.id ?? null, from: p?.startDate ?? null, to: p?.endDate ?? null, era: null, budget: 50000, scope: 'city' }
  })
  const [eraTouched, setEraTouched] = useState(false)
  // 3 · What the scene needs
  const [slots, setSlots] = useState<Slot[]>([])
  const [analysedFor, setAnalysedFor] = useState<string | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [slotSheet, setSlotSheet] = useState<{ key: number; open: boolean; slot: Slot | null; focus: 'name' | 'note' }>({
    key: 0,
    open: false,
    slot: null,
    focus: 'name',
  })
  const [creditsOpen, setCreditsOpen] = useState(false)

  const brief = source === 'describe' ? text : source === 'script' ? script : photoNote
  const dirty = !!(text.trim() || script.trim() || photo)

  const go = (to: Step) => {
    setDir(to > step ? 1 : -1)
    setStep(to)
  }
  // Android back steps back through the wizard (one handler per step, so each registers afresh).
  useBackHandler(step === 2 && !generating, () => go(1))
  useBackHandler(step === 3 && !generating, () => go(2))
  useBackHandler(generating, noop)

  const photoPicker = usePhotoPicker({
    title: 'Reference photo',
    description: 'Show us the look you’re after',
    sample: STUDIO_SAMPLE_PHOTO,
    onPick: async ({ url, file }) => {
      setSceneError(undefined)
      if (!file) return setPhoto(url)
      try {
        setPhoto(await downscaleImage(file))
      } catch {
        popup.toast('Couldn’t read that photo. Try another one.', { tone: 'error' })
      } finally {
        URL.revokeObjectURL(url)
      }
    },
  })
  const scanPicker = usePhotoPicker({
    title: 'Scan a script page',
    description: 'We’ll read the text from a photo of the page',
    sample: { url: '', label: 'A page from a sample script' },
    onPick: async ({ url, file }) => {
      if (file) URL.revokeObjectURL(url)
      const hide = popup.loading('Reading the page…')
      await sleep(1500)
      hide()
      setScript(SAMPLE_SCRIPT)
      setSceneError(undefined)
      popup.toast('Text read from the page', { tone: 'success' })
    },
  })

  const close = async () => {
    if (dirty && !(await popup.confirm({ title: 'Discard this board?', message: 'Your scene and limits won’t be saved.', confirmText: 'Discard', tone: 'danger' })))
      return
    nav.pop()
  }

  const analyse = () => {
    const key = `${source}|${brief}|${photo}`
    if (key === analysedFor && slots.length) return
    setAnalysing(true)
    setTimeout(() => {
      setSlots(suggestSlots(source, brief, photo))
      setAnalysedFor(key)
      setAnalysing(false)
    }, 1400)
  }

  const next = () => {
    if (step === 1) {
      const error =
        source === 'describe' && text.trim().length < 12
          ? 'Describe the scene in a few words'
          : source === 'photo' && !photo
            ? 'Add a reference photo'
            : source === 'script' && script.trim().length < 30
              ? 'Paste or scan a script page'
              : undefined
      setSceneError(error)
      if (error) return haptic('warning')
      if (!eraTouched) setLimits((l) => ({ ...l, era: detectEra(brief) }))
      go(2)
    } else if (step === 2) {
      go(3)
      analyse()
    }
  }

  const generate = async () => {
    if (credits < 1) return setCreditsOpen(true)
    if (!slots.some((s) => !s.haveIt)) {
      haptic('warning')
      return popup.toast('Keep at least one slot to source', { tone: 'error' })
    }
    const name = boardName(source, brief)
    if (!spend(`Generated “${name}”`)) return setCreditsOpen(true)
    setGenerating(true)
    await sleep(2800)
    const id = createBoard({
      name,
      source,
      prompt: brief.trim(),
      photo: source === 'photo' ? photo : null,
      limits,
      slots,
      projectBoardId: query.get('board'),
    })
    nav.replace(`/customer/ai-studio/boards/${id}`)
    popup.toast(`Board ready · ${useStudio.getState().credits} credits left`, { tone: 'success' })
  }

  const updateSlot = (id: string, patch: Partial<Slot>) => setSlots((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const removeSlot = (slot: Slot) => {
    const index = slots.findIndex((s) => s.id === slot.id)
    setSlots((list) => list.filter((s) => s.id !== slot.id))
    popup.toast(`${slot.name} removed`, {
      action: {
        label: 'Undo',
        onClick: () =>
          setSlots((list) => {
            const copy = [...list]
            copy.splice(index, 0, slot)
            return copy
          }),
      },
    })
  }
  const openSlot = (slot: Slot | null, focus: 'name' | 'note' = 'name') =>
    setSlotSheet((s) => ({ key: s.key + 1, open: true, slot, focus }))

  const footer =
    step === 1 ? (
      <Button size="lg" block onClick={next}>
        Continue
      </Button>
    ) : (
      <div className="flex gap-3">
        <Button size="lg" variant="secondary" onClick={() => go((step - 1) as Step)}>
          Back
        </Button>
        {step === 2 ? (
          <Button size="lg" className="flex-1" onClick={next}>
            Continue
          </Button>
        ) : credits < 1 ? (
          <Button size="lg" className="flex-1" icon={SparkleIcon} onClick={() => setCreditsOpen(true)}>
            Top up to generate
          </Button>
        ) : (
          <Button size="lg" className="flex-1" icon={SparkleIcon} disabled={analysing} onClick={generate}>
            Generate board · 1 credit
          </Button>
        )}
      </div>
    )

  return (
    <>
      <Screen
        surface
        header={
          <AppBar
            close
            back={close}
            title="New board"
            subtitle={`Step ${step} of 3 · ${STEP_TITLE[step]}`}
            actions={<CreditsPill onClick={() => setCreditsOpen(true)} />}
          >
            <div className="flex gap-1.5 px-4 pb-3" aria-hidden>
              {[1, 2, 3].map((i) => (
                <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <motion.span
                    className="block h-full rounded-full bg-accent"
                    initial={false}
                    animate={{ width: i <= step ? '100%' : '0%' }}
                    transition={{ duration: 0.35, ease: EASE_OUT }}
                  />
                </span>
              ))}
            </div>
          </AppBar>
        }
        footer={footer}
      >
        <FadeSwitch id={String(step)} dir={dir}>
          {step === 1 && (
            <SceneStep
              source={source}
              onSource={(s) => {
                setSource(s)
                setSceneError(undefined)
              }}
              text={text}
              onText={(v) => {
                setText(v)
                setSceneError(undefined)
              }}
              script={script}
              onScript={(v) => {
                setScript(v)
                setSceneError(undefined)
              }}
              photo={photo}
              onPickPhoto={photoPicker.pick}
              onRemovePhoto={() => setPhoto(null)}
              photoNote={photoNote}
              onPhotoNote={setPhotoNote}
              onScan={scanPicker.pick}
              error={sceneError}
            />
          )}
          {step === 2 && (
            <LimitsStep
              limits={limits}
              onChange={(patch) => setLimits((l) => ({ ...l, ...patch }))}
              onEra={(era) => {
                setEraTouched(true)
                setLimits((l) => ({ ...l, era }))
              }}
              detected={detectEra(brief)}
            />
          )}
          {step === 3 && (
            <SlotsStep
              analysing={analysing}
              source={source}
              brief={brief}
              photo={photo}
              limits={limits}
              slots={slots}
              onEditScene={() => go(1)}
              onEditLimits={() => go(2)}
              onToggle={updateSlot}
              onEdit={openSlot}
              onRemove={removeSlot}
              onAdd={() => openSlot(null)}
              onReanalyse={() => {
                setAnalysedFor(null)
                setAnalysing(true)
                setTimeout(() => {
                  setSlots(suggestSlots(source, brief, photo))
                  setAnalysedFor(`${source}|${brief}|${photo}`)
                  setAnalysing(false)
                }, 1200)
              }}
            />
          )}
        </FadeSwitch>

        {photoPicker.element}
        {scanPicker.element}
        <SlotSheet
          key={slotSheet.key}
          open={slotSheet.open}
          initial={slotSheet.slot}
          focus={slotSheet.focus}
          onClose={() => setSlotSheet((s) => ({ ...s, open: false }))}
          onSave={(slot) =>
            setSlots((list) => (list.some((s) => s.id === slot.id) ? list.map((s) => (s.id === slot.id ? slot : s)) : [...list, slot]))
          }
        />
        <CreditsSheet
          open={creditsOpen}
          onClose={() => setCreditsOpen(false)}
          reason={credits < 1 ? 'You’re out of credits. Top up to generate this board.' : undefined}
        />
      </Screen>
      <AnimatePresence>{generating && <Generating />}</AnimatePresence>
    </>
  )
}

/* ── Step 1 · Tell us the scene ──────────────────────────────────────────── */

function SceneStep(props: {
  source: SceneSource
  onSource: (s: SceneSource) => void
  text: string
  onText: (v: string) => void
  script: string
  onScript: (v: string) => void
  photo: string | null
  onPickPhoto: () => void
  onRemovePhoto: () => void
  photoNote: string
  onPhotoNote: (v: string) => void
  onScan: () => void
  error?: string
}) {
  const { source } = props
  return (
    <div className="px-4 pb-6 pt-3 @medium:mx-auto @medium:max-w-xl">
      <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-fg">Tell us the scene</h2>
      <p className="mt-0.5 text-sm text-muted">Describe it, show a reference photo or paste a script page.</p>

      <div role="radiogroup" aria-label="Scene input" className="mt-4 grid grid-cols-3 gap-2">
        {SOURCES.map((s) => {
          const selected = s.value === source
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                haptic()
                props.onSource(s.value)
              }}
              className={cn(
                'pressable flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center transition-colors',
                selected ? 'border-accent bg-accent-soft text-accent-soft-fg' : 'border-line bg-surface text-fg-2',
              )}
            >
              <s.icon size={22} weight={selected ? 'fill' : 'regular'} />
              <span className="text-[13px] font-semibold leading-tight">{s.label}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        {source === 'describe' && (
          <>
            <TextArea
              label="Describe the scene"
              rows={5}
              value={props.text}
              maxLength={600}
              error={props.error}
              hint="Mention the place, time of day, era and any key props"
              onChange={(e) => props.onText(e.target.value)}
            />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.07em] text-muted">Try an example</p>
            <div className="mt-2 flex flex-col gap-2">
              {SCENE_EXAMPLES.slice(0, 4).map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => props.onText(ex)}
                  className="pressable rounded-xl bg-surface-2 px-3.5 py-2.5 text-left text-[13px] leading-snug text-fg-2"
                >
                  {ex}
                </button>
              ))}
            </div>
          </>
        )}

        {source === 'photo' && (
          <>
            {props.photo ? (
              <div className="relative overflow-hidden rounded-2xl bg-surface-2">
                <img src={props.photo} alt="Reference" className="aspect-[4/3] w-full object-cover" />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <button
                    type="button"
                    onClick={props.onPickPhoto}
                    className="pressable inline-flex h-9 items-center gap-1.5 rounded-xl bg-surface/95 px-3 text-sm font-semibold text-fg shadow-card"
                  >
                    <ArrowsClockwiseIcon size={15} weight="bold" /> Replace
                  </button>
                  <IconButton icon={TrashIcon} label="Remove photo" size="sm" variant="surface" onClick={props.onRemovePhoto} />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={props.onPickPhoto}
                className={cn(
                  'flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition-colors hover:border-accent/50',
                  props.error ? 'border-danger' : 'border-line-strong',
                )}
              >
                <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <CameraIcon size={28} weight="duotone" />
                </span>
                <span className="text-[15px] font-semibold text-fg">Add a reference photo</span>
                <span className="text-[13px] text-muted">Camera, gallery or a sample photo</span>
              </button>
            )}
            <FieldMessage error={props.error} />
            <TextArea
              className="mt-4"
              label="Anything to change? (optional)"
              rows={2}
              value={props.photoNote}
              maxLength={200}
              hint="e.g. Same mood, but set in the 1970s"
              onChange={(e) => props.onPhotoNote(e.target.value)}
            />
          </>
        )}

        {source === 'script' && (
          <>
            <div className="mb-3 flex gap-2">
              <Button variant="tonal" size="sm" icon={CameraIcon} className="flex-1" onClick={props.onScan}>
                Scan a page
              </Button>
              <Button variant="secondary" size="sm" icon={ScrollIcon} className="flex-1" onClick={() => props.onScript(SAMPLE_SCRIPT)}>
                Use sample script
              </Button>
            </div>
            <TextArea
              label="Script page"
              rows={9}
              value={props.script}
              maxLength={3000}
              error={props.error}
              hint="Paste the scene. We’ll pick out the set, era and props."
              onChange={(e) => props.onScript(e.target.value)}
              className="[&_textarea]:font-mono [&_textarea]:text-sm"
            />
          </>
        )}
      </div>
    </div>
  )
}

/* ── Step 2 · Set the limits ─────────────────────────────────────────────── */

function Section({ title, hint, icon: SIcon, children }: { title: string; hint?: ReactNode; icon: Icon; children: ReactNode }) {
  return (
    <section className="border-b border-line py-4 last:border-0">
      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.07em] text-muted">
        <SIcon size={14} weight="bold" /> {title}
      </h3>
      {hint && <p className="mt-0.5 text-[13px] text-subtle">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function LimitsStep({
  limits,
  onChange,
  onEra,
  detected,
}: {
  limits: Limits
  onChange: (patch: Partial<Limits>) => void
  onEra: (era: Limits['era']) => void
  detected: Limits['era']
}) {
  const projects = activeProjects(useProjects((s) => s.projects))
  const project = projects.find((p) => p.id === limits.projectId)
  const [custom, setCustom] = useState(!!limits.from && !project)
  const days = limitDays(limits)
  const hasDates = !!(limits.from && limits.to)

  return (
    <div className="px-4 pb-4 pt-3 @medium:mx-auto @medium:max-w-xl">
      <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-fg">Set the limits</h2>
      <p className="mt-0.5 text-sm text-muted">We’ll only suggest props that fit.</p>

      <Section title="Dates" icon={CalendarBlankIcon} hint="Pick a project to file the board under it and check props are free">
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <Chip
              key={p.id}
              selected={limits.projectId === p.id}
              onClick={() => {
                setCustom(false)
                onChange({ projectId: p.id, from: p.startDate, to: p.endDate })
              }}
            >
              {p.name} · {formatDateRangeShort(p.startDate, p.endDate)}
            </Chip>
          ))}
          <Chip
            icon={CalendarBlankIcon}
            selected={custom}
            onClick={() => {
              setCustom(true)
              const from = limits.from ?? addDays(todayISO(), 7)
              onChange({ projectId: null, from, to: limits.to && limits.to >= from ? limits.to : addDays(from, 2) })
            }}
          >
            Custom dates
          </Chip>
          <Chip
            selected={!hasDates}
            onClick={() => {
              setCustom(false)
              onChange({ projectId: null, from: null, to: null })
            }}
          >
            Any dates
          </Chip>
        </div>
        {custom && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <DateField
              label="From"
              format="short"
              value={limits.from}
              min={todayISO()}
              onChange={(from) => onChange({ from, to: limits.to && limits.to >= from ? limits.to : from })}
            />
            <DateField label="To" format="short" value={limits.to} min={limits.from ?? todayISO()} onChange={(to) => onChange({ to })} />
          </div>
        )}
      </Section>

      <Section
        title="Era"
        icon={SparkleIcon}
        hint={detected ? `We spotted ${detected} in your scene` : 'Pick one to keep props true to the period'}
      >
        <div className="flex flex-wrap gap-2">
          <Chip selected={!limits.era} onClick={() => onEra(null)}>
            Any era
          </Chip>
          {ERAS.map((e) => (
            <Chip key={e.id} selected={limits.era === e.id} onClick={() => onEra(e.id)}>
              {e.id}
            </Chip>
          ))}
        </div>
      </Section>

      <Section
        title="Budget"
        icon={WalletIcon}
        hint={`Total for props${hasDates ? ` over ${days} day${days === 1 ? '' : 's'} · about ${formatINR(Math.round(limits.budget / days))}/day` : ' per shoot day'}`}
      >
        <TextField
          label="Props budget"
          prefix="₹"
          inputMode="numeric"
          value={limits.budget ? new Intl.NumberFormat('en-IN').format(limits.budget) : ''}
          hint={limits.budget ? amountInWords(limits.budget) : undefined}
          onChange={(e) => onChange({ budget: Math.min(10_000_000, Number(e.target.value.replace(/\D/g, '')) || 0) })}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {BUDGETS.map((b) => (
            <Chip key={b.value} selected={limits.budget === b.value} onClick={() => onChange({ budget: b.value })}>
              {b.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Distance" icon={MapPinIcon} hint={SCOPE_HINT[limits.scope]}>
        <Segmented
          options={SCOPES.map((s) => ({ value: s, label: SCOPE_LABEL[s] }))}
          value={limits.scope}
          onChange={(scope) => onChange({ scope })}
          className="[&_button]:text-[13px]"
        />
      </Section>
    </div>
  )
}

/* ── Step 3 · What the scene needs ───────────────────────────────────────── */

function SlotsStep(props: {
  analysing: boolean
  source: SceneSource
  brief: string
  photo: string | null
  limits: Limits
  slots: Slot[]
  onEditScene: () => void
  onEditLimits: () => void
  onToggle: (id: string, patch: Partial<Slot>) => void
  onEdit: (slot: Slot, focus: 'name' | 'note') => void
  onRemove: (slot: Slot) => void
  onAdd: () => void
  onReanalyse: () => void
}) {
  const popup = usePopup()
  const { limits, slots } = props
  const sourcing = slots.filter((s) => !s.haveIt).length
  const limitChips = [
    limits.from && limits.to ? formatDateRangeShort(limits.from, limits.to) : 'Any dates',
    limits.era ?? 'Any era',
    formatINR(limits.budget),
    SCOPE_SHORT[limits.scope],
  ]

  return (
    <div className="px-4 pb-6 pt-3 @medium:mx-auto @medium:max-w-xl">
      {/* The scene and limits, for reference */}
      <div className="rounded-2xl bg-surface-2 p-3">
        <div className="flex items-start gap-3">
          {props.photo && props.source === 'photo' ? (
            <img src={props.photo} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface text-accent">
              {props.source === 'script' ? <ScrollIcon size={22} weight="duotone" /> : <TextAaIcon size={22} weight="duotone" />}
            </span>
          )}
          <p className="line-clamp-3 min-w-0 flex-1 text-[13px] leading-snug text-fg-2">
            {props.brief.trim() || 'Reference photo'}
          </p>
          <button type="button" onClick={props.onEditScene} className="shrink-0 text-sm font-semibold text-accent">
            Edit
          </button>
        </div>
        <button type="button" onClick={props.onEditLimits} className="mt-2.5 flex w-full flex-wrap gap-1.5 text-left" aria-label="Edit limits">
          {limitChips.map((c) => (
            <span key={c} className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-fg-2">
              {c}
            </span>
          ))}
        </button>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-fg">What the scene needs</h2>
          <p className="mt-0.5 text-sm text-muted">
            {props.analysing ? 'Reading your scene…' : `${slots.length} suggested · ${sourcing} to source`}
          </p>
        </div>
        {!props.analysing && (
          <Button size="sm" variant="ghost" icon={ArrowsClockwiseIcon} onClick={props.onReanalyse}>
            Redo
          </Button>
        )}
      </div>

      {props.analysing ? (
        <div className="mt-4 space-y-2.5" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-card">
              <Skeleton className="size-9 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          <AnimatePresence initial={false}>
            {slots.map((slot, i) => (
              <motion.li
                key={slot.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
                transition={{ duration: 0.3, ease: EASE_OUT, delay: Math.min(i, 8) * 0.04 }}
                className={cn('rounded-2xl bg-surface p-3 shadow-card transition-opacity', slot.haveIt && 'opacity-75')}
              >
                <div className="flex items-start gap-3">
                  <IconTile icon={categoryIcon(slot.category)} tone={slot.haveIt ? 'neutral' : 'brand'} size="sm" />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className={cn('text-[15px] font-semibold text-fg', slot.haveIt && 'line-through decoration-subtle')}>
                      {slot.name}
                    </p>
                    <p className="text-[13px] text-muted">
                      {slot.category}
                      {slot.note && <span className="text-fg-2"> · {slot.note}</span>}
                    </p>
                  </div>
                  <Menu
                    items={[
                      { label: 'Rename', icon: PencilSimpleIcon, onSelect: () => props.onEdit(slot, 'name') },
                      { label: slot.note ? 'Edit note' : 'Add a note', icon: NotePencilIcon, onSelect: () => props.onEdit(slot, 'note') },
                      { label: 'Remove', icon: TrashIcon, destructive: true, onSelect: () => props.onRemove(slot) },
                    ]}
                  >
                    <IconButton icon={DotsThreeVerticalIcon} weight="bold" size="sm" label={`Options for ${slot.name}`} className="-mr-1 -mt-1" />
                  </Menu>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <ToggleChip
                    checked={slot.periodCorrect}
                    onChange={(periodCorrect) => {
                      if (periodCorrect && !limits.era) return popup.toast('Pick an era in the limits first', { tone: 'info' })
                      props.onToggle(slot.id, { periodCorrect })
                    }}
                  >
                    Must be period-correct
                  </ToggleChip>
                  <ToggleChip checked={slot.haveIt} onChange={(haveIt) => props.onToggle(slot.id, { haveIt })}>
                    We already have this
                  </ToggleChip>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
          <li>
            <button
              type="button"
              onClick={props.onAdd}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong py-3.5 text-sm font-semibold text-accent transition-colors hover:border-accent/50"
            >
              <PlusIcon size={17} weight="bold" /> Add a slot
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}

function ToggleChip({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => {
        haptic()
        onChange(!checked)
      }}
      className={cn(
        'pressable inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[11.5px] font-semibold transition-colors',
        checked ? 'border-accent/40 bg-accent-soft text-accent-soft-fg' : 'border-line-strong text-fg-2',
      )}
    >
      <span
        className={cn(
          'grid size-3.5 place-items-center rounded-[4px] border transition-colors',
          checked ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong',
        )}
      >
        {checked && <CheckIcon size={9} weight="bold" />}
      </span>
      {children}
    </button>
  )
}

/* ── Generating ──────────────────────────────────────────────────────────── */

const GEN_STEPS = ['Reading the scene', 'Matching props near you', 'Checking your dates', 'Composing versions A, B and C']

function Generating() {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-surface px-10 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="status"
      aria-live="polite"
    >
      <div className="relative grid size-28 place-items-center">
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ background: 'conic-gradient(from 0deg, var(--color-accent), transparent 40%, var(--color-accent))' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
        />
        <span className="absolute inset-1.5 rounded-full bg-surface" />
        <motion.span
          className="relative text-accent"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <SparkleIcon size={44} weight="fill" />
        </motion.span>
      </div>
      <h2 className="mt-6 font-display text-xl font-bold text-fg">Generating your board</h2>
      <ul className="mt-5 space-y-2.5 text-left">
        {GEN_STEPS.map((s, i) => (
          <motion.li
            key={s}
            className="flex items-center gap-2.5 text-sm text-fg-2"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.6, duration: 0.3 }}
          >
            <motion.span
              className="grid size-5 place-items-center rounded-full bg-success text-white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.6, type: 'spring', stiffness: 500, damping: 30 }}
            >
              <CheckIcon size={11} weight="bold" />
            </motion.span>
            {s}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  )
}
