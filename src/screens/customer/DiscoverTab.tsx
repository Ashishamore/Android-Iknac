import {
  ArrowRightIcon,
  BookmarkSimpleIcon,
  CalendarCheckIcon,
  CalendarPlusIcon,
  ClockCounterClockwiseIcon,
  MapPinIcon,
  MapTrifoldIcon,
  PaintBrushIcon,
  SealCheckIcon,
  SlidersHorizontalIcon,
  TruckIcon,
} from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { SearchBarButton } from '@/components/discover/SearchBar'
import { useSearchTools } from '@/components/discover/useSearchTools'
import { SavedSearchRow } from '@/components/discover/SavedSearchRow'
import { VendorCard } from '@/components/discover/VendorCard'
import { PropCard, PropMeta, PropThumb } from '@/components/PropCard'
import {
  CATEGORIES,
  COLLECTIONS,
  ERAS,
  HOME_CITY,
  PROPS,
  VENDORS,
  propById,
  propCountByVendor,
  type Collection,
  type Era,
} from '@/data/props'
import { cn } from '@/lib/cn'
import { formatDistance } from '@/lib/format'
import { formatDateRangeShort } from '@/lib/dates'
import { EASE_OUT } from '@/lib/motion'
import { EMPTY_FILTERS, inScope, resultsPath, searchProps } from '@/lib/search'
import { nav } from '@/navigation'
import { useDiscover } from '@/store/discover'
import { usePrefs } from '@/store/prefs'
import { activeProjects, useProjects, type Project } from '@/store/projects'
import { AppBar, Avatar, Button, Chip, ChipRow, IconButton, IconTile, Screen, SectionHeader, Tag } from '@/ui'

const HINTS = ['rotary phone', 'vanity van', 'chesterfield sofa', 'kaali-peeli taxi', 'brass lantern']

const openSearch = () => nav.push('/customer/discover/search')
const openMap = () => nav.push(resultsPath({}, { view: 'map' }))

export default function DiscoverTab() {
  usePrefs((s) => s.distanceUnit) // re-render when units change
  const addRecent = useDiscover((s) => s.addRecent)
  const projects = useProjects((s) => s.projects)
  const active = useMemo(() => activeProjects(projects), [projects])

  const tools = useSearchTools({
    onVoice: (text) => {
      addRecent(text)
      nav.push(resultsPath({ q: text }))
    },
    onPhoto: ({ url, matchId }) => nav.push(resultsPath({ similarTo: matchId }), { state: { photo: url } }),
  })

  return (
    <Screen
      header={
        <AppBar
          title="Discover"
          subtitle={
            <span className="inline-flex items-center gap-1">
              <MapPinIcon size={12} weight="fill" className="text-accent" />
              Andheri West, {HOME_CITY}
            </span>
          }
          actions={<IconButton icon={MapTrifoldIcon} label="Map view" onClick={openMap} />}
        >
          <div className="px-4 pb-3">
            <SearchBarButton hints={HINTS} onPress={openSearch} onVoice={tools.startVoice} onPhoto={tools.startPhoto} />
          </div>
        </AppBar>
      }
    >
      <QuickFilters project={active[0]} />
      <RecentSearches />
      <Categories />
      <EraStyles />
      <AvailableOnDates projects={active} />
      <VendorsNearYou />
      <FurtherAfield />
      <Collections />
      <SavedSearches />
      <div className="h-8" />
      {tools.element}
    </Screen>
  )
}

/* ── Filters · Map view · quick toggles ──────────────────────────────────── */

function QuickFilters({ project }: { project?: Project }) {
  return (
    <ChipRow className="pb-1 pt-3">
      <Chip icon={SlidersHorizontalIcon} onClick={() => nav.push(resultsPath({}, { openFilters: true }))}>
        Filters
      </Chip>
      <Chip icon={MapTrifoldIcon} onClick={openMap}>
        Map view
      </Chip>
      {project && (
        <Chip icon={CalendarCheckIcon} onClick={() => nav.push(resultsPath({ projectId: project.id, freeOnly: true }))}>
          Free on your dates
        </Chip>
      )}
      <Chip icon={SealCheckIcon} onClick={() => nav.push(resultsPath({ verified: true }))}>
        Verified only
      </Chip>
      <Chip icon={TruckIcon} onClick={() => nav.push(resultsPath({ delivery: true }))}>
        Delivery
      </Chip>
      <Chip icon={PaintBrushIcon} onClick={() => nav.push(resultsPath({ modifiable: true }))}>
        Can be modified
      </Chip>
    </ChipRow>
  )
}

/* ── Recent searches ─────────────────────────────────────────────────────── */

function RecentSearches() {
  const recent = useDiscover((s) => s.recent)
  const clearRecent = useDiscover((s) => s.clearRecent)
  if (!recent.length) return null
  return (
    <section>
      <SectionHeader title="Recent searches" action="Clear" onAction={clearRecent} className="pt-5" />
      <ChipRow>
        {recent.map((term) => (
          <Chip key={term} icon={ClockCounterClockwiseIcon} onClick={() => nav.push(resultsPath({ q: term }))}>
            {term}
          </Chip>
        ))}
      </ChipRow>
    </section>
  )
}

/* ── Categories (10) ─────────────────────────────────────────────────────── */

function Categories() {
  return (
    <section>
      <SectionHeader title="Categories" subtitle="Props, vehicles, locations and more" className="pt-6" />
      <div className="grid grid-cols-5 gap-x-2 gap-y-4 px-4 @medium:grid-cols-10">
        {CATEGORIES.map((c, i) => (
          <motion.button
            key={c.id}
            type="button"
            onClick={() => nav.push(resultsPath({ categories: [c.id] }))}
            className="pressable flex flex-col items-center gap-1.5 outline-none"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT, delay: i * 0.025 }}
          >
            <span className="grid size-14 place-items-center rounded-2xl bg-surface text-accent shadow-card">
              <c.icon size={26} weight="duotone" />
            </span>
            <span className="line-clamp-2 text-center text-xs font-medium leading-tight text-fg-2">{c.id}</span>
          </motion.button>
        ))}
      </div>
    </section>
  )
}

/* ── Era & style ─────────────────────────────────────────────────────────── */

/** Period palettes — content colours, independent of the app accent. */
const ERA_STYLE: Record<Era, string> = {
  Colonial: 'bg-[#f5ede0] text-[#7a5526] dark:bg-[#2a2218] dark:text-[#e0bf8f]',
  '1940s–60s': 'bg-[#ebf1e6] text-[#44633a] dark:bg-[#1c2619] dark:text-[#a9cf98]',
  '1970s': 'bg-[#fcebdd] text-[#a8521b] dark:bg-[#2d1f14] dark:text-[#f3aa74]',
  '1980s–90s': 'bg-[#efeafb] text-[#5a43a6] dark:bg-[#221d33] dark:text-[#b9a7f5]',
  Y2K: 'bg-[#e4f2fb] text-[#1d6f9c] dark:bg-[#14232e] dark:text-[#88c9ef]',
  Modern: 'bg-[#eef0f3] text-[#3a4250] dark:bg-[#1e2229] dark:text-[#c3c9d3]',
}

function EraStyles() {
  const counts = useMemo(() => Object.fromEntries(ERAS.map((e) => [e.id, PROPS.filter((p) => p.era === e.id).length])), [])
  return (
    <section>
      <SectionHeader title="Era & style" subtitle="Recreate a period, down to the props" className="pt-7" />
      <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
        {ERAS.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => nav.push(resultsPath({ eras: [e.id] }))}
            className={cn(
              'pressable flex h-[132px] w-[148px] shrink-0 snap-start flex-col rounded-2xl p-3.5 text-left',
              ERA_STYLE[e.id],
            )}
          >
            <span className="font-display text-xl font-extrabold leading-tight tracking-[-0.02em]">{e.id}</span>
            <span className="mt-1 line-clamp-2 text-xs leading-snug opacity-80">{e.blurb}</span>
            <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold">
              {counts[e.id]} prop{counts[e.id] === 1 ? '' : 's'} <ArrowRightIcon size={12} weight="bold" />
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

/* ── Available on your dates ─────────────────────────────────────────────── */

function AvailableOnDates({ projects }: { projects: Project[] }) {
  const [chosen, setChosen] = useState<string | null>(null)
  const project = projects.find((p) => p.id === chosen) ?? projects[0]
  const free = useMemo(
    () =>
      project
        ? searchProps({ ...EMPTY_FILTERS, projectId: project.id, from: project.startDate, to: project.endDate, freeOnly: true })
        : [],
    [project],
  )

  if (!project) {
    return (
      <section>
        <SectionHeader title="Available on your dates" className="pt-7" />
        <div className="mx-4 flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card">
          <IconTile icon={CalendarPlusIcon} tone="brand" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-fg">Add your shoot dates</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">Create a project to see what’s free when you shoot.</p>
          </div>
          <Button size="sm" variant="tonal" onClick={() => nav.push('/customer/projects/new')}>
            Create
          </Button>
        </div>
      </section>
    )
  }

  const range = formatDateRangeShort(project.startDate, project.endDate)
  return (
    <section>
      <SectionHeader
        title="Available on your dates"
        subtitle={`${free.length} free in ${HOME_CITY} · ${range}`}
        action="See all"
        onAction={() => nav.push(resultsPath({ projectId: project.id, freeOnly: true }))}
        className="pt-7"
      />
      {projects.length > 1 && (
        <ChipRow className="pb-3">
          {projects.map((p) => (
            <Chip key={p.id} selected={p.id === project.id} onClick={() => setChosen(p.id)}>
              {p.name}
            </Chip>
          ))}
        </ChipRow>
      )}
      <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1">
        {free.slice(0, 10).map((item) => (
          <PropCard
            key={item.id}
            item={item}
            className="w-[164px] shrink-0 snap-start"
            meta={<PropMeta item={item} />}
          />
        ))}
      </div>
    </section>
  )
}

/* ── Vendors near you ────────────────────────────────────────────────────── */

function VendorsNearYou() {
  const near = useMemo(() => VENDORS.filter((v) => inScope(v, 'nearby')).sort((a, b) => a.distanceKm - b.distanceKm), [])
  return (
    <section>
      <SectionHeader
        title="Vendors near you"
        subtitle={`${near.length} within 10 km of Andheri`}
        action="Map"
        onAction={() => nav.push(resultsPath({ scope: 'nearby' }, { view: 'map' }))}
        className="pt-5"
      />
      <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1">
        {near.map((v) => (
          <VendorCard
            key={v.id}
            vendor={v}
            className="w-[236px] shrink-0 snap-start"
            onClick={() => nav.push(resultsPath({ vendorId: v.id, scope: 'india' }))}
          />
        ))}
      </div>
    </section>
  )
}

/* ── Further afield ──────────────────────────────────────────────────────── */

function FurtherAfield() {
  const far = useMemo(() => VENDORS.filter((v) => v.city !== HOME_CITY).sort((a, b) => a.distanceKm - b.distanceKm), [])
  return (
    <section>
      <SectionHeader
        title="Further afield"
        subtitle="Other cities · delivered by road freight"
        action="All India"
        onAction={() => nav.push(resultsPath({ scope: 'india' }))}
        className="pt-5"
      />
      <div className="mx-4 overflow-hidden rounded-2xl bg-surface shadow-card @medium:max-w-2xl">
        {far.map((v) => {
          const count = propCountByVendor(v.id)
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => nav.push(resultsPath({ vendorId: v.id, scope: 'india' }))}
              className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
            >
              <Avatar name={v.name} size="md" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-[15px] font-medium text-fg">
                  <span className="truncate">{v.name}</span>
                  {v.verified && <SealCheckIcon size={14} weight="fill" className="shrink-0 text-accent" />}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-muted">
                  {v.city} · {formatDistance(v.distanceKm)} · {count} prop{count === 1 ? '' : 's'}
                </span>
              </span>
              <Tag tone="info" className="shrink-0">
                <TruckIcon size={12} weight="fill" />
                {v.freight}
              </Tag>
              <span aria-hidden className="absolute bottom-0 left-[68px] right-0 h-px bg-line group-last:hidden" />
            </button>
          )
        })}
      </div>
    </section>
  )
}

/* ── Collections ─────────────────────────────────────────────────────────── */

function Collections() {
  return (
    <section>
      <SectionHeader title="Collections" subtitle="Curated sets for common briefs" className="pt-7" />
      <div className="grid grid-cols-2 gap-3 px-4 @medium:grid-cols-3">
        {COLLECTIONS.map((c) => (
          <CollectionCard key={c.id} collection={c} />
        ))}
      </div>
    </section>
  )
}

function CollectionCard({ collection: c }: { collection: Collection }) {
  const preview = c.propIds.slice(0, 3).map(propById)
  return (
    <button
      type="button"
      onClick={() => nav.push(resultsPath({ collectionId: c.id }))}
      className="pressable rounded-2xl bg-surface p-2 text-left shadow-card outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
    >
      <div className="grid h-24 grid-cols-[2fr_1fr] grid-rows-2 gap-1 overflow-hidden rounded-xl">
        {preview.map((p, i) => (
          <PropThumb key={p.id} item={p} iconSize={i === 0 ? 30 : 18} className={cn('size-full', i === 0 && 'row-span-2')} />
        ))}
      </div>
      <div className="px-1 pb-1 pt-2.5">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <c.icon size={15} weight="fill" className="shrink-0 text-accent" />
          <span className="truncate">{c.name}</span>
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted">{c.blurb}</p>
        <p className="mt-1.5 text-xs font-semibold text-fg-2">{c.propIds.length} props</p>
      </div>
    </button>
  )
}

/* ── Saved searches ──────────────────────────────────────────────────────── */

function SavedSearches() {
  const saved = useDiscover((s) => s.saved)
  return (
    <section>
      <SectionHeader title="Saved searches" subtitle="Run again, or get alerts for new matches" className="pt-7" />
      {saved.length === 0 ? (
        <div className="mx-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-line-strong px-6 py-6 text-center">
          <BookmarkSimpleIcon size={26} weight="duotone" className="text-accent" />
          <p className="mt-2 text-sm font-semibold text-fg">No saved searches</p>
          <p className="mt-0.5 text-[13px] text-muted">Tap the bookmark on any results page to save it here.</p>
        </div>
      ) : (
        <div className="mx-4 overflow-hidden rounded-2xl bg-surface shadow-card @medium:max-w-2xl">
          {saved.map((s) => (
            <SavedSearchRow key={s.id} search={s} />
          ))}
        </div>
      )}
    </section>
  )
}
