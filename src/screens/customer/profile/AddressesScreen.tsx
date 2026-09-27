import { CheckCircleIcon, DotsThreeVerticalIcon, MapPinIcon, PencilSimpleIcon, PhoneIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { AddressSheet } from '@/components/AddressSheet'
import { ADDRESS_ICON } from '@/data/profile'
import { formatPhone } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { EASE_OUT } from '@/lib/motion'
import { Menu } from '@/overlays/Menu'
import { usePopup } from '@/overlays/popupContext'
import { useProfile, type Address } from '@/store/profile'
import { AppBar, Card, EmptyState, Fab, IconButton, IconTile, Screen, Tag } from '@/ui'

/** Saved addresses: offices, studios and stores to deliver to or pick up from. */
export default function AddressesScreen() {
  const popup = usePopup()
  const addresses = useProfile((s) => s.addresses)
  const saveAddress = useProfile((s) => s.saveAddress)
  const removeAddress = useProfile((s) => s.removeAddress)
  const setDefaultAddress = useProfile((s) => s.setDefaultAddress)
  const [sheet, setSheet] = useState<{ key: number; open: boolean; address: Address | null }>({ key: 0, open: false, address: null })
  const openSheet = (address: Address | null) => setSheet((s) => ({ key: s.key + 1, open: true, address }))

  return (
    <Screen
      header={<AppBar title="Saved addresses" />}
      fab={<Fab icon={PlusIcon} label="Add address" onClick={() => openSheet(null)} />}
    >
      {addresses.length === 0 ? (
        <EmptyState icon={MapPinIcon} title="No saved addresses" description="Save your office, studio or props store to pick them in one tap when you book." />
      ) : (
        <div className="grid grid-cols-1 gap-3 px-4 pb-24 pt-2 @medium:mx-auto @medium:max-w-2xl">
          {addresses.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT, delay: Math.min(i, 6) * 0.04 }}>
              <Card className="flex items-start gap-3 py-3.5 pl-4 pr-1.5">
                <IconTile icon={ADDRESS_ICON[a.label]} tone={a.isDefault ? 'brand' : 'neutral'} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-fg">{a.label}</span>
                    {a.isDefault && <Tag tone="success">Default</Tag>}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-fg-2">{a.name}</p>
                  <p className="text-[13px] leading-snug text-muted">{a.line}</p>
                  {a.landmark && <p className="text-[13px] text-muted">{a.landmark}</p>}
                  <p className="mt-1 flex items-center gap-1 text-[13px] text-fg-2">
                    <PhoneIcon size={13} className="text-subtle" /> {formatPhone(a.phone)}
                  </p>
                </div>
                <Menu
                  items={[
                    { label: 'Edit', icon: PencilSimpleIcon, onSelect: () => openSheet(a) },
                    ...(!a.isDefault
                      ? [
                          {
                            label: 'Make default',
                            icon: CheckCircleIcon,
                            onSelect: () => {
                              setDefaultAddress(a.id)
                              haptic()
                              popup.toast(`${a.label} is now your default address`, { tone: 'success' })
                            },
                          },
                        ]
                      : []),
                    {
                      label: 'Remove',
                      icon: TrashIcon,
                      destructive: true,
                      onSelect: () => {
                        const undo = removeAddress(a.id)
                        popup.toast(`${a.label} address removed`, { action: { label: 'Undo', onClick: undo } })
                      },
                    },
                  ]}
                >
                  <IconButton icon={DotsThreeVerticalIcon} weight="bold" size="sm" label={`Options for ${a.label}: ${a.name}`} />
                </Menu>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AddressSheet
        key={sheet.key}
        open={sheet.open}
        address={sheet.address}
        first={addresses.length === 0}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSave={(a) => {
          saveAddress(a)
          setSheet((s) => ({ ...s, open: false }))
          haptic('success')
          popup.toast(sheet.address ? 'Address updated' : 'Address saved', { tone: 'success' })
        }}
      />
    </Screen>
  )
}
