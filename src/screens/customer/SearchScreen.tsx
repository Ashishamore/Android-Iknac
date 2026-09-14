import {
  ArrowLeftIcon,
  ArrowUpLeftIcon,
  CameraIcon,
  ClockCounterClockwiseIcon,
  HourglassIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  StorefrontIcon,
  TrendUpIcon,
  XCircleIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchTools } from '@/components/discover/useSearchTools'
import { CATEGORIES, COLLECTIONS, PROPS } from '@/data/props'
import { cn } from '@/lib/cn'
import { resultsPath, suggest, type Filters, type Suggestion } from '@/lib/search'
import { nav, useQuery, useRouteState } from '@/navigation'
import { useDiscover } from '@/store/discover'
import { Chip, IconButton, Screen } from '@/ui'

/** Passed by the results screen so a new search updates it instead of opening another. */
export interface SearchRouteState {
  apply?: (patch: Partial<Filters>, photo?: string | null) => void
}

const POPULAR = ['Rotary phone', 'Vanity van', 'Chesterfield sofa', 'Kaali-peeli taxi', 'Neon sign', 'Gramophone']

function suggestionIcon(s: Suggestion): Icon {
  if (s.kind === 'category') return CATEGORIES.find((c) => c.id === s.label)?.icon ?? MagnifyingGlassIcon
  if (s.kind === 'collection') return COLLECTIONS.find((c) => c.name === s.label)?.icon ?? MagnifyingGlassIcon
  if (s.kind === 'vendor') return StorefrontIcon
  if (s.kind === 'era') return HourglassIcon
  return PROPS.find((p) => p.name === s.label)?.icon ?? MagnifyingGlassIcon
}

/** Bold the part of `label` that matches what was typed. */
function Highlight({ label, term }: { label: string; term: string }) {
  const i = label.toLowerCase().indexOf(term.trim().toLowerCase())
  if (!term.trim() || i < 0) return <>{label}</>
  const end = i + term.trim().length
  return (
    <>
      {label.slice(0, i)}
      <b className="font-bold text-fg">{label.slice(i, end)}</b>
      {label.slice(end)}
    </>
  )
}

/** Text search with recent searches, type-ahead suggestions, voice and photo. */
export default function SearchScreen() {
  const query = useQuery()
  const route = useRouteState<SearchRouteState>()
  const [text, setText] = useState(() => query.get('q') ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const recent = useDiscover((s) => s.recent)
  const addRecent = useDiscover((s) => s.addRecent)
  const removeRecent = useDiscover((s) => s.removeRecent)
  const clearRecent = useDiscover((s) => s.clearRecent)
  const suggestions = useMemo(() => suggest(text), [text])

  // Focus once the screen has faded in, so the keyboard doesn't fight the animation.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 320)
    return () => clearTimeout(t)
  }, [])

  const go = (patch: Partial<Filters>, photo?: string | null) => {
    inputRef.current?.blur()
    if (route?.apply) {
      route.apply(patch, photo)
      nav.pop()
    } else {
      nav.replace(resultsPath(patch), photo !== undefined ? { state: { photo } } : undefined)
    }
  }

  const submit = (term: string) => {
    const t = term.trim()
    if (!t) return
    addRecent(t)
    go({ q: t })
  }

  const pick = (s: Suggestion) => {
    addRecent(s.label)
    go(s.patch)
  }

  const tools = useSearchTools({
    onVoice: submit,
    onPhoto: ({ url, matchId }) => go({ similarTo: matchId }, url),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit(text)
  }

  return (
    <Screen
      surface
      header={
        <header className="relative z-30 shrink-0 border-b border-line bg-surface pt-safe">
          <form role="search" onSubmit={onSubmit} className="flex h-16 items-center gap-1 px-2">
            <IconButton icon={ArrowLeftIcon} label="Back" onClick={() => nav.pop()} />
            <div className="flex h-11 min-w-0 flex-1 items-center gap-1 rounded-xl bg-surface-2 pl-3.5 pr-1 transition-shadow focus-within:shadow-[0_0_0_2px_var(--color-accent)]">
              <MagnifyingGlassIcon size={19} className="shrink-0 text-muted" />
              <input
                ref={inputRef}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                aria-label="Search props"
                placeholder="Search props, vendors, eras…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent pl-1.5 text-[15px] text-fg outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden"
              />
              {text ? (
                <button
                  type="button"
                  aria-label="Clear"
                  onClick={() => {
                    setText('')
                    inputRef.current?.focus()
                  }}
                  className="pressable grid size-9 place-items-center"
                >
                  <XCircleIcon size={19} weight="fill" className="text-subtle" />
                </button>
              ) : (
                <>
                  <button type="button" aria-label="Voice search" onClick={tools.startVoice} className="pressable grid size-9 place-items-center text-accent">
                    <MicrophoneIcon size={20} weight="fill" />
                  </button>
                  <button type="button" aria-label="Search with a photo" onClick={tools.startPhoto} className="pressable grid size-9 place-items-center text-accent">
                    <CameraIcon size={20} weight="fill" />
                  </button>
                </>
              )}
            </div>
          </form>
        </header>
      }
    >
      {text.trim() ? (
        <ul className="py-1.5">
          <li>
            <Row icon={MagnifyingGlassIcon} onClick={() => submit(text)} accent>
              Search for “{text.trim()}”
            </Row>
          </li>
          {suggestions.map((s) => (
            <li key={`${s.kind}-${s.label}`}>
              <Row icon={suggestionIcon(s)} detail={s.detail} onClick={() => pick(s)} trailing={<ArrowUpLeftIcon size={16} className="text-subtle" />}>
                <Highlight label={s.label} term={text} />
              </Row>
            </li>
          ))}
          {suggestions.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted">No quick matches — press search to look everywhere.</li>
          )}
        </ul>
      ) : (
        <>
          {recent.length > 0 && (
            <section className="pt-3">
              <div className="flex items-center justify-between px-4 pb-1">
                <h2 className="text-xs font-bold uppercase tracking-[0.07em] text-muted">Recent searches</h2>
                <button type="button" onClick={clearRecent} className="rounded-lg px-1 py-0.5 text-sm font-semibold text-accent">
                  Clear all
                </button>
              </div>
              <ul>
                {recent.map((term) => (
                  <li key={term} className="flex items-center pr-2">
                    <Row icon={ClockCounterClockwiseIcon} onClick={() => submit(term)} className="flex-1">
                      {term}
                    </Row>
                    <IconButton icon={XIcon} label={`Remove ${term}`} size="sm" className="text-subtle" onClick={() => removeRecent(term)} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="px-4 pt-5">
            <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.07em] text-muted">
              <TrendUpIcon size={14} weight="bold" /> Popular right now
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {POPULAR.map((p) => (
                <Chip key={p} onClick={() => submit(p)}>
                  {p}
                </Chip>
              ))}
            </div>
          </section>

          <section className="px-4 pb-8 pt-7">
            <h2 className="text-xs font-bold uppercase tracking-[0.07em] text-muted">Browse by category</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip key={c.id} icon={c.icon} onClick={() => go({ categories: [c.id] })}>
                  {c.id}
                </Chip>
              ))}
            </div>
          </section>
        </>
      )}
      {tools.element}
    </Screen>
  )
}

function Row({
  icon: RIcon,
  children,
  detail,
  trailing,
  onClick,
  accent,
  className,
}: {
  icon: Icon
  children: ReactNode
  detail?: string
  trailing?: ReactNode
  onClick: () => void
  accent?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex w-full items-center gap-3.5 px-4 py-2.5 text-left transition-colors active:bg-surface-2', className)}
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full',
          accent ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-fg-2',
        )}
      >
        <RIcon size={18} weight={accent ? 'bold' : 'regular'} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[15px]', accent ? 'font-semibold text-accent' : 'text-fg-2')}>{children}</span>
        {detail && <span className="block truncate text-xs text-muted">{detail}</span>}
      </span>
      {trailing}
    </button>
  )
}
