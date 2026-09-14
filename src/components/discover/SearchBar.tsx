import { CameraIcon, MagnifyingGlassIcon, MicrophoneIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'

interface SearchBarButtonProps {
  /** Current search text (shown instead of the placeholder). */
  text?: string
  placeholder?: string
  /** Placeholder examples that rotate, e.g. "rotary phone" → Search "rotary phone". */
  hints?: string[]
  onPress: () => void
  onVoice: () => void
  onPhoto: () => void
  className?: string
}

/**
 * Looks like a search field; tapping it opens the search screen. Voice and
 * photo search sit at the end, like Zomato / Flipkart.
 */
export function SearchBarButton({ text, placeholder = 'Search props, vendors, eras…', hints, onPress, onVoice, onPhoto, className }: SearchBarButtonProps) {
  return (
    <div className={cn('flex h-12 items-center rounded-2xl border border-line bg-surface pl-3.5 pr-1 shadow-card', className)}>
      <button
        type="button"
        onClick={onPress}
        aria-label={text ? `Search: ${text}` : 'Search'}
        className="flex h-full min-w-0 flex-1 items-center gap-2.5 text-left outline-none"
      >
        <MagnifyingGlassIcon size={20} weight="bold" className="shrink-0 text-accent" />
        {text ? (
          <span className="truncate text-[15px] font-medium text-fg">{text}</span>
        ) : hints?.length ? (
          <RotatingHint hints={hints} />
        ) : (
          <span className="truncate text-[15px] text-subtle">{placeholder}</span>
        )}
      </button>
      <span aria-hidden className="mx-1 h-6 w-px bg-line-strong" />
      <ToolButton label="Voice search" onClick={onVoice}>
        <MicrophoneIcon size={20} weight="fill" />
      </ToolButton>
      <ToolButton label="Search with a photo" onClick={onPhoto}>
        <CameraIcon size={20} weight="fill" />
      </ToolButton>
    </div>
  )
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="pressable grid size-10 shrink-0 place-items-center rounded-full text-accent hover:bg-accent-soft"
    >
      {children}
    </button>
  )
}

/** Search "rotary phone" → Search "vanity van" → … sliding up every few seconds. */
function RotatingHint({ hints }: { hints: string[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % hints.length), 2600)
    return () => clearInterval(t)
  }, [hints.length])
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-[15px] text-subtle">
      <span className="shrink-0">Search</span>
      <span className="relative h-6 min-w-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.span
            key={i}
            className="absolute inset-x-0 top-0 truncate leading-6"
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          >
            “{hints[i]}”
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  )
}
