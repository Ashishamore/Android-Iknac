import { FilmSlateIcon } from '@phosphor-icons/react'
import { confirm } from '~/ui/feedback'
import { renterAppUrl } from './data'

/** Switch to renting things → the renter app (the phone prototype), in a new tab. */
export async function openRenterApp() {
  const ok = await confirm({
    title: 'Rent props for your own shoots',
    message: 'Search props from other owners, plan shoots and book with delivery. The renter app opens in a new tab. Your stock stays here.',
    confirmText: 'Open the renter app',
    icon: FilmSlateIcon,
  })
  if (ok) window.open(renterAppUrl(), '_blank', 'noopener')
}
