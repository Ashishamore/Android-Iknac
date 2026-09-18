import { ImagesIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { AiNote, ListingForm } from '@/components/owner/ListingForm'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { formMissing, type Draft, type FormValues } from '@/lib/owner'
import { nav, useParams } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useOwner } from '@/store/owner'
import { AppBar, Button, EmptyState, Screen } from '@/ui'

/** Finish capture: Name · Category · Era · Size · Weight · Pieces · Condition · Day rate · Deposit · Description → Later · Submit. */
export default function DraftFormScreen() {
  const { id } = useParams<{ id: string }>()
  const draft = useOwner((s) => s.drafts.find((d) => d.id === id))
  if (!draft) {
    return (
      <Screen header={<AppBar title="Draft" close />}>
        <EmptyState icon={ImagesIcon} title="Draft not found" description="It may have been submitted or discarded." action={<Button onClick={() => nav.pop()}>Go back</Button>} />
      </Screen>
    )
  }
  return <DraftForm draft={draft} />
}

function DraftForm({ draft }: { draft: Draft }) {
  const popup = usePopup()
  const updateDraft = useOwner((s) => s.updateDraft)
  const submitDraft = useOwner((s) => s.submitDraft)
  const [values, setValues] = useState<FormValues>(() => ({ ...draft }))
  const [aiFilled, setAiFilled] = useState(draft.aiFilled)
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const save = () => updateDraft(draft.id, { ...values, aiFilled })

  const later = () => {
    save()
    nav.pop()
    popup.toast('Saved in “Waiting for details”')
  }

  const submit = async () => {
    const missing = formMissing(values, true)
    setErrors(missing)
    if (missing.length) {
      haptic('warning')
      return popup.toast(`Still needs ${missing.map((m) => (m === 'dayRate' ? 'a day rate' : m)).join(', ')}`, { tone: 'error' })
    }
    save()
    setBusy(true)
    await sleep(900)
    const listingId = submitDraft(draft.id)
    setBusy(false)
    if (!listingId) return
    haptic('success')
    nav.replace(`/renter/stock/${listingId}`)
    popup.toast('Submitted for verification · usually within 2 hours', { tone: 'success' })
  }

  return (
    <Screen
      surface
      header={<AppBar close back={later} title={values.name || 'Finish capture'} subtitle={`${values.photos.length} photo${values.photos.length === 1 ? '' : 's'} · draft`} />}
      footer={
        <div className="flex gap-2.5 @medium:mx-auto @medium:max-w-md">
          <Button size="lg" variant="secondary" className="flex-1" onClick={later}>
            Later
          </Button>
          <Button size="lg" className="flex-[2]" loading={busy} onClick={submit}>
            Submit for verification
          </Button>
        </div>
      }
    >
      <div className="space-y-5 px-4 pb-8 pt-2 @medium:mx-auto @medium:max-w-xl">
        {aiFilled.length > 0 && <AiNote />}
        <ListingForm
          mode="draft"
          values={values}
          onChange={(patch) => {
            setValues((v) => ({ ...v, ...patch }))
            setErrors((e) => e.filter((f) => !(f in patch)))
          }}
          aiFilled={aiFilled}
          onTouch={(field) => setAiFilled((a) => a.filter((f) => f !== field))}
          errors={errors}
        />
      </div>
    </Screen>
  )
}
