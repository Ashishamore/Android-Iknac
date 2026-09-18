import { CreditCardIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import type { Side } from '@/lib/platform'
import { useDemoAccount, usePlatform } from '@/store/platform'

/**
 * The plan row as the Control Centre has it. Moving an account between plans,
 * or switching its subscription off, shows up here on either Profile.
 */
export function SubscriptionNote({ side, className }: { side: Side; className?: string }) {
  const account = useDemoAccount(side)
  const plan = usePlatform((s) => s.plans.find((p) => p.id === account?.planId))
  if (!account || !plan) return null
  const off = plan.price > 0 && !account.subscription

  return (
    <div className={cn('flex items-start gap-3 rounded-2xl px-4 py-3', off ? 'bg-warning-soft' : 'bg-surface-2', className)}>
      {off ? <WarningCircleIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-warning" /> : <CreditCardIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-muted" />}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-fg">{off ? 'Your subscription is switched off' : `On ${plan.name}${plan.price ? ` · ${formatINR(plan.price)} a month` : ' · free'}`}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-fg-2">{off ? 'You are on the free limits for now. Nothing you have made has been touched.' : plan.blurb}</p>
      </div>
    </div>
  )
}
