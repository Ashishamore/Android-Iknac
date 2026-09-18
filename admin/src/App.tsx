import { CompassIcon } from '@phosphor-icons/react'
import { useEffect, type ReactNode } from 'react'
import { ControlCentre } from './admin/ControlCentre'
import AddStock from './pages/add/AddStock'
import DraftForm from './pages/add/DraftForm'
import ImportList from './pages/add/ImportList'
import OneItem from './pages/add/OneItem'
import RapidCapture from './pages/add/RapidCapture'
import Diary from './pages/Diary'
import { HandoverDetail, HandoverHome } from './pages/Handover'
import Inbox from './pages/inbox/Inbox'
import ListingDetail from './pages/ListingDetail'
import { BusinessPage, VerificationPage } from './pages/profile/account'
import { HelpPage, LanguagePage, VendorPreviewPage } from './pages/profile/app'
import { PromotePage, StaffPage } from './pages/profile/growing'
import { PayoutsPage, PlanPage } from './pages/profile/money'
import { ProfileOverview } from './pages/profile/Profile'
import { DeliveryPage, PoliciesPage, ReviewsPage } from './pages/profile/trade'
import Provider from './pages/Provider'
import Stock from './pages/Stock'
import Today from './pages/Today'
import Workspace from './pages/Workspace'
import { match, navigate, useLocation } from './router'
import { NotificationList } from './shell/Notifications'
import { Shell } from './shell/Shell'
import { useUi } from './store/ui'
import { useThemeController } from './lib/theme'
import { Button } from './ui/controls'
import { Card, EmptyState, PageHeader } from './ui/display'
import { FeedbackHost } from './ui/overlays'

type Route = { path: string; render: (p: Record<string, string>) => ReactNode; bleed?: boolean; bare?: boolean; title: string }

const PROFILE: Record<string, () => ReactNode> = {
  business: () => <BusinessPage />,
  verification: () => <VerificationPage />,
  plan: () => <PlanPage />,
  payouts: () => <PayoutsPage />,
  policies: () => <PoliciesPage />,
  delivery: () => <DeliveryPage />,
  reviews: () => <ReviewsPage />,
  promote: () => <PromotePage />,
  staff: () => <StaffPage />,
  language: () => <LanguagePage />,
  help: () => <HelpPage />,
  preview: () => <VendorPreviewPage />,
}

const ROUTES: Route[] = [
  { path: '/workspace', bare: true, title: 'Choose a workspace', render: () => <Workspace /> },
  { path: '/today', title: 'Today', render: () => <Today /> },
  { path: '/stock', title: 'Stock', render: () => <Stock /> },
  { path: '/stock/:id', title: 'Listing', render: (p) => <ListingDetail key={p.id} id={p.id} /> },
  { path: '/add', title: 'Add stock', render: () => <AddStock /> },
  { path: '/add/rapid', title: 'Rapid capture', render: () => <RapidCapture /> },
  { path: '/add/one', title: 'One item', render: () => <OneItem /> },
  { path: '/add/import', title: 'From a list', render: () => <ImportList /> },
  { path: '/add/draft/:id', title: 'Finish capture', render: (p) => <DraftForm id={p.id} /> },
  { path: '/diary', title: 'Diary', render: () => <Diary /> },
  { path: '/requests', title: 'Messages', render: () => <Inbox /> },
  { path: '/requests/:id', title: 'Messages', render: (p) => <Inbox selectedId={p.id} /> },
  { path: '/orders/:id', title: 'Order', render: (p) => <Inbox selectedId={p.id} /> },
  { path: '/handover', title: 'Handover', render: () => <HandoverHome /> },
  { path: '/handover/:id', title: 'Handover', render: (p) => <HandoverDetail key={p.id} id={p.id} /> },
  {
    path: '/notifications',
    title: 'Notifications',
    render: () => (
      <>
        <PageHeader title="Notifications" />
        <Card className="overflow-hidden">
          <NotificationList />
        </Card>
      </>
    ),
  },
  { path: '/profile', title: 'Profile', render: () => <ProfileOverview /> },
  { path: '/profile/:section', title: 'Profile', render: (p) => PROFILE[p.section]?.() ?? <NotFound /> },
  { path: '/provider', bare: true, title: 'Provider · take one', render: () => <Provider /> },
  { path: '/provider/:tab', bare: true, title: 'Provider · take one', render: (p) => <Provider tab={p.tab as 'dash'} /> },
  { path: '/provider/prop/:id', bare: true, title: 'Provider · take one', render: (p) => <Provider propId={p.id} /> },
  { path: '/provider/prop/:id/availability', bare: true, title: 'Provider · take one', render: (p) => <Provider propId={p.id} availability /> },
]

export default function App() {
  useThemeController()
  const { path } = useLocation()
  const remember = useUi((s) => s.rememberWorkspace)

  // ENTRY: the bare URL opens the fork, or straight on Today when the side is remembered.
  useEffect(() => {
    if (path === '/') navigate(remember ? '/today' : '/workspace', { replace: true })
  }, [path, remember])

  let found: { route: Route; params: Record<string, string> } | null = null
  for (const route of ROUTES) {
    const params = match(route.path, path)
    if (params) {
      found = { route, params }
      break
    }
  }

  const control = path === '/admin' || path.startsWith('/admin/')

  useEffect(() => {
    if (!control) document.title = `${found?.route.title ?? 'PropKart'} · PropKart for Business`
  }, [found?.route.title, control])

  if (path === '/') return <FeedbackHost />

  // CONTROL CENTRE: a different app, with its own rail and roles.
  if (control)
    return (
      <>
        <ControlCentre />
        <FeedbackHost />
      </>
    )

  return (
    <>
      {found?.route.bare ? (
        found.route.render(found.params)
      ) : (
        <Shell bleed={found?.route.bleed}>{found ? found.route.render(found.params) : <NotFound />}</Shell>
      )}
      <FeedbackHost />
    </>
  )
}

function NotFound() {
  return (
    <Card>
      <EmptyState icon={CompassIcon} title="This page doesn’t exist" description="The link may be old, or mistyped." action={<Button onClick={() => navigate('/today')}>Go to Today</Button>} />
    </Card>
  )
}
