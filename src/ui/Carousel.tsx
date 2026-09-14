import { Children, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useIsFocused } from '@/navigation'

/** Swipeable, auto-advancing banner carousel with page dots. */
export function Carousel({
  children,
  interval = 5000,
  className,
}: {
  children: ReactNode
  interval?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const touching = useRef(false)
  const [index, setIndex] = useState(0)
  const count = Children.count(children)
  const focused = useIsFocused()

  const goTo = (i: number) => {
    const el = ref.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!interval || !focused || count < 2) return
    const t = setInterval(() => {
      const el = ref.current
      if (!el || touching.current) return
      goTo((Math.round(el.scrollLeft / el.clientWidth) + 1) % count)
    }, interval)
    return () => clearInterval(t)
  }, [interval, focused, count])

  return (
    <div className={className}>
      <div
        ref={ref}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        onPointerDown={() => (touching.current = true)}
        onPointerUp={() => (touching.current = false)}
        onPointerCancel={() => (touching.current = false)}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-4"
      >
        {Children.map(children, (child) => (
          <div className="w-full shrink-0 snap-center px-4">{child}</div>
        ))}
      </div>
      {count > 1 && (
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300 ease-out-quint',
                i === index ? 'w-5 bg-accent' : 'w-1.5 bg-line-strong',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
