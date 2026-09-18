import { CheckIcon, MinusIcon, ShieldCheckIcon, TrashIcon, UserPlusIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { useNow } from '@/lib/hooks'
import { AREAS, roleCan, ROLE_META, type Admin, type Role } from '@/lib/platform'
import { newId, usePlatform } from '@/store/platform'
import { Button, Select, Switch, TextField } from '~/ui/controls'
import { Banner, Card, PageHeader, SectionTitle, Tag } from '~/ui/display'
import { confirm, toast } from '~/ui/feedback'
import { Drawer } from '~/ui/overlays'
import { DataTable, TwoLine, type Column } from '~/ui/table'
import { useMe } from '../lib'
import { AREA } from '../nav'

const ROLES: Role[] = ['super', 'ops', 'finance', 'support']

const blank = (): Admin => ({ id: newId('ad'), name: '', email: '', role: 'support', actions: 0, lastSeen: Date.now(), active: true })

/** ADMIN TEAM: who gets in, and how far. */
export default function Team() {
  const admins = usePlatform((s) => s.admins)
  const now = useNow(60_000).getTime()
  const me = useMe()
  const [editing, setEditing] = useState<Admin | null>(null)

  const columns: Column<Admin>[] = [
    { key: 'name', header: 'Name', cell: (a) => <TwoLine top={a.name + (a.id === me.id ? ' · you' : '')} bottom={a.email} /> },
    { key: 'role', header: 'Role', width: 'w-36', cell: (a) => <Tag tone={a.role === 'super' ? 'brand' : 'neutral'}>{ROLE_META[a.role].label}</Tag> },
    { key: 'actions', header: 'Actions logged', width: 'w-32', align: 'right', hide: 'sm', cell: (a) => a.actions.toLocaleString('en-IN') },
    { key: 'seen', header: 'Last here', width: 'w-32', hide: 'md', cell: (a) => <span className="text-muted">{timeAgo(a.lastSeen, now)}</span> },
    { key: 'state', header: 'State', width: 'w-28', cell: (a) => <Tag tone={a.active ? 'success' : 'neutral'}>{a.active ? 'Login active' : 'No access'}</Tag> },
  ]

  return (
    <>
      <PageHeader
        title="Admin team"
        subtitle={AREA.team.intent}
        actions={
          <Button icon={UserPlusIcon} onClick={() => setEditing(blank())}>
            Add someone
          </Button>
        }
      />

      <DataTable columns={columns} rows={admins} rowKey={(a) => a.id} activeKey={editing?.id} onRow={(a) => setEditing(a)} empty={{ icon: ShieldCheckIcon, title: 'Nobody has access', description: 'Add someone to let them in.' }} />

      <SectionTitle className="mt-6">What each role reaches</SectionTitle>
      <Card className="overflow-hidden">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-surface-2/60">
                <th scope="col" className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.07em] text-muted">
                  Area
                </th>
                {ROLES.map((r) => (
                  <th key={r} scope="col" className="whitespace-nowrap px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.07em] text-muted">
                    {ROLE_META[r].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AREAS.map((id) => (
                <tr key={id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-2 text-[13px] font-medium text-fg">{AREA[id].label}</td>
                  {ROLES.map((r) => {
                    const yes = roleCan(r, id)
                    return (
                      <td key={r} className="px-3 py-2 text-center">
                        <span className={cn('inline-grid size-5 place-items-center rounded-md', yes ? 'bg-success-soft text-success' : 'bg-surface-2 text-subtle')}>
                          {yes ? <CheckIcon size={12} weight="bold" /> : <MinusIcon size={12} weight="bold" />}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-2 text-xs text-muted">This is the grid the rail and the routes actually read. Hiding a page is not the only guard — opening its URL is refused too.</p>

      <SectionTitle className="mt-6">The roles</SectionTitle>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((r) => (
          <Card key={r} className="p-4">
            <p className="font-display text-[15px] font-bold text-fg">{ROLE_META[r].label}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-2">{ROLE_META[r].blurb}</p>
            <p className="mt-2 text-xs text-muted">{admins.filter((a) => a.role === r).length} on this role</p>
          </Card>
        ))}
      </div>

      <AdminDrawer key={editing?.id ?? 'none'} admin={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function AdminDrawer({ admin, onClose }: { admin: Admin | null; onClose: () => void }) {
  const admins = usePlatform((s) => s.admins)
  const save = usePlatform((s) => s.saveAdmin)
  const remove = usePlatform((s) => s.removeAdmin)
  const me = useMe()
  const [draft, setDraft] = useState<Admin | null>(admin)
  if (!admin || !draft) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>

  const isNew = !admins.some((a) => a.id === admin.id)
  const isMe = draft.id === me.id
  const set = (patch: Partial<Admin>) => setDraft({ ...draft, ...patch })
  const reaches = AREAS.filter((id) => roleCan(draft.role, id))
  const ready = draft.name.trim() && /.+@.+\..+/.test(draft.email)

  return (
    <Drawer
      open
      onClose={onClose}
      title={isNew ? 'Add someone' : draft.name}
      subtitle={isNew ? 'They can sign in as soon as you save.' : `${draft.actions.toLocaleString('en-IN')} actions logged`}
      badge={isMe ? <Tag tone="brand">You</Tag> : undefined}
      footer={
        <>
          <Button
            disabled={!ready}
            onClick={() => {
              save(draft)
              toast(isNew ? `${draft.name} can get in` : `${draft.name} saved`, { tone: 'success' })
              onClose()
            }}
          >
            {isNew ? 'Add them' : 'Save'}
          </Button>
          {!isNew && (
            <Button
              variant="danger-ghost"
              icon={TrashIcon}
              disabled={isMe}
              onClick={async () => {
                if (!(await confirm({ title: `Remove ${draft.name}?`, message: 'They lose access straight away. What they did stays in the audit log.', confirmText: 'Remove access', tone: 'danger', icon: TrashIcon }))) return
                remove(draft.id)
                toast(`${draft.name} removed`)
                onClose()
              }}
            >
              Remove access
            </Button>
          )}
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <TextField label="Name" value={draft.name} onChange={(e) => set({ name: e.currentTarget.value })} placeholder="Asha Menon" />
        <TextField label="Email" type="email" value={draft.email} onChange={(e) => set({ email: e.currentTarget.value })} placeholder="asha@propkart.in" />
        <Select label="Role" value={draft.role} onChange={(e) => set({ role: e.currentTarget.value as Role })} hint={ROLE_META[draft.role].blurb}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_META[r].label}
            </option>
          ))}
        </Select>
      </div>

      <SectionTitle className="mt-5">What they will reach</SectionTitle>
      <Card className="p-3">
        <div className="flex flex-wrap gap-1.5">
          {reaches.map((id) => (
            <Tag key={id} tone="success">
              {AREA[id].label}
            </Tag>
          ))}
        </div>
        {reaches.length < AREAS.length && (
          <>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.07em] text-muted">Not this</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {AREAS.filter((id) => !roleCan(draft.role, id)).map((id) => (
                <Tag key={id} tone="neutral">
                  {AREA[id].label}
                </Tag>
              ))}
            </div>
          </>
        )}
      </Card>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-fg">Login active</p>
          <p className="text-xs text-muted">Off keeps the record and stops them signing in.</p>
        </div>
        <Switch checked={draft.active} onChange={(active) => set({ active })} label="Login active" disabled={isMe} />
      </div>

      {isMe && (
        <Banner tone="neutral" className="mt-4">
          This is you. You cannot remove your own access, or switch your own login off.
        </Banner>
      )}
    </Drawer>
  )
}
