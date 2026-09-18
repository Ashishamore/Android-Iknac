import { CameraIcon, SparkleIcon, XIcon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { usePhotoPicker } from '@/components/usePhotoPicker'
import { CONDITIONS } from '@/data/owner'
import { CATEGORIES, ERAS, MATERIALS, type Category, type Era, type Material } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { downscaleImage } from '@/lib/image'
import { isPhysical, type Condition, type FormValues } from '@/lib/owner'
import { useOwner } from '@/store/owner'
import { Chip, TextArea, TextField } from '@/ui'
import { ListingThumb, Stepper } from './OwnerUI'

/**
 * Finish capture (drafts) and Edit details (listings). In `edit` mode the
 * pieces and prices are left out: they have their own sections on the listing.
 */
export function ListingForm({
  mode,
  values,
  onChange,
  aiFilled,
  onTouch,
  errors,
}: {
  mode: 'draft' | 'edit'
  values: FormValues
  onChange: (patch: Partial<FormValues>) => void
  aiFilled: string[]
  onTouch: (field: string) => void
  errors: string[]
}) {
  const depositMultiple = useOwner((s) => s.policies.depositMultiple)
  const [size, setSize] = useState(() => (values.size ? values.size.map(String) : ['', '', '']))
  const set = (field: keyof FormValues, patch: Partial<FormValues>) => {
    onTouch(field)
    onChange(patch)
  }
  const picker = usePhotoPicker({
    title: 'Add a photo',
    sample: { url: 'sample', label: 'A placeholder photo' },
    onPick: async ({ url, file }) => {
      const photo = file ? await downscaleImage(file, 900, 0.8) : 'sample'
      if (file) URL.revokeObjectURL(url)
      set('photos', { photos: [...values.photos, photo] })
    },
  })
  const setSizePart = (i: number, raw: string) => {
    const next = [...size]
    next[i] = raw.replace(/\D/g, '').slice(0, 4)
    setSize(next)
    const nums = next.map(Number)
    set('size', { size: nums.every((n) => n > 0) ? (nums as [number, number, number]) : null })
  }
  const ai = (field: string) => aiFilled.includes(field)
  const err = (field: string) => errors.includes(field)

  return (
    <div className="space-y-5">
      {/* Photos */}
      <Field title="Photos" ai={false} error={err('photos') ? 'Add at least one photo' : undefined}>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {values.photos.map((p, i) => (
            <span key={i} className="relative shrink-0">
              <ListingThumb listing={{ photos: [p], category: values.category ?? 'Decor', catalogId: null }} className="size-20 rounded-2xl" iconSize={26} />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => set('photos', { photos: values.photos.filter((_, j) => j !== i) })}
                className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-fg text-bg shadow-card"
              >
                <XIcon size={12} weight="bold" />
              </button>
            </span>
          ))}
          <button type="button" onClick={picker.pick} className="grid size-20 shrink-0 place-items-center rounded-2xl border-2 border-dashed border-line-strong text-muted">
            <span className="flex flex-col items-center gap-0.5 text-[11px] font-semibold">
              <CameraIcon size={22} /> Add
            </span>
          </button>
        </div>
      </Field>

      <TextField
        label={ai('name') ? 'Name · filled by AI' : 'Name'}
        value={values.name}
        error={err('name') ? 'Give it a name renters will search for' : undefined}
        onChange={(e) => set('name', { name: e.target.value })}
      />

      <Field title="Category" ai={ai('category')} error={err('category') ? 'Pick a category' : undefined}>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip key={c.id} selected={values.category === c.id} onClick={() => set('category', { category: c.id as Category })}>
              {c.id}
            </Chip>
          ))}
        </div>
      </Field>

      <Field title="Era" ai={ai('era')} error={err('era') ? 'Pick an era' : undefined}>
        <div className="flex flex-wrap gap-2">
          {ERAS.map((e) => (
            <Chip key={e.id} selected={values.era === e.id} onClick={() => set('era', { era: e.id as Era })}>
              {e.id}
            </Chip>
          ))}
        </div>
      </Field>

      {isPhysical(values.category) && (
        <>
          <Field title="Size (cm)" ai={ai('size')} error={err('size') ? 'Add width, depth and height' : undefined}>
            <div className="grid grid-cols-3 gap-2">
              {['Width', 'Depth', 'Height'].map((label, i) => (
                <TextField key={label} label={label} inputMode="numeric" value={size[i]} onChange={(e) => setSizePart(i, e.target.value)} />
              ))}
            </div>
          </Field>
          <TextField
            label={ai('weight') ? 'Weight (kg) · filled by AI' : 'Weight (kg)'}
            inputMode="decimal"
            value={values.weight ? String(values.weight) : ''}
            error={err('weight') ? 'Add the weight so transport can be planned' : undefined}
            onChange={(e) => {
              const n = parseFloat(e.target.value.replace(/[^\d.]/g, ''))
              set('weight', { weight: Number.isFinite(n) && n > 0 ? n : null })
            }}
          />
        </>
      )}

      <Field title="Material" ai={ai('material')}>
        <div className="flex flex-wrap gap-2">
          {MATERIALS.map((m) => (
            <Chip key={m} selected={values.material === m} onClick={() => set('material', { material: values.material === m ? null : (m as Material) })}>
              {m}
            </Chip>
          ))}
        </div>
      </Field>

      {mode === 'draft' && (
        <div className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-[15px] font-medium text-fg">Pieces</span>
            <span className="block text-[13px] text-muted">Identical items you can rent out at once</span>
          </span>
          <Stepper value={values.pieces} min={1} max={50} label="Pieces" onChange={(pieces) => set('pieces', { pieces })} />
        </div>
      )}

      <Field title="Condition" ai={ai('condition')}>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <Chip key={c} selected={values.condition === c} onClick={() => set('condition', { condition: c as Condition })}>
              {c}
            </Chip>
          ))}
        </div>
      </Field>

      {mode === 'draft' && (
        <div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={ai('dayRate') ? 'Day rate · AI' : 'Day rate'}
              prefix="₹"
              inputMode="numeric"
              value={values.dayRate ? String(values.dayRate) : ''}
              error={err('dayRate') ? 'Add a day rate' : undefined}
              onChange={(e) => set('dayRate', { dayRate: Number(e.target.value.replace(/\D/g, '').slice(0, 6)) || null })}
            />
            <TextField label="Deposit a piece" prefix="₹" inputMode="numeric" value={values.deposit ? String(values.deposit) : ''} onChange={(e) => set('deposit', { deposit: Number(e.target.value.replace(/\D/g, '').slice(0, 7)) || null })} />
          </div>
          {values.dayRate ? (
            <button type="button" onClick={() => set('deposit', { deposit: values.dayRate! * depositMultiple })} className="mt-2 px-1 text-[13px] font-semibold text-accent">
              Use your policy: {depositMultiple}× day rate = {formatINR(values.dayRate * depositMultiple)}
            </button>
          ) : null}
        </div>
      )}

      <TextArea
        label={ai('description') ? 'Description · filled by AI' : 'Description'}
        rows={4}
        value={values.description}
        hint="What it is, what works, any wear. Renters read this first."
        onChange={(e) => set('description', { description: e.target.value })}
      />
      {picker.element}
    </div>
  )
}

function Field({ title, ai, error, children }: { title: string; ai: boolean; error?: string; children: ReactNode }) {
  return (
    <div>
      <p className={cn('mb-2 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-[0.07em]', error ? 'text-danger' : 'text-muted')}>
        {title}
        {ai && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal text-accent-soft-fg">
            <SparkleIcon size={10} weight="fill" /> AI
          </span>
        )}
      </p>
      {children}
      {error && <p className="mt-1.5 px-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  )
}

/** Nudge shown when a form was filled from photos. */
export function AiNote() {
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-accent-soft px-3.5 py-3 text-[13px] leading-snug text-accent-soft-fg">
      <SparkleIcon size={16} weight="fill" className="mt-0.5 shrink-0" />
      AI filled the fields marked AI from your photos. Check them before you submit.
    </p>
  )
}

