import { useState } from 'react'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { usePopup } from '@/overlays/popupContext'
import { useOwner } from '@/store/owner'
import { AppBar, Button, Card, Chip, ListItem, Screen, SectionHeader, TextField } from '@/ui'

/** Delivery → I deliver · Radius · Charge per trip · Per km beyond */
export default function DeliveryScreen() {
  const popup = usePopup()
  const delivery = useOwner((s) => s.delivery)
  const setDelivery = useOwner((s) => s.setDelivery)
  const [perTrip, setPerTrip] = useState(String(delivery.perTrip))
  const [perKm, setPerKm] = useState(String(delivery.perKm))
  const dirty = Number(perTrip) !== delivery.perTrip || Number(perKm) !== delivery.perKm
  const example = 40
  const exampleCost = (Number(perTrip) || 0) + Math.max(0, example - delivery.radiusKm) * (Number(perKm) || 0)

  return (
    <Screen
      header={<AppBar title="Delivery" />}
      footer={
        dirty ? (
          <div className="@medium:mx-auto @medium:max-w-md">
            <Button
              size="lg"
              block
              onClick={() => {
                setDelivery({ perTrip: Number(perTrip) || 0, perKm: Number(perKm) || 0 })
                haptic('success')
                popup.toast('Delivery charges saved', { tone: 'success' })
              }}
            >
              Save charges
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="px-4 pb-10 pt-1 @medium:mx-auto @medium:max-w-2xl">
        <Card className="overflow-hidden">
          <ListItem
            title="I deliver"
            subtitle={delivery.enabled ? 'You drop off and pick up. Renters see “Delivers to set”.' : 'Renters arrange their own pickup'}
            toggle={{
              checked: delivery.enabled,
              onChange: (enabled) => {
                setDelivery({ enabled })
                popup.toast(enabled ? 'You now deliver to set' : 'Renters will collect', { tone: 'success' })
              },
            }}
          />
        </Card>

        {delivery.enabled && (
          <>
            <SectionHeader title="Radius" subtitle="Trips inside this cost the flat charge" className="px-0 pt-6" />
            <div className="flex flex-wrap gap-2">
              {[10, 25, 50, 100].map((km) => (
                <Chip key={km} selected={delivery.radiusKm === km} onClick={() => setDelivery({ radiusKm: km })}>
                  {km === 100 ? 'All Mumbai (100 km)' : `${km} km`}
                </Chip>
              ))}
            </div>

            <SectionHeader title="Charges" className="px-0 pt-6" />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Charge per trip" prefix="₹" inputMode="numeric" value={perTrip} onChange={(e) => setPerTrip(e.target.value.replace(/\D/g, '').slice(0, 5))} />
              <TextField label="Per km beyond" prefix="₹" inputMode="numeric" value={perKm} onChange={(e) => setPerKm(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </div>
            <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-[13px] text-fg-2">
              A set {example} km away costs the renter <span className="font-bold text-fg">{formatINR(exampleCost)}</span> each way: {formatINR(Number(perTrip) || 0)} + {Math.max(0, example - delivery.radiusKm)} km × {formatINR(Number(perKm) || 0)}.
            </p>
          </>
        )}
      </div>
    </Screen>
  )
}
