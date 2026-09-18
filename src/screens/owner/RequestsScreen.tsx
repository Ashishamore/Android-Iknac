import { CalendarXIcon, ChatCircleTextIcon, CheckCircleIcon, QuestionIcon, SwapIcon, WarningIcon, type Icon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { DeclineSheet } from '@/components/owner/DeclineSheet'
import { DueTag, ListingThumb } from '@/components/owner/OwnerUI'
import { formatDateRangeShort, timeAgo } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { ANSWER_WINDOW, type OwnerRequest } from '@/lib/owner'
import { nav, useQuery } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useOwner } from '@/store/owner'
import { AppBar, Button, Card, EmptyState, Screen, SectionHeader, Tabs, Tag } from '@/ui'

type Tab = 'bookings' | 'questions' | 'done'
const KIND_ICON: Record<OwnerRequest['kind'], Icon> = { question: QuestionIcon, change: SwapIcon, damage: WarningIcon }

/** Messages → Requests: booking requests (accept · decline with reason), questions, and done. */
export default function RequestsScreen() {
  const popup = usePopup()
  const query = useQuery()
  const orders = useOwner((s) => s.orders)
  const requests = useOwner((s) => s.requests)
  const listings = useOwner((s) => s.listings)
  const accept = useOwner((s) => s.acceptOrder)
  const decline = useOwner((s) => s.declineOrder)
  const [tab, setTab] = useState<Tab>(() => (query.get('tab') === 'questions' || query.get('tab') === 'done' ? (query.get('tab') as Tab) : 'bookings'))
  const [declining, setDeclining] = useState<{ key: number; open: boolean; id: string | null }>({ key: 0, open: false, id: null })
  const listingOf = (id: string) => listings.find((l) => l.id === id)!

  const pending = orders.filter((o) => o.status === 'request').sort((a, b) => a.requestedAt - b.requestedAt)
  const upcoming = orders.filter((o) => o.status === 'confirmed' || o.status === 'out').sort((a, b) => a.from.localeCompare(b.from))
  const open = requests.filter((r) => r.status === 'open').sort((a, b) => a.at - b.at)
  const done = [
    ...requests.filter((r) => r.status === 'done').map((r) => ({ key: r.id, at: r.at, title: `${r.renter.company} · ${listingOf(r.listingId).name}`, text: r.answer ?? '', to: `/renter/requests/${r.id}`, tag: 'Answered' })),
    ...orders
      .filter((o) => o.status === 'declined' || o.status === 'closed')
      .map((o) => ({ key: o.id, at: o.requestedAt, title: `${o.renter.company} · ${listingOf(o.listingId).name}`, text: o.status === 'declined' ? `Declined: ${o.declineReason}` : `Closed · ${formatDateRangeShort(o.from, o.to)}`, to: `/renter/orders/${o.id}`, tag: o.status === 'declined' ? 'Declined' : 'Closed' })),
  ].sort((a, b) => b.at - a.at)

  return (
    <Screen
      resetScrollOn={tab}
      header={
        <AppBar title="Requests">
          <Tabs
            tabs={[
              { value: 'bookings', label: 'Bookings', count: pending.length },
              { value: 'questions', label: 'Questions', count: open.length },
              { value: 'done', label: 'Done' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </AppBar>
      }
    >
      <div className="px-4 pb-10 pt-3 @medium:mx-auto @medium:max-w-2xl">
        {tab === 'bookings' && (
          <>
            {pending.length === 0 ? (
              <EmptyState icon={CalendarXIcon} title="No booking requests" description="New requests appear here. You have 24 hours to answer each one." className="py-8" />
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {pending.map((o) => {
                  const l = listingOf(o.listingId)
                  return (
                    <Card key={o.id} className="p-3.5">
                      <button type="button" onClick={() => nav.push(`/renter/orders/${o.id}`)} className="flex w-full items-start gap-3 text-left">
                        <ListingThumb listing={l} className="size-12 shrink-0 rounded-xl" iconSize={20} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-fg">{o.renter.company}</span>
                            <DueTag due={o.requestedAt + ANSWER_WINDOW} />
                          </span>
                          <span className="block truncate text-[13px] text-fg-2">
                            {l.name} × {o.qty}
                          </span>
                          <span className="block truncate text-[13px] text-muted">
                            {formatDateRangeShort(o.from, o.to)} · {o.project}
                          </span>
                        </span>
                      </button>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="secondary" className="flex-1" onClick={() => setDeclining((s) => ({ key: s.key + 1, open: true, id: o.id }))}>
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          icon={CheckCircleIcon}
                          className="flex-1"
                          onClick={() => {
                            accept(o.id)
                            haptic('success')
                            popup.toast(`Accepted ${o.renter.company}`, { tone: 'success' })
                          }}
                        >
                          Accept
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
            <SectionHeader title="Upcoming and out" subtitle={`${upcoming.length} active booking${upcoming.length === 1 ? '' : 's'}`} className="px-0 pt-6" />
            <Card className="overflow-hidden">
              {upcoming.map((o) => (
                <Row key={o.id} to={`/renter/orders/${o.id}`} title={`${o.renter.company} · ${listingOf(o.listingId).name} × ${o.qty}`} text={formatDateRangeShort(o.from, o.to)} tag={<Tag tone={o.status === 'out' ? 'info' : 'brand'} dot>{o.status === 'out' ? 'Out now' : 'Confirmed'}</Tag>} />
              ))}
            </Card>
          </>
        )}

        {tab === 'questions' &&
          (open.length === 0 ? (
            <EmptyState icon={ChatCircleTextIcon} title="No open questions" description="Questions, change requests and damage reports land here." className="py-8" />
          ) : (
            <Card className="overflow-hidden">
              {open.map((r) => {
                const KIcon = KIND_ICON[r.kind]
                return (
                  <button key={r.id} type="button" onClick={() => nav.push(`/renter/requests/${r.id}`)} className="group relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2">
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                      <KIcon size={18} weight="duotone" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-fg">{r.renter.company}</span>
                        <DueTag due={r.at + ANSWER_WINDOW} />
                      </span>
                      <span className="block truncate text-[13px] text-fg-2">{listingOf(r.listingId).name}</span>
                      <span className="line-clamp-2 text-[13px] text-muted">{r.text}</span>
                    </span>
                    <span aria-hidden className="absolute bottom-0 left-16 right-0 h-px bg-line group-last:hidden" />
                  </button>
                )
              })}
            </Card>
          ))}

        {tab === 'done' && (
          <Card className="overflow-hidden">
            {done.map((d) => (
              <Row key={d.key} to={d.to} title={d.title} text={`${timeAgo(d.at)} · ${d.text}`} tag={<Tag tone={d.tag === 'Declined' ? 'neutral' : 'success'}>{d.tag}</Tag>} />
            ))}
          </Card>
        )}
      </div>

      <DeclineSheet
        key={declining.key}
        open={declining.open}
        onClose={() => setDeclining((s) => ({ ...s, open: false }))}
        onDecline={(reason) => {
          if (declining.id) decline(declining.id, reason)
          setDeclining((s) => ({ ...s, open: false }))
          popup.toast('Declined · the renter has been told')
        }}
      />
    </Screen>
  )
}

function Row({ to, title, text, tag }: { to: string; title: string; text: string; tag: ReactNode }) {
  return (
    <button type="button" onClick={() => nav.push(to)} className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-fg">{title}</span>
        <span className="block truncate text-[13px] text-muted">{text}</span>
      </span>
      {tag}
      <span aria-hidden className="absolute bottom-0 left-4 right-0 h-px bg-line group-last:hidden" />
    </button>
  )
}
