import { CaretDownIcon, ChatCircleDotsIcon, EnvelopeSimpleIcon, PhoneIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { HELP_TOPICS } from '@/data/owner'
import { SUPPORT } from '@/data/profile'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { usePrefs } from '@/store/prefs'
import { AppBar, Button, Card, ListGroup, ListItem, Screen, SectionHeader } from '@/ui'

const OWNER_ALERTS = [
  { id: 'bookings', label: 'Booking requests', description: 'So you can answer inside 24 hours' },
  { id: 'deliveries', label: 'Handovers', description: 'Drivers arriving, returns due today' },
  { id: 'payments', label: 'Payouts', description: 'Every Friday when money lands' },
  { id: 'team', label: 'Questions from renters', description: 'Questions, changes and damage reports' },
]

/** Help & settings: owner FAQs, contact, and which alerts you get. */
export default function OwnerHelpScreen() {
  const [open, setOpen] = useState<number | null>(0)
  const notifications = usePrefs((s) => s.notifications)
  const setNotification = usePrefs((s) => s.setNotification)
  return (
    <Screen header={<AppBar title="Help & settings" />}>
      <div className="pb-10 pt-1 @medium:mx-auto @medium:max-w-2xl">
        <div className="grid grid-cols-3 gap-2.5 px-4">
          {[
            { icon: ChatCircleDotsIcon, label: 'WhatsApp', href: `https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent('Hi, I rent out props and need help')}` },
            { icon: PhoneIcon, label: 'Call us', href: `tel:${SUPPORT.phone}` },
            { icon: EnvelopeSimpleIcon, label: 'Email', href: `mailto:${SUPPORT.email}` },
          ].map((c) => (
            <Button key={c.label} variant="secondary" icon={c.icon} className="flex-col gap-1 py-6" onClick={() => (c.href.startsWith('http') ? window.open(c.href, '_blank', 'noopener') : (window.location.href = c.href))}>
              {c.label}
            </Button>
          ))}
        </div>

        <SectionHeader title="Common questions" className="pt-6" />
        <Card className="mx-4 overflow-hidden">
          {HELP_TOPICS.map((f, i) => {
            const expanded = open === i
            return (
              <div key={f.q} className="group relative">
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : i)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                  <span className="min-w-0 flex-1 text-[15px] font-medium text-fg">{f.q}</span>
                  <CaretDownIcon size={16} weight="bold" className={cn('shrink-0 text-subtle transition-transform duration-300', expanded && 'rotate-180')} />
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE_OUT }} className="overflow-hidden px-4 text-sm leading-relaxed text-fg-2">
                      <span className="block pb-4">{f.a}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
                <span aria-hidden className="absolute bottom-0 left-4 right-0 h-px bg-line group-last:hidden" />
              </div>
            )
          })}
        </Card>

        <ListGroup title="Alerts" className="pt-6">
          {OWNER_ALERTS.map((a) => (
            <ListItem key={a.id} title={a.label} subtitle={a.description} toggle={{ checked: !!notifications[a.id], onChange: (on) => setNotification(a.id, on) }} />
          ))}
        </ListGroup>
        <p className="px-5 pt-4 text-center text-xs text-subtle">Prop Owner app · prototype</p>
      </div>
    </Screen>
  )
}
