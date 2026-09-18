import { CameraIcon, CheckCircleIcon, ImageSquareIcon, RulerIcon, SparkleIcon, UploadSimpleIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { AI_GUESSES } from '@/data/owner'
import { cn } from '@/lib/cn'
import { downscaleImage } from '@/lib/image'
import { useOwner } from '@/store/owner'
import { navigate } from '~/router'
import { Button, IconButton } from '~/ui/controls'
import { Card, PageHeader, ProgressBar, Thumb } from '~/ui/display'
import { sleep, toast } from '~/ui/feedback'

const SLOTS = [
  { id: 'front', label: 'Front', hint: 'Straight on' },
  { id: 'back', label: 'Back', hint: 'The other side' },
  { id: 'detail', label: 'Detail', hint: 'Texture, maker’s mark, wear' },
  { id: 'inuse', label: 'In use', hint: 'Styled, as it would sit on set' },
  { id: 'scale', label: 'Scale photo', hint: 'Next to a person, A4 sheet or tape' },
] as const
type SlotId = (typeof SLOTS)[number]['id']

const READING_STEPS = ['Finding the object', 'Matching category and era', 'Estimating size from the scale photo', 'Writing a description']

/** One item → Front · Back · Detail · In use · Scale photo → Read the photos (AI fills the form). */
export default function OneItem() {
  const drafts = useOwner((s) => s.drafts)
  const multiple = useOwner((s) => s.policies.depositMultiple)
  const addDrafts = useOwner((s) => s.addDrafts)
  const [photos, setPhotos] = useState<Partial<Record<SlotId, string>>>({})
  const [reading, setReading] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const slot = useRef<SlotId>('front')
  const taken = SLOTS.filter((s) => photos[s.id]).map((s) => photos[s.id]!)

  const upload = (id: SlotId) => {
    slot.current = id
    input.current?.click()
  }

  const create = async (useAi: boolean) => {
    const guess = AI_GUESSES[drafts.filter((d) => d.source === 'one').length % AI_GUESSES.length]
    if (useAi) {
      for (let i = 0; i < READING_STEPS.length; i++) {
        setReading(i)
        await sleep(520)
      }
      setReading(null)
    }
    const hasScale = !!photos.scale
    const [id] = addDrafts([
      useAi
        ? {
            source: 'one',
            photos: taken,
            name: guess.name,
            category: guess.category,
            era: guess.era,
            material: guess.material,
            size: hasScale ? guess.size : null,
            weight: hasScale ? guess.weight : null,
            pieces: 1,
            condition: 'Good',
            dayRate: guess.dayRate,
            deposit: guess.dayRate * multiple,
            description: guess.description,
            aiFilled: ['name', 'category', 'era', 'material', 'description', 'dayRate', ...(hasScale ? ['size', 'weight'] : [])],
          }
        : { source: 'one', photos: taken, name: '', category: null, era: null, material: null, size: null, weight: null, pieces: 1, condition: 'Good', dayRate: null, deposit: null, description: '', aiFilled: [] },
    ])
    navigate(`/add/draft/${id}`, { replace: true })
    if (useAi && !hasScale) toast('No scale photo, so add the size and weight yourself', { tone: 'info' })
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Add stock', to: '/add' }, { label: 'One item' }]}
        title="One item"
        subtitle="Take these five photos. AI reads them and fills in the name, category, era, size and a description. You check it before it goes live."
        actions={
          <Button variant="secondary" onClick={() => navigate('/add')}>
            Cancel
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SLOTS.map((s, i) => {
            const p = photos[s.id]
            return (
              <div key={s.id} className={cn('group relative overflow-hidden rounded-xl', i === 0 && 'col-span-2 row-span-2 sm:col-span-1', p ? 'border border-line bg-surface' : 'border-2 border-dashed border-line-strong bg-surface/60')}>
                {p ? (
                  <Thumb listing={{ photos: [p], category: 'Decor', catalogId: null }} className="aspect-square w-full" iconSize={40} />
                ) : (
                  <div className="grid aspect-square w-full place-items-center text-muted">
                    <span className="flex flex-col items-center gap-2 px-3 text-center">
                      {s.id === 'scale' ? <RulerIcon size={30} weight="light" /> : <CameraIcon size={30} weight="light" />}
                      <span className="flex gap-1.5">
                        <Button size="xs" variant="secondary" icon={UploadSimpleIcon} onClick={() => upload(s.id)}>
                          Upload
                        </Button>
                        <Button size="xs" variant="ghost" icon={ImageSquareIcon} onClick={() => setPhotos((x) => ({ ...x, [s.id]: 'sample' }))}>
                          Sample
                        </Button>
                      </span>
                    </span>
                  </div>
                )}
                <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2.5 pt-8', p ? 'bg-gradient-to-t from-black/60 to-transparent text-white' : 'text-fg')}>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold">
                      {s.label}
                      {i === 0 && <span className={cn('ml-1 font-medium', p ? 'opacity-80' : 'text-danger')}>· required</span>}
                    </span>
                    <span className={cn('block truncate text-[11px]', p ? 'opacity-85' : 'text-muted')}>{s.hint}</span>
                  </span>
                  {p && <CheckCircleIcon size={20} weight="fill" className="shrink-0" />}
                </div>
                {p && (
                  <IconButton
                    icon={XIcon}
                    size="xs"
                    label={`Remove ${s.label} photo`}
                    onClick={() => setPhotos((x) => ({ ...x, [s.id]: undefined }))}
                    className="absolute right-2 top-2 bg-black/50 text-white opacity-0 hover:bg-black/70 hover:text-white group-hover:opacity-100 focus:opacity-100"
                  />
                )}
              </div>
            )
          })}
        </div>

        <Card className="h-fit p-5 lg:sticky lg:top-4">
          <p className="text-[13px] font-semibold text-fg-2">{taken.length} of 5 photos</p>
          <ProgressBar value={(taken.length / 5) * 100} tone={taken.length === 5 ? 'success' : 'brand'} className="mt-2" />
          <p className="mt-3 text-xs leading-relaxed text-muted">Only the front photo is required. The scale photo lets AI estimate size and weight.</p>

          <AnimatePresence initial={false}>
            {reading !== null && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 space-y-1.5 overflow-hidden">
                {READING_STEPS.map((step, i) => (
                  <li key={step} className={cn('flex items-center gap-2 text-[13px]', i < reading ? 'text-success' : i === reading ? 'font-semibold text-fg' : 'text-subtle')}>
                    {i < reading ? <CheckCircleIcon size={15} weight="fill" /> : <SparkleIcon size={15} weight={i === reading ? 'fill' : 'regular'} className={i === reading ? 'animate-pulse text-accent' : ''} />}
                    {step}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>

          <Button block size="lg" icon={SparkleIcon} className="mt-5" loading={reading !== null} disabled={!photos.front} onClick={() => create(true)}>
            {reading !== null ? 'Reading the photos…' : 'Read the photos'}
          </Button>
          <Button block variant="ghost" className="mt-2" disabled={!taken.length || reading !== null} onClick={() => create(false)}>
            Skip AI · I’ll fill it in
          </Button>
        </Card>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          const id = slot.current
          const url = await downscaleImage(f, 900, 0.8)
          setPhotos((x) => ({ ...x, [id]: url }))
        }}
      />
    </>
  )
}
