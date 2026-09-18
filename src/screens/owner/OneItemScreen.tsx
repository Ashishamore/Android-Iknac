import { CameraIcon, CheckCircleIcon, RulerIcon, SparkleIcon } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { ListingThumb } from '@/components/owner/OwnerUI'
import { usePhotoPicker } from '@/components/usePhotoPicker'
import { AI_GUESSES } from '@/data/owner'
import { cn } from '@/lib/cn'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { downscaleImage } from '@/lib/image'
import { nav } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useOwner } from '@/store/owner'
import { AppBar, Button, Screen } from '@/ui'

const SLOTS = [
  { id: 'front', label: 'Front', hint: 'Straight on' },
  { id: 'back', label: 'Back', hint: 'The other side' },
  { id: 'detail', label: 'Detail', hint: 'Texture, maker’s mark, wear' },
  { id: 'inuse', label: 'In use', hint: 'Styled, as it would sit on set' },
  { id: 'scale', label: 'Scale photo', hint: 'Next to a person, A4 sheet or tape' },
] as const
type SlotId = (typeof SLOTS)[number]['id']

/** One item → Front · Back · Detail · In use · Scale photo → Read the photos (AI fills the form). */
export default function OneItemScreen() {
  const popup = usePopup()
  const drafts = useOwner((s) => s.drafts)
  const multiple = useOwner((s) => s.policies.depositMultiple)
  const addDrafts = useOwner((s) => s.addDrafts)
  const [photos, setPhotos] = useState<Partial<Record<SlotId, string>>>({})
  const slot = useRef<SlotId>('front')
  const [reading, setReading] = useState(false)
  const taken = SLOTS.filter((s) => photos[s.id]).map((s) => photos[s.id]!)

  const picker = usePhotoPicker({
    title: 'Add a photo',
    sample: { url: 'sample', label: 'A placeholder photo' },
    onPick: async ({ url, file }) => {
      const id = slot.current
      const p = file ? await downscaleImage(file, 900, 0.8) : 'sample'
      if (file) URL.revokeObjectURL(url)
      setPhotos((x) => ({ ...x, [id]: p }))
      haptic()
    },
  })

  const open = (id: SlotId) => {
    slot.current = id
    void picker.pick()
  }

  const create = async (useAi: boolean) => {
    const guess = AI_GUESSES[drafts.filter((d) => d.source === 'one').length % AI_GUESSES.length]
    if (useAi) {
      setReading(true)
      await sleep(1700)
      setReading(false)
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
    haptic('success')
    nav.replace(`/renter/add/draft/${id}`)
    if (useAi && !hasScale) popup.toast('No scale photo, so add the size and weight yourself', { tone: 'info' })
  }

  return (
    <Screen
      surface
      header={<AppBar close title="One item" subtitle={`${taken.length} of 5 photos`} />}
      footer={
        <div className="space-y-2 @medium:mx-auto @medium:max-w-md">
          <Button size="lg" block icon={SparkleIcon} loading={reading} disabled={!photos.front} onClick={() => create(true)}>
            {reading ? 'Reading the photos…' : 'Read the photos'}
          </Button>
          <button type="button" disabled={!taken.length || reading} onClick={() => create(false)} className="w-full py-1 text-center text-sm font-semibold text-muted disabled:opacity-40">
            Skip AI · I’ll fill it in
          </button>
        </div>
      }
    >
      <div className="px-4 pb-8 pt-2 @medium:mx-auto @medium:max-w-xl">
        <p className="text-[15px] leading-relaxed text-fg-2">Take these five photos. AI reads them and fills in the name, category, era, size and a description. You check it before it goes live.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {SLOTS.map((s, i) => {
            const p = photos[s.id]
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => open(s.id)}
                className={cn('pressable relative overflow-hidden rounded-2xl text-left outline-none focus-visible:ring-4 focus-visible:ring-accent/25', i === 4 && 'col-span-2', p ? 'bg-surface-2' : 'border-2 border-dashed border-line-strong')}
              >
                {p ? (
                  <ListingThumb listing={{ photos: [p], category: 'Decor', catalogId: null }} className={cn('w-full', i === 4 ? 'aspect-[2/1]' : 'aspect-square')} iconSize={32} />
                ) : (
                  <span className={cn('grid w-full place-items-center text-muted', i === 4 ? 'aspect-[2/1]' : 'aspect-square')}>
                    {s.id === 'scale' ? <RulerIcon size={30} /> : <CameraIcon size={30} />}
                  </span>
                )}
                <span className={cn('absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2.5 pt-6', p ? 'bg-gradient-to-t from-black/55 to-transparent text-white' : 'text-fg')}>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{s.label}</span>
                    <span className={cn('block truncate text-[11px]', p ? 'opacity-90' : 'text-muted')}>{p ? 'Tap to retake' : s.hint}</span>
                  </span>
                  {p && <CheckCircleIcon size={20} weight="fill" className="shrink-0 text-white" />}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-muted">Only the front photo is required. The scale photo lets AI estimate size and weight.</p>
      </div>
      {picker.element}
    </Screen>
  )
}
