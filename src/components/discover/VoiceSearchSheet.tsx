import { MicrophoneIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BottomSheet } from '@/overlays/BottomSheet'
import { Chip } from '@/ui'

const EXAMPLES = ['Rotary phone', 'Vanity van', '1970s motorbike']

interface VoiceSearchSheetProps {
  open: boolean
  /** What the simulated voice "hears". */
  phrase: string
  onClose: () => void
  onResult: (text: string) => void
}

/**
 * Simulated voice search: listens, types out what it "heard", then searches.
 * Give it a new `key` each time it opens.
 */
export function VoiceSearchSheet({ open, phrase, onClose, onResult }: VoiceSearchSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <VoiceBody active={open} phrase={phrase} onResult={onResult} />
    </BottomSheet>
  )
}

const LISTEN_MS = 1100
const CHAR_MS = 55

function VoiceBody({ active, phrase, onResult }: { active: boolean; phrase: string; onResult: (text: string) => void }) {
  const [typed, setTyped] = useState(0)
  const [phase, setPhase] = useState<'listening' | 'hearing' | 'done'>('listening')
  const resultRef = useRef(onResult)
  useLayoutEffect(() => {
    resultRef.current = onResult
  })

  useEffect(() => {
    if (!active) return
    const timers = [window.setTimeout(() => setPhase('hearing'), LISTEN_MS)]
    for (let i = 1; i <= phrase.length; i++) timers.push(window.setTimeout(() => setTyped(i), LISTEN_MS + i * CHAR_MS))
    const end = LISTEN_MS + phrase.length * CHAR_MS
    timers.push(window.setTimeout(() => setPhase('done'), end + 250))
    timers.push(window.setTimeout(() => resultRef.current(phrase), end + 950))
    return () => timers.forEach(clearTimeout)
  }, [active, phrase])

  const status = phase === 'listening' ? 'Listening…' : phase === 'hearing' ? 'Go on, I’m listening' : 'Searching…'

  return (
    <div className="flex flex-col items-center pb-1 pt-2 text-center" aria-live="polite">
      <p className="text-sm font-semibold text-muted">{status}</p>
      <p className="mt-2 flex min-h-[64px] max-w-72 items-center justify-center font-display text-[22px] font-bold leading-tight text-fg">
        {typed ? (
          <span>
            {phrase.slice(0, typed)}
            {phase !== 'done' && <span className="ml-0.5 inline-block h-6 w-0.5 translate-y-1 animate-pulse bg-accent" />}
          </span>
        ) : (
          <span className="text-subtle">Say what you’re looking for</span>
        )}
      </p>

      <MicOrb live={phase !== 'done'} />

      <p className="mt-7 text-2xs font-bold uppercase tracking-[0.08em] text-muted">Or try</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((e) => (
          <Chip key={e} onClick={() => onResult(e)}>
            {e}
          </Chip>
        ))}
      </div>
      <p className="mt-4 text-2xs text-subtle">Voice is simulated in this prototype</p>
    </div>
  )
}

function MicOrb({ live }: { live: boolean }) {
  return (
    <div className="relative mt-4 grid size-28 place-items-center">
      {live &&
        [0, 0.8].map((delay) => (
          <motion.span
            key={delay}
            aria-hidden
            className="absolute inset-2 rounded-full bg-accent/25"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay }}
          />
        ))}
      <motion.span
        className="relative grid size-20 place-items-center rounded-full bg-accent text-accent-fg shadow-float"
        animate={live ? { scale: [1, 1.06, 1] } : { scale: 0.92 }}
        transition={live ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
      >
        <MicrophoneIcon size={34} weight="fill" />
      </motion.span>
    </div>
  )
}
