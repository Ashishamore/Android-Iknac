import {
  ArrowCounterClockwiseIcon,
  BuildingsIcon,
  CaretRightIcon,
  CrownSimpleIcon,
  EyeIcon,
  FilmSlateIcon,
  GavelIcon,
  IdentificationBadgeIcon,
  LifebuoyIcon,
  MegaphoneIcon,
  SealCheckIcon,
  SignOutIcon,
  StarIcon,
  TranslateIcon,
  TruckIcon,
  UsersThreeIcon,
  WalletIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { OwnerAppBar } from '@/components/owner/OwnerUI'
import { OWNER_LANGUAGES, OWNER_PLANS, PLATFORM } from '@/data/owner'
import { formatDayShort } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { sleep } from '@/lib/hooks'
import { nextPayoutDate, payoutSummary, ratingSummary } from '@/lib/owner'
import { nav } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useFeeRate, useOwner } from '@/store/owner'
import { usePrefs } from '@/store/prefs'
import { resetDemoData } from '@/store/reset'
import { useSession } from '@/store/session'
import { Avatar, Badge, Button, Card, LargeTitle, ListGroup, ListItem, OptionList, Screen } from '@/ui'
import { useLogout } from '../shared/useLogout'

const go = (path: string) => () => nav.push(`/renter/profile/${path}`)

/** PROFILE: who you are, money, how you trade, growing, this app. */
export default function OwnerProfileTab() {
  const popup = usePopup()
  const logOut = useLogout()
  const s = useOwner()
  const fee = useFeeRate()
  const language = usePrefs((p) => p.language)
  const setLanguage = usePrefs((p) => p.setLanguage)
  const [langOpen, setLangOpen] = useState(false)
  const [switchOpen, setSwitchOpen] = useState(false)
  const v = s.verification
  const done = Object.values(v).filter((x) => x === 'done').length
  const verified = v.phone === 'done' && v.identity === 'done' && v.warehouse === 'done' && v.bank === 'done'
  const plan = OWNER_PLANS.find((p) => p.id === s.plan)!
  const payout = payoutSummary(s.orders, (id) => s.listings.find((l) => l.id === id), fee)
  const rating = ratingSummary(s.reviews)
  const lang = OWNER_LANGUAGES.find((l) => l.id === language) ?? OWNER_LANGUAGES[0]

  const reset = async () => {
    const ok = await popup.confirm({
      title: 'Reset demo data?',
      message: 'This signs you out of both sides and clears everything created in the prototype.',
      confirmText: 'Reset',
      tone: 'danger',
      icon: ArrowCounterClockwiseIcon,
    })
    if (ok) void resetDemoData()
  }

  return (
    <Screen header={<OwnerAppBar />}>
      <LargeTitle title="Profile" className="@medium:mx-auto @medium:max-w-2xl" />
      <div className="px-4 @medium:mx-auto @medium:max-w-2xl">
        {/* Business card */}
        <Card className="overflow-hidden">
          <button type="button" onClick={go('business')} className="flex w-full items-center gap-4 p-4 text-left">
            <Avatar name={s.business.name} size="xl" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-display text-lg font-bold text-fg">
                <span className="truncate">{s.business.name}</span>
                {verified && <SealCheckIcon size={18} weight="fill" className="shrink-0 text-accent" aria-label="Verified" />}
              </span>
              <span className="block truncate text-sm text-fg-2">
                {s.business.type} · {s.business.owner}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
                <StarIcon size={13} weight="fill" className="text-amber-500" /> {rating.avg.toFixed(1)} · {s.followers.toLocaleString('en-IN')} followers
              </span>
            </span>
            <CaretRightIcon size={16} weight="bold" className="shrink-0 text-subtle" />
          </button>
          <button type="button" onClick={go('preview')} className="flex w-full items-center justify-center gap-2 border-t border-line py-3 text-sm font-semibold text-accent transition-colors active:bg-surface-2">
            <EyeIcon size={17} weight="bold" /> See it as a renter does
          </button>
        </Card>
      </div>

      <div className="space-y-6 pb-8 pt-6 @medium:mx-auto @medium:max-w-2xl">
        <ListGroup title="Who you are">
          <ListItem icon={BuildingsIcon} iconTone="brand" title="Business" subtitle={`${s.business.type} · GST ${s.business.gst ? 'added' : 'missing'}`} onClick={go('business')} />
          <ListItem
            icon={IdentificationBadgeIcon}
            iconTone={done === 5 ? 'success' : 'warning'}
            title="Verification"
            subtitle={`${done} of 5 done${v.gst !== 'done' ? ' · GST pending' : ''}`}
            onClick={go('verification')}
          />
        </ListGroup>

        <ListGroup title="Money">
          <ListItem icon={CrownSimpleIcon} iconTone="warning" title="Plan" subtitle={`${plan.name} · ${PLATFORM} takes ${Math.round(fee * 100)}%`} onClick={go('plan')} />
          <ListItem icon={WalletIcon} iconTone="success" title="Payouts" subtitle={`${formatINR(payout.next)} on ${formatDayShort(nextPayoutDate())}`} onClick={go('payouts')} />
        </ListGroup>

        <ListGroup title="How you trade">
          <ListItem icon={GavelIcon} iconTone="neutral" title="Policies" subtitle={`Deposit ${s.policies.depositMultiple}× day rate · ${s.policies.turnaround} turnaround day${s.policies.turnaround === 1 ? '' : 's'}`} onClick={go('policies')} />
          <ListItem
            icon={TruckIcon}
            iconTone="neutral"
            title="Delivery"
            subtitle={s.delivery.enabled ? `You deliver within ${s.delivery.radiusKm} km · ${formatINR(s.delivery.perTrip)} a trip` : 'Renters collect'}
            onClick={go('delivery')}
          />
          <ListItem
            icon={StarIcon}
            iconTone="neutral"
            title="Reviews"
            subtitle={`${rating.avg.toFixed(1)} from ${s.reviews.length} reviews`}
            trailing={rating.unreplied ? <Badge tone="brand">{rating.unreplied} to reply</Badge> : undefined}
            chevron
            onClick={go('reviews')}
          />
        </ListGroup>

        <ListGroup title="Growing">
          <ListItem icon={MegaphoneIcon} iconTone="brand" title="Promote" subtitle={`${s.followers.toLocaleString('en-IN')} followers`} onClick={go('promote')} />
          <ListItem icon={UsersThreeIcon} iconTone="brand" title="Staff" subtitle={`${s.staff.length} people`} onClick={go('staff')} />
        </ListGroup>

        <ListGroup title="This app">
          <ListItem icon={TranslateIcon} title="Language" value={lang.native} onClick={() => setLangOpen(true)} />
          <ListItem icon={LifebuoyIcon} title="Help & settings" onClick={go('help')} />
          <ListItem icon={FilmSlateIcon} iconTone="brand" title="Switch to renting things" subtitle="Open the renter app" onClick={() => setSwitchOpen(true)} />
        </ListGroup>

        <ListGroup>
          <ListItem icon={ArrowCounterClockwiseIcon} iconTone="warning" title="Reset demo data" onClick={reset} />
          <ListItem icon={SignOutIcon} title="Log out" destructive onClick={logOut} />
        </ListGroup>
      </div>

      <BottomSheet open={langOpen} onClose={() => setLangOpen(false)} title="Language" description="For this app and your messages">
        <OptionList
          options={OWNER_LANGUAGES.map((l) => ({ value: l.id, label: l.native, description: l.id === 'en' ? undefined : l.label }))}
          value={OWNER_LANGUAGES.some((l) => l.id === language) ? language : 'en'}
          onSelect={(id) => {
            setLanguage(id)
            setLangOpen(false)
            popup.toast(id === 'en' ? 'Language set to English' : `${OWNER_LANGUAGES.find((l) => l.id === id)!.label} selected · the prototype shows English for now`, { tone: 'success' })
          }}
        />
      </BottomSheet>
      <SwitchSheet open={switchOpen} onClose={() => setSwitchOpen(false)} />
    </Screen>
  )
}

/** Switch to renting things → the renter (art director) app. */
function SwitchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const popup = usePopup()
  const phone = useSession((s) => s.accounts.owner?.phone ?? null)
  const hasCustomer = useSession((s) => !!s.accounts.customer)
  const enter = useSession((s) => s.enter)
  const login = useSession((s) => s.login)
  const go = async () => {
    onClose()
    const hide = popup.loading('Opening the renter app…')
    await sleep(800)
    hide()
    if (hasCustomer) enter('customer', '/customer')
    else login('customer', phone, '/customer')
  }
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Rent props for your own shoots"
      description={hasCustomer ? 'Jump to your renter account' : 'Use the same number to open a renter account'}
      footer={
        <Button size="lg" block icon={FilmSlateIcon} onClick={go}>
          Switch to renting
        </Button>
      }
    >
      <p className="text-[15px] leading-relaxed text-fg-2">Search props from other owners, plan shoots, build boards with AI and book with delivery. Your stock stays here; switch back any time from the renter app’s Profile.</p>
    </BottomSheet>
  )
}
