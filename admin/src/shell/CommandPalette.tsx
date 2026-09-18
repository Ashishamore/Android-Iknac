import {
  ArrowRightIcon,
  CalendarDotsIcon,
  CalendarXIcon,
  CameraIcon,
  ChatCircleTextIcon,
  CornersOutIcon,
  FileCsvIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  QrCodeIcon,
  ReceiptIcon,
  SparkleIcon,
  SunHorizonIcon,
  UserCircleIcon,
  type Icon,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { useOwner } from '@/store/owner'
import { PROFILE_SECTIONS } from '~/pages/profile/sections'
import { navigate } from '~/router'
import { useChromeUi } from '~/store/ui'
import { Kbd } from '~/ui/controls'

interface Result {
  id: string
  group: string
  label: string
  hint?: string
  icon: Icon
  to: string
}

const PAGES: Result[] = [
  { id: 'p-today', group: 'Go to', label: 'Today', icon: SunHorizonIcon, to: '/today' },
  { id: 'p-stock', group: 'Go to', label: 'Stock', icon: PackageIcon, to: '/stock' },
  { id: 'p-diary', group: 'Go to', label: 'Diary', icon: CalendarDotsIcon, to: '/diary' },
  { id: 'p-messages', group: 'Go to', label: 'Messages · requests', icon: ChatCircleTextIcon, to: '/requests' },
  { id: 'p-handover', group: 'Go to', label: 'Handover · scan a code', icon: QrCodeIcon, to: '/handover' },
  { id: 'p-profile', group: 'Go to', label: 'Profile', icon: UserCircleIcon, to: '/profile' },
  { id: 'a-rapid', group: 'Actions', label: 'Add many items · rapid capture', icon: CameraIcon, to: '/add/rapid' },
  { id: 'a-one', group: 'Actions', label: 'Add one item · AI reads the photos', icon: SparkleIcon, to: '/add/one' },
  { id: 'a-import', group: 'Actions', label: 'Import stock from a spreadsheet', icon: FileCsvIcon, to: '/add/import' },
  { id: 'a-block', group: 'Actions', label: 'Block dates', icon: CalendarXIcon, to: '/diary?block=1' },
  ...PROFILE_SECTIONS.flatMap((g) => g.items.map((s) => ({ id: `s-${s.id}`, group: 'Settings', label: s.label, hint: g.label, icon: s.icon, to: `/profile/${s.id}` }))),
]

/** Ctrl + K: jump to any page, listing, order or request. */
export function CommandPalette() {
  const open = useChromeUi((s) => s.palette)
  const set = useChromeUi((s) => s.set)
  const listings = useOwner((s) => s.listings)
  const orders = useOwner((s) => s.orders)
  const requests = useOwner((s) => s.requests)
  const [q, setQ] = useState('')
  const [index, setIndex] = useState(0)
  const list = useRef<HTMLDivElement>(null)

  const close = () => {
    set({ palette: false })
    setQ('')
    setIndex(0)
  }

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    const has = (...parts: (string | undefined)[]) => parts.join(' ').toLowerCase().includes(term)
    if (!term) return PAGES.filter((p) => p.group !== 'Settings')
    const nameOf = (id: string) => listings.find((l) => l.id === id)?.name ?? ''
    return [
      ...PAGES.filter((p) => has(p.label, p.hint)),
      ...listings
        .filter((l) => has(l.name, l.category, l.era, l.pieces.map((p) => p.code).join(' ')))
        .slice(0, 6)
        .map((l) => ({ id: l.id, group: 'Stock', label: l.name, hint: `${l.category} · ${l.pieces.length} pieces`, icon: PackageIcon, to: `/stock/${l.id}` })),
      ...orders
        .filter((o) => has(o.id, o.renter.company, o.renter.person, o.project, nameOf(o.listingId)))
        .slice(0, 6)
        .map((o) => ({ id: o.id, group: 'Orders', label: `${o.id} · ${o.renter.company}`, hint: nameOf(o.listingId), icon: ReceiptIcon, to: `/orders/${o.id}` })),
      ...requests
        .filter((r) => has(r.renter.company, r.text, nameOf(r.listingId)))
        .slice(0, 4)
        .map((r) => ({ id: r.id, group: 'Messages', label: `${r.renter.company} · ${r.kind === 'question' ? 'Question' : r.kind === 'change' ? 'Change request' : 'Damage'}`, hint: r.text, icon: ChatCircleTextIcon, to: `/requests/${r.id}` })),
    ]
  }, [q, listings, orders, requests])

  useEffect(() => {
    list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const go = (r: Result | undefined) => {
    if (!r) return
    close()
    navigate(r.to)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(results[index])
    } else if (e.key === 'Escape') close()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[65] flex items-start justify-center px-3 pt-[10vh]">
          <motion.div className="absolute inset-0 bg-scrim/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div
            role="dialog"
            aria-label="Search"
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-float"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <MagnifyingGlassIcon size={18} className="shrink-0 text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setIndex(0)
                }}
                onKeyDown={onKey}
                placeholder="Search pages, stock, tag codes, orders, renters…"
                className="h-13 min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-subtle"
              />
              <Kbd>Esc</Kbd>
            </div>
            <div ref={list} className="thin-scroll min-h-0 flex-1 overflow-y-auto p-1.5">
              {results.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">No matches for “{q}”</p>}
              {results.map((r, i) => {
                const header = i === 0 || results[i - 1].group !== r.group
                return (
                  <div key={r.id}>
                    {header && <p className="px-2.5 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-subtle">{r.group}</p>}
                    <button
                      type="button"
                      data-index={i}
                      onMouseMove={() => setIndex(i)}
                      onClick={() => go(r)}
                      className={cn('flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[13px]', i === index ? 'bg-accent-soft text-accent-soft-fg' : 'text-fg')}
                    >
                      <r.icon size={17} className={cn('shrink-0', i === index ? '' : 'text-muted')} />
                      <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>
                      {r.hint && <span className="max-w-[45%] truncate text-xs text-muted">{r.hint}</span>}
                      {i === index && <ArrowRightIcon size={14} className="shrink-0" />}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-3 border-t border-line bg-surface-2/60 px-4 py-2 text-[11px] text-muted">
              <span className="flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> move
              </span>
              <span className="flex items-center gap-1">
                <Kbd>Enter</Kbd> open
              </span>
              <span className="ml-auto flex items-center gap-1">
                <CornersOutIcon size={12} /> Ctrl K anywhere
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
