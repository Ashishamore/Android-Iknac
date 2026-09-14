import { CalendarCheckIcon, CurrencyInrIcon, StorefrontIcon, TruckIcon, type Icon } from '@phosphor-icons/react'
import { sleep } from '@/lib/hooks'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useSession } from '@/store/session'
import { Button } from '@/ui'

const PERKS: { icon: Icon; title: string; text: string }[] = [
  { icon: StorefrontIcon, title: 'List props in minutes', text: 'Photos, price per day and the dates they’re free' },
  { icon: CalendarCheckIcon, title: 'Get booked by art directors', text: 'Holds, bookings and reminders in one place' },
  { icon: TruckIcon, title: 'We handle pickup', text: 'Partner vehicles, photo checks and deposits' },
  { icon: CurrencyInrIcon, title: 'Paid within 48 hours', text: 'Straight to your bank after each return' },
]

/** "Switch to renting out my things": opens the Prop Owner side with the same number. */
export function SwitchToRentingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const popup = usePopup()
  const phone = useSession((s) => s.accounts.customer?.phone ?? null)
  const hasOwner = useSession((s) => !!s.accounts.owner)
  const enter = useSession((s) => s.enter)
  const login = useSession((s) => s.login)

  const switchNow = async () => {
    onClose()
    const hide = popup.loading(hasOwner ? 'Opening your rental shop…' : 'Setting up your rental shop…')
    await sleep(900)
    hide()
    if (hasOwner) enter('owner', '/renter')
    else login('owner', phone, '/renter')
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Rent out your things"
      description={hasOwner ? 'Jump to your Prop Owner account' : 'Use the same number to open a Prop Owner account'}
      footer={
        <Button size="lg" block icon={StorefrontIcon} onClick={switchNow}>
          {hasOwner ? 'Switch to renting' : 'Start renting out'}
        </Button>
      }
    >
      <ul className="space-y-3.5">
        {PERKS.map((p) => (
          <li key={p.title} className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <p.icon size={20} weight="duotone" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-fg">{p.title}</span>
              <span className="block text-[13px] text-muted">{p.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-subtle">You can switch back to renting props from the Prop Owner app any time.</p>
    </BottomSheet>
  )
}
