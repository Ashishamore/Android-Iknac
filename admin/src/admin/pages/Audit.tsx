import { ClockCounterClockwiseIcon, LockKeyIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { timeAgo } from '@/lib/dates'
import { useNow } from '@/lib/hooks'
import { AUDIT_CAP, type AuditEntry, type Area } from '@/lib/platform'
import { usePlatform } from '@/store/platform'
import { SearchInput, Select } from '~/ui/controls'
import { Banner, PageHeader, Tag } from '~/ui/display'
import { DataTable, ShowMore, Toolbar, type Column } from '~/ui/table'
import { AREA } from '../nav'

const PAGE = 40

const stamp = (at: number) =>
  new Date(at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })

/** AUDIT LOG: every change anyone made, in the button's own words. */
export default function Audit() {
  const audit = usePlatform((s) => s.audit)
  const admins = usePlatform((s) => s.admins)
  const now = useNow(60_000).getTime()
  const [q, setQ] = useState('')
  const [area, setArea] = useState<Area | 'all'>('all')
  const [who, setWho] = useState('all')
  const [shown, setShown] = useState(PAGE)

  const text = q.trim().toLowerCase()
  const rows = audit.filter((e) => {
    if (area !== 'all' && e.area !== area) return false
    if (who !== 'all' && e.adminId !== who) return false
    if (!text) return true
    const name = admins.find((a) => a.id === e.adminId)?.name ?? ''
    return [e.action, e.target, e.detail ?? '', name].some((v) => v.toLowerCase().includes(text))
  })

  const columns: Column<AuditEntry>[] = [
    { key: 'when', header: 'When', width: 'w-40', cell: (e) => <span className="tabular-nums text-muted">{stamp(e.at)}</span> },
    { key: 'who', header: 'Who', width: 'w-40', hide: 'sm', cell: (e) => admins.find((a) => a.id === e.adminId)?.name ?? 'Removed admin' },
    { key: 'what', header: 'What', width: 'w-52', cell: (e) => <span className="font-semibold text-fg">{e.action}</span> },
    {
      key: 'target',
      header: 'To what',
      cell: (e) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-fg-2">{e.target}</span>
          {e.detail && <span className="truncate text-xs text-muted">{e.detail}</span>}
        </span>
      ),
    },
    { key: 'area', header: 'Area', width: 'w-40', hide: 'lg', cell: (e) => <Tag tone="neutral">{AREA[e.area].label}</Tag> },
    { key: 'ago', header: '', width: 'w-24', align: 'right', hide: 'xl', cell: (e) => <span className="text-subtle">{timeAgo(e.at, now)}</span> },
  ]

  return (
    <>
      <PageHeader title="Audit log" subtitle={AREA.audit.intent} />

      <Toolbar>
        <SearchInput value={q} onChange={(e) => setQ(e.currentTarget.value)} onClear={() => setQ('')} placeholder="Action, target or person" className="w-full sm:w-80" />
        <Select
          className="w-48"
          value={area}
          onChange={(e) => {
            setArea(e.currentTarget.value as Area | 'all')
            setShown(PAGE)
          }}
        >
          <option value="all">Every area</option>
          {Object.values(AREA).map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </Select>
        <Select
          className="w-48"
          value={who}
          onChange={(e) => {
            setWho(e.currentTarget.value)
            setShown(PAGE)
          }}
        >
          <option value="all">Anyone</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <span className="ml-auto text-[13px] text-muted">{rows.length} entries</span>
      </Toolbar>

      <DataTable columns={columns} rows={rows.slice(0, shown)} rowKey={(e) => e.id} empty={{ icon: ClockCounterClockwiseIcon, title: 'Nothing matches', description: 'Try a different area, person or search.' }} />
      <ShowMore shown={Math.min(shown, rows.length)} total={rows.length} step={PAGE} onMore={() => setShown((n) => n + PAGE)} />

      <Banner tone="neutral" icon={LockKeyIcon} className="mt-2">
        The last {AUDIT_CAP} entries are kept. Nothing here can be edited or removed, by any role.
      </Banner>
    </>
  )
}
