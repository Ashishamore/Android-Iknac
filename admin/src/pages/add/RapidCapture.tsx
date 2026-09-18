import { ArrowRightIcon, CameraIcon, CheckIcon, TrashIcon, UploadSimpleIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { cn } from '@/lib/cn'
import { downscaleImage } from '@/lib/image'
import type { Draft } from '@/lib/owner'
import { useOwner } from '@/store/owner'
import { plural } from '~/lib/data'
import { navigate } from '~/router'
import { Button, IconButton, Kbd } from '~/ui/controls'
import { Card, CardHeader, PageHeader, Thumb } from '~/ui/display'
import { confirm, toast } from '~/ui/feedback'

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

/** Many items → Rapid capture: shoot (or drop photos of) each prop, Next prop, then Done. */
export default function RapidCapture() {
  const addDrafts = useOwner((s) => s.addDrafts)
  const fileRef = useRef<HTMLInputElement>(null)
  const [done, setDone] = useState<string[][]>([])
  const [current, setCurrent] = useState<string[]>([])
  const [flash, setFlash] = useState(0)
  const [dragging, setDragging] = useState(false)
  const total = done.length + (current.length ? 1 : 0)

  const shoot = () => {
    setFlash((f) => f + 1)
    setCurrent((c) => [...c, 'sample'])
  }

  const addFiles = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/')).slice(0, 8)
    if (!images.length) return
    const urls = await Promise.all(images.map((f) => downscaleImage(f, 900, 0.75)))
    setCurrent((c) => [...c, ...urls])
  }

  const next = () => {
    if (!current.length) return
    setDone((d) => [...d, current])
    setCurrent([])
  }

  const finish = () => {
    const all = current.length ? [...done, current] : done
    if (!all.length) return navigate('/add')
    addDrafts(all.map(blankDraft))
    navigate('/add', { replace: true })
    toast(`${plural(all.length, 'prop')} added to “Waiting for details”`, { tone: 'success' })
  }

  const close = async () => {
    if (!total) return navigate('/add')
    const discard = await confirm({ title: `Discard ${plural(total, 'prop')}?`, message: 'Nothing has been saved yet. Press Done instead to keep them as drafts.', confirmText: 'Discard', cancelText: 'Keep capturing', tone: 'danger', icon: TrashIcon })
    if (discard) navigate('/add')
  }

  // Space = shoot, Enter = next prop (like a camera app).
  const keys = useRef({ shoot, next })
  useEffect(() => {
    keys.current = { shoot, next }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select, button, a, [role="dialog"]')) return
      if (e.code === 'Space') {
        e.preventDefault()
        keys.current.shoot()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        keys.current.next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void addFiles([...e.dataTransfer.files])
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Add stock', to: '/add' }, { label: 'Rapid capture' }]}
        title="Rapid capture"
        subtitle="One prop at a time: take 2–4 shots, then Next prop. Add the details later."
        actions={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button icon={CheckIcon} disabled={!total} onClick={finish}>
              Done{total ? ` · ${plural(total, 'prop')}` : ''}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Viewfinder */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className="relative flex min-h-[420px] flex-col overflow-hidden rounded-xl bg-[#101318] text-white shadow-float"
        >
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold tabular-nums">Prop {done.length + 1}</span>
            <span className="text-[13px] text-white/60">{current.length ? `${plural(current.length, 'shot')} of this prop` : 'No shots yet'}</span>
          </div>
          <div className={cn('relative mx-4 grid flex-1 place-items-center rounded-2xl border-2 border-dashed transition-colors', dragging ? 'border-brand-400 bg-brand-500/15' : 'border-white/20 bg-white/5')}>
            <div className="max-w-xs px-6 text-center">
              <CameraIcon size={40} weight="light" className="mx-auto text-white/50" />
              <p className="mt-3 text-sm text-white/80">Fill the frame with one prop, or drop its photos here.</p>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-white/50">
                <Kbd className="border-white/20 bg-white/10 text-white/70">Space</Kbd> shoot · <Kbd className="border-white/20 bg-white/10 text-white/70">Enter</Kbd> next prop
              </p>
            </div>
            <AnimatePresence>{flash > 0 && <motion.div key={flash} className="pointer-events-none absolute inset-0 rounded-2xl bg-white" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }} />}</AnimatePresence>
          </div>

          <div className="flex h-20 items-center gap-2 overflow-x-auto px-4 no-scrollbar">
            {current.map((p, i) => (
              <motion.span key={i} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <Thumb listing={{ photos: [p], category: 'Decor', catalogId: null }} className="size-14 rounded-lg bg-white/10 ring-2 ring-white/20 [&_svg]:text-white/50" iconSize={20} />
              </motion.span>
            ))}
          </div>

          <div className="grid grid-cols-3 items-center border-t border-white/10 px-6 py-4">
            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 justify-self-start rounded-lg px-3 py-2 text-[13px] font-semibold text-white/80 hover:bg-white/10">
              <UploadSimpleIcon size={18} /> Upload
            </button>
            <motion.button type="button" aria-label="Take a photo" whileTap={{ scale: 0.9 }} onClick={shoot} className="grid size-16 place-items-center justify-self-center rounded-full border-4 border-white/90 hover:border-white">
              <span className="size-12 rounded-full bg-white" />
            </motion.button>
            <button type="button" onClick={next} disabled={!current.length} className="flex items-center gap-2 justify-self-end rounded-lg px-3 py-2 text-[13px] font-semibold text-white/80 hover:bg-white/10 disabled:opacity-40">
              Next prop <ArrowRightIcon size={16} weight="bold" />
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void addFiles([...(e.target.files ?? [])])
              e.target.value = ''
            }}
          />
        </div>

        {/* Captured so far */}
        <Card className="flex flex-col">
          <CardHeader title="Captured" subtitle={total ? `${plural(total, 'prop')} · details come later` : 'Props you finish appear here'} />
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
            {done.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-muted">Take a few shots, then press Next prop.</p>
            ) : (
              <ul className="divide-y divide-line">
                {done.map((shots, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <Thumb listing={{ photos: shots, category: 'Decor', catalogId: null }} className="size-11 rounded-lg" iconSize={18} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-fg">Prop {i + 1}</span>
                      <span className="block text-xs text-muted">{plural(shots.length, 'shot')}</span>
                    </span>
                    <IconButton icon={TrashIcon} size="sm" label={`Remove prop ${i + 1}`} onClick={() => setDone((d) => d.filter((_, j) => j !== i))} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-line p-3">
            <Button block icon={CheckIcon} disabled={!total} onClick={finish}>
              Done{total ? ` · ${plural(total, 'prop')}` : ''}
            </Button>
          </div>
        </Card>
      </div>
    </>
  )
}
