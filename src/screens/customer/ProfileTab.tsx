import {
  ArrowCounterClockwiseIcon,
  CaretRightIcon,
  CreditCardIcon,
  CrownSimpleIcon,
  GearSixIcon,
  HeartIcon,
  KanbanIcon,
  LifebuoyIcon,
  MapPinIcon,
  PresentationChartIcon,
  ReceiptIcon,
  SealCheckIcon,
  SignOutIcon,
  StarIcon,
  StorefrontIcon,
  UsersThreeIcon,
  WalletIcon,
} from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { PLANS } from '@/data/profile'
import { formatDate } from '@/lib/dates'
import { formatINR, formatPhone } from '@/lib/format'
import { bookingStatus, pendingReviews } from '@/lib/ops'
import { nav } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useDiscover } from '@/store/discover'
import { useProfile } from '@/store/profile'
import { useProjectOps } from '@/store/projectOps'
import { resetDemoData } from '@/store/reset'
import { useSaved } from '@/store/saved'
import { useAccount, useDisplayName } from '@/store/session'
import { useStudio } from '@/store/studio'
import { AppBar, Avatar, Badge, Card, LargeTitle, ListGroup, ListItem, Screen, Tag } from '@/ui'
import { SwitchToRentingSheet } from './profile/SwitchToRentingSheet'
import { useLogout } from '../shared/useLogout'

const go = (path: string) => () => nav.push(`/customer/profile/${path}`)

/** PROFILE: Me, saved items, boards and bookings, money, account, help, settings. */
export default function ProfileTab() {
  const popup = usePopup()
  const name = useDisplayName()
  const phone = useAccount()?.phone
  const logOut = useLogout()
  const profile = useProfile()
  const savedProps = Object.keys(useSaved((s) => s.saved)).length
  const savedVendors = Object.keys(useSaved((s) => s.vendors)).length
  const savedSearches = useDiscover((s) => s.saved).length
  const boards = useProjectOps((s) => s.boards)
  const bookings = useProjectOps((s) => s.bookings)
  const runs = useProjectOps((s) => s.runs)
  const members = useProjectOps((s) => s.members)
  const aiBoards = useStudio((s) => s.boards).length
  const [switchOpen, setSwitchOpen] = useState(false)

  const active = bookings.filter((b) => bookingStatus(b, runs).group !== 'completed').length
  const held = bookings.filter((b) => bookingStatus(b, runs).group !== 'completed').reduce((n, b) => n + b.amounts.deposit, 0)
  const toReview = useMemo(() => pendingReviews(bookings, runs, boards, profile.reviews).length, [bookings, runs, boards, profile.reviews])
  const people = new Set(members.filter((m) => !m.you).map((m) => m.phone)).size
  const plan = PLANS.find((p) => p.id === profile.plan.id)!
  const verified = profile.verified.phone && profile.verified.id

  const reset = async () => {
    const ok = await popup.confirm({
      title: 'Reset demo data?',
      message: 'This signs you out of both sides and clears everything created in the prototype. Theme, colour and settings are kept.',
      confirmText: 'Reset',
      tone: 'danger',
      icon: ArrowCounterClockwiseIcon,
    })
    if (ok) void resetDemoData()
  }

  return (
    <Screen header={<AppBar title="Profile" titleOnScroll />}>
      <LargeTitle title="Profile" className="@medium:mx-auto @medium:max-w-2xl" />

      {/* Me → Name · House · City · Verified */}
      <div className="px-4 @medium:mx-auto @medium:max-w-2xl">
        <Card onClick={go('edit')} className="p-4">
          <div className="flex items-center gap-4">
            <Avatar name={name} src={profile.photo ?? undefined} size="xl" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-display text-lg font-bold text-fg">
                <span className="truncate">{name}</span>
                {verified && <SealCheckIcon size={18} weight="fill" className="shrink-0 text-accent" aria-label="Verified" />}
              </p>
              <p className="truncate text-sm text-fg-2">
                {profile.role} · {profile.house}
              </p>
              <p className="flex items-center gap-1 text-[13px] text-muted">
                <MapPinIcon size={13} weight="fill" className="shrink-0" />
                <span className="truncate">
                  {profile.city}
                  {phone ? ` · ${formatPhone(phone)}` : ''}
                </span>
              </p>
            </div>
            <CaretRightIcon size={16} weight="bold" className="shrink-0 text-subtle" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Tag tone={verified ? 'success' : 'warning'} dot>
              {verified ? 'Verified' : 'Verify your ID'}
            </Tag>
            <Tag tone={profile.verified.gst ? 'success' : 'neutral'} dot>
              {profile.verified.gst ? 'GST verified' : 'GST not verified'}
            </Tag>
            <Tag tone="brand">
              <CrownSimpleIcon size={11} weight="fill" /> {plan.name}
            </Tag>
          </div>
        </Card>
      </div>

      <div className="@medium:mx-auto @medium:max-w-2xl">
        <ListGroup className="mt-6">
          <ListItem
            icon={HeartIcon}
            iconTone="danger"
            title="Saved items"
            subtitle={`${savedProps} props · ${savedVendors} vendors · ${savedSearches} searches`}
            onClick={go('saved')}
          />
        </ListGroup>

        <ListGroup title="Work" className="mt-6">
          <ListItem icon={KanbanIcon} iconTone="brand" title="My boards" subtitle={`${boards.length} project boards · ${aiBoards} AI boards`} onClick={go('boards')} />
          <ListItem icon={ReceiptIcon} iconTone="brand" title="All bookings" subtitle={`${bookings.length} bookings · ${active} active`} onClick={go('bookings')} />
        </ListGroup>

        <ListGroup title="Money" className="mt-6">
          <ListItem
            icon={CrownSimpleIcon}
            iconTone="warning"
            title="Plan"
            subtitle={`${plan.name} · ${plan.monthly ? `renews ${formatDate(profile.plan.renewsOn)}` : 'free forever'}`}
            onClick={go('plan')}
          />
          <ListItem icon={WalletIcon} iconTone="success" title="Payments & deposits" subtitle={held ? `${formatINR(held)} deposit held` : 'No deposits held'} onClick={go('payments')} />
          <ListItem
            icon={CreditCardIcon}
            iconTone="info"
            title="Invoices & GST"
            subtitle={profile.verified.gst ? `GSTIN ${profile.gst.gstin}` : 'Add your GSTIN for tax invoices'}
            onClick={go('invoices')}
          />
        </ListGroup>

        <ListGroup title="Account" className="mt-6">
          <ListItem icon={MapPinIcon} iconTone="neutral" title="Saved addresses" subtitle={`${profile.addresses.length} saved`} onClick={go('addresses')} />
          <ListItem icon={UsersThreeIcon} iconTone="neutral" title="Team" subtitle={`${people} people across your projects`} onClick={go('team')} />
          <ListItem
            icon={StarIcon}
            iconTone="neutral"
            title="Reviews"
            subtitle={`${profile.reviews.length} written`}
            trailing={toReview > 0 ? <Badge tone="brand">{toReview} to write</Badge> : undefined}
            chevron
            onClick={go('reviews')}
          />
        </ListGroup>

        <ListGroup title="Support" className="mt-6">
          <ListItem icon={LifebuoyIcon} iconTone="neutral" title="Help & support" subtitle="FAQs, chat, call, tickets" onClick={go('help')} />
          <ListItem icon={GearSixIcon} iconTone="neutral" title="Settings" subtitle="Notifications · Units · Language" onClick={go('settings')} />
        </ListGroup>

        {/* Switch to renting out my things */}
        <div className="px-4 pt-6">
          <Card onClick={() => setSwitchOpen(true)} className="flex items-center gap-3 bg-accent-soft p-4 shadow-none">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-accent-fg">
              <StorefrontIcon size={22} weight="fill" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-accent-soft-fg">Switch to renting out my things</span>
              <span className="block text-[13px] text-fg-2">List your props and earn from other shoots</span>
            </span>
            <CaretRightIcon size={16} weight="bold" className="shrink-0 text-accent" />
          </Card>
        </div>

        <ListGroup className="mt-6">
          <ListItem icon={PresentationChartIcon} iconTone="neutral" title="View onboarding" onClick={() => nav.push('/customer/onboarding')} />
          <ListItem icon={ArrowCounterClockwiseIcon} iconTone="warning" title="Reset demo data" subtitle="Clear everything created in the prototype" onClick={reset} />
          <ListItem icon={SignOutIcon} title="Log out" destructive onClick={logOut} />
        </ListGroup>
        <p className="px-4 pb-8 pt-4 text-center text-xs text-subtle">Prototype · props rental for film & ad shoots</p>
      </div>

      <SwitchToRentingSheet open={switchOpen} onClose={() => setSwitchOpen(false)} />
    </Screen>
  )
}
