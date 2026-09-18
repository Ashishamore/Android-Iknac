import { CheckIcon, CrownSimpleIcon, DotsThreeIcon, MegaphoneIcon, PhoneIcon, RocketLaunchIcon, TrashIcon, UserPlusIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { BOOST_OPTIONS, STAFF_ROLES } from '@/data/owner'
import { cn } from '@/lib/cn'
import { formatDayShort, timeAgo, toISODate } from '@/lib/dates'
import { formatINR, formatPhone } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import type { Listing, StaffRole } from '@/lib/owner'
import { useOwner } from '@/store/owner'
import { plural } from '~/lib/data'
import { linkProps, useQuery } from '~/router'
import { Button, Chip, IconButton, SearchInput, TextArea, TextField } from '~/ui/controls'
import { Avatar, Card, CardHeader, EmptyState, Stat, Tag, Thumb } from '~/ui/display'
import { busy, sleep, toast } from '~/ui/feedback'
import { Dialog, Menu } from '~/ui/overlays'
import { ProfileLayout } from './Profile'

/** Promote → Followers · Tell them · Boost listing */
export function PromotePage() {
  const query = useQuery()
  const followers = useOwner((s) => s.followers)
  const listings = useOwner((s) => s.listings)
  const notifications = useOwner((s) => s.notifications)
  const boost = useOwner((s) => s.boost)
  const tell = useOwner((s) => s.tellFollowers)
  const now = useNow(60_000).getTime()
  const [tellOpen, setTellOpen] = useState({ key: 0, open: false })
  const [boostDialog, setBoostDialog] = useState(() => ({ key: 1, open: !!query.get('listing'), listingId: query.get('listing') }))
  const live = listings.filter((l) => l.listed && !l.review)
  const boosted = listings.filter((l) => l.boostedUntil && l.boostedUntil > now)
  const sent = notifications.filter((n) => n.title === 'Update sent')

  return (
    <ProfileLayout section="promote" title="Promote" subtitle="Reach the art directors who follow you, and get seen first in search">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Followers" value={followers.toLocaleString('en-IN')} hint="36 new this month" icon={UsersThreeIcon} />
        <Stat label="Boosts running" value={boosted.length} hint={boosted.length ? 'Shown first in search' : 'None right now'} icon={RocketLaunchIcon} />
        <Stat label="Updates sent" value={sent.length} hint={sent[0] ? `Last ${timeAgo(sent[0].at)}` : 'None yet'} icon={MegaphoneIcon} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="flex flex-col p-5">
          <p className="flex items-center gap-2 text-[15px] font-bold text-fg">
            <MegaphoneIcon size={19} weight="duotone" className="text-accent" /> Tell them
          </p>
          <p className="mt-1 flex-1 text-[13px] text-muted">Send your followers news: new stock, a festive offer, dates you’re free.</p>
          <Button className="mt-4 self-start" onClick={() => setTellOpen((s) => ({ key: s.key + 1, open: true }))}>
            Write an update
          </Button>
        </Card>
        <Card className="flex flex-col p-5">
          <p className="flex items-center gap-2 text-[15px] font-bold text-fg">
            <RocketLaunchIcon size={19} weight="duotone" className="text-accent" /> Boost listing
          </p>
          <p className="mt-1 flex-1 text-[13px] text-muted">Show a listing at the top of search and on renters’ Home for a few days.</p>
          <Button className="mt-4 self-start" onClick={() => setBoostDialog((s) => ({ key: s.key + 1, open: true, listingId: null }))}>
            Boost a listing
          </Button>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Boosts running" />
        {boosted.length === 0 ? (
          <EmptyState icon={RocketLaunchIcon} title="No boosts running" description="Boosted listings show first in search and on renters’ Home." />
        ) : (
          <ul className="divide-y divide-line">
            {boosted.map((l) => (
              <li key={l.id}>
                <a {...linkProps(`/stock/${l.id}`)} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/70">
                  <Thumb listing={l} className="size-10 rounded-lg" iconSize={18} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{l.name}</span>
                    <span className="block text-xs text-muted">Until {formatDayShort(toISODate(new Date(l.boostedUntil!)))}</span>
                  </span>
                  <Tag tone="brand">
                    <RocketLaunchIcon size={11} weight="fill" /> Boosted
                  </Tag>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <TellDialog
        key={`tell-${tellOpen.key}`}
        open={tellOpen.open}
        followers={followers}
        onClose={() => setTellOpen((s) => ({ ...s, open: false }))}
        onSend={async (text) => {
          setTellOpen((s) => ({ ...s, open: false }))
          const hide = busy('Sending…')
          await sleep(900)
          hide()
          tell(text)
          toast(`Sent to ${followers.toLocaleString('en-IN')} followers`, { tone: 'success' })
        }}
      />
      <BoostDialog
        key={`boost-${boostDialog.key}`}
        open={boostDialog.open}
        listings={live}
        initial={boostDialog.listingId}
        onClose={() => setBoostDialog((s) => ({ ...s, open: false }))}
        onBoost={async (listingId, days, price) => {
          setBoostDialog((s) => ({ ...s, open: false }))
          const hide = busy(`Paying ${formatINR(price)}…`)
          await sleep(1100)
          hide()
          boost(listingId, days)
          toast(`Boosted for ${days} days`, { tone: 'success' })
        }}
      />
    </ProfileLayout>
  )
}

function TellDialog({ open, followers, onClose, onSend }: { open: boolean; followers: number; onClose: () => void; onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  const ideas = ['New in: brass lamps and lanterns for Diwali shoots.', 'Free this weekend: Irani café set and wingback chairs.', '10% off 7+ day rentals this month.']
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tell your followers"
      description={`Goes to ${followers.toLocaleString('en-IN')} art directors as a notification`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={MegaphoneIcon} disabled={text.trim().length < 5} onClick={() => onSend(text.trim())}>
            Send update
          </Button>
        </>
      }
    >
      <p className="mb-2 text-[13px] font-semibold text-fg-2">Ideas</p>
      <div className="flex flex-wrap gap-2">
        {ideas.map((i) => (
          <Chip key={i} onClick={() => setText(i)}>
            {i}
          </Chip>
        ))}
      </div>
      <TextArea className="mt-4" label="Your update" rows={3} value={text} maxLength={160} hint={`${text.length}/160`} autoFocus onChange={(e) => setText(e.target.value)} />
    </Dialog>
  )
}

function BoostDialog({ open, listings, initial, onClose, onBoost }: { open: boolean; listings: Listing[]; initial: string | null; onClose: () => void; onBoost: (listingId: string, days: number, price: number) => void }) {
  const [pick, setPick] = useState<string | null>(initial ?? listings[0]?.id ?? null)
  const [option, setOption] = useState(BOOST_OPTIONS[1])
  const [q, setQ] = useState('')
  const shown = listings.filter((l) => l.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Boost a listing"
      description="Shown first in search and on Home for renters near you"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={RocketLaunchIcon} disabled={!pick} onClick={() => pick && onBoost(pick, option.days, option.price)}>
            Pay {formatINR(option.price)} · {option.days} days
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {BOOST_OPTIONS.map((o) => (
          <button key={o.days} type="button" aria-pressed={option.days === o.days} onClick={() => setOption(o)} className={cn('rounded-lg border px-3 py-2.5 text-center transition-colors', option.days === o.days ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2')}>
            <span className="block text-sm font-bold text-fg">{o.days} days</span>
            <span className="block text-xs text-muted">{formatINR(o.price)}</span>
          </button>
        ))}
      </div>
      <p className="mb-2 mt-5 text-[13px] font-semibold text-fg-2">Listing</p>
      <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search live listings" />
      <div role="radiogroup" className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-line thin-scroll">
        {shown.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={pick === l.id} onClick={() => setPick(l.id)} className={cn('flex w-full items-center gap-3 border-b border-line px-3 py-2 text-left last:border-b-0', pick === l.id ? 'bg-accent-soft' : 'hover:bg-surface-2')}>
            <Thumb listing={l} className="size-9 rounded-md" iconSize={16} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg">{l.name}</span>
            <span className={cn('size-4 shrink-0 rounded-full border-2', pick === l.id ? 'border-accent bg-accent ring-2 ring-inset ring-surface' : 'border-line-strong')} />
          </button>
        ))}
      </div>
    </Dialog>
  )
}

/** Staff → Owner · Manager · Warehouse · Add someone */
export function StaffPage() {
  const staff = useOwner((s) => s.staff)
  const addStaff = useOwner((s) => s.addStaff)
  const updateStaff = useOwner((s) => s.updateStaff)
  const removeStaff = useOwner((s) => s.removeStaff)
  const [adding, setAdding] = useState({ key: 0, open: false })

  return (
    <ProfileLayout
      section="staff"
      title="Staff"
      subtitle={plural(staff.length, 'person', 'people')}
      actions={
        <Button icon={UserPlusIcon} onClick={() => setAdding((s) => ({ key: s.key + 1, open: true }))}>
          Add someone
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {STAFF_ROLES.map((role) => {
          const people = staff.filter((m) => m.role === role.id)
          return (
            <Card key={role.id}>
              <CardHeader title={role.id} subtitle={role.text} actions={<Tag tone="neutral">{people.length}</Tag>} />
              {people.length === 0 ? (
                <p className="px-4 py-3 text-[13px] text-muted">Nobody yet</p>
              ) : (
                <ul className="divide-y divide-line">
                  {people.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar name={m.name} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                          <span className="truncate">{m.name}</span>
                          {m.role === 'Owner' && (
                            <Tag tone="brand">
                              <CrownSimpleIcon size={11} weight="fill" /> You
                            </Tag>
                          )}
                        </span>
                        <span className="block text-xs text-muted">{formatPhone(m.phone)}</span>
                      </span>
                      {m.role !== 'Owner' && (
                        <Menu
                          items={[
                            { heading: 'Change role' },
                            ...STAFF_ROLES.filter((r) => r.id !== 'Owner').map((r) => ({
                              label: r.id,
                              checked: r.id === m.role,
                              icon: r.id === m.role ? CheckIcon : undefined,
                              onSelect: () => {
                                if (r.id === m.role) return
                                updateStaff(m.id, { role: r.id })
                                toast(`${m.name} is now ${r.id.toLowerCase()}`, { tone: 'success' })
                              },
                            })),
                            'divider',
                            { label: 'Call', icon: PhoneIcon, onSelect: () => (window.location.href = `tel:+91${m.phone}`) },
                            {
                              label: 'Remove',
                              icon: TrashIcon,
                              destructive: true,
                              onSelect: () => {
                                const undo = removeStaff(m.id)
                                toast(`${m.name} removed`, { action: { label: 'Undo', onClick: undo } })
                              },
                            },
                          ]}
                        >
                          <IconButton icon={DotsThreeIcon} weight="bold" size="sm" label={`Options for ${m.name}`} />
                        </Menu>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )
        })}
      </div>
      <AddDialog
        key={adding.key}
        open={adding.open}
        onClose={() => setAdding((s) => ({ ...s, open: false }))}
        onAdd={(m) => {
          addStaff(m)
          setAdding((s) => ({ ...s, open: false }))
          toast(`Invite sent to ${m.name}`, { tone: 'success' })
        }}
      />
    </ProfileLayout>
  )
}

function AddDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (m: { name: string; phone: string; role: StaffRole }) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<StaffRole>('Warehouse')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})
  const save = () => {
    const e: typeof errors = {}
    if (name.trim().length < 2) e.name = 'Enter their name'
    if (phone.length !== 10) e.phone = 'Enter a 10-digit number'
    setErrors(e)
    if (!Object.keys(e).length) onAdd({ name: name.trim(), phone, role })
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add someone"
      description="They get an SMS to install the app"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={UserPlusIcon} onClick={save}>
            Send invite
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Name" autoFocus value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Mobile number" prefix="+91" inputClassName="pl-11" inputMode="numeric" value={phone} error={errors.phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
      </div>
      <p className="mb-2 mt-5 text-[13px] font-semibold text-fg-2">Role</p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Role">
        {STAFF_ROLES.filter((r) => r.id !== 'Owner').map((r) => (
          <button key={r.id} type="button" role="radio" aria-checked={role === r.id} onClick={() => setRole(r.id)} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors', role === r.id ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2')}>
            <span className={cn('grid size-4 shrink-0 place-items-center rounded-full border-2', role === r.id ? 'border-accent' : 'border-line-strong')}>{role === r.id && <span className="size-1.5 rounded-full bg-accent" />}</span>
            <span>
              <span className={cn('block text-sm font-semibold', role === r.id ? 'text-accent-soft-fg' : 'text-fg')}>{r.id}</span>
              <span className="block text-xs text-muted">{r.text}</span>
            </span>
          </button>
        ))}
      </div>
    </Dialog>
  )
}
