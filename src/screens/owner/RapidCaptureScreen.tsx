import { ArrowRightIcon, CheckIcon, ImagesIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState, type ChangeEvent } from 'react'
import { ListingThumb } from '@/components/owner/OwnerUI'
import { haptic } from '@/lib/haptics'
import { downscaleImage } from '@/lib/image'
import type { Draft } from '@/lib/owner'
import { nav } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useOwner } from '@/store/owner'
import { Button, Screen } from '@/ui'

const blankDraft = (photos: string[]): Omit<Draft, 'id' | 'createdAt'> => ({
  source: 'rapid',
  photos,
  name: '',
  category: null,
  era: null,
  material: null,
  size: null,
  weight: null,
  pieces: 1,
  condition: 'Good',
  dayRate: null,
  deposit: null,
  description: '',
  aiFilled: [],
})

/** Many items → Rapid capture: shoot each prop, "Next prop", then Done. Details come later. */
export default function RapidCaptureScreen() {
  const popup = usePopup()
  const addDrafts = useOwner((s) => s.addDrafts)
  const fileRef = useRef<HTMLInputElement>(null)
  const [done, setDone] = useState<string[][]>([])
  const [current, setCurrent] = useState<string[]>([])
  const [flash, setFlash] = useState(0)
  const total = done.length + (current.length ? 1 : 0)

  const shoot = () => {
    haptic()
    setFlash((f) => f + 1)
    setCurrent((c) => [...c, 'sample'])
  }

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])].slice(0, 8)
    e.target.value = ''
    const urls = await Promise.all(files.map((f) => downscaleImage(f, 900, 0.75)))
    setCurrent((c) => [...c, ...urls])
  }

  const next = () => {
    if (!current.length) return
    haptic('success')
    setDone((d) => [...d, current])
    setCurrent([])
  }

  const finish = () => {
    const all = current.length ? [...done, current] : done
    if (!all.length) return nav.pop()
    addDrafts(all.map(blankDraft))
    haptic('success')
    nav.pop()
    popup.toast(`${all.length} prop${all.length === 1 ? '' : 's'} added to “Waiting for details”`, { tone: 'success' })
  }

  const close = async () => {
    if (!total) return nav.pop()
    const choice = await popup.actionSheet({
      title: `Keep ${total} prop${total === 1 ? '' : 's'}?`,
      options: [
        { id: 'save', label: 'Save as drafts', icon: CheckIcon },
        { id: 'discard', label: 'Discard them', icon: XIcon, destructive: true },
      ],
    })
    if (choice === 'save') finish()
    else if (choice === 'discard') nav.pop()
  }

  return (
    <Screen>
      <div className="flex min-h-full flex-col bg-[#101318] pt-[var(--sat)] text-white">
        <div className="flex h-14 items-center gap-1 px-2">
          <button type="button" aria-label="Close" onClick={close} className="grid size-10 place-items-center rounded-full hover:bg-white/10">
            <XIcon size={22} />
          </button>
          <h1 className="flex-1 px-1 font-display text-[17px] font-bold">Rapid capture</h1>
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold tabular-nums">Prop {done.length + 1}</span>
        </div>

        {/* Viewfinder (simulated) */}
        <div className="relative mx-4 grid flex-1 place-items-center overflow-hidden rounded-3xl bg-white/5">
          <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed border-white/25" />
          <p className="max-w-60 text-center text-sm text-white/70">Fill the frame with one prop. Take 2–4 shots, then tap Next prop.</p>
          <AnimatePresence>
            {flash > 0 && <motion.div key={flash} className="absolute inset-0 bg-white" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }} />}
          </AnimatePresence>
        </div>

        {/* This prop's shots */}
        <div className="no-scrollbar flex h-20 items-center gap-2 overflow-x-auto px-4">
          {current.map((p, i) => (
            <motion.span key={i} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <ListingThumb listing={{ photos: [p], category: 'Decor', catalogId: null }} className="size-14 rounded-xl ring-2 ring-white/20 [&_svg]:text-white/50" iconSize={20} />
            </motion.span>
          ))}
          {!current.length && <p className="text-sm text-white/50">{done.length ? `${done.length} prop${done.length === 1 ? '' : 's'} captured · keep going` : 'Shots of this prop appear here'}</p>}
        </div>

        {/* Controls */}
        <div className="grid grid-cols-3 items-center px-6 pb-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-1 justify-self-start text-xs font-semibold text-white/80">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/10">
              <ImagesIcon size={22} />
            </span>
            Upload
          </button>
          <motion.button type="button" aria-label="Take a photo" whileTap={{ scale: 0.9 }} onClick={shoot} className="grid size-20 place-items-center justify-self-center rounded-full border-4 border-white/90">
            <span className="size-16 rounded-full bg-white" />
          </motion.button>
          <button type="button" onClick={next} disabled={!current.length} className="flex flex-col items-center gap-1 justify-self-end text-xs font-semibold text-white/80 disabled:opacity-40">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/10">
              <ArrowRightIcon size={22} weight="bold" />
            </span>
            Next prop
          </button>
        </div>
        <div className="px-4 pb-[calc(var(--sab)+16px)]">
          <Button size="lg" block disabled={!total} onClick={finish}>
            Done{total ? ` · ${total} prop${total === 1 ? '' : 's'}` : ''}
          </Button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={upload} />
      </div>
    </Screen>
  )
}
