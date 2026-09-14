import {
  BuildingsIcon,
  CheckCircleIcon,
  CrosshairIcon,
  DotsThreeVerticalIcon,
  FilmSlateIcon,
  HouseIcon,
  MapPinIcon,
  PencilSimpleIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
  WarehouseIcon,
  type Icon,
} from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { ADDRESS_LABELS, type AddressLabel } from '@/data/profile'
import { formatPhone } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { EASE_OUT } from '@/lib/motion'
import { BottomSheet } from '@/overlays/BottomSheet'
import { Menu } from '@/overlays/Menu'
import { usePopup } from '@/overlays/popupContext'
import { useProfile, type Address } from '@/store/profile'
import { newId } from '@/store/projects'
import { useAccount } from '@/store/session'
import { AppBar, Button, Card, Checkbox, Chip, EmptyState, Fab, IconButton, IconTile, Screen, Tag, TextArea, TextField } from '@/ui'

const ADDRESS_ICON: Record<AddressLabel, Icon> = {
  Office: BuildingsIcon,
  Studio: FilmSlateIcon,
  Warehouse: WarehouseIcon,
  Home: HouseIcon,
  Other: MapPinIcon,
}

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

function AddressSheet({
  open,
  address,
  first,
  onClose,
  onSave,
}: {
  open: boolean
  address: Address | null
  first: boolean
  onClose: () => void
  onSave: (a: Address) => void
}) {
  const popup = usePopup()
  const myPhone = useAccount()?.phone ?? ''
  const [label, setLabel] = useState<AddressLabel>(address?.label ?? 'Studio')
  const [name, setName] = useState(address?.name ?? '')
  const [line, setLine] = useState(address?.line ?? '')
  const [landmark, setLandmark] = useState(address?.landmark ?? '')
  const [phone, setPhone] = useState(address?.phone ?? myPhone)
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? first)
  const [errors, setErrors] = useState<{ name?: string; line?: string; phone?: string }>({})

  const locate = async () => {
    const hide = popup.loading('Finding your location…')
    await sleep(1100)
    hide()
    setLine('Plot 7, Veera Desai Road, Andheri West, Mumbai 400058')
    setLandmark('Opposite Country Club')
    setErrors((e) => ({ ...e, line: undefined }))
    haptic('success')
  }

  const save = () => {
    const next: typeof errors = {}
    if (name.trim().length < 2) next.name = 'Name the place, e.g. the studio or company'
    if (line.trim().length < 10) next.line = 'Enter the full address with pincode'
    if (phone.length !== 10) next.phone = 'Enter a 10-digit mobile number'
    setErrors(next)
    if (Object.keys(next).length) return haptic('warning')
    onSave({ id: address?.id ?? `addr-${newId()}`, label, name: name.trim(), line: line.trim(), landmark: landmark.trim(), phone, isDefault })
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={address ? 'Edit address' : 'Add address'}
      description="For deliveries, pickups and invoices"
      footer={
        <Button size="lg" block onClick={save}>
          {address ? 'Save changes' : 'Save address'}
        </Button>
      }
    >
      <div className="space-y-4">
        <Button variant="tonal" icon={CrosshairIcon} block onClick={locate}>
          Use my current location
        </Button>
        <div className="flex flex-wrap gap-2">
          {ADDRESS_LABELS.map((l) => (
            <Chip key={l} icon={ADDRESS_ICON[l]} selected={label === l} onClick={() => setLabel(l)}>
              {l}
            </Chip>
          ))}
        </div>
        <TextField
          label="Place or company name"
          value={name}
          autoComplete="organization"
          error={errors.name}
          onChange={(e) => {
            setName(e.target.value)
            setErrors((x) => ({ ...x, name: undefined }))
          }}
        />
        <TextArea
          label="Address"
          value={line}
          rows={2}
          error={errors.line}
          onChange={(e) => {
            setLine(e.target.value)
            setErrors((x) => ({ ...x, line: undefined }))
          }}
        />
        <TextField label="Landmark (optional)" value={landmark} autoComplete="off" onChange={(e) => setLandmark(e.target.value)} />
        <TextField
          label="Phone for the driver"
          prefix="+91"
          inputMode="numeric"
          value={phone}
          error={errors.phone}
          onChange={(e) => {
            setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
            setErrors((x) => ({ ...x, phone: undefined }))
          }}
        />
        <Checkbox checked={isDefault} onChange={setIsDefault} label="Use as my default address" description="Picked first when you book" />
      </div>
    </BottomSheet>
  )
}
