import { ArrowLeftIcon, CalendarXIcon, ChatCircleTextIcon, CheckCircleIcon, QuestionIcon, ShieldCheckIcon, SwapIcon, TrayIcon, WarningIcon, type Icon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { formatDateRangeShort, timeAgo } from '@/lib/dates'
import { ANSWER_WINDOW, type OwnerRequest } from '@/lib/owner'
import { useOwner } from '@/store/owner'
import { KIND_TITLE, plural } from '~/lib/data'
import { navigate } from '~/router'
import { Button, SearchInput, Tabs } from '~/ui/controls'
import { DueTag, EmptyState, PageHeader, Tag, Thumb } from '~/ui/display'
import { toast } from '~/ui/feedback'
import { DeclineDialog, OrderPane, RequestPane } from './panes'

type Tab = 'bookings' | 'questions' | 'done'
const KIND_ICON: Record<OwnerRequest['kind'], Icon> = { question: QuestionIcon, change: SwapIcon, damage: WarningIcon }

/**
 * Messages → Requests, Outlook-style: a list on the left and the order or
 * request open on the right. /requests/:id and /orders/:id select an item.
 */
export default function Inbox({ selectedId }: { selectedId?: string }) {
  const orders = useOwner((s) => s.orders)
  const requests = useOwner((s) => s.requests)
  const listings = useOwner((s) => s.listings)
  const accept = useOwner((s) => s.acceptOrder)
  const decline = useOwner((s) => s.declineOrder)
  const [q, setQ] = useState('')
  const [declining, setDeclining] = useState<{ key: number; open: boolean; id: string | null }>({ key: 0, open: false, id: null })
  const listingOf = (id: string) => listings.find((l) => l.id === id)
  const nameOf = (id: string) => listingOf(id)?.name ?? 'Listing'

  const selOrder = orders.find((o) => o.id === selectedId)
  const selRequest = requests.find((r) => r.id === selectedId)
  const tabFor = (): Tab => (selRequest ? (selRequest.status === 'open' ? 'questions' : 'done') : selOrder && (selOrder.status === 'closed' || selOrder.status === 'declined') ? 'done' : 'bookings')
  const [tab, setTab] = useState<Tab>(tabFor)
  const [lastSelected, setLastSelected] = useState(selectedId)
  if (lastSelected !== selectedId) {
    setLastSelected(selectedId)
    if (selectedId) setTab(tabFor())
  }

  const term = q.trim().toLowerCase()
  const matches = (...parts: string[]) => !term || parts.join(' ').toLowerCase().includes(term)
  const pending = orders.filter((o) => o.status === 'request' && matches(o.id, o.renter.company, o.project, nameOf(o.listingId))).sort((a, b) => a.requestedAt - b.requestedAt)
  const deposits = orders.filter((o) => o.status === 'returned' && matches(o.id, o.renter.company, o.project, nameOf(o.listingId)))
  const upcoming = orders.filter((o) => (o.status === 'confirmed' || o.status === 'out') && matches(o.id, o.renter.company, o.project, nameOf(o.listingId))).sort((a, b) => a.from.localeCompare(b.from))
  const open = requests.filter((r) => r.status === 'open' && matches(r.renter.company, r.text, nameOf(r.listingId))).sort((a, b) => a.at - b.at)
  const done = [
    ...requests.filter((r) => r.status === 'done').map((r) => ({ key: r.id, at: r.at, title: r.renter.company, sub: `${KIND_TITLE[r.kind]} · ${nameOf(r.listingId)}`, text: r.answer ?? '', to: `/requests/${r.id}`, tag: 'Answered' })),
    ...orders
      .filter((o) => o.status === 'declined' || o.status === 'closed')
      .map((o) => ({ key: o.id, at: o.requestedAt, title: o.renter.company, sub: `${o.id} · ${nameOf(o.listingId)} × ${o.qty}`, text: o.status === 'declined' ? `Declined: ${o.declineReason}` : `Closed · ${formatDateRangeShort(o.from, o.to)}`, to: `/orders/${o.id}`, tag: o.status === 'declined' ? 'Declined' : 'Closed' })),
  ]
    .filter((d) => matches(d.title, d.sub, d.text))
    .sort((a, b) => b.at - a.at)

  const pickedListing = selOrder ? listingOf(selOrder.listingId) : selRequest ? listingOf(selRequest.listingId) : undefined
  const hasPane = !!pickedListing && !!(selOrder || selRequest)

  return (
    <>
      <PageHeader crumbs={[{ label: 'Messages' }]} title="Messages" subtitle="Booking requests, questions, change requests and damage reports · answer within 24 hours" className={cn(hasPane && 'hidden lg:block')} />

      <div className="grid min-h-[560px] grid-cols-1 overflow-hidden rounded-xl border border-line bg-surface shadow-card lg:h-[calc(100dvh-12.5rem)] lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* List */}
        <div className={cn('flex min-h-0 flex-col border-line lg:border-r', hasPane && 'hidden lg:flex')}>
          <div className="border-b border-line p-3 pb-0">
            <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search renters, orders, props" />
            <Tabs
              className="mt-2 border-b-0"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'bookings', label: 'Bookings', count: pending.length + deposits.length },
                { value: 'questions', label: 'Questions', count: open.length },
                { value: 'done', label: 'Done' },
              ]}
            />
          </div>
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
            {tab === 'bookings' && (
              <>
                <ListGroup title="Waiting for you" count={pending.length}>
                  {pending.length === 0 ? (
                    <Empty text="No booking requests. New ones appear here with 24 hours to answer." />
                  ) : (
                    pending.map((o) => {
                      const l = listingOf(o.listingId)
                      return (
                        <Row key={o.id} active={selectedId === o.id} onClick={() => navigate(`/orders/${o.id}`)} unread>
                          {l && <Thumb listing={l} className="size-10 rounded-lg" iconSize={18} />}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-fg">{o.renter.company}</p>
                              <DueTag due={o.requestedAt + ANSWER_WINDOW} />
                            </div>
                            <p className="truncate text-[13px] text-fg-2">
                              {l?.name} × {o.qty}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {formatDateRangeShort(o.from, o.to)} · {o.project}
                            </p>
                            <div className="mt-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <Button size="xs" variant="secondary" onClick={() => setDeclining((s) => ({ key: s.key + 1, open: true, id: o.id }))}>
                                Decline
                              </Button>
                              <Button
                                size="xs"
                                icon={CheckCircleIcon}
                                onClick={() => {
                                  accept(o.id)
                                  toast(`Accepted ${o.renter.company}`, { tone: 'success' })
                                }}
                              >
                                Accept
                              </Button>
                            </div>
                          </div>
                        </Row>
                      )
                    })
                  )}
                </ListGroup>
                {deposits.length > 0 && (
                  <ListGroup title="Deposit to release" count={deposits.length}>
                    {deposits.map((o) => (
                      <Row key={o.id} active={selectedId === o.id} onClick={() => navigate(`/orders/${o.id}`)} unread>
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-success-soft text-success">
                          <ShieldCheckIcon size={20} weight="duotone" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-fg">{o.renter.company}</p>
                            {o.returnedAt && <DueTag due={o.returnedAt + ANSWER_WINDOW} />}
                          </div>
                          <p className="truncate text-[13px] text-fg-2">
                            {nameOf(o.listingId)} × {o.qty}
                          </p>
                          <p className="truncate text-xs text-muted">Back and checked · release or claim</p>
                        </div>
                      </Row>
                    ))}
                  </ListGroup>
                )}
                <ListGroup title="Upcoming and out" count={upcoming.length}>
                  {upcoming.map((o) => (
                    <Row key={o.id} active={selectedId === o.id} onClick={() => navigate(`/orders/${o.id}`)}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-fg">{o.renter.company}</p>
                          <Tag tone={o.status === 'out' ? 'info' : 'brand'} dot>
                            {o.status === 'out' ? 'Out now' : 'Confirmed'}
                          </Tag>
                        </div>
                        <p className="truncate text-xs text-muted">
                          {o.id} · {nameOf(o.listingId)} × {o.qty} · {formatDateRangeShort(o.from, o.to)}
                        </p>
                      </div>
                    </Row>
                  ))}
                </ListGroup>
              </>
            )}

            {tab === 'questions' &&
              (open.length === 0 ? (
                <EmptyState icon={ChatCircleTextIcon} title="No open questions" description="Questions, change requests and damage reports land here." />
              ) : (
                open.map((r) => {
                  const KIcon = KIND_ICON[r.kind]
                  return (
                    <Row key={r.id} active={selectedId === r.id} onClick={() => navigate(`/requests/${r.id}`)} unread>
                      <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', r.kind === 'damage' ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent')}>
                        <KIcon size={19} weight="duotone" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-fg">{r.renter.company}</p>
                          <DueTag due={r.at + ANSWER_WINDOW} />
                        </div>
                        <p className="truncate text-xs font-semibold text-fg-2">
                          {KIND_TITLE[r.kind]} · {nameOf(r.listingId)}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted">{r.text}</p>
                      </div>
                    </Row>
                  )
                })
              ))}

            {tab === 'done' &&
              (done.length === 0 ? (
                <EmptyState icon={TrayIcon} title="Nothing here yet" />
              ) : (
                done.map((d) => (
                  <Row key={d.key} active={selectedId === d.key} onClick={() => navigate(d.to)}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-fg">{d.title}</p>
                        <span className="shrink-0 text-[11px] text-subtle">{timeAgo(d.at)}</span>
                      </div>
                      <p className="truncate text-xs text-fg-2">{d.sub}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-xs text-muted">{d.text}</p>
                        <Tag tone={d.tag === 'Declined' ? 'neutral' : 'success'}>{d.tag}</Tag>
                      </div>
                    </div>
                  </Row>
                ))
              ))}
          </div>
        </div>

        {/* Reading pane */}
        <div className={cn('thin-scroll min-h-0 overflow-y-auto bg-bg/60', !hasPane && 'hidden lg:block')}>
          {hasPane && (
            <div className="border-b border-line bg-surface px-3 py-2 lg:hidden">
              <Button size="sm" variant="ghost" icon={ArrowLeftIcon} onClick={() => navigate('/requests')}>
                All messages
              </Button>
            </div>
          )}
          {selOrder && pickedListing ? (
            <OrderPane key={selOrder.id} o={selOrder} l={pickedListing} />
          ) : selRequest && pickedListing ? (
            <RequestPane key={selRequest.id} r={selRequest} l={pickedListing} />
          ) : (
            <div className="grid h-full place-items-center">
              <EmptyState
                icon={selectedId ? WarningIcon : CalendarXIcon}
                title={selectedId ? 'Not found' : 'Pick a message'}
                description={selectedId ? `Nothing matches “${selectedId}”.` : `${plural(pending.length + open.length + deposits.length, 'item')} waiting on you. Open one to answer it here.`}
              />
            </div>
          )}
        </div>
      </div>

      <DeclineDialog
        key={declining.key}
        open={declining.open}
        onClose={() => setDeclining((s) => ({ ...s, open: false }))}
        onDecline={(reason) => {
          if (declining.id) decline(declining.id, reason)
          setDeclining((s) => ({ ...s, open: false }))
          toast('Declined · the renter has been told')
        }}
      />
    </>
  )
}

function ListGroup({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div>
      <p className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface-2/95 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted backdrop-blur">
        {title} <span className="tabular-nums">· {count}</span>
      </p>
      <div className="divide-y divide-line">{children}</div>
    </div>
  )
}

function Row({ active, unread, onClick, children }: { active?: boolean; unread?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return
        e.preventDefault()
        onClick()
      }}
      className={cn('relative flex cursor-pointer items-start gap-3 px-4 py-3 text-left outline-none transition-colors focus-visible:bg-surface-2', active ? 'bg-accent-soft/70' : 'hover:bg-surface-2/70')}
    >
      {(active || unread) && <span className={cn('absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full', active ? 'bg-accent' : 'bg-accent/40')} />}
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-4 text-[13px] text-muted">{text}</p>
}
