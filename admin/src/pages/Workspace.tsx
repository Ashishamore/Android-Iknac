import { ArrowRightIcon, ArrowSquareOutIcon, FilmSlateIcon, PackageIcon, SealCheckIcon, ShieldCheckIcon, StorefrontIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { EASE_OUT } from '@/lib/motion'
import { useOwner } from '@/store/owner'
import { isVerified, plural, renterAppUrl, useCounts } from '~/lib/data'
import { navigate } from '~/router'
import { useCounts as useAdminCounts } from '~/admin/lib'
import { useUi } from '~/store/ui'
import { Checkbox } from '~/ui/controls'
import { Avatar, CountBadge } from '~/ui/display'

/** ENTRY: the fork. "I rent props out" (with what's waiting) or the renter app. */
export default function Workspace() {
  const business = useOwner((s) => s.business)
  const verification = useOwner((s) => s.verification)
  const orders = useOwner((s) => s.orders)
  const counts = useCounts()
  const remember = useUi((s) => s.rememberWorkspace)
  const setRemember = useUi((s) => s.setRememberWorkspace)
  const active = orders.filter((o) => o.status === 'confirmed' || o.status === 'out').length

  return (
    <div className="thin-scroll h-dvh overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-14">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg">
            <PackageIcon size={19} weight="fill" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-[-0.01em] text-fg">PropKart</span>
          <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted">for Business</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }} className="mt-10 sm:mt-16">
          <p className="text-sm font-semibold text-muted">Welcome back, {business.owner.split(' ')[0]}</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-[-0.02em] text-fg sm:text-4xl">Choose a workspace</h1>
          <p className="mt-2 text-[15px] text-fg-2">One login, two sides. You can switch any time from the account menu.</p>
        </motion.div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <motion.button
            type="button"
            onClick={() => navigate('/today')}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.05 }}
            className="group relative flex flex-col rounded-2xl border-2 border-accent bg-surface p-5 text-left shadow-float transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-12 place-items-center rounded-xl bg-accent text-accent-fg">
                <StorefrontIcon size={26} weight="duotone" />
              </span>
              {counts.waiting > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
                  <CountBadge n={counts.waiting} /> waiting
                </span>
              )}
            </div>
            <p className="mt-5 font-display text-xl font-bold text-fg">I rent props out</p>
            <div className="mt-2 flex items-center gap-2">
              <Avatar name={business.name} size="xs" />
              <span className="flex min-w-0 items-center gap-1 text-sm font-semibold text-fg-2">
                <span className="truncate">{business.name}</span>
                {isVerified(verification) && <SealCheckIcon size={14} weight="fill" className="shrink-0 text-accent" />}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-muted">
              {plural(counts.listings, 'listing')} · {plural(active, 'active booking')} · {plural(counts.moving, 'handover')} today
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-accent">
              Open Today <ArrowRightIcon size={15} weight="bold" className="transition-transform group-hover:translate-x-1" />
            </span>
          </motion.button>

          <motion.a
            href={renterAppUrl()}
            target="_blank"
            rel="noopener"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.1 }}
            className="group flex flex-col rounded-2xl border border-line bg-surface p-5 text-left shadow-card transition-[transform,border-color] hover:-translate-y-0.5 hover:border-line-strong"
          >
            <span className="grid size-12 place-items-center rounded-xl bg-surface-2 text-fg-2">
              <FilmSlateIcon size={26} weight="duotone" />
            </span>
            <p className="mt-5 font-display text-xl font-bold text-fg">I hire props for shoots</p>
            <p className="mt-2 text-sm text-fg-2">Art director · renter app</p>
            <p className="mt-1 text-[13px] text-muted">Search props, plan shoots with AI boards, book with delivery.</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-fg-2">
              Open in a new tab <ArrowSquareOutIcon size={15} weight="bold" />
            </span>
          </motion.a>
        </div>

        <div className="mt-6 flex items-center gap-2.5 text-sm text-fg-2">
          <Checkbox checked={remember} onChange={setRemember} label="Remember my choice" />
          <span className="cursor-pointer select-none" onClick={() => setRemember(!remember)}>
            Remember my choice and open straight on Today next time
          </span>
        </div>

        <ControlCentreLink />

        <p className="mt-auto pt-12 text-[13px] text-muted">Coming from the renter app? Use “Switch to renting out my things” in its Profile to land here with the same number.</p>
      </div>
    </div>
  )
}

/** "Or run the place" — the Control Centre, for whoever runs PropKart itself. */
function ControlCentreLink() {
  const waiting = useAdminCounts().waiting
  return (
    <button
      type="button"
      onClick={() => navigate('/admin')}
      className="group mt-6 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-line-strong"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-fg text-bg">
        <ShieldCheckIcon size={18} weight="fill" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-fg">Or run the place</span>
        <span className="block text-[13px] text-muted">Control Centre · people, listings, money and the flags</span>
      </span>
      {waiting > 0 && <span className="shrink-0 rounded-full bg-danger px-2.5 py-1 text-xs font-bold tabular-nums text-white">{waiting} waiting</span>}
      <ArrowRightIcon size={15} weight="bold" className="shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
