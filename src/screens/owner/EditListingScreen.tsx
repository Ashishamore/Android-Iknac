import { PackageIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { ListingForm } from '@/components/owner/ListingForm'
import { haptic } from '@/lib/haptics'
import { formMissing, type FormValues, type Listing } from '@/lib/owner'
import { nav, useParams } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useListing, useOwner } from '@/store/owner'
import { AppBar, Button, EmptyState, Screen } from '@/ui'

/** Specs → Edit details. Pieces and prices have their own sections on the listing. */
export default function EditListingScreen() {
  const { id } = useParams<{ id: string }>()
  const listing = useListing(id)
  if (!listing) {
    return (
      <Screen header={<AppBar title="Edit details" close />}>
        <EmptyState icon={PackageIcon} title="Listing not found" action={<Button onClick={() => nav.pop()}>Go back</Button>} />
      </Screen>
    )
  }
  return <EditForm listing={listing} />
}

function EditForm({ listing: l }: { listing: Listing }) {
  const popup = usePopup()
  const updateListing = useOwner((s) => s.updateListing)
  const initial: FormValues = { photos: l.photos, name: l.name, category: l.category, era: l.era, material: l.material, size: l.size, weight: l.weight, pieces: l.pieces.length, condition: l.condition, dayRate: l.dayRate, deposit: l.deposit, description: l.description }
  const [values, setValues] = useState<FormValues>(initial)
  const [errors, setErrors] = useState<string[]>([])
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)

  const save = () => {
    const missing = formMissing(values, false)
    setErrors(missing)
    if (missing.length) return haptic('warning')
    updateListing(l.id, {
      photos: values.photos,
      name: values.name.trim(),
      category: values.category!,
      era: values.era!,
      material: values.material,
      size: values.size,
      weight: values.weight,
      condition: values.condition,
      description: values.description.trim(),
    })
    haptic('success')
    nav.pop()
    popup.toast('Details saved', { tone: 'success' })
  }

  const close = async () => {
    if (dirty && !(await popup.confirm({ title: 'Discard changes?', confirmText: 'Discard', tone: 'danger' }))) return
    nav.pop()
  }

  return (
    <Screen
      surface
      header={<AppBar close back={close} title="Edit details" subtitle={l.name} />}
      footer={
        <div className="@medium:mx-auto @medium:max-w-md">
          <Button size="lg" block onClick={save} disabled={!dirty}>
            Save
          </Button>
        </div>
      }
    >
      <div className="px-4 pb-8 pt-2 @medium:mx-auto @medium:max-w-xl">
        <ListingForm
          mode="edit"
          values={values}
          onChange={(patch) => {
            setValues((v) => ({ ...v, ...patch }))
            setErrors((e) => e.filter((f) => !(f in patch)))
          }}
          aiFilled={[]}
          onTouch={() => {}}
          errors={errors}
        />
      </div>
    </Screen>
  )
}
