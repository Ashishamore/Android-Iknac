import { ArrowCounterClockwiseIcon, CheckIcon, FlagIcon, PackageIcon, ProhibitIcon, XIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { propById } from '@/data/props'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { LISTING_STATE } from '@/lib/platform'
import { usePlatform } from '@/store/platform'
import { navigate, useQuery } from '~/router'
import { Button, Chip, SearchInput, Segmented, Select, TextArea } from '~/ui/controls'
import { Banner, Card, KV, PageHeader, SectionTitle, Tag, Thumb } from '~/ui/display'
import { confirm, toast } from '~/ui/feedback'
import { Drawer } from '~/ui/overlays'
import { DataTable, ShowMore, Toolbar, type Column } from '~/ui/table'
import { useListingRows, type ListingRow } from '../lib'
import { AREA } from '../nav'

type Tab = 'reported' | 'waiting' | 'all'
const PAGE = 40

/** LISTINGS: moderation — what is reported, what is waiting, and all stock. */
export default function Listings() {
  const query = useQuery()
  const rows = useListingRows()
  const reports = usePlatform((s) => s.reports)
  const accounts = usePlatform((s) => s.accounts)
  const now = useNow(60_000).getTime()
  const [tab, setTab] = useState<Tab>((query.get('tab') as Tab) ?? (query.get('provider') ? 'all' : 'reported'))
  const [provider, setProvider] = useState(query.get('provider') ?? '')
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [openId, setOpenId] = useState<string | null>(null)

  const openReports = reports.filter((r) => !r.closed)
  const text = q.trim().toLowerCase()
  const filtered = rows.filter((r) => {
    if (tab === 'reported' && !r.reports) return false
    if (tab === 'waiting' && r.state !== 'waiting') return false
    if (provider && r.providerId !== provider) return false
    if (!text) return true
    return [r.name, r.vendor, r.category, r.era].some((v) => v.toLowerCase().includes(text))
  })
  const providerName = accounts.find((a) => a.id === provider)?.business

  const columns: Column<ListingRow>[] = [
    {
      key: 'item',
      header: 'Item',
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Thumb listing={{ photos: [], category: r.category as never, catalogId: r.id }} className="size-9 shrink-0 rounded-lg" iconSize={17} />
          <span className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-semibold text-fg">{r.name}</span>
              {r.reports > 0 && <FlagIcon size={12} weight="fill" aria-label="Reported" className="shrink-0 text-danger" />}
            </span>
            <span className="truncate text-xs text-muted">{r.era}</span>
          </span>
        </span>
      ),
    },
    { key: 'provider', header: 'Provider', width: 'w-44', hide: 'sm', cell: (r) => r.vendor },
    { key: 'category', header: 'Category', width: 'w-32', hide: 'md', cell: (r) => r.category },
    { key: 'rate', header: 'Day rate', width: 'w-28', align: 'right', cell: (r) => formatINR(r.rate) },
    { key: 'free', header: 'Free', width: 'w-20', hide: 'lg', cell: (r) => <Tag tone={r.free ? 'success' : 'neutral'}>{r.free ? 'Today' : 'Out'}</Tag> },
    { key: 'state', header: 'State', width: 'w-40', cell: (r) => <Tag tone={LISTING_STATE[r.state].tone}>{LISTING_STATE[r.state].label}</Tag> },
  ]

  return (
    <>
      <PageHeader
        title="Listings"
        subtitle={AREA.listings.intent}
        actions={
          <Segmented
            value={tab}
            onChange={(v) => {
              setTab(v)
              setShown(PAGE)
            }}
            options={[
              { value: 'reported', label: 'Reported', count: openReports.length },
              { value: 'waiting', label: 'Waiting', count: rows.filter((r) => r.state === 'waiting').length },
              { value: 'all', label: 'All stock', count: rows.length },
            ]}
          />
        }
      />

      {provider && (
        <Banner
          tone="brand"
          icon={PackageIcon}
          title={`Showing only ${providerName ?? 'one provider'}`}
          className="mb-4"
          actions={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setProvider('')
                navigate('/admin/listings')
              }}
            >
              Show everyone
            </Button>
          }
        >
          {filtered.length} of their items, in the state renters see them.
        </Banner>
      )}

      {tab === 'reported' && openReports.length > 0 && (
        <section className="mb-4">
          <SectionTitle>Reports waiting</SectionTitle>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {openReports.map((r) => {
              const prop = propById(r.propId)
              const by = accounts.find((a) => a.id === r.byAccountId)
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Thumb listing={{ photos: [], category: (prop?.category ?? 'Decor') as never, catalogId: r.propId }} className="size-11 shrink-0 rounded-lg" iconSize={20} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-fg">{prop?.name ?? r.propId}</p>
                      <p className="text-[13px] font-semibold text-danger">{r.reason}</p>
                    </div>
                    <Tag tone="danger">{timeAgo(r.at, now)}</Tag>
                  </div>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-fg-2">{r.detail}</p>
                  <p className="mt-2 text-xs text-muted">Reported by {by?.business ?? 'someone'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setOpenId(r.propId)}>
                      Open listing
                    </Button>
                    <NothingToAnswer id={r.id} />
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      <Toolbar>
        <SearchInput value={q} onChange={(e) => setQ(e.currentTarget.value)} onClear={() => setQ('')} placeholder="Item, provider, category or era" className="w-full sm:w-80" />
        <Select className="w-56" value={provider} onChange={(e) => setProvider(e.currentTarget.value)}>
          <option value="">Every provider</option>
          {accounts
            .filter((a) => a.side === 'provider' && a.vendorId)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.business}
              </option>
            ))}
        </Select>
        <span className="ml-auto text-[13px] text-muted">{filtered.length} shown</span>
      </Toolbar>

      <DataTable
        columns={columns}
        rows={filtered.slice(0, shown)}
        rowKey={(r) => r.id}
        activeKey={openId ?? undefined}
        onRow={(r) => setOpenId(r.id)}
        empty={{ icon: PackageIcon, title: tab === 'reported' ? 'Nothing reported' : tab === 'waiting' ? 'Nothing waiting to go live' : 'No stock matches', description: 'Try another tab, or clear the search.' }}
      />
      <ShowMore shown={Math.min(shown, filtered.length)} total={filtered.length} step={PAGE} onMore={() => setShown((n) => n + PAGE)} />

      <ListingDrawer key={openId ?? 'none'} id={openId} onClose={() => setOpenId(null)} />
    </>
  )
}

function NothingToAnswer({ id }: { id: string }) {
  const closeReport = usePlatform((s) => s.closeReport)
  return (
    <Button
      size="sm"
      variant="ghost"
      icon={XIcon}
      onClick={() => {
        closeReport(id)
        toast('Report closed · nothing to answer', { tone: 'success' })
      }}
    >
      Nothing to answer
    </Button>
  )
}

/** LISTING DRAWER: the item as renters read it, its reports, and its state. */
function ListingDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const rows = useListingRows()
  const reports = usePlatform((s) => s.reports)
  const accounts = usePlatform((s) => s.accounts)
  const setListing = usePlatform((s) => s.setListing)
  const closeReport = usePlatform((s) => s.closeReport)
  const now = useNow(60_000).getTime()
  const [reason, setReason] = useState('')
  const row = rows.find((r) => r.id === id)
  const prop = id ? propById(id) : undefined
  if (!row || !prop) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>

  const mine = reports.filter((r) => r.propId === row.id)
  const open = mine.filter((r) => !r.closed)

  const takeDown = async () => {
    if (!reason.trim()) return toast('Give a reason first — it goes in the log', { tone: 'error' })
    const ok = await confirm({
      title: `Take "${row.name}" down?`,
      message: 'It leaves Discover straight away. The provider keeps it in their stock, paused.',
      confirmText: 'Take it down',
      tone: 'danger',
      icon: ProhibitIcon,
    })
    if (!ok) return
    setListing(row.id, 'down', reason.trim())
    toast(`${row.name} is out of Discover`, { tone: 'success' })
    onClose()
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={row.name}
      subtitle={`${row.vendor} · ${row.category} · ${row.era}`}
      badge={<Tag tone={LISTING_STATE[row.state].tone}>{LISTING_STATE[row.state].label}</Tag>}
      footer={
        <>
          {row.state === 'waiting' && (
            <Button
              icon={CheckIcon}
              onClick={() => {
                setListing(row.id, 'live')
                toast(`${row.name} is live`, { tone: 'success' })
                onClose()
              }}
            >
              Approve and publish
            </Button>
          )}
          {row.state === 'down' && (
            <Button
              icon={ArrowCounterClockwiseIcon}
              onClick={() => {
                setListing(row.id, 'live')
                toast(`${row.name} is back in Discover`, { tone: 'success' })
                onClose()
              }}
            >
              Put it back
            </Button>
          )}
          {row.state !== 'down' && (
            <Button variant="danger-ghost" icon={ProhibitIcon} onClick={takeDown}>
              Take it down
            </Button>
          )}
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {row.state === 'owner-suspended' && (
        <Banner tone="warning" icon={ProhibitIcon} title="Its owner is suspended" className="mb-4">
          Nothing on this shelf shows in Discover while {row.vendor} is suspended. Lift that on their account, in People.
        </Banner>
      )}

      <Thumb listing={{ photos: [], category: row.category as never, catalogId: row.id }} className="h-40 w-full rounded-xl" iconSize={48} />

      <Card className="mt-4 px-4 py-1">
        <dl className="divide-y divide-line">
          <KV label="Provider" value={row.vendor} strong />
          <KV label="Category" value={row.category} />
          <KV label="Era" value={row.era} />
          <KV label="Day rate" value={formatINR(row.rate)} strong />
          <KV label="Deposit" value={`${formatINR(row.rate * 2)} · 2× the day rate`} />
          <KV label="Pieces" value="1 in the set" />
          <KV label="Condition" value="Good" />
          <KV label="Free today" value={row.free ? 'Yes' : 'Out on a booking'} />
        </dl>
      </Card>

      {mine.length > 0 && (
        <>
          <SectionTitle className="mt-5">Reports on this listing</SectionTitle>
          <div className="space-y-2">
            {mine.map((r) => {
              const by = accounts.find((a) => a.id === r.byAccountId)
              return (
                <Card key={r.id} className={cn('p-3', r.closed && 'opacity-60')}>
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 text-[13px] font-bold text-fg">{r.reason}</p>
                    <Tag tone={r.closed ? 'neutral' : 'danger'}>{r.closed ? 'Closed' : timeAgo(r.at, now)}</Tag>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-fg-2">{r.detail}</p>
                  <p className="mt-1.5 text-xs text-muted">Reported by {by?.business ?? 'someone'}</p>
                  {!r.closed && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2.5"
                      onClick={() => {
                        closeReport(r.id)
                        toast('Report closed', { tone: 'success' })
                      }}
                    >
                      Close this report
                    </Button>
                  )}
                </Card>
              )
            })}
          </div>
          {open.length > 0 && <p className="mt-2 text-xs text-muted">Closing a report leaves the listing as it is. Take it down separately if it should go.</p>}
        </>
      )}

      {row.state !== 'down' && (
        <>
          <SectionTitle className="mt-5">Reason for taking it down</SectionTitle>
          <TextArea rows={3} value={reason} onChange={(e) => setReason(e.currentTarget.value)} placeholder="What is wrong with it" hint="This goes in the audit log, and to the provider." />
          <div className="mt-2 flex flex-wrap gap-2">
            {['The photos are not the item', 'Unsafe to hire out', 'Duplicate listing', 'Priced wrongly'].map((r) => (
              <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
                {r}
              </Chip>
            ))}
          </div>
        </>
      )}
    </Drawer>
  )
}
