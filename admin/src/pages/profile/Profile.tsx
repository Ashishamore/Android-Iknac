import { ArrowCounterClockwiseIcon, CaretRightIcon, EyeIcon, FilmSlateIcon, PencilSimpleIcon, SealCheckIcon, StarIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { OWNER_LANGUAGES, OWNER_PLANS, PLATFORM } from '@/data/owner'
import { cn } from '@/lib/cn'
import { formatDayShort } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { nextPayoutDate, payoutSummary, ratingSummary } from '@/lib/owner'
import { useFeeRate, useOwner } from '@/store/owner'
import { openRenterApp } from '~/lib/actions'
import { isVerified, plural, resetDemo } from '~/lib/data'
import { linkProps, navigate } from '~/router'
import { useUi } from '~/store/ui'
import { Button, Select } from '~/ui/controls'
import { Avatar, Card, CountBadge, PageHeader, Tag } from '~/ui/display'
import { confirm } from '~/ui/feedback'
import { PROFILE_SECTIONS, type SectionId } from './sections'

/** One-line summaries shown next to each section. */
function useSummaries(): Record<SectionId, ReactNode> {
  const s = useOwner()
  const fee = useFeeRate()
  const language = useUi((u) => u.language)
  const theme = useUi((u) => u.theme)
  const done = Object.values(s.verification).filter((x) => x === 'done').length
  const plan = OWNER_PLANS.find((p) => p.id === s.plan)!
  const payout = payoutSummary(s.orders, (id) => s.listings.find((l) => l.id === id), fee)
  const rating = ratingSummary(s.reviews)
  return {
    business: `${s.business.type} · GST ${s.business.gst ? 'added' : 'missing'}`,
    verification: `${done} of 5 done${s.verification.gst !== 'done' ? ' · GST pending' : ''}`,
    plan: `${plan.name} · ${PLATFORM} takes ${Math.round(fee * 100)}%`,
    payouts: `${formatINR(payout.next)} on ${formatDayShort(nextPayoutDate())}`,
    policies: `Deposit ${s.policies.depositMultiple}× day rate · ${plural(s.policies.turnaround, 'turnaround day')}`,
    delivery: s.delivery.enabled ? `You deliver within ${s.delivery.radiusKm} km · ${formatINR(s.delivery.perTrip)} a trip` : 'Renters collect',
    reviews: (
      <>
        {rating.avg.toFixed(1)} from {plural(s.reviews.length, 'review')}
        {rating.unreplied > 0 && <Tag tone="brand" className="ml-1.5">{rating.unreplied} to reply</Tag>}
      </>
    ),
    promote: `${s.followers.toLocaleString('en-IN')} followers`,
    staff: plural(s.staff.length, 'person', 'people'),
    language: `${OWNER_LANGUAGES.find((l) => l.id === language)?.native ?? 'English'} · ${theme === 'system' ? 'system theme' : `${theme} theme`}`,
    help: 'Answers, support and demo data',
  }
}

/** PROFILE: business card, then who you are · money · how you trade · growing · this app. */
export function ProfileOverview() {
  const s = useOwner()
  const summaries = useSummaries()
  const rating = ratingSummary(s.reviews)
  const verified = isVerified(s.verification)

  return (
    <>
      <PageHeader crumbs={[{ label: 'Profile' }]} title="Profile" subtitle="Your business, money, how you trade and this app" />

      {/* Business card */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 sm:h-24" />
        <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
          <Avatar name={s.business.name} size="xl" className="-mt-9 rounded-full ring-4 ring-surface" />
          <div className="min-w-0 flex-1 basis-56 pt-3">
            <p className="flex items-center gap-1.5 font-display text-xl font-extrabold text-fg">
              <span className="truncate">{s.business.name}</span>
              {verified && <SealCheckIcon size={20} weight="fill" className="shrink-0 text-accent" aria-label="Verified" />}
            </p>
            <p className="text-sm text-fg-2">
              {s.business.type} · {s.business.owner}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
              <StarIcon size={13} weight="fill" className="text-amber-500" /> {rating.avg.toFixed(1)} · {s.followers.toLocaleString('en-IN')} followers · {s.business.address}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={EyeIcon} onClick={() => navigate('/profile/preview')}>
              See it as a renter does
            </Button>
            <Button variant="secondary" icon={PencilSimpleIcon} onClick={() => navigate('/profile/business')}>
              Edit business
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PROFILE_SECTIONS.map((g) => (
          <Card key={g.label}>
            <p className="border-b border-line px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{g.label}</p>
            <ul className="divide-y divide-line">
              {g.items.map((it) => (
                <li key={it.id}>
                  <a {...linkProps(`/profile/${it.id}`)} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/70">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                      <it.icon size={19} weight="duotone" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-fg">{it.label}</span>
                      <span className="block truncate text-xs text-muted">{summaries[it.id]}</span>
                    </span>
                    <CaretRightIcon size={14} weight="bold" className="shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
                  </a>
                </li>
              ))}
              {g.label === 'This app' && (
                <li>
                  <button type="button" onClick={openRenterApp} className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/70">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                      <FilmSlateIcon size={19} weight="duotone" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-fg">Switch to renting things</span>
                      <span className="block truncate text-xs text-muted">Open the renter app</span>
                    </span>
                    <CaretRightIcon size={14} weight="bold" className="shrink-0 text-subtle" />
                  </button>
                </li>
              )}
            </ul>
          </Card>
        ))}
        <Card className="flex flex-col justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-fg">Demo data</p>
            <p className="text-xs text-muted">Restore the Kapoor Props sample and clear every change made here.</p>
          </div>
          <Button
            variant="secondary"
            icon={ArrowCounterClockwiseIcon}
            className="self-start"
            onClick={async () => {
              if (await confirm({ title: 'Reset demo data?', message: 'Clears every change made in the admin panel.', confirmText: 'Reset', tone: 'danger', icon: ArrowCounterClockwiseIcon })) resetDemo()
            }}
          >
            Reset demo data
          </Button>
        </Card>
      </div>
    </>
  )
}

/** Settings-style frame: a grouped section nav on the left, the section on the right. */
export function ProfileLayout({ section, title, subtitle, actions, children }: { section: SectionId | 'preview'; title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const unreplied = useOwner((s) => ratingSummary(s.reviews).unreplied)
  const current = PROFILE_SECTIONS.flatMap((g) => g.items).find((i) => i.id === section)
  return (
    <>
      <PageHeader crumbs={[{ label: 'Profile', to: '/profile' }, { label: current?.label ?? title }]} title={title} subtitle={subtitle} actions={actions} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Profile sections" className="hidden lg:block">
          <div className="sticky top-4 flex flex-col gap-4">
            {PROFILE_SECTIONS.map((g) => (
              <div key={g.label}>
                <p className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-subtle">{g.label}</p>
                {g.items.map((it) => {
                  const on = it.id === section
                  return (
                    <a key={it.id} {...linkProps(`/profile/${it.id}`)} aria-current={on ? 'page' : undefined} className={cn('flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors', on ? 'bg-accent-soft font-semibold text-accent-soft-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg')}>
                      <it.icon size={16} weight={on ? 'fill' : 'regular'} />
                      <span className="min-w-0 flex-1 truncate">{it.label}</span>
                      {it.id === 'reviews' && <CountBadge n={unreplied} tone="brand" />}
                    </a>
                  )
                })}
              </div>
            ))}
          </div>
        </nav>
        <div className="min-w-0">
          <Select aria-label="Profile section" value={section} onChange={(e) => navigate(`/profile/${e.target.value}`)} className="mb-4 lg:hidden">
            {section === 'preview' && <option value="preview">See it as a renter does</option>}
            {PROFILE_SECTIONS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          {children}
        </div>
      </div>
    </>
  )
}
