import { CheckCircleIcon, ImagesIcon, SealCheckIcon, TrashIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { formMissing, tierRates, youKeep, type Draft, type FormValues } from '@/lib/owner'
import { useFeeRate, useOwner } from '@/store/owner'
import { navigate } from '~/router'
import { Button } from '~/ui/controls'
import { Card, CardHeader, EmptyState, KV, PageHeader, Tag, Thumb } from '~/ui/display'
import { confirm, sleep, toast } from '~/ui/feedback'
import { AiNote, ListingForm } from './ListingForm'

const LABEL: Record<string, string> = { name: 'Name', category: 'Category', era: 'Era', size: 'Size', weight: 'Weight', dayRate: 'Day rate', photos: 'Photos' }

export default function DraftForm({ id }: { id: string }) {
  const draft = useOwner((s) => s.drafts.find((d) => d.id === id))
  if (!draft) {
    return (
      <>
        <PageHeader crumbs={[{ label: 'Add stock', to: '/add' }, { label: 'Draft' }]} title="Draft not found" />
        <Card>
          <EmptyState icon={ImagesIcon} title="Draft not found" description="It may have been submitted or discarded." action={<Button onClick={() => navigate('/add')}>Back to Add stock</Button>} />
        </Card>
      </>
    )
  }
  return <Form key={draft.id} draft={draft} />
}

/** Finish capture: Name · Category · Era · Size · Weight · Pieces · Condition · Day rate · Deposit · Description → Later · Submit. */
function Form({ draft }: { draft: Draft }) {
  const updateDraft = useOwner((s) => s.updateDraft)
  const submitDraft = useOwner((s) => s.submitDraft)
  const removeDraft = useOwner((s) => s.removeDraft)
  const fee = useFeeRate()
  const [values, setValues] = useState<FormValues>(() => ({ ...draft }))
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const missing = formMissing(values, true)
  const checklist = ['photos', 'name', 'category', 'era', 'size', 'weight', 'dayRate']

  const save = () => updateDraft(draft.id, { ...values })

  const later = () => {
    save()
    navigate('/add')
    toast('Saved in “Waiting for details”', { tone: 'success' })
  }

  const submit = async () => {
    setErrors(missing)
    if (missing.length) return toast(`Still needs ${missing.map((m) => (m === 'dayRate' ? 'a day rate' : m)).join(', ')}`, { tone: 'error' })
    save()
    setBusy(true)
    await sleep(900)
    const listingId = submitDraft(draft.id)
    setBusy(false)
    if (!listingId) return
    navigate(`/stock/${listingId}`, { replace: true })
    toast('Submitted for verification · usually within 2 hours', { tone: 'success' })
  }

  const discard = async () => {
    if (!(await confirm({ title: 'Discard this draft?', confirmText: 'Discard', tone: 'danger', icon: TrashIcon }))) return
    const undo = removeDraft(draft.id)
    navigate('/add')
    toast('Draft discarded', { action: { label: 'Undo', onClick: undo } })
  }

  const tiers = values.dayRate ? tierRates(values.dayRate) : null

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Add stock', to: '/add' }, { label: 'Waiting for details', to: '/add' }, { label: values.name || 'Untitled prop' }]}
        title={values.name || 'Finish capture'}
        subtitle={`Draft · captured ${timeAgo(draft.createdAt)} · ${values.photos.length} photo${values.photos.length === 1 ? '' : 's'}`}
        actions={
          <>
            <Button variant="danger-ghost" icon={TrashIcon} onClick={discard}>
              Discard
            </Button>
            <Button variant="secondary" onClick={later}>
              Later
            </Button>
            <Button icon={SealCheckIcon} loading={busy} onClick={submit}>
              Submit for verification
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5">
          {draft.aiFilled.length > 0 && (
            <div className="mb-5">
              <AiNote />
            </div>
          )}
          <ListingForm
            mode="draft"
            values={values}
            aiFilled={draft.aiFilled}
            errors={errors}
            onChange={(patch) => {
              setValues((v) => ({ ...v, ...patch }))
              setErrors((e) => e.filter((f) => !(f in patch)))
            }}
          />
        </Card>

        <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:h-fit">
          <Card>
            <CardHeader title="Before it goes live" subtitle={missing.length ? `${missing.length} thing${missing.length === 1 ? '' : 's'} left` : 'Ready to submit'} />
            <ul className="space-y-2 px-4 py-3">
              {checklist.map((f) => {
                const done = !missing.includes(f)
                return (
                  <li key={f} className={cn('flex items-center gap-2 text-[13px]', done ? 'text-fg-2' : 'font-semibold text-fg')}>
                    {done ? <CheckCircleIcon size={16} weight="fill" className="text-success" /> : <WarningCircleIcon size={16} weight="fill" className="text-warning" />}
                    {LABEL[f]}
                    {draft.aiFilled.includes(f) && <Tag tone="brand">AI</Tag>}
                  </li>
                )
              })}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Preview" />
            <div className="flex items-center gap-3 p-4">
              <Thumb listing={{ photos: values.photos, category: values.category ?? 'Decor', catalogId: null }} className="size-16 rounded-lg" iconSize={24} />
              <div className="min-w-0">
                <p className={cn('truncate text-sm font-semibold', values.name ? 'text-fg' : 'italic text-muted')}>{values.name || 'Untitled prop'}</p>
                <p className="truncate text-xs text-muted">{[values.category, values.era].filter(Boolean).join(' · ') || 'No category yet'}</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-fg">{values.dayRate ? `${formatINR(values.dayRate)}/day` : '—'}</p>
              </div>
            </div>
            {tiers && (
              <dl className="divide-y divide-line border-t border-line px-4">
                <KV label="3–6 days" value={`${formatINR(tiers.mid)}/day`} />
                <KV label="7+ days" value={`${formatINR(tiers.long)}/day`} />
                <KV label="You keep" value={<span className="text-success">{formatINR(youKeep(values.dayRate!, fee))}/day</span>} />
              </dl>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
