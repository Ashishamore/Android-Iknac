import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  ChatCircleDotsIcon,
  CheckIcon,
  ClockCounterClockwiseIcon,
  DesktopIcon,
  EnvelopeSimpleIcon,
  FilmSlateIcon,
  MapPinIcon,
  MoonIcon,
  PhoneIcon,
  SealCheckIcon,
  StarIcon,
  SunIcon,
  TruckIcon,
  type Icon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { HELP_TOPICS, OWNER_LANGUAGES, PLATFORM } from '@/data/owner'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { ratingSummary } from '@/lib/owner'
import { useOwner } from '@/store/owner'
import { openRenterApp } from '~/lib/actions'
import { isVerified, plural, resetDemo } from '~/lib/data'
import { linkProps, navigate } from '~/router'
import { useUi, type Accent, type Lang, type Theme } from '~/store/ui'
import { Button, Kbd } from '~/ui/controls'
import { Avatar, Card, CardHeader, Tag, Thumb } from '~/ui/display'
import { confirm, toast } from '~/ui/feedback'
import { ProfileLayout } from './Profile'

const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: 'indigo', label: 'Indigo', swatch: 'oklch(0.53 0.21 272)' },
  { id: 'blue', label: 'Blue', swatch: 'oklch(0.55 0.2 258)' },
  { id: 'violet', label: 'Violet', swatch: 'oklch(0.53 0.16 288)' },
  { id: 'teal', label: 'Teal', swatch: 'oklch(0.56 0.11 182)' },
  { id: 'orange', label: 'Orange', swatch: 'oklch(0.66 0.19 44)' },
  { id: 'rose', label: 'Rose', swatch: 'oklch(0.58 0.21 22)' },
]

const THEMES: { id: Theme; label: string; icon: Icon }[] = [
  { id: 'light', label: 'Light', icon: SunIcon },
  { id: 'dark', label: 'Dark', icon: MoonIcon },
  { id: 'system', label: 'Match system', icon: DesktopIcon },
]

/** Language → English · हिंदी · मराठी, plus theme and colour for this panel. */
export function LanguagePage() {
  const ui = useUi()
  return (
    <ProfileLayout section="language" title="Language & appearance" subtitle="For this panel on this browser">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Language" subtitle="Navigation and menus switch language. Page content stays in English in the prototype." />
          <div role="radiogroup" className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3">
            {OWNER_LANGUAGES.map((l) => {
              const on = ui.language === l.id
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    ui.setLanguage(l.id as Lang)
                    toast(l.id === 'en' ? 'Language set to English' : `${l.label} selected`, { tone: 'success' })
                  }}
                  className={cn('flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors', on ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2')}
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-base font-semibold', on ? 'text-accent-soft-fg' : 'text-fg')}>{l.native}</span>
                    <span className="block text-xs text-muted">{l.label}</span>
                  </span>
                  {on && <CheckIcon size={18} weight="bold" className="text-accent" />}
                </button>
              )
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="Theme" />
          <div role="radiogroup" className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3">
            {THEMES.map((t) => {
              const on = ui.theme === t.id
              return (
                <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => ui.setTheme(t.id)} className={cn('flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors', on ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2')}>
                  <t.icon size={20} weight={on ? 'fill' : 'regular'} className={on ? 'text-accent' : 'text-muted'} />
                  <span className={cn('flex-1 text-sm font-semibold', on ? 'text-accent-soft-fg' : 'text-fg')}>{t.label}</span>
                </button>
              )
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="Panel colour" subtitle="Buttons, links and highlights" />
          <div className="flex flex-wrap gap-3 p-4">
            {ACCENTS.map((a) => {
              const on = ui.accent === a.id
              return (
                <button key={a.id} type="button" aria-pressed={on} onClick={() => ui.setAccent(a.id)} className="flex flex-col items-center gap-1.5">
                  <span className={cn('grid size-10 place-items-center rounded-full text-white ring-offset-2 ring-offset-surface transition-shadow', on ? 'ring-2 ring-fg' : 'hover:ring-2 hover:ring-line-strong')} style={{ background: a.swatch }}>
                    {on && <CheckIcon size={16} weight="bold" />}
                  </span>
                  <span className={cn('text-xs', on ? 'font-semibold text-fg' : 'text-muted')}>{a.label}</span>
                </button>
              )
            })}
          </div>
        </Card>
      </div>
    </ProfileLayout>
  )
}

const SHORTCUTS: [string[], string][] = [
  [['Ctrl', 'K'], 'Search pages, stock, orders and renters'],
  [['Esc'], 'Close a dialog or menu'],
  [['Space'], 'Shoot, in rapid capture'],
  [['Enter'], 'Next prop, in rapid capture'],
]

/** Help & settings: answers, support, shortcuts, demo data. */
export function HelpPage() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <ProfileLayout section="help" title="Help & settings" subtitle="Answers to common questions, and how to reach us">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader title="Common questions" />
          <ul className="divide-y divide-line">
            {HELP_TOPICS.map((t, i) => (
              <li key={t.q}>
                <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-fg transition-colors hover:bg-surface-2/70">
                  <span className="flex-1">{t.q}</span>
                  <CaretDownIcon size={14} weight="bold" className={cn('shrink-0 text-muted transition-transform', open === i && 'rotate-180')} />
                </button>
                {open === i && <p className="px-4 pb-4 text-sm leading-relaxed text-fg-2">{t.a}</p>}
              </li>
            ))}
          </ul>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Talk to us" subtitle="Mon–Sat, 9 AM – 9 PM" />
            <div className="flex flex-col gap-2 p-4">
              <Button variant="secondary" icon={PhoneIcon} className="justify-start" onClick={() => (window.location.href = 'tel:+912240001234')}>
                Call support
              </Button>
              <Button variant="secondary" icon={ChatCircleDotsIcon} className="justify-start" onClick={() => toast('Chat opens in the phone app in the prototype', { tone: 'info' })}>
                Chat with us
              </Button>
              <Button variant="secondary" icon={EnvelopeSimpleIcon} className="justify-start" onClick={() => (window.location.href = 'mailto:partners@propkart.in')}>
                partners@propkart.in
              </Button>
            </div>
          </Card>
          <Card>
            <CardHeader title="Keyboard shortcuts" />
            <ul className="space-y-2 p-4">
              {SHORTCUTS.map(([keys, text]) => (
                <li key={text} className="flex items-center gap-3 text-[13px] text-fg-2">
                  <span className="flex shrink-0 gap-1">
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="This app" />
            <div className="flex flex-col gap-2 p-4">
              <Button variant="secondary" icon={FilmSlateIcon} className="justify-start" onClick={openRenterApp}>
                Switch to renting things
              </Button>
              <Button variant="secondary" icon={ClockCounterClockwiseIcon} className="justify-start" onClick={() => navigate('/provider')}>
                Older version (take one)
              </Button>
              <Button
                variant="danger-ghost"
                icon={ArrowCounterClockwiseIcon}
                className="justify-start"
                onClick={async () => {
                  if (await confirm({ title: 'Reset demo data?', message: 'Clears every change made in the admin panel.', confirmText: 'Reset', tone: 'danger', icon: ArrowCounterClockwiseIcon })) resetDemo()
                }}
              >
                Reset demo data
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </ProfileLayout>
  )
}

/** See it as a renter does → the vendor page, built from the owner's data. */
export function VendorPreviewPage() {
  const s = useOwner()
  const rating = ratingSummary(s.reviews)
  const live = s.listings.filter((l) => l.listed && !l.review)
  const categories = [...new Set(live.map((l) => l.category))]
  const [cat, setCat] = useState<string>('All')
  const shown = live.filter((l) => cat === 'All' || l.category === cat)

  return (
    <ProfileLayout
      section="preview"
      title="See it as a renter does"
      subtitle="Your vendor page in the renter app, built from your live data"
      actions={
        <Button variant="secondary" onClick={() => navigate('/profile/business')}>
          Edit business
        </Button>
      }
    >
      <Card className="overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-brand-700 via-brand-500 to-brand-300" />
        <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
          <Avatar name={s.business.name} size="xl" className="-mt-10 rounded-full ring-4 ring-surface" />
          <div className="min-w-0 flex-1 basis-60 pt-3">
            <p className="flex items-center gap-1.5 font-display text-2xl font-extrabold text-fg">
              {s.business.name}
              {isVerified(s.verification) && <SealCheckIcon size={22} weight="fill" className="text-accent" />}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
              <span className="flex items-center gap-1">
                <StarIcon size={13} weight="fill" className="text-amber-500" /> {rating.avg.toFixed(1)} ({s.reviews.length})
              </span>
              <span className="flex items-center gap-1">
                <MapPinIcon size={13} /> Andheri West, Mumbai
              </span>
              <span className="flex items-center gap-1">
                <TruckIcon size={13} /> {s.delivery.enabled ? `Delivers within ${s.delivery.radiusKm} km` : 'Pickup only'}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={PhoneIcon} disabled>
              Call
            </Button>
            <Button disabled>Follow · {s.followers.toLocaleString('en-IN')}</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-line border-t border-line sm:grid-cols-4 sm:divide-y-0">
          {[
            [live.length, 'Props'],
            ['Within 2h', 'Replies'],
            ['96%', 'On time'],
            [s.followers.toLocaleString('en-IN'), 'Followers'],
          ].map(([v, label]) => (
            <div key={label} className="px-4 py-3 text-center">
              <p className="font-display text-lg font-extrabold text-fg">{v}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader title="Props" subtitle={plural(live.length, 'live listing')} />
          <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
            {['All', ...categories].map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} className={cn('rounded-full px-3 py-1 text-[13px] font-medium transition-colors', cat === c ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-2 hover:text-fg')}>
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 2xl:grid-cols-4">
            {shown.map((l) => (
              <a key={l.id} {...linkProps(`/stock/${l.id}`)} className="group min-w-0">
                <Thumb listing={l} className="aspect-square w-full rounded-lg" iconSize={40} />
                <p className="mt-1.5 truncate text-[13px] font-semibold text-fg group-hover:text-accent">{l.name}</p>
                <p className="text-xs text-muted">
                  <span className="font-bold text-fg">{formatINR(l.dayRate)}</span>/day
                </p>
              </a>
            ))}
          </div>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Rental terms" />
            <ul className="space-y-2 p-4 text-[13px] text-fg-2">
              <li>Deposit: {s.policies.depositMultiple}× the day rate, refunded after the return check</li>
              <li>{plural(s.policies.turnaround, 'day')} kept free between bookings</li>
              <li>{s.policies.modifyDefault ? 'Modifications allowed on request' : 'No modifications unless agreed'}</li>
              <li>Longer rentals: 10% off 3–6 days, 20% off 7+</li>
              <li>Payments protected by {PLATFORM}</li>
            </ul>
          </Card>
          <Card>
            <CardHeader title="Reviews" subtitle={`${rating.avg.toFixed(1)} average`} />
            <ul className="divide-y divide-line">
              {[...s.reviews]
                .sort((a, b) => b.at - a.at)
                .slice(0, 4)
                .map((r) => (
                  <li key={r.id} className="px-4 py-3">
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
                      <span className="min-w-0 flex-1 truncate">{r.renter}</span>
                      <Tag tone="warning">
                        <StarIcon size={10} weight="fill" /> {r.rating}
                      </Tag>
                    </p>
                    <p className="mt-0.5 text-[13px] text-fg-2">{r.text}</p>
                    {r.reply && <p className="mt-1 border-l-2 border-line-strong pl-2 text-xs text-muted">Reply: {r.reply}</p>}
                    <p className="mt-1 text-[11px] text-subtle">{timeAgo(r.at)}</p>
                  </li>
                ))}
            </ul>
          </Card>
        </div>
      </div>
    </ProfileLayout>
  )
}
