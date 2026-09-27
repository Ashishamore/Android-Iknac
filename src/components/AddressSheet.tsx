import { CrosshairIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { ADDRESS_ICON, ADDRESS_LABELS, type AddressLabel } from '@/data/profile'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import type { Address } from '@/store/profile'
import { newId } from '@/store/projects'
import { useAccount } from '@/store/session'
import { Button, Checkbox, Chip, TextArea, TextField } from '@/ui'

/**
 * Add or edit a saved address (Profile → Saved addresses, and checkout).
 * Give it a new `key` each time it opens so the fields start fresh.
 */
export function AddressSheet({
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
