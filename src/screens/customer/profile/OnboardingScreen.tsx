import { CompassIcon, FilmSlateIcon, PackageIcon, SparkleIcon, UsersThreeIcon, type Icon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { haptic } from '@/lib/haptics'
import { nav } from '@/navigation'
import { Button, Screen } from '@/ui'

const SLIDES: { icon: Icon; accent: Icon; title: string; text: string }[] = [
  { icon: CompassIcon, accent: FilmSlateIcon, title: 'Find any prop in minutes', text: 'Search by era, category or a photo. See what’s free on your shoot dates, near your set.' },
  { icon: SparkleIcon, accent: CompassIcon, title: 'Brief AI, get a board', text: 'Describe a scene or paste a script page. AI Studio lists what it needs and matches props within budget.' },
  { icon: PackageIcon, accent: SparkleIcon, title: 'Hold, book and track', text: 'Reserve for 24 hours, book in five steps, then follow every delivery to set, with a photo check on arrival.' },
  { icon: UsersThreeIcon, accent: PackageIcon, title: 'Run the shoot as a team', text: 'Share boards, chat per project, and keep budget, invoices and GST in one place.' },
]

/** "View onboarding": the intro slides (swipe, or Next). */
export default function OnboardingScreen() {
  const scroller = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const last = index === SLIDES.length - 1

  const goTo = (i: number) => {
    const el = scroller.current
    if (!el) return
    haptic()
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <Screen surface className="flex flex-col overflow-hidden">
      <div className="flex justify-end px-4 pt-[calc(var(--sat)+12px)]">
        <button type="button" onClick={() => nav.pop()} className="rounded-lg px-2 py-1 text-sm font-semibold text-muted">
          Skip
        </button>
      </div>
      <div
        ref={scroller}
        className="no-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => {
          const el = e.currentTarget
          setIndex(Math.round(el.scrollLeft / el.clientWidth))
        }}
      >
        {SLIDES.map((s, i) => (
          <section key={s.title} className="flex w-full shrink-0 snap-center flex-col items-center justify-center px-8 text-center" aria-label={`Slide ${i + 1} of ${SLIDES.length}`}>
            <div className="relative grid size-44 place-items-center">
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-[48px] bg-accent-soft"
                animate={index === i ? { rotate: [0, 6, 0] } : {}}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.span
                className="relative grid size-24 place-items-center rounded-3xl bg-accent text-accent-fg shadow-float"
                animate={index === i ? { y: [0, -6, 0] } : {}}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <s.icon size={48} weight="fill" />
              </motion.span>
              <span aria-hidden className="absolute -right-2 top-4 grid size-11 place-items-center rounded-2xl bg-surface text-accent shadow-card">
                <s.accent size={22} weight="duotone" />
              </span>
            </div>
            <h1 className="mt-10 font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-fg">{s.title}</h1>
            <p className="mt-3 max-w-80 text-[15px] leading-relaxed text-muted">{s.text}</p>
          </section>
        ))}
      </div>
      <div className="px-6 pb-[calc(var(--sab)+20px)] pt-4">
        <div className="mb-5 flex justify-center gap-2" role="tablist" aria-label="Slides">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={index === i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn('h-2 rounded-full transition-all duration-300', index === i ? 'w-6 bg-accent' : 'w-2 bg-line-strong')}
            />
          ))}
        </div>
        <div className="@medium:mx-auto @medium:max-w-md">
          <Button size="lg" block onClick={() => (last ? nav.pop() : goTo(index + 1))}>
            {last ? 'Get started' : 'Next'}
          </Button>
        </div>
      </div>
    </Screen>
  )
}
