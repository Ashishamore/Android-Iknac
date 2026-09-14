import {
  ArrowLeftIcon,
  ArrowsDownUpIcon,
  BookmarkSimpleIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  CheckSquareIcon,
  GlobeHemisphereEastIcon,
  GridFourIcon,
  KanbanIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MapTrifoldIcon,
  SlidersHorizontalIcon,
  TruckIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BoardSheet } from '@/components/discover/BoardSheet'
import { FilterSheet } from '@/components/discover/FilterSheet'
import { MapView } from '@/components/discover/MapView'
import { SaveSearchSheet } from '@/components/discover/SaveSearchSheet'
import { SearchBarButton } from '@/components/discover/SearchBar'
import { useSearchTools } from '@/components/discover/useSearchTools'
import { PropCard, PropMeta, PropRow, PropThumb } from '@/components/PropCard'
import { collectionById, propById, vendorById } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatDateRangeShort } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { EASE_OUT } from '@/lib/motion'
import {
  PRICE_BANDS,
  SCOPE_MORE,
  SCOPE_PLACE,
  SCOPE_SHORT,
  SORT_OPTIONS,
  describeFilters,
  filterCount,
  parseFilters,
  parseSort,
  parseView,
  searchKey,
  searchProps,
  similarItems,
  sortLabel,
  suggestName,
  widerCounts,
  type Filters,
  type Scope,
  type SortKey,
  type ViewMode,
} from '@/lib/search'
import { nav, useBackHandler, useQuery, useRouteState } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useDiscover } from '@/store/discover'
import { activeProjects, useProjects } from '@/store/projects'
import { AppBar, Button, FadeSwitch, IconButton, OptionList, Screen, SectionHeader } from '@/ui'
import type { SearchRouteState } from './SearchScreen'

interface ResultsRouteState {
  /** Photo-search image (object URL or path). */
  photo?: string | null
}

/** Filters from the URL; the shoot dates default to the user's next project. */
function initialFilters(query: URLSearchParams): Filters {
  const f = parseFilters(query)
  const projects = useProjects.getState().projects
  if (f.projectId) {
    const p = projects.find((x) => x.id === f.projectId)
    return p ? { ...f, from: p.startDate, to: p.endDate } : { ...f, projectId: null }
  }
  if ((f.from && f.to) || query.get('dates') === 'any') return f
  const next = activeProjects(projects)[0]
  return next ? { ...f, projectId: next.id, from: next.startDate, to: next.endDate } : f
}

type SheetKind = 'filters' | 'sort' | 'save' | 'board'

/** Discover results: chips, sort, grid / list / map, select → add to board, save search. */
export default function DiscoverResultsScreen() {
  const query = useQuery()
  const route = useRouteState<ResultsRouteState>()
  const popup = usePopup()
  const [filters, setFilters] = useState(() => initialFilters(query))
  const [photo, setPhoto] = useState<string | null>(route?.photo ?? null)
  const [sort, setSort] = useState<SortKey>(() => parseSort(query))
  const [view, setView] = useState<ViewMode>(() => parseView(query))
  const [sheet, setSheet] = useState<{ kind: SheetKind | null; key: number }>({ kind: null, key: 0 })
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const results = useMemo(() => searchProps(filters, sort), [filters, sort])
  const wider = useMemo(() => widerCounts(filters), [filters])

  const addRecent = useDiscover((s) => s.addRecent)
  const savedList = useDiscover((s) => s.saved)
  const saveSearch = useDiscover((s) => s.saveSearch)
  const deleteSearch = useDiscover((s) => s.deleteSearch)
  const key = searchKey(filters)
  const savedMatch = savedList.find((s) => searchKey(parseFilters(new URLSearchParams(s.query))) === key)

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }))
  const openSheet = (kind: SheetKind) => setSheet((s) => ({ kind, key: s.key + 1 }))
  const closeSheet = () => setSheet((s) => ({ ...s, kind: null }))

  const exitSelection = () => {
    setSelecting(false)
    setSelected([])
  }
  useBackHandler(selecting, exitSelection)
  const toggleSelected = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  // Discover's "Filters" shortcut opens the sheet once the screen has slid in.
  useEffect(() => {
    if (query.get('filters') !== 'open') return
    const t = setTimeout(() => setSheet((s) => ({ kind: 'filters', key: s.key + 1 })), 360)
    return () => clearTimeout(t)
  }, [query])

  /** A new search from the bar: keep dates, scope, price and toggles; replace the rest. */
  const applySearch = (patch: Partial<Filters>, photoUrl?: string | null) => {
    setFilters((f) => ({ ...f, q: '', categories: [], eras: [], vendorId: null, collectionId: null, similarTo: null, ...patch }))
    if (photoUrl !== undefined) setPhoto(photoUrl)
    exitSelection()
  }

  const tools = useSearchTools({
    onVoice: (text) => {
      addRecent(text)
      applySearch({ q: text })
    },
    onPhoto: ({ url, matchId }) => applySearch({ similarTo: matchId }, url),
  })

  const openSearch = () => {
    const state: SearchRouteState = { apply: applySearch }
    nav.push(`/customer/discover/search${filters.q ? `?q=${encodeURIComponent(filters.q)}` : ''}`, { state })
  }

  const onBookmark = () => {
    if (savedMatch) {
      const undo = deleteSearch(savedMatch.id)
      popup.toast('Removed from saved searches', { action: { label: 'Undo', onClick: undo } })
    } else openSheet('save')
  }

  const changeView = (v: ViewMode) => {
    setView(v)
    if (v === 'map') exitSelection()
  }

  const barText =
    filters.q ||
    (filters.similarTo && 'Photo search') ||
    (filters.collectionId && collectionById(filters.collectionId)?.name) ||
    (filters.vendorId && vendorById(filters.vendorId)?.name) ||
    [...filters.categories, ...filters.eras].join(', ') ||
    'All props'

  const selection = (id: string) =>
    selecting ? { selected: selected.includes(id), onToggle: () => toggleSelected(id) } : undefined
  const allSelected = results.length > 0 && selected.length === results.length

  const header = selecting ? (
    <AppBar
      close
      back={exitSelection}
      title={`${selected.length} selected`}
      actions={
        <Button size="sm" variant="ghost" onClick={() => setSelected(allSelected ? [] : results.map((p) => p.id))}>
          {allSelected ? 'Clear' : 'Select all'}
        </Button>
      }
    />
  ) : (
    <header className="relative z-30 shrink-0 bg-surface pt-safe shadow-[0_1px_0_var(--color-line)]">
      <div className="flex h-16 items-center gap-1 px-2">
        <IconButton icon={ArrowLeftIcon} label="Back" onClick={() => nav.pop()} />
        <SearchBarButton
          className="h-11 min-w-0 flex-1 border-transparent bg-surface-2 shadow-none"
          text={barText}
          onPress={openSearch}
          onVoice={tools.startVoice}
          onPhoto={tools.startPhoto}
        />
        <IconButton
          icon={BookmarkSimpleIcon}
          weight={savedMatch ? 'fill' : 'regular'}
          label={savedMatch ? 'Remove from saved searches' : 'Save this search'}
          aria-pressed={!!savedMatch}
          className={savedMatch ? 'text-accent' : undefined}
          onClick={onBookmark}
        />
      </div>
      <AppliedChips filters={filters} set={set} onOpenFilters={() => openSheet('filters')} />
      <div className="flex h-11 items-center gap-1 border-t border-line pl-4 pr-1.5">
        <p className="min-w-0 flex-1 truncate text-[13px] text-muted" aria-live="polite">
          <span className="font-bold text-fg">{results.length}</span> result{results.length === 1 ? '' : 's'}
        </p>
        <button
          type="button"
          onClick={() => openSheet('sort')}
          className="pressable inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-fg-2 hover:bg-surface-2"
        >
          <ArrowsDownUpIcon size={15} weight="bold" className="text-muted" />
          {sortLabel(sort)}
        </button>
        <ViewToggle value={view} onChange={changeView} />
        {view !== 'map' && (
          <IconButton
            icon={CheckSquareIcon}
            label="Select multiple"
            size="sm"
            disabled={!results.length}
            className="disabled:opacity-40"
            onClick={() => {
              haptic()
              setSelecting(true)
            }}
          />
        )}
      </div>
    </header>
  )

  return (
    <Screen
      header={header}
      footer={
        selecting ? (
          <Button size="lg" block icon={KanbanIcon} disabled={!selected.length} onClick={() => openSheet('board')}>
            {selected.length ? `Add ${selected.length} to board` : 'Select props to add'}
          </Button>
        ) : undefined
      }
    >
      {filters.similarTo && (
        <PhotoBanner photo={photo} matchId={filters.similarTo} onClear={() => set({ similarTo: null })} />
      )}

      {results.length === 0 ? (
        <NothingExact
          filters={filters}
          wider={wider}
          onWiden={(scope) => set({ scope })}
          onChangeFilters={() => openSheet('filters')}
        />
      ) : (
        <FadeSwitch id={view} className={view === 'map' ? 'h-full' : undefined}>
          {view === 'map' ? (
            <MapView results={results} onShowList={() => changeView('list')} />
          ) : view === 'list' ? (
            <div className="grid gap-2.5 p-4 @medium:grid-cols-2">
              {results.map((p, i) => (
                <Rise key={p.id} i={i}>
                  <PropRow item={p} from={filters.from} to={filters.to} selection={selection(p.id)} />
                </Rise>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4 @medium:grid-cols-3 @expanded:grid-cols-4">
              {results.map((p, i) => (
                <Rise key={p.id} i={i}>
                  <PropCard
                    item={p}
                    meta={<PropMeta item={p} from={filters.from} to={filters.to} />}
                    selection={selection(p.id)}
                  />
                </Rise>
              ))}
            </div>
          )}
          {view !== 'map' && <WiderBanner wider={wider} onWiden={(scope) => set({ scope })} />}
        </FadeSwitch>
      )}

      <FilterSheet
        key={`filters-${sheet.key}`}
        open={sheet.kind === 'filters'}
        onClose={closeSheet}
        initial={filters}
        onApply={(f) => {
          setFilters(f)
          closeSheet()
        }}
      />
      <BottomSheet open={sheet.kind === 'sort'} onClose={closeSheet} title="Sort by">
        <OptionList
          options={SORT_OPTIONS}
          value={sort}
          onSelect={(v) => {
            setSort(v)
            closeSheet()
          }}
        />
      </BottomSheet>
      <SaveSearchSheet
        key={`save-${sheet.key}`}
        open={sheet.kind === 'save'}
        onClose={closeSheet}
        defaultName={suggestName(filters)}
        summary={describeFilters(filters)}
        onSave={(name, alerts) => {
          const id = saveSearch(name, key, alerts)
          closeSheet()
          popup.toast(alerts ? 'Search saved · we’ll alert you about new matches' : 'Search saved', {
            tone: 'success',
            action: { label: 'Undo', onClick: () => deleteSearch(id) },
          })
        }}
      />
      <BoardSheet open={sheet.kind === 'board'} onClose={closeSheet} propIds={selected} onAdded={exitSelection} />
      {tools.element}
    </Screen>
  )
}

/** Staggered rise-in for result cards. */
function Rise({ i, children }: { i: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE_OUT, delay: Math.min(i, 8) * 0.03 }}
    >
      {children}
    </motion.div>
  )
}

/* ── Applied filter chips ────────────────────────────────────────────────── */

function HeaderChip({
  icon: CIcon,
  children,
  onClick,
  active,
  removable,
  badge,
  label,
}: {
  icon?: Icon
  children: ReactNode
  onClick: () => void
  active?: boolean
  removable?: boolean
  badge?: number
  label?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        haptic()
        onClick()
      }}
      className={cn(
        'pressable inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-semibold transition-colors',
        active ? 'border-accent/40 bg-accent-soft text-accent-soft-fg' : 'border-line-strong bg-surface text-fg-2',
        removable && 'pr-2',
      )}
    >
      {CIcon && <CIcon size={15} weight={active ? 'fill' : 'regular'} />}
      {children}
      {!!badge && (
        <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-fg">
          {badge}
        </span>
      )}
      {removable && <XIcon size={13} weight="bold" className="opacity-70" />}
    </button>
  )
}

function AppliedChips({
  filters: f,
  set,
  onOpenFilters,
}: {
  filters: Filters
  set: (patch: Partial<Filters>) => void
  onOpenFilters: () => void
}) {
  const without = <T,>(list: T[], v: T) => list.filter((x) => x !== v)
  const removable: { id: string; label: string; remove: () => void }[] = [
    ...(f.collectionId ? [{ id: 'collection', label: collectionById(f.collectionId)?.name ?? '', remove: () => set({ collectionId: null }) }] : []),
    ...(f.vendorId ? [{ id: 'vendor', label: vendorById(f.vendorId)?.name ?? '', remove: () => set({ vendorId: null }) }] : []),
    ...f.categories.map((c) => ({ id: `c-${c}`, label: c, remove: () => set({ categories: without(f.categories, c) }) })),
    ...f.eras.map((e) => ({ id: `e-${e}`, label: e, remove: () => set({ eras: without(f.eras, e) }) })),
    ...f.materials.map((m) => ({ id: `m-${m}`, label: m, remove: () => set({ materials: without(f.materials, m) }) })),
    ...f.prices.map((id) => ({
      id: `p-${id}`,
      label: PRICE_BANDS.find((b) => b.id === id)?.label ?? id,
      remove: () => set({ prices: without(f.prices, id) }),
    })),
    ...(f.freeOnly && f.from ? [{ id: 'free', label: 'Free on your dates', remove: () => set({ freeOnly: false }) }] : []),
    ...(f.modifiable ? [{ id: 'mod', label: 'Can be modified', remove: () => set({ modifiable: false }) }] : []),
    ...(f.delivery ? [{ id: 'del', label: 'Delivery', remove: () => set({ delivery: false }) }] : []),
    ...(f.verified ? [{ id: 'ver', label: 'Verified only', remove: () => set({ verified: false }) }] : []),
  ]

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2.5">
      <HeaderChip icon={SlidersHorizontalIcon} onClick={onOpenFilters} badge={filterCount(f)} active={filterCount(f) > 0}>
        Filters
      </HeaderChip>
      <HeaderChip icon={CalendarBlankIcon} onClick={onOpenFilters} label="Dates">
        {f.from && f.to ? formatDateRangeShort(f.from, f.to) : 'Any dates'}
        <CaretDownIcon size={12} weight="bold" className="-ml-0.5 opacity-60" />
      </HeaderChip>
      <HeaderChip icon={MapPinIcon} onClick={onOpenFilters} label="Where to look">
        {SCOPE_SHORT[f.scope]}
        <CaretDownIcon size={12} weight="bold" className="-ml-0.5 opacity-60" />
      </HeaderChip>
      {removable.map((c) => (
        <HeaderChip key={c.id} active removable onClick={c.remove} label={`Remove ${c.label}`}>
          {c.label}
        </HeaderChip>
      ))}
    </div>
  )
}

/* ── View toggle: grid · list · map ──────────────────────────────────────── */

const VIEWS: { value: ViewMode; label: string; icon: Icon }[] = [
  { value: 'grid', label: 'Grid view', icon: GridFourIcon },
  { value: 'list', label: 'List view', icon: ListBulletsIcon },
  { value: 'map', label: 'Map view', icon: MapTrifoldIcon },
]

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div role="radiogroup" aria-label="View" className="relative flex rounded-[10px] bg-surface-2 p-0.5">
      {VIEWS.map((v) => {
        const active = v.value === value
        return (
          <button
            key={v.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={v.label}
            title={v.label}
            onClick={() => {
              haptic()
              onChange(v.value)
            }}
            className={cn(
              'relative grid size-8 place-items-center rounded-lg transition-colors duration-200',
              active ? 'text-fg' : 'text-muted',
            )}
          >
            {active && (
              <motion.span
                className="absolute inset-0 rounded-lg bg-surface shadow-card dark:bg-surface-3"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.18 }}
              />
            )}
            <v.icon size={17} weight={active ? 'fill' : 'regular'} className="relative" />
          </button>
        )
      })}
    </div>
  )
}

/* ── Photo search banner ─────────────────────────────────────────────────── */

function PhotoBanner({ photo, matchId, onClear }: { photo: string | null; matchId: string; onClear: () => void }) {
  const match = propById(matchId)
  return (
    <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-surface p-2.5 shadow-card">
      {photo ? (
        <img src={photo} alt="Your photo" className="size-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <PropThumb item={match} iconSize={22} className="size-14 shrink-0 rounded-xl" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-2xs font-bold uppercase tracking-[0.08em] text-accent">Photo search</p>
        <p className="truncate text-[15px] font-semibold text-fg">Props like {match.name}</p>
        <p className="truncate text-xs text-muted">
          {match.category} · {match.era}
          {match.material ? ` · ${match.material}` : ''}
        </p>
      </div>
      <IconButton icon={XIcon} label="Clear photo search" size="sm" onClick={onClear} />
    </div>
  )
}

/* ── "N more in Maharashtra / rest of India" ─────────────────────────────── */

function WiderBanner({ wider, onWiden }: { wider: { scope: Scope; count: number }[]; onWiden: (s: Scope) => void }) {
  if (!wider.length) return null
  return (
    <div className="mx-4 mb-6 rounded-2xl border border-dashed border-line-strong p-4 @medium:max-w-xl">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-info-soft text-info">
          <TruckIcon size={20} weight="fill" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-fg">More beyond this area</p>
          <p className="text-[13px] text-muted">Vendors further away deliver by road freight</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {wider.map((w) => (
          <Button key={w.scope} size="sm" variant="tonal" onClick={() => onWiden(w.scope)}>
            {w.count} more {SCOPE_MORE[w.scope]}
          </Button>
        ))}
      </div>
    </div>
  )
}

/* ── Nothing exact → Look wider · Change filters · Similar items ─────────── */

function NothingExact({
  filters,
  wider,
  onWiden,
  onChangeFilters,
}: {
  filters: Filters
  wider: { scope: Scope; count: number }[]
  onWiden: (s: Scope) => void
  onChangeFilters: () => void
}) {
  const similar = useMemo(() => similarItems(filters), [filters])
  const next = wider[0]
  const q = filters.q.trim()
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="flex flex-col items-center px-8 pb-2 pt-10 text-center"
      >
        <div className="mb-4 grid size-16 place-items-center rounded-3xl bg-accent-soft text-accent">
          <MagnifyingGlassIcon size={30} weight="duotone" />
        </div>
        <h3 className="font-display text-base font-bold text-fg">Nothing exact{q ? ` for “${q}”` : ''}</h3>
        <p className="mt-1 max-w-72 text-sm leading-relaxed text-muted">
          No props match all your filters {SCOPE_PLACE[filters.scope]}.
          {next ? ` There ${next.count === 1 ? 'is' : 'are'} ${next.count} ${SCOPE_MORE[next.scope]}.` : ''}
        </p>
        <div className="mt-5 flex w-full max-w-xs flex-col gap-2.5">
          {next && (
            <Button block icon={GlobeHemisphereEastIcon} onClick={() => onWiden(next.scope)}>
              Look wider · {next.count} {SCOPE_MORE[next.scope]}
            </Button>
          )}
          <Button block variant={next ? 'secondary' : 'primary'} icon={SlidersHorizontalIcon} onClick={onChangeFilters}>
            Change filters
          </Button>
        </div>
      </motion.div>
      <SectionHeader title="Similar items" subtitle="Close to what you’re looking for" />
      <div className="grid grid-cols-2 gap-3 px-4 pb-8 @medium:grid-cols-3 @expanded:grid-cols-4">
        {similar.map((p, i) => (
          <Rise key={p.id} i={i}>
            <PropCard item={p} meta={<PropMeta item={p} from={filters.from} to={filters.to} />} />
          </Rise>
        ))}
      </div>
    </div>
  )
}
