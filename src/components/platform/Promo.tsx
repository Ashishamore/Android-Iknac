import { ArrowRightIcon, BroadcastIcon, CaretRightIcon, RocketLaunchIcon, WrenchIcon, XIcon } from '@phosphor-icons/react'
import { CATEGORY_ICON, propById } from '@/data/props'
import { cn } from '@/lib/cn'
import type { Broadcast, Campaign } from '@/lib/platform'

/**
 * What the Control Centre puts inside the phone apps: the two advertising
 * slots, the broadcast strip and the maintenance notice.
 *
 * They take everything as props and never touch navigation, so the panel can
 * render the same components at phone width — the preview is the real card.
 */

function Plate({ propId, className, iconSize = 26 }: { propId: string | null; className?: string; iconSize?: number }) {
  const prop = propId ? propById(propId) : undefined
  const Glyph = prop?.icon ?? (prop ? CATEGORY_ICON[prop.category] : RocketLaunchIcon)
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-soft-fg', className)}>
      <Glyph size={iconSize} weight="duotone" />
    </span>
  )
}

/** Renter Home: the card under the greeting, above the banners. */
export function CampaignCard({ campaign, onOpen, className }: { campaign: Campaign; onOpen?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onOpen} className={cn('pressable flex w-full items-center gap-3 rounded-3xl bg-surface p-3.5 text-left shadow-card outline-none', className)}>
      <Plate propId={campaign.propId} className="size-14" />
      <span className="min-w-0 flex-1">
        {campaign.sponsored && <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-subtle">Sponsored</span>}
        <span className="block truncate text-[15px] font-bold text-fg">{campaign.headline || 'Headline'}</span>
        <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-fg-2">{campaign.sub}</span>
        <span className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-bold text-accent">
          {campaign.button || 'Have a look'}
          <ArrowRightIcon size={13} weight="bold" />
        </span>
      </span>
    </button>
  )
}

/** Provider Today: the strip under the earnings card. */
export function CampaignStrip({ campaign, onOpen, className }: { campaign: Campaign; onOpen?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onOpen} className={cn('pressable flex w-full items-center gap-3 rounded-2xl bg-accent-soft p-3.5 text-left outline-none', className)}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg">
        <RocketLaunchIcon size={20} weight="fill" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-accent-soft-fg">{campaign.headline || 'Headline'}</span>
        <span className="block text-[13px] leading-snug text-fg-2">{campaign.sub}</span>
        {campaign.sponsored && <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-subtle">Sponsored</span>}
      </span>
      <CaretRightIcon size={15} weight="bold" className="shrink-0 text-accent" />
    </button>
  )
}

/** The strip a broadcast puts at the top of an app. */
export function BroadcastStrip({ broadcast, onOpen, onHide, inset, className }: { broadcast: Pick<Broadcast, 'tone' | 'headline' | 'body' | 'button'>; onOpen?: () => void; onHide?: () => void; inset?: boolean; className?: string }) {
  const warn = broadcast.tone === 'warning'
  return (
    <div role="status" className={cn('flex items-start gap-2 px-4 py-2', warn ? 'bg-danger-soft' : 'bg-accent-soft', inset && 'pt-[calc(var(--sat)+8px)]', className)}>
      <BroadcastIcon size={15} weight="fill" className={cn('mt-0.5 shrink-0', warn ? 'text-danger' : 'text-accent')} />
      <div className="min-w-0 flex-1">
        <p className={cn('text-[12px] font-bold leading-snug', warn ? 'text-danger' : 'text-accent-soft-fg')}>{broadcast.headline || 'Headline'}</p>
        <p className="text-[12px] leading-snug text-fg-2">{broadcast.body}</p>
        {broadcast.button && (
          <button type="button" onClick={onOpen} className="mt-0.5 inline-flex items-center gap-0.5 text-[12px] font-bold text-accent">
            {broadcast.button.label}
            <CaretRightIcon size={11} weight="bold" />
          </button>
        )}
      </div>
      {onHide && (
        <button type="button" aria-label="Hide this notice" onClick={onHide} className="-mr-1 -mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg text-muted active:bg-black/5">
          <XIcon size={12} weight="bold" />
        </button>
      )}
    </div>
  )
}

/** The maintenance notice, from the feature flag of the same name. */
export function MaintenanceStrip({ text, inset, className }: { text: string; inset?: boolean; className?: string }) {
  return (
    <div role="status" className={cn('flex items-start gap-2 bg-warning-soft px-4 py-2', inset && 'pt-[calc(var(--sat)+8px)]', className)}>
      <WrenchIcon size={15} weight="fill" className="mt-0.5 shrink-0 text-warning" />
      <p className="min-w-0 flex-1 text-[12px] leading-snug text-fg-2">{text}</p>
    </div>
  )
}
