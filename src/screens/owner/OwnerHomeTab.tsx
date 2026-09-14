import { SignOutIcon, StorefrontIcon } from '@phosphor-icons/react'
import { formatPhone } from '@/lib/format'
import { useAccount } from '@/store/session'
import { AppBar, Button, EmptyState, LargeTitle, Screen } from '@/ui'
import { useLogout } from '../shared/useLogout'

/** Placeholder until the prop-owner app's tabs are defined. */
export default function OwnerHomeTab() {
  const phone = useAccount()?.phone
  const logOut = useLogout()
  return (
    <Screen header={<AppBar title="Prop Owner" titleOnScroll />}>
      <LargeTitle title="Prop Owner" subtitle={phone ? formatPhone(phone) : 'Demo account'} />
      <EmptyState
        icon={StorefrontIcon}
        title="Prop owner app"
        description="Listings, bookings and earnings will live here."
        action={
          <Button variant="secondary" icon={SignOutIcon} onClick={logOut}>
            Log out
          </Button>
        }
      />
    </Screen>
  )
}
