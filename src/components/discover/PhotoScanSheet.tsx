import { CheckCircleIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RentalProp } from '@/data/props'
import { EASE_OUT, T } from '@/lib/motion'
import { BottomSheet } from '@/overlays/BottomSheet'
import { Tag } from '@/ui'
import { PropThumb } from '../PropCard'

interface PhotoScanSheetProps {
  open: boolean
  /** The photo (object URL or path); null shows the matched prop's tile. */
  url: string | null
  /** The prop the photo "matches" (image recognition is simulated). */
  match: RentalProp
  onClose: () => void
  onDone: () => void
}

/** "Scanning" animation over the photo, then the detected tags. Give it a new `key` each time it opens. */
export function PhotoScanSheet({ open, url, match, onClose, onDone }: PhotoScanSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Photo search">
      <ScanBody active={open} url={url} match={match} onDone={onDone} />
    </BottomSheet>
  )
}

function ScanBody({ active, url, match, onDone }: { active: boolean; url: string | null; match: RentalProp; onDone: () => void }) {
  const [found, setFound] = useState(false)
  const doneRef = useRef(onDone)
  useLayoutEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => {
    if (!active) return
    const a = window.setTimeout(() => setFound(true), 1900)
    const b = window.setTimeout(() => doneRef.current(), 3000)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [active])

  const tags = [match.category, match.era, match.material].filter(Boolean) as string[]

  return (
    <div className="pb-1">
      <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-2">
        {url ? (
          <img src={url} alt="Your photo" className="size-full object-cover" />
        ) : (
          <PropThumb item={match} iconSize={56} className="size-full" />
        )}
        {/* Viewfinder corners */}
        {['left-3 top-3 border-l-[3px] border-t-[3px] rounded-tl-xl', 'right-3 top-3 border-r-[3px] border-t-[3px] rounded-tr-xl', 'bottom-3 left-3 border-b-[3px] border-l-[3px] rounded-bl-xl', 'bottom-3 right-3 border-b-[3px] border-r-[3px] rounded-br-xl'].map((c) => (
          <span key={c} aria-hidden className={`absolute size-7 border-white/90 drop-shadow ${c}`} />
        ))}
        <AnimatePresence>
          {!found && (
            <motion.span
              key="scan"
              aria-hidden
              className="absolute inset-x-0 h-20 bg-linear-to-b from-transparent via-white/45 to-transparent"
              initial={{ top: '-25%' }}
              animate={{ top: '100%' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          {found && (
            <motion.span
              key="found"
              className="absolute inset-0 grid place-items-center bg-scrim/35"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={T.pop_in} className="text-white">
                <CheckCircleIcon size={56} weight="fill" />
              </motion.span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 min-h-[76px] text-center" aria-live="polite">
        <p className="text-[15px] font-semibold text-fg">
          {found ? `Looks like: ${match.name}` : 'Looking for similar props…'}
        </p>
        <AnimatePresence>
          {found && (
            <motion.div
              className="mt-2.5 flex flex-wrap justify-center gap-1.5"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            >
              {tags.map((t) => (
                <Tag key={t} tone="brand" className="px-2.5 py-1 text-xs">
                  {t}
                </Tag>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {!found && <p className="mt-1 text-sm text-muted">Matching shape, style and era</p>}
      </div>
    </div>
  )
}
