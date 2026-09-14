import { CaretDownIcon, ChatCircleDotsIcon, EnvelopeSimpleIcon, LifebuoyIcon, PhoneIcon, PlusIcon, TicketIcon, type Icon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { FAQS, SUPPORT, TICKET_TOPICS } from '@/data/profile'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { EASE_OUT } from '@/lib/motion'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useProfile } from '@/store/profile'
import { useProjectOps } from '@/store/projectOps'
import { useDisplayName } from '@/store/session'
import { AppBar, Button, Card, Chip, IconTile, Screen, SearchField, SectionHeader, Tag, TextArea } from '@/ui'

/** Help & support: FAQs, WhatsApp / call / email, and support tickets. */
export default function HelpScreen() {
  const popup = usePopup()
  const name = useDisplayName().split(' ')[0]
  const tickets = useProfile((s) => s.tickets)
  const addTicket = useProfile((s) => s.addTicket)
  const [q, setQ] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [sheet, setSheet] = useState({ key: 0, open: false })
  const term = q.trim().toLowerCase()
  const faqs = FAQS.map((f, i) => ({ ...f, i })).filter((f) => !term || `${f.q} ${f.a}`.toLowerCase().includes(term))

  const openLink = (url: string) => window.open(url, '_blank', 'noopener')

  return (
    <Screen header={<AppBar title="Help & support" />}>
      <div className="px-4 pb-10 pt-2 @medium:mx-auto @medium:max-w-2xl">
        <h2 className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-fg">Hi {name}, how can we help?</h2>
        <p className="mt-0.5 text-sm text-muted">We’re around 7 AM – 11 PM, every day, including shoot days.</p>
        <SearchField value={q} placeholder="Search help articles" onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} className="mt-4" />

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <Contact icon={ChatCircleDotsIcon} label="WhatsApp" note="Replies in 5 min" onClick={() => openLink(`https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent('Hi, I need help with a booking')}`)} />
          <Contact
            icon={PhoneIcon}
            label="Call us"
            note="Toll-free"
            onClick={() => {
              window.location.href = `tel:${SUPPORT.phone}`
            }}
          />
          <Contact
            icon={EnvelopeSimpleIcon}
            label="Email"
            note="Within a day"
            onClick={() => {
              window.location.href = `mailto:${SUPPORT.email}`
            }}
          />
        </div>

        <SectionHeader title="Common questions" className="px-0 pt-6" />
        {faqs.length === 0 ? (
          <Card className="p-5 text-center">
            <p className="text-sm text-muted">No articles match “{q}”.</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSheet((s) => ({ key: s.key + 1, open: true }))}>
              Ask our team instead
            </Button>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            {faqs.map((f) => {
              const expanded = openFaq === f.i
              return (
                <div key={f.i} className="group relative">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpenFaq(expanded ? null : f.i)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1 text-[15px] font-medium text-fg">{f.q}</span>
                    <CaretDownIcon size={16} weight="bold" className={cn('shrink-0 text-subtle transition-transform duration-300', expanded && 'rotate-180')} />
                  </button>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: EASE_OUT }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 text-sm leading-relaxed text-fg-2">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <span aria-hidden className="absolute bottom-0 left-4 right-0 h-px bg-line group-last:hidden" />
                </div>
              )
            })}
          </Card>
        )}

        <div className="flex items-end justify-between gap-3 pb-3 pt-7">
          <div>
            <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-fg">Your tickets</h2>
            <p className="mt-0.5 text-xs text-muted">{tickets.length ? `${tickets.filter((t) => t.status === 'Open').length} open` : 'Problems you’ve reported'}</p>
          </div>
          <Button size="sm" variant="tonal" icon={PlusIcon} onClick={() => setSheet((s) => ({ key: s.key + 1, open: true }))}>
            Raise a ticket
          </Button>
        </div>
        {tickets.length === 0 ? (
          <Card className="flex items-center gap-3 p-4">
            <IconTile icon={LifebuoyIcon} tone="neutral" />
            <p className="text-sm text-muted">No tickets yet. If something goes wrong with a booking, raise one and we’ll call you back.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            {tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  popup.alert({
                    title: `${t.id} · ${t.topic}`,
                    message: (
                      <>
                        <span className="block">“{t.text}”</span>
                        <span className="mt-2 block">{t.status === 'Open' ? 'We’ll call you back on your registered number within 2 hours.' : 'This ticket is resolved.'}</span>
                      </>
                    ),
                    icon: TicketIcon,
                  })
                }
                className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2"
              >
                <IconTile icon={TicketIcon} tone={t.status === 'Open' ? 'warning' : 'success'} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-fg">
                    {t.topic}
                    {t.bookingId && <span className="font-normal text-muted"> · {t.bookingId}</span>}
                  </span>
                  <span className="block truncate text-[13px] text-muted">
                    {t.id} · {timeAgo(t.at)} · {t.text}
                  </span>
                </span>
                <Tag tone={t.status === 'Open' ? 'warning' : 'success'} dot>
                  {t.status}
                </Tag>
                <span aria-hidden className="absolute bottom-0 left-[66px] right-0 h-px bg-line group-last:hidden" />
              </button>
            ))}
          </Card>
        )}
      </div>

      <TicketSheet
        key={sheet.key}
        open={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSubmit={async (t) => {
          setSheet((s) => ({ ...s, open: false }))
          const hide = popup.loading('Sending to support…')
          await sleep(900)
          hide()
          const id = addTicket(t)
          haptic('success')
          popup.toast(`Ticket ${id} raised · we’ll call you within 2 hours`, { tone: 'success', duration: 4000 })
        }}
      />
    </Screen>
  )
}

function Contact({ icon: CIcon, label, note, onClick }: { icon: Icon; label: string; note: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable flex flex-col items-center rounded-2xl bg-surface px-2 py-3.5 text-center shadow-card outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
    >
      <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
        <CIcon size={20} weight="fill" />
      </span>
      <span className="mt-2 text-sm font-semibold text-fg">{label}</span>
      <span className="text-[11px] text-muted">{note}</span>
    </button>
  )
}

function TicketSheet({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (t: { topic: string; bookingId: string | null; text: string }) => void }) {
  const bookings = useProjectOps((s) => s.bookings)
  const recent = [...bookings].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4)
  const [topic, setTopic] = useState(TICKET_TOPICS[0])
  const [bookingId, setBookingId] = useState<string | null>(recent[0]?.id ?? null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string>()

  const submit = () => {
    if (text.trim().length < 10) {
      haptic('warning')
      return setError('Tell us a little more (at least 10 characters)')
    }
    onSubmit({ topic, bookingId, text: text.trim() })
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Raise a ticket"
      description="A support lead calls you back within 2 hours"
      footer={
        <Button size="lg" block onClick={submit}>
          Send
        </Button>
      }
    >
      <p className="px-1 text-xs font-bold uppercase tracking-[0.07em] text-muted">Topic</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {TICKET_TOPICS.map((t) => (
          <Chip key={t} selected={topic === t} onClick={() => setTopic(t)}>
            {t}
          </Chip>
        ))}
      </div>
      {recent.length > 0 && (
        <>
          <p className="mt-4 px-1 text-xs font-bold uppercase tracking-[0.07em] text-muted">Booking</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recent.map((b) => (
              <Chip key={b.id} selected={bookingId === b.id} onClick={() => setBookingId(b.id)}>
                {b.id}
              </Chip>
            ))}
            <Chip selected={bookingId === null} onClick={() => setBookingId(null)}>
              Not about a booking
            </Chip>
          </div>
        </>
      )}
      <TextArea
        className="mt-4"
        label="What happened?"
        value={text}
        rows={4}
        error={error}
        onChange={(e) => {
          setText(e.target.value)
          setError(undefined)
        }}
      />
    </BottomSheet>
  )
}
