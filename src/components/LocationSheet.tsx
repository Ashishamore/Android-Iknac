import { TrashIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { formatDateRange } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { BottomSheet } from '@/overlays/BottomSheet'
import { newId, type ShootLocation } from '@/store/projects'
import { Button, DateField, TextArea, TextField } from '@/ui'

interface LocationSheetProps {
  open: boolean
  onClose: () => void
  /** Location being edited, or null to add a new one. */
  initial: ShootLocation | null
  /** The project's shoot dates — the location's date must fall within them. */
  min: string
  max: string
  onSave: (location: ShootLocation) => void
  onRemove?: (id: string) => void
}

/**
 * Add / edit a shoot location (name, address, date within the shoot dates).
 * Give it a new `key` each time it opens so the fields start fresh.
 */
export function LocationSheet({ open, onClose, initial, min, max, onSave, onRemove }: LocationSheetProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [date, setDate] = useState<string | null>(initial?.date ?? (min === max ? min : null))
  const [errors, setErrors] = useState<{ name?: string; address?: string; date?: string }>({})
  const outOfRange = !!date && (date < min || date > max)

  const save = () => {
    const next: typeof errors = {}
    if (name.trim().length < 2) next.name = 'Enter the location name'
    if (address.trim().length < 5) next.address = 'Enter the full address'
    if (!date) next.date = 'Pick the shoot date'
    else if (outOfRange) next.date = 'Pick a date within the shoot dates'
    setErrors(next)
    if (Object.keys(next).length) {
      haptic('warning')
      return
    }
    onSave({ id: initial?.id ?? newId(), name: name.trim(), address: address.trim(), date: date! })
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={initial ? 'Edit location' : 'Add location'}
      description={`Shoot dates: ${formatDateRange(min, max)}`}
      footer={
        <div className="flex gap-3">
          {initial && onRemove && (
            <Button
              variant="danger-soft"
              size="lg"
              icon={TrashIcon}
              onClick={() => {
                onRemove(initial.id)
                onClose()
              }}
            >
              Remove
            </Button>
          )}
          <Button size="lg" className="flex-1" onClick={save}>
            {initial ? 'Save location' : 'Add location'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <TextField
          label="Location name"
          value={name}
          maxLength={60}
          autoComplete="off"
          error={errors.name}
          hint="e.g. Film City – Stage 4"
          onChange={(e) => {
            setName(e.target.value)
            setErrors((x) => ({ ...x, name: undefined }))
          }}
        />
        <TextArea
          label="Address"
          rows={2}
          value={address}
          error={errors.address}
          onChange={(e) => {
            setAddress(e.target.value)
            setErrors((x) => ({ ...x, address: undefined }))
          }}
        />
        <DateField
          label="Shoot date"
          sheetTitle="Shoot date"
          value={date}
          min={min}
          max={max}
          error={errors.date ?? (outOfRange ? 'Outside the shoot dates — pick a new date' : undefined)}
          hint={`Between ${formatDateRange(min, max)}`}
          onChange={(iso) => {
            setDate(iso)
            setErrors((x) => ({ ...x, date: undefined }))
          }}
        />
      </div>
    </BottomSheet>
  )
}
