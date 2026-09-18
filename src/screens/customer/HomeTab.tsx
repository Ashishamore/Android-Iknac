import {
  ArrowRightIcon,
  BellIcon,
  CameraIcon,
  FolderSimplePlusIcon,
  HandWavingIcon,
  HeartIcon,
  QrCodeIcon,
  ScrollIcon,
  SparkleIcon,
  TruckIcon,
  type Icon,
} from '@phosphor-icons/react'
import { motion, useTransform } from 'motion/react'
import { VendorCard } from '@/components/discover/VendorCard'
import { ProjectBoardCard } from '@/components/ops/ProjectBoardCard'
import { PropCard, PropThumb } from '@/components/PropCard'
import { BoardCard } from '@/components/studio/BoardCard'
import { CATEGORIES, monthsUntil, propById, seasonalCollections, TRENDING_PROPS, VENDORS, type Collection } from '@/data/props'
import { SCENE_CHIPS } from '@/data/studio'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { useNow } from '@/lib/hooks'
import { EASE_OUT } from '@/lib/motion'
import { checkDue, handoverRuns, liveRuns } from '@/lib/ops'
import { inScope, liveProps, resultsPath } from '@/lib/search'
import { TONE_SOFT, type Tone } from '@/lib/tones'
import { nav } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useUnreadNotifications } from '@/store/notifications'
import { usePrefs } from '@/store/prefs'
import { useProjectOps } from '@/store/projectOps'
import { activeProjects, useProjects } from '@/store/projects'
import { useRecent } from '@/store/recent'
import { useDisplayName } from '@/store/session'
import { useStudio } from '@/store/studio'
import { AppBar, Carousel, IconButton, ImagePlaceholder, Screen, SectionHeader, useScrollY } from '@/ui'
import { liveVendors, useCatalogueVersion } from '@/store/platform'
import { CampaignCard } from '@/components/platform/Promo'
import { usePlatform, useSlotCampaign } from '@/store/platform'

function greeting(date = new Date()) {
  const h = date.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

interface Banner {
  id: string
  /** Image in /public (16:9). Slots without one show a placeholder. */
  image?: string
  alt?: string
  onClick?: () => void
}

/** Home promotions banners, in slide order. */
const BANNERS: Banner[] = [
  {
    id: 'hero-props',
    image: '/banners/hero-props-yellow-car.webp',
    alt: 'Cars, bikes & statement props — vintage cars, scooters and chandeliers for the money shot. Browse hero props.',
    onClick: () => nav.push(resultsPath({ categories: ['Vehicles'] })),
  },
  {
    id: 'recreate-era-latch',
    image: '/banners/recreate-era-latch.webp',
    alt: 'Recreate the era — vintage leather and brass props. Browse hero props.',
    onClick: () => nav.push(resultsPath({ eras: ['Colonial'] })),
  },
  {
    id: 'recreate-era-pottery',
    image: '/banners/recreate-era-pottery.webp',
    alt: 'Recreate the era — antique pottery and period décor. Browse hero props.',
    onClick: () => nav.push(resultsPath({ categories: ['Decor'] })),
  },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
const SEASON_TONE: Record<string, Tone> = {
  'monsoon-streets': 'info',
  'festive-lights': 'warning',
  'wedding-season': 'danger',
  'christmas-party': 'success',
  'summer-holidays': 'brand',
}

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: EASE_OUT, delay },
})

/** HOME: greeting, promotions, quick actions, pick up a board, AI, trending, vendors, seasons, recent, categories. */
export default function HomeTab() {
  const firstName = useDisplayName().split(' ')[0]
  const unread = useUnreadNotifications()
  // Re-render when the admin panel takes a listing down or suspends a provider.
  useCatalogueVersion()

  return (
    <Screen
      header={
        <AppBar
          transparent
          solidAt={64}
          title={`Hi, ${firstName}`}
          actions={
            <IconButton
              icon={BellIcon}
              label="Notifications"
              variant="surface"
              badge={unread}
              onClick={() => nav.push('/customer/notifications')}
            />
          }
        />
      }
    >
      <WelcomeHeader firstName={firstName} />
      <HomePromo />

      {/* Promotions banner */}
      <Carousel className="mt-4">
        {BANNERS.map((b, i) =>
          b.image ? (
            <button
              key={b.id}
              type="button"
              onClick={b.onClick}
              className="block w-full overflow-hidden rounded-3xl bg-surface-3 shadow-card transition-transform duration-200 ease-out-quint active:scale-[0.985] dark:ring-1 dark:ring-white/10"
            >
              <img
                src={b.image}
                alt={b.alt ?? ''}
                draggable={false}
                decoding="async"
                fetchPriority={i === 0 ? 'high' : 'auto'}
                className="aspect-video w-full object-cover"
              />
            </button>
          ) : (
            <ImagePlaceholder key={b.id} label={`Image ${i + 1}`} hint="16:9 banner" className="aspect-video rounded-3xl" />
          ),
        )}
      </Carousel>

      <QuickActions />
      {/* Side by side on tablets */}
      <div className="@medium:grid @medium:grid-cols-2 @medium:items-start @medium:gap-x-4 @medium:px-4">
        <ContinueBoard />
        <DescribeScene />
      </div>

      <SectionHeader
        title="Trending props"
        subtitle="Most booked this week"
        action="See all"
        onAction={() => nav.push('/customer/trending')}
        className="pt-6"
      />
      <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1">
        {liveProps(TRENDING_PROPS).slice(0, 8).map((item) => (
          <PropCard key={item.id} item={item} className="w-[164px] shrink-0 snap-start" />
        ))}
      </div>

      <VendorsNearYou />
      <SeasonalCollections />
      <RecentlyViewed />
      <BrowseCategories />
      <div className="h-8" />
    </Screen>
  )
}

/** Greets the signed-in user at the top of Home. The bell sits in the app bar above it. */
function WelcomeHeader({ firstName }: { firstName: string }) {
  // Fade out as it scrolls under the app bar (which then shows "Hi, …").
  const scrollY = useScrollY()
  const opacity = useTransform(scrollY, [0, 64], [1, 0])
  return (
    <motion.header style={{ opacity }} className="px-4 pb-2 pt-[calc(var(--sat)+20px)]">
      <div className="pr-14">
        <motion.p {...rise(0)} className="text-sm font-medium text-muted">
          {greeting()}
        </motion.p>
        <motion.h1
          {...rise(0.05)}
          className="mt-0.5 flex items-center gap-2 font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-fg"
        >
          <span className="truncate">Welcome, {firstName}</span>
          <motion.span
            aria-hidden
            className="inline-flex shrink-0 text-amber-400"
            style={{ originX: 0.75, originY: 0.8 }}
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, 18, -8, 18, -4, 12, 0] }}
            transition={{ duration: 1.5, delay: 0.45, ease: 'easeInOut' }}
          >
            <HandWavingIcon size={28} weight="fill" />
          </motion.span>
        </motion.h1>
      </div>
      <motion.p {...rise(0.1)} className="mt-1 text-balance text-[15px] leading-snug text-muted">
        Find the perfect props for your next shoot.
      </motion.p>
    </motion.header>
  )
}

/* ── Quick actions ───────────────────────────────────────────────────────── */

function QuickActions() {
  const popup = usePopup()
  const runs = useProjectOps((s) => s.runs)
  const projects = useProjects((s) => s.projects)
  const active = new Set(activeProjects(projects).map((p) => p.id))
  const live = liveRuns(runs.filter((r) => active.has(r.projectId)))
  const moving = live.filter((r) => r.stage >= 1).length
  const due = handoverRuns(runs).filter(checkDue).length

  const track = () => {
    const next = live[0]
    if (!next) {
      popup.toast('Nothing on the way yet. Book a board and its deliveries show up here.')
      return nav.switchTab('projects')
    }
    nav.push(`/customer/projects/${next.projectId}?tab=deliveries`)
  }

  const actions: { label: string; aria: string; icon: Icon; badge?: number; onClick: () => void }[] = [
    { label: 'New project', aria: 'New project', icon: FolderSimplePlusIcon, onClick: () => nav.push('/customer/projects/new') },
    { label: 'Scan at handover', aria: 'Scan code at handover', icon: QrCodeIcon, badge: due, onClick: () => nav.push('/customer/scan') },
    { label: 'Track delivery', aria: 'Track delivery', icon: TruckIcon, badge: moving, onClick: track },
    { label: 'Saved items', aria: 'Saved items', icon: HeartIcon, onClick: () => nav.push('/customer/profile/saved') },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 px-4 pt-6">
      {actions.map((a, i) => (
        <motion.button
          key={a.label}
          type="button"
          aria-label={a.badge ? `${a.aria} (${a.badge})` : a.aria}
          onClick={a.onClick}
          className="pressable flex flex-col items-center gap-1.5 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.1 + i * 0.04 }}
        >
          <span className="relative grid size-14 place-items-center rounded-2xl bg-surface text-accent shadow-card">
            <a.icon size={26} weight="duotone" />
            {a.badge ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white ring-2 ring-bg">
                {a.badge}
              </span>
            ) : null}
          </span>
          <span className="line-clamp-2 text-center text-xs font-medium leading-tight text-fg-2">{a.label}</span>
        </motion.button>
      ))}
    </div>
  )
}

/* ── Continue where you left off ─────────────────────────────────────────── */

function ContinueBoard() {
  const last = useRecent((s) => s.lastBoard)
  const boards = useProjectOps((s) => s.boards)
  const aiBoards = useStudio((s) => s.boards)
  const projects = useProjects((s) => s.projects)
  const now = useNow(60_000).getTime()

  let card = null
  let subtitle = 'Your latest board'
  const aiBoard = last?.kind === 'ai' ? aiBoards.find((b) => b.id === last.id) : undefined
  const lastProjectBoard = last?.kind === 'project' ? boards.find((b) => b.id === last.id) : undefined
  // Nothing opened yet: fall back to the board with the latest change in an active project.
  const active = activeProjects(projects)
  const touched = (b: (typeof boards)[number]) => Math.max(b.createdAt, ...b.lines.map((l) => l.addedAt))
  const board =
    lastProjectBoard ??
    (aiBoard ? undefined : [...boards].filter((b) => active.some((p) => p.id === b.projectId)).sort((a, b) => touched(b) - touched(a))[0])
  const project = board && projects.find((p) => p.id === board.projectId)

  if (aiBoard) {
    card = <BoardCard board={aiBoard} onClick={() => nav.push(`/customer/ai-studio/boards/${aiBoard.id}`)} />
  } else if (board && project) {
    card = <ProjectBoardCard board={board} project={project} now={now} />
  }
  if (!card) return null
  if (last && (aiBoard || lastProjectBoard)) subtitle = `Opened ${timeAgo(last.at).toLowerCase()}`

  return (
    <section>
      <SectionHeader title="Continue where you left off" subtitle={subtitle} className="pt-7 @medium:px-0" />
      <div className="px-4 @medium:px-0">{card}</div>
    </section>
  )
}

/* ── Describe the scene → AI Studio ──────────────────────────────────────── */

function DescribeScene() {
  const credits = useStudio((s) => s.credits)
  const open = (query = '') => nav.push(`/customer/ai-studio/new${query}`)
  return (
    <section>
      <SectionHeader title="Describe the scene" subtitle="AI Studio builds a prop board within your budget" className="pt-7 @medium:px-0" />
      <div className="px-4 @medium:px-0">
        <div className="relative overflow-hidden rounded-3xl bg-accent-soft p-3.5">
          <SparkleIcon aria-hidden size={96} weight="fill" className="absolute -right-5 -top-7 text-accent opacity-10" />
          <button
            type="button"
            onClick={() => open('?mode=describe')}
            className="pressable relative flex h-12 w-full items-center gap-2.5 rounded-2xl bg-surface px-3.5 text-left text-[15px] text-muted shadow-card outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
          >
            <SparkleIcon size={18} weight="fill" className="shrink-0 text-accent" />
            <span className="min-w-0 flex-1 truncate">A rainy 1970s Irani café at dawn…</span>
            <ArrowRightIcon size={18} weight="bold" className="shrink-0 text-accent" />
          </button>
          <div className="no-scrollbar -mx-3.5 mt-3 flex gap-2 overflow-x-auto px-3.5">
            {SCENE_CHIPS.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => open(`?mode=describe&brief=${encodeURIComponent(c.brief)}`)}
                className="pressable h-8 shrink-0 rounded-full bg-surface/80 px-3 text-[13px] font-semibold text-fg-2 ring-1 ring-line"
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 whitespace-nowrap border-t border-accent/15 pt-3 text-[13px] font-semibold">
            <button type="button" onClick={() => open('?mode=photo')} className="inline-flex items-center gap-1.5 text-accent-soft-fg" aria-label="Reference photo">
              <CameraIcon size={16} weight="bold" /> Photo
            </button>
            <button type="button" onClick={() => open('?mode=script')} className="inline-flex items-center gap-1.5 text-accent-soft-fg" aria-label="Script page">
              <ScrollIcon size={16} weight="bold" /> Script
            </button>
            <span className="ml-auto text-xs font-medium text-fg-2">
              {credits} credit{credits === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Vendors near you → Vendor profile ───────────────────────────────────── */

function VendorsNearYou() {
  usePrefs((s) => s.distanceUnit) // re-render when units change
  const near = liveVendors(VENDORS).filter((v) => inScope(v, 'nearby')).sort((a, b) => a.distanceKm - b.distanceKm)
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
          <VendorCard key={v.id} vendor={v} className="w-[236px] shrink-0 snap-start" onClick={() => nav.push(`/customer/vendors/${v.id}`)} />
        ))}
      </div>
    </section>
  )
}

/* ── Seasonal collections ────────────────────────────────────────────────── */

function SeasonalCollections() {
  const list = seasonalCollections()
  return (
    <section>
      <SectionHeader title="Seasonal collections" subtitle="Shoot ahead of the season" className="pt-5" />
      <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1">
        {list.map((c) => (
          <SeasonCard key={c.id} collection={c} />
        ))}
      </div>
    </section>
  )
}

function SeasonCard({ collection: c }: { collection: Collection }) {
  const season = c.season!
  const away = monthsUntil(season)
  const tone = SEASON_TONE[c.id] ?? 'brand'
  const preview = c.propIds.slice(0, 3).map(propById)
  return (
    <button
      type="button"
      onClick={() => nav.push(resultsPath({ collectionId: c.id }))}
      className="pressable w-[252px] shrink-0 snap-start overflow-hidden rounded-3xl bg-surface text-left shadow-card outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
    >
      <div className={cn('relative h-28 overflow-hidden p-3.5', TONE_SOFT[tone])}>
        <c.icon aria-hidden size={92} weight="duotone" className="absolute -bottom-4 -right-2 opacity-30" />
        <span className="inline-flex items-center gap-1 rounded-full bg-surface/85 px-2 py-0.5 text-[11px] font-bold text-fg">
          {away === 0 ? (
            <>
              <span className="size-1.5 rounded-full bg-success" /> In season
            </>
          ) : (
            `From ${MONTHS[season.from - 1]}`
          )}
        </span>
        <p className="absolute bottom-3 left-3.5 right-16 font-display text-lg font-bold leading-tight">{c.name}</p>
      </div>
      <div className="flex items-center gap-2 p-3">
        <span className="flex -space-x-2">
          {preview.map((p) => (
            <PropThumb key={p.id} item={p} iconSize={16} className="size-9 rounded-lg ring-2 ring-surface" />
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-fg-2">{c.blurb}</span>
          <span className="block text-xs text-muted">
            {MONTHS[season.from - 1]} – {MONTHS[season.to - 1]} · {c.propIds.length} props
          </span>
        </span>
      </div>
    </button>
  )
}

/* ── Recently viewed ─────────────────────────────────────────────────────── */

function RecentlyViewed() {
  const popup = usePopup()
  const ids = useRecent((s) => s.props)
  const clearProps = useRecent((s) => s.clearProps)
  const items = liveProps(ids.map(propById).filter(Boolean))

  const clear = () => {
    haptic()
    const undo = clearProps()
    popup.toast('Recently viewed cleared', { action: { label: 'Undo', onClick: undo } })
  }

  return (
    <section>
      <SectionHeader
        title="Recently viewed"
        subtitle={items.length ? 'Pick up where you were browsing' : undefined}
        action={items.length ? 'Clear' : undefined}
        onAction={clear}
        className="pt-5"
      />
      {items.length ? (
        <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1">
          {items.map((item) => (
            <PropCard key={item.id} item={item} className="w-[148px] shrink-0 snap-start" />
          ))}
        </div>
      ) : (
        <p className="mx-4 rounded-2xl border-2 border-dashed border-line-strong px-4 py-5 text-center text-sm text-muted">
          Props you open show up here.
        </p>
      )}
    </section>
  )
}

/* ── Browse all categories → Discover ────────────────────────────────────── */

function BrowseCategories() {
  return (
    <section>
      <SectionHeader title="Browse all categories" subtitle="Props, vehicles, locations and more" action="Discover" onAction={() => nav.switchTab('discover')} className="pt-5" />
      <div className="grid grid-cols-5 gap-x-2 gap-y-4 px-4 @medium:grid-cols-10">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => nav.push(resultsPath({ categories: [c.id] }))}
            className="pressable flex flex-col items-center gap-1.5 outline-none"
          >
            <span className="grid size-14 place-items-center rounded-2xl bg-surface text-accent shadow-card">
              <c.icon size={26} weight="duotone" />
            </span>
            <span className="line-clamp-2 text-center text-xs font-medium leading-tight text-fg-2">{c.id}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

/** The "Renter Home" slot: whatever campaign the Control Centre has running. */
function HomePromo() {
  const campaign = useSlotCampaign('renter-home')
  const tap = usePlatform((s) => s.tapCampaign)
  if (!campaign) return null
  return (
    <div className="mt-4 px-4 @medium:mx-auto @medium:max-w-2xl">
      <CampaignCard
        campaign={campaign}
        onOpen={() => {
          tap(campaign.id)
          nav.push(campaign.to)
        }}
      />
    </div>
  )
}
