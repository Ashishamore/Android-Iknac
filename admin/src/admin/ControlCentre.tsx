import { LockKeyIcon } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { ROLE_META } from '@/lib/platform'
import { navigate, useLocation } from '~/router'
import { Button } from '~/ui/controls'
import { Card, EmptyState } from '~/ui/display'
import { useCan, useMe } from './lib'
import { AREA, areaOf } from './nav'
import Advertising from './pages/Advertising'
import Audit from './pages/Audit'
import Broadcast from './pages/Broadcast'
import Coupons from './pages/Coupons'
import Flags from './pages/Flags'
import Listings from './pages/Listings'
import Money from './pages/Money'
import Orders from './pages/Orders'
import Overview from './pages/Overview'
import People from './pages/People'
import Subscriptions from './pages/Subscriptions'
import Team from './pages/Team'
import Verification from './pages/Verification'
import { ControlShell } from './Shell'

const PAGES = {
  overview: Overview,
  people: People,
  verification: Verification,
  listings: Listings,
  orders: Orders,
  money: Money,
  coupons: Coupons,
  ads: Advertising,
  subscriptions: Subscriptions,
  broadcast: Broadcast,
  flags: Flags,
  audit: Audit,
  team: Team,
} as const

/**
 * The Control Centre, at /admin. Anything under it that is not a page falls
 * back to Overview, and a role that cannot reach a page is refused here as
 * well as being hidden in the rail.
 */
export function ControlCentre() {
  const { path, search } = useLocation()
  const can = useCan()
  const me = useMe()
  const area = areaOf(path)
  const Page = PAGES[area]

  useEffect(() => {
    document.title = `${AREA[area].label} · PropKart Control Centre`
  }, [area])

  // Unknown /admin/… goes to Overview rather than a dead end.
  const known = Object.values(AREA).some((a) => a.path === path)
  useEffect(() => {
    if (!known) navigate('/admin', { replace: true })
  }, [known])

  return (
    <ControlShell>
      {can(area) ? (
        <Page key={`${area}${search}`} />
      ) : (
        <Card>
          <EmptyState
            icon={LockKeyIcon}
            title={`${ROLE_META[me.role].label} cannot reach ${AREA[area].label}`}
            description="The rail hides it, and the route refuses it. Switch to another admin from the account menu if you need to see this page."
            action={<Button onClick={() => navigate('/admin')}>Go to Overview</Button>}
          />
        </Card>
      )}
    </ControlShell>
  )
}
