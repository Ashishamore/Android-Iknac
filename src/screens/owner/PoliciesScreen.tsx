import { Stepper } from '@/components/owner/OwnerUI'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { usePopup } from '@/overlays/popupContext'
import { useOwner } from '@/store/owner'
import { AppBar, Button, Card, ListItem, Screen, SectionHeader, Segmented } from '@/ui'

/** Policies → Deposit multiple · Turnaround days · Modify by default */
export default function PoliciesScreen() {
  const popup = usePopup()
  const policies = useOwner((s) => s.policies)
  const setPolicies = useOwner((s) => s.setPolicies)
  const listings = useOwner((s) => s.listings)
  const updateListing = useOwner((s) => s.updateListing)
  const differentTurnaround = listings.filter((l) => l.bufferDays !== policies.turnaround).length
  const differentDeposit = listings.filter((l) => l.deposit !== l.dayRate * policies.depositMultiple).length

  const applyAll = (what: 'turnaround' | 'deposit') => {
    const before = listings.map((l) => ({ id: l.id, bufferDays: l.bufferDays, deposit: l.deposit }))
    for (const l of listings) updateListing(l.id, what === 'turnaround' ? { bufferDays: policies.turnaround } : { deposit: l.dayRate * policies.depositMultiple })
    haptic('success')
    popup.toast(`Applied to all ${listings.length} listings`, {
      tone: 'success',
      action: { label: 'Undo', onClick: () => before.forEach((b) => useOwner.getState().updateListing(b.id, { bufferDays: b.bufferDays, deposit: b.deposit })) },
    })
  }

  return (
    <Screen header={<AppBar title="Policies" subtitle="Defaults for new listings" />}>
      <div className="px-4 pb-10 pt-1 @medium:mx-auto @medium:max-w-2xl">
        <SectionHeader title="Deposit multiple" subtitle="Deposit per piece, as a multiple of the day rate" className="px-0 pt-3" />
        <Card className="p-4">
          <Segmented
            options={[1, 2, 3, 5].map((n) => ({ value: String(n), label: `${n}×` }))}
            value={String(policies.depositMultiple)}
            onChange={(v) => {
              haptic()
              setPolicies({ depositMultiple: Number(v) })
            }}
          />
          <p className="mt-3 text-[13px] text-muted">
            A {formatINR(450)}/day phone takes a {formatINR(450 * policies.depositMultiple)} deposit. Higher deposits protect fragile pieces; lower ones get more bookings.
          </p>
          {differentDeposit > 0 && (
            <Button size="sm" variant="ghost" className="-ml-2 mt-1" onClick={() => applyAll('deposit')}>
              Apply to {differentDeposit} existing listing{differentDeposit === 1 ? '' : 's'}
            </Button>
          )}
        </Card>

        <SectionHeader title="Turnaround days" subtitle="Kept free before and after each booking to clean, fix and pack" className="px-0 pt-6" />
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-medium text-fg">
              {policies.turnaround} day{policies.turnaround === 1 ? '' : 's'} either side
            </span>
            <Stepper value={policies.turnaround} min={0} max={3} label="Turnaround days" onChange={(turnaround) => setPolicies({ turnaround })} />
          </div>
          {differentTurnaround > 0 && (
            <Button size="sm" variant="ghost" className="-ml-2 mt-2" onClick={() => applyAll('turnaround')}>
              Apply to {differentTurnaround} existing listing{differentTurnaround === 1 ? '' : 's'}
            </Button>
          )}
        </Card>

        <SectionHeader title="Modifications" className="px-0 pt-6" />
        <Card className="overflow-hidden">
          <ListItem
            title="Allow modification by default"
            subtitle="New listings let renters ask to repaint or alter them"
            toggle={{ checked: policies.modifyDefault, onChange: (modifyDefault) => setPolicies({ modifyDefault }) }}
          />
        </Card>
        <p className="mt-2 px-1 text-xs text-muted">You still approve every paint or alteration request before delivery.</p>
      </div>
    </Screen>
  )
}
