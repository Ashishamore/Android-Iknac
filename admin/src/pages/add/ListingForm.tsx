import { ImageSquareIcon, SparkleIcon, UploadSimpleIcon, XIcon } from '@phosphor-icons/react'
import { useState, type ChangeEvent, type ReactNode } from 'react'
import { CONDITIONS } from '@/data/owner'
import { CATEGORIES, ERAS, MATERIALS, type Category, type Era, type Material } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { downscaleImage } from '@/lib/image'
import { isPhysical, type Condition, type FormValues } from '@/lib/owner'
import { useOwner } from '@/store/owner'
import { Button, Chip, Field, Select, Stepper, TextArea, TextField } from '~/ui/controls'
import { Thumb } from '~/ui/display'

/** A small "AI" marker for fields filled from the photos. */
function AiMark({ on }: { on: boolean }) {
  if (!on) return null
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-accent-soft px-1 py-px align-middle text-[10px] font-bold text-accent-soft-fg">
      <SparkleIcon size={9} weight="fill" /> AI
    </span>
  )
}

export function AiNote() {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-accent/15 bg-accent-soft px-3.5 py-2.5 text-[13px] leading-snug text-accent-soft-fg">
      <SparkleIcon size={16} weight="fill" className="mt-px shrink-0" />
      AI filled the fields marked AI from your photos. Check them before you submit.
    </p>
  )
}

/** Adds photos from files (downscaled) or a sample placeholder. */
export function PhotoPicker({ onAdd, label = 'Upload photos', multiple = true, children }: { onAdd: (photos: string[]) => void; label?: string; multiple?: boolean; children?: (open: () => void) => ReactNode }) {
  const [input, setInput] = useState<HTMLInputElement | null>(null)
  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])].slice(0, 8)
    e.target.value = ''
    if (files.length) onAdd(await Promise.all(files.map((f) => downscaleImage(f, 900, 0.8))))
  }
  const open = () => input?.click()
  return (
    <>
      {children ? (
        children(open)
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={UploadSimpleIcon} onClick={open}>
            {label}
          </Button>
          <Button size="sm" variant="ghost" icon={ImageSquareIcon} onClick={() => onAdd(['sample'])}>
            Use a sample photo
          </Button>
        </div>
      )}
      <input ref={setInput} type="file" accept="image/*" multiple={multiple} hidden onChange={pick} />
    </>
  )
}

/**
 * Finish capture (drafts) and Edit details (listings). In `edit` mode the
 * pieces and prices are left out: they have their own sections on the listing.
 */
export function ListingForm({
  mode,
  values,
  onChange,
  aiFilled,
  errors,
}: {
  mode: 'draft' | 'edit'
  values: FormValues
  onChange: (patch: Partial<FormValues>) => void
  aiFilled: string[]
  errors: string[]
}) {
  const depositMultiple = useOwner((s) => s.policies.depositMultiple)
  const [size, setSize] = useState(() => (values.size ? values.size.map(String) : ['', '', '']))
  const ai = (f: string) => aiFilled.includes(f)
  const err = (f: string) => errors.includes(f)

  const setSizePart = (i: number, raw: string) => {
    const next = [...size]
    next[i] = raw.replace(/\D/g, '').slice(0, 4)
    setSize(next)
    const nums = next.map(Number)
    onChange({ size: nums.every((n) => n > 0) ? (nums as [number, number, number]) : null })
  }

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
      {/* Photos */}
      <Field label="Photos" error={err('photos') ? 'Add at least one photo' : undefined} className="md:col-span-2">
        <PhotoPicker onAdd={(p) => onChange({ photos: [...values.photos, ...p] })}>
          {(open) => (
            <div className="flex flex-wrap gap-2">
              {values.photos.map((p, i) => (
                <span key={i} className="group relative">
                  <Thumb listing={{ photos: [p], category: values.category ?? 'Decor', catalogId: null }} className="size-24 rounded-xl border border-line" iconSize={28} />
                  {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-fg/75 px-1 text-[10px] font-bold text-bg">Cover</span>}
                  <button
                    type="button"
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => onChange({ photos: values.photos.filter((_, j) => j !== i) })}
                    className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-fg text-bg opacity-0 shadow-card transition-opacity group-hover:opacity-100 focus:opacity-100"
                  >
                    <XIcon size={12} weight="bold" />
                  </button>
                </span>
              ))}
              <button type="button" onClick={open} className={cn('grid size-24 place-items-center rounded-xl border-2 border-dashed text-muted transition-colors hover:border-accent hover:text-accent', err('photos') ? 'border-danger' : 'border-line-strong')}>
                <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                  <UploadSimpleIcon size={20} /> Upload
                </span>
              </button>
              <button type="button" onClick={() => onChange({ photos: [...values.photos, 'sample'] })} className="grid size-24 place-items-center rounded-xl border-2 border-dashed border-line-strong text-muted transition-colors hover:border-accent hover:text-accent">
                <span className="flex flex-col items-center gap-1 text-center text-xs font-semibold">
                  <ImageSquareIcon size={20} /> Sample
                </span>
              </button>
            </div>
          )}
        </PhotoPicker>
      </Field>

      <TextField
        label={
          <>
            Name
            <AiMark on={ai('name')} />
          </>
        }
        className="md:col-span-2"
        value={values.name}
        placeholder="What renters will search for, e.g. Brass Table Lamp"
        error={err('name') ? 'Give it a name renters will search for' : undefined}
        onChange={(e) => onChange({ name: e.target.value })}
      />

      <Select
        label={
          <>
            Category
            <AiMark on={ai('category')} />
          </>
        }
        value={values.category ?? ''}
        error={err('category') ? 'Pick a category' : undefined}
        onChange={(e) => onChange({ category: (e.target.value || null) as Category | null })}
      >
        <option value="">Choose a category</option>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.id}
          </option>
        ))}
      </Select>

      <Select
        label={
          <>
            Material
            <AiMark on={ai('material')} />
          </>
        }
        value={values.material ?? ''}
        onChange={(e) => onChange({ material: (e.target.value || null) as Material | null })}
      >
        <option value="">Not set</option>
        {MATERIALS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </Select>

      <Field
        label={
          <>
            Era
            <AiMark on={ai('era')} />
          </>
        }
        error={err('era') ? 'Pick an era' : undefined}
        className="md:col-span-2"
      >
        <div className="flex flex-wrap gap-2">
          {ERAS.map((e) => (
            <Chip key={e.id} selected={values.era === e.id} onClick={() => onChange({ era: e.id as Era })}>
              {e.id}
            </Chip>
          ))}
        </div>
      </Field>

      {isPhysical(values.category) && (
        <>
          <Field
            label={
              <>
                Size (cm)
                <AiMark on={ai('size')} />
              </>
            }
            error={err('size') ? 'Add width, depth and height' : undefined}
          >
            <div className="grid grid-cols-3 gap-2">
              {['Width', 'Depth', 'Height'].map((label, i) => (
                <TextField key={label} aria-label={label} placeholder={label} inputMode="numeric" value={size[i]} onChange={(e) => setSizePart(i, e.target.value)} />
              ))}
            </div>
          </Field>
          <TextField
            label={
              <>
                Weight
                <AiMark on={ai('weight')} />
              </>
            }
            suffix="kg"
            inputMode="decimal"
            value={values.weight ? String(values.weight) : ''}
            error={err('weight') ? 'Add the weight so transport can be planned' : undefined}
            onChange={(e) => {
              const n = parseFloat(e.target.value.replace(/[^\d.]/g, ''))
              onChange({ weight: Number.isFinite(n) && n > 0 ? n : null })
            }}
          />
        </>
      )}

      <Field label="Condition" className={mode === 'edit' ? 'md:col-span-2' : undefined}>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <Chip key={c} selected={values.condition === c} onClick={() => onChange({ condition: c as Condition })}>
              {c}
            </Chip>
          ))}
        </div>
      </Field>

      {mode === 'draft' && (
        <Field label="Pieces" hint="Identical items you can rent out at once">
          <Stepper value={values.pieces} min={1} max={50} label="Pieces" onChange={(pieces) => onChange({ pieces })} />
        </Field>
      )}

      {mode === 'draft' && (
        <>
          <TextField
            label={
              <>
                Day rate
                <AiMark on={ai('dayRate')} />
              </>
            }
            prefix="₹"
            inputMode="numeric"
            value={values.dayRate ? String(values.dayRate) : ''}
            error={err('dayRate') ? 'Add a day rate' : undefined}
            onChange={(e) => onChange({ dayRate: Number(e.target.value.replace(/\D/g, '').slice(0, 6)) || null })}
          />
          <TextField
            label="Deposit a piece"
            prefix="₹"
            inputMode="numeric"
            value={values.deposit ? String(values.deposit) : ''}
            onChange={(e) => onChange({ deposit: Number(e.target.value.replace(/\D/g, '').slice(0, 7)) || null })}
            hint={
              values.dayRate ? (
                <button type="button" onClick={() => onChange({ deposit: values.dayRate! * depositMultiple })} className="font-semibold text-accent hover:underline">
                  Use your policy: {depositMultiple}× day rate = {formatINR(values.dayRate * depositMultiple)}
                </button>
              ) : undefined
            }
          />
        </>
      )}

      <TextArea
        label={
          <>
            Description
            <AiMark on={ai('description')} />
          </>
        }
        className="md:col-span-2"
        rows={4}
        value={values.description}
        hint="What it is, what works, any wear. Renters read this first."
        onChange={(e) => onChange({ description: e.target.value })}
      />
    </div>
  )
}
