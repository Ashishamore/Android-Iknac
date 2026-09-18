import { CheckIcon, CrownSimpleIcon, FilmSlateIcon, SparkleIcon, UsersThreeIcon, type Icon } from '@phosphor-icons/react'
import { useState } from 'react'
import { PLANS, type PlanId } from '@/data/profile'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { usePopup } from '@/overlays/popupContext'
import { useProfile } from '@/store/profile'
import { useProjectOps } from '@/store/projectOps'
import { activeProjects, useProjects } from '@/store/projects'
import { useStudio } from '@/store/studio'
import { AppBar, Button, Card, ProgressBar, Screen, SectionHeader, Segmented, Tag } from '@/ui'
import { SubscriptionNote } from '@/components/platform/SubscriptionNote'

type Cycle = 'monthly' | 'yearly'
const RANK: Record<PlanId, number> = { free: 0, pro: 1, studio: 2 }

/** Plan: current plan, usage, and switching between Starter / Pro / Studio. */
export default function PlanScreen() {
  const popup = usePopup()
  const plan = useProfile((s) => s.plan)
  const setPlan = useProfile((s) => s.setPlan)
  const credits = useStudio((s) => s.credits)
  const topUp = useStudio((s) => s.topUp)
  const projects = useProjects((s) => s.projects)
  const members = useProjectOps((s) => s.members)
  const [cycle, setCycle] = useState<Cycle>(plan.cycle)
  const current = PLANS.find((p) => p.id === plan.id)!
  const active = activeProjects(projects).length
  const seats = new Set(members.filter((m) => !m.you).map((m) => m.phone)).size + 1

  const choose = async (id: PlanId) => {
    const next = PLANS.find((p) => p.id === id)!
    const upgrade = RANK[id] > RANK[plan.id]
    const price = cycle === 'yearly' ? next.yearly : next.monthly
    const sameTier = id === plan.id
    const ok = await popup.confirm({
      title: sameTier ? `Switch to ${cycle} billing?` : upgrade ? `Upgrade to ${next.name}?` : `Move to ${next.name}?`,
      message:
        id === 'free'
          ? `${active > 1 ? `You have ${active} active projects. Starter allows 1, so you won’t be able to start new ones. ` : ''}Your ${current.name} features stay until ${formatDate(plan.renewsOn)}.`
          : `${formatINR(price)} per ${cycle === 'yearly' ? 'year' : 'month'} + GST, charged to your default payment method. Includes ${next.credits} AI credits a month.`,
      confirmText: sameTier ? 'Switch' : upgrade ? `Pay ${formatINR(price)}` : 'Confirm',
      tone: id === 'free' ? 'danger' : 'brand',
      icon: CrownSimpleIcon,
    })
    if (!ok) return
    const hide = popup.loading(price ? 'Processing payment…' : 'Updating your plan…')
    await sleep(1200)
    hide()
    setPlan(id, id === 'free' ? 'monthly' : cycle)
    if (upgrade) topUp(next.credits, `${next.name} plan credits`)
    haptic('success')
    popup.toast(upgrade ? `Welcome to ${next.name}! ${next.credits} credits added` : `You’re on ${next.name}${id === 'free' ? '' : ` · ${cycle}`}`, { tone: 'success' })
  }

  return (
    <Screen header={<AppBar title="Plan" />}>
      <div className="px-4 pb-10 pt-2 @medium:mx-auto @medium:max-w-2xl">
        <SubscriptionNote side="renter" className="mb-3" />
        {/* Current plan */}
        <div className="relative overflow-hidden rounded-3xl bg-accent p-5 text-accent-fg shadow-float">
          <CrownSimpleIcon aria-hidden size={84} weight="fill" className="absolute -right-2 -top-3 rotate-12 opacity-15" />
          <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-80">Your plan</p>
          <p className="mt-1 font-display text-[28px] font-extrabold leading-tight">{current.name}</p>
          <p className="mt-1 text-sm opacity-90">
            {current.monthly
              ? `${formatINR(plan.cycle === 'yearly' ? current.yearly : current.monthly)} / ${plan.cycle === 'yearly' ? 'year' : 'month'} · renews ${formatDate(plan.renewsOn)}`
              : 'Free forever'}
          </p>
        </div>

        {/* Usage */}
        <SectionHeader title="Usage" className="px-0 pt-6" />
        <Card className="divide-y divide-line px-4">
          <Usage icon={SparkleIcon} label="AI Studio credits" value={`${credits} left`} note={`${current.credits} added each month`} progress={Math.min(100, (credits / current.credits) * 100)} />
          <Usage
            icon={FilmSlateIcon}
            label="Active projects"
            value={current.maxProjects ? `${active} of ${current.maxProjects}` : `${active} · unlimited`}
            progress={current.maxProjects ? Math.min(100, (active / current.maxProjects) * 100) : undefined}
            warn={!!current.maxProjects && active > current.maxProjects}
          />
          <Usage icon={UsersThreeIcon} label="Team seats" value={`${seats} of ${current.maxSeats}`} progress={Math.min(100, (seats / current.maxSeats) * 100)} warn={seats > current.maxSeats} />
        </Card>

        {/* Plans */}
        <div className="flex items-end justify-between gap-3 pb-3 pt-7">
          <div>
            <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-fg">Plans</h2>
            <p className="mt-0.5 text-xs text-muted">Yearly billing gets you 2 months free</p>
          </div>
        </div>
        <Segmented
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: 'Yearly' },
          ]}
          value={cycle}
          onChange={setCycle}
        />
        <div className="mt-4 grid gap-3 @expanded:grid-cols-3">
          {PLANS.map((p) => {
            const isCurrent = p.id === plan.id && (p.id === 'free' || plan.cycle === cycle)
            const price = cycle === 'yearly' ? p.yearly : p.monthly
            const upgrade = RANK[p.id] > RANK[plan.id]
            return (
              <Card key={p.id} className={cn('flex flex-col p-4', isCurrent && 'ring-2 ring-accent')}>
                <div className="flex items-center gap-2">
                  <p className="font-display text-lg font-bold text-fg">{p.name}</p>
                  {p.tag && <Tag tone="brand">{p.tag}</Tag>}
                  {isCurrent && (
                    <Tag tone="success" className="ml-auto">
                      Current
                    </Tag>
                  )}
                </div>
                <p className="mt-1">
                  <span className="font-display text-2xl font-extrabold tabular-nums text-fg">{price ? formatINR(price) : 'Free'}</span>
                  {price > 0 && <span className="text-sm text-muted"> / {cycle === 'yearly' ? 'year' : 'month'}</span>}
                </p>
                {cycle === 'yearly' && p.monthly > 0 && <p className="text-xs font-semibold text-success">Save {formatINR(p.monthly * 12 - p.yearly)} a year</p>}
                <ul className="mt-3 flex-1 space-y-1.5">
                  {[`${p.credits} AI credits a month`, p.projects, p.seats, ...p.perks].map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm text-fg-2">
                      <CheckIcon size={15} weight="bold" className="mt-0.5 shrink-0 text-success" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-4"
                  block
                  variant={isCurrent ? 'outline' : upgrade ? 'primary' : 'secondary'}
                  disabled={isCurrent}
                  onClick={() => choose(p.id)}
                >
                  {isCurrent ? 'Current plan' : p.id === plan.id ? `Switch to ${cycle}` : upgrade ? `Upgrade to ${p.name}` : `Move to ${p.name}`}
                </Button>
              </Card>
            )
          })}
        </div>
        <p className="mt-4 text-center text-xs text-muted">Prices exclude 18% GST. Change or cancel any time.</p>
      </div>
    </Screen>
  )
}

function Usage({ icon: UIcon, label, value, note, progress, warn }: { icon: Icon; label: string; value: string; note?: string; progress?: number; warn?: boolean }) {
  return (
    <div className="py-3.5">
      <div className="flex items-center gap-3">
        <UIcon size={20} className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-fg">{label}</span>
          {note && <span className="block text-xs text-muted">{note}</span>}
        </span>
        <span className={cn('shrink-0 text-sm font-bold tabular-nums', warn ? 'text-warning' : 'text-fg')}>{value}</span>
      </div>
      {progress !== undefined && <ProgressBar value={progress} tone={warn ? 'warning' : 'brand'} className="ml-8 mt-2.5 h-1.5" />}
    </div>
  )
}
