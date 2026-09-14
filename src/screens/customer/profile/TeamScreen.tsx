import { ChatCircleDotsIcon, CrownSimpleIcon, PhoneIcon, PlusIcon, UserMinusIcon, UserPlusIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { ROLES } from '@/data/ops'
import { formatPhone } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import type { Member } from '@/lib/ops'
import { nav } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useProjectOps } from '@/store/projectOps'
import { activeProjects, sortProjects, useProjects, type Project } from '@/store/projects'
import { AppBar, Avatar, Button, Card, Checkbox, Chip, EmptyState, Fab, Screen, SearchField, Tag, TextField } from '@/ui'

interface Person {
  phone: string
  name: string
  role: string
  memberships: { member: Member; project: Project }[]
}

/** Team: everyone you work with across projects. Call, add to a project, remove, invite. */
export default function TeamScreen() {
  const popup = usePopup()
  const members = useProjectOps((s) => s.members)
  const addMember = useProjectOps((s) => s.addMember)
  const projects = useProjects((s) => s.projects)
  const [q, setQ] = useState('')
  const [personPhone, setPersonPhone] = useState<{ key: number; open: boolean; phone: string | null }>({ key: 0, open: false, phone: null })
  const [inviting, setInviting] = useState({ key: 0, open: false })

  const people = useMemo(() => {
    const map = new Map<string, Person>()
    for (const p of sortProjects(projects)) {
      for (const m of members.filter((x) => x.projectId === p.id && !x.you)) {
        const person = map.get(m.phone) ?? { phone: m.phone, name: m.name, role: m.role, memberships: [] }
        person.memberships.push({ member: m, project: p })
        map.set(m.phone, person)
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [members, projects])
  const term = q.trim().toLowerCase()
  const shown = term ? people.filter((p) => `${p.name} ${p.role}`.toLowerCase().includes(term)) : people
  const person = people.find((p) => p.phone === personPhone.phone) ?? null

  return (
    <Screen
      header={<AppBar title="Team" subtitle={`${people.length} people across ${new Set(members.map((m) => m.projectId)).size} projects`} />}
      fab={<Fab icon={UserPlusIcon} label="Invite" onClick={() => setInviting((s) => ({ key: s.key + 1, open: true }))} />}
    >
      <div className="px-4 pb-24 pt-2 @medium:mx-auto @medium:max-w-2xl">
        {people.length > 4 && <SearchField value={q} placeholder="Search by name or role" onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} className="mb-3" />}
        {shown.length === 0 ? (
          <EmptyState icon={UsersThreeIcon} title={people.length ? 'Nobody matches' : 'No teammates yet'} description="Invite your producer, set decorator or PA to share boards and chat." />
        ) : (
          <Card className="overflow-hidden">
            {shown.map((p) => (
              <button
                key={p.phone}
                type="button"
                onClick={() => setPersonPhone((s) => ({ key: s.key + 1, open: true, phone: p.phone }))}
                className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2"
              >
                <Avatar name={p.name} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-fg">{p.name}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {p.role} · {formatPhone(p.phone)}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {p.memberships.map(({ project, member }) => (
                      <Tag key={member.id} tone={member.admin ? 'brand' : 'neutral'}>
                        {member.admin && <CrownSimpleIcon size={10} weight="fill" />}
                        {project.name}
                      </Tag>
                    ))}
                  </span>
                </span>
                <span aria-hidden className="absolute bottom-0 left-[68px] right-0 h-px bg-line group-last:hidden" />
              </button>
            ))}
          </Card>
        )}
      </div>

      <PersonSheet key={`person-${personPhone.key}`} open={personPhone.open} person={person} onClose={() => setPersonPhone((s) => ({ ...s, open: false }))} />
      <InviteSheet
        key={`invite-${inviting.key}`}
        open={inviting.open}
        projects={activeProjects(projects)}
        onClose={() => setInviting((s) => ({ ...s, open: false }))}
        onInvite={({ name, phone, role, projectIds }) => {
          const known = members.filter((m) => m.phone === phone).map((m) => m.projectId)
          const fresh = projectIds.filter((id) => !known.includes(id))
          fresh.forEach((projectId) => addMember({ name, phone, role, projectId, admin: false }))
          setInviting((s) => ({ ...s, open: false }))
          haptic('success')
          popup.toast(fresh.length ? `Invite sent to ${name} by SMS` : `${name} is already on ${projectIds.length === 1 ? 'that project' : 'those projects'}`, {
            tone: fresh.length ? 'success' : 'info',
          })
        }}
      />
    </Screen>
  )
}

function PersonSheet({ open, person, onClose }: { open: boolean; person: Person | null; onClose: () => void }) {
  const popup = usePopup()
  const addMember = useProjectOps((s) => s.addMember)
  const removeMember = useProjectOps((s) => s.removeMember)
  const projects = useProjects((s) => s.projects)
  if (!person) return <BottomSheet open={false} onClose={onClose} />

  const onIds = person.memberships.map((m) => m.project.id)
  const addable = activeProjects(projects).filter((p) => !onIds.includes(p.id))
  const first = person.name.split(' ')[0]

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex flex-col items-center pt-1 text-center">
        <Avatar name={person.name} size="xl" />
        <p className="mt-3 font-display text-lg font-bold text-fg">{person.name}</p>
        <p className="text-sm text-muted">
          {person.role} · {formatPhone(person.phone)}
        </p>
      </div>
      <div className="mt-4 flex gap-2.5">
        <Button
          variant="secondary"
          icon={PhoneIcon}
          className="flex-1"
          onClick={() => {
            window.location.href = `tel:+91${person.phone}`
          }}
        >
          Call
        </Button>
        <Button variant="secondary" icon={ChatCircleDotsIcon} className="flex-1" onClick={() => window.open(`https://wa.me/91${person.phone}`, '_blank', 'noopener')}>
          WhatsApp
        </Button>
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-[0.07em] text-muted">On {person.memberships.length === 1 ? '1 project' : `${person.memberships.length} projects`}</p>
      <div className="mt-2 overflow-hidden rounded-2xl border border-line">
        {person.memberships.map(({ member, project }) => (
          <div key={member.id} className="group relative flex items-center gap-3 py-2.5 pl-3.5 pr-2">
            <button
              type="button"
              onClick={() => {
                onClose()
                nav.push(`/customer/projects/${project.id}?tab=team`)
              }}
              className="min-w-0 flex-1 text-left"
            >
              <span className="flex items-center gap-2 text-[15px] font-medium text-fg">
                <span className="truncate">{project.name}</span>
                {member.admin && (
                  <Tag tone="brand" className="shrink-0">
                    Admin
                  </Tag>
                )}
              </span>
              <span className="block text-[13px] text-muted">{member.role}</span>
            </button>
            <Button
              size="sm"
              variant="ghost"
              icon={UserMinusIcon}
              className="text-danger"
              onClick={() => {
                const undo = removeMember(member.id)
                if (person.memberships.length === 1) onClose()
                popup.toast(`${first} removed from ${project.name}`, { action: { label: 'Undo', onClick: undo } })
              }}
            >
              Remove
            </Button>
            <span aria-hidden className="absolute bottom-0 left-3.5 right-0 h-px bg-line group-last:hidden" />
          </div>
        ))}
      </div>

      {addable.length > 0 && (
        <>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.07em] text-muted">Add to a project</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {addable.map((p) => (
              <Chip
                key={p.id}
                icon={PlusIcon}
                onClick={() => {
                  addMember({ name: person.name, phone: person.phone, role: person.role, projectId: p.id, admin: false })
                  haptic('success')
                  popup.toast(`${first} added to ${p.name}`, { tone: 'success' })
                }}
              >
                {p.name}
              </Chip>
            ))}
          </div>
        </>
      )}
    </BottomSheet>
  )
}

function InviteSheet({
  open,
  projects,
  onClose,
  onInvite,
}: {
  open: boolean
  projects: Project[]
  onClose: () => void
  onInvite: (i: { name: string; phone: string; role: string; projectIds: string[] }) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState(ROLES[0])
  const [picked, setPicked] = useState<string[]>(projects[0] ? [projects[0].id] : [])
  const [errors, setErrors] = useState<{ name?: string; phone?: string; projects?: string }>({})

  const save = () => {
    const next: typeof errors = {}
    if (name.trim().length < 2) next.name = 'Enter their name'
    if (phone.length !== 10) next.phone = 'Enter a 10-digit mobile number'
    if (!picked.length) next.projects = 'Pick at least one project'
    setErrors(next)
    if (Object.keys(next).length) return haptic('warning')
    onInvite({ name: name.trim(), phone, role, projectIds: picked })
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Invite to your team"
      description="They get an SMS to join the projects you pick"
      footer={
        <Button size="lg" block icon={UserPlusIcon} onClick={save}>
          Send invite
        </Button>
      }
    >
      <div className="space-y-4">
        <TextField
          label="Name"
          value={name}
          autoComplete="off"
          error={errors.name}
          onChange={(e) => {
            setName(e.target.value)
            setErrors((x) => ({ ...x, name: undefined }))
          }}
        />
        <TextField
          label="Mobile number"
          prefix="+91"
          inputMode="numeric"
          value={phone}
          error={errors.phone}
          onChange={(e) => {
            setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
            setErrors((x) => ({ ...x, phone: undefined }))
          }}
        />
        <div>
          <p className="px-1 text-xs font-bold uppercase tracking-[0.07em] text-muted">Role</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <Chip key={r} selected={role === r} onClick={() => setRole(r)}>
                {r}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="px-1 text-xs font-bold uppercase tracking-[0.07em] text-muted">Projects</p>
          {projects.length ? (
            <div className="mt-2 space-y-3">
              {projects.map((p) => (
                <Checkbox
                  key={p.id}
                  checked={picked.includes(p.id)}
                  label={p.name}
                  onChange={(on) => {
                    setPicked((list) => (on ? [...list, p.id] : list.filter((x) => x !== p.id)))
                    setErrors((x) => ({ ...x, projects: undefined }))
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Create a project first to invite people to it.</p>
          )}
          {errors.projects && <p className="mt-2 px-1 text-xs font-medium text-danger">{errors.projects}</p>}
        </div>
      </div>
    </BottomSheet>
  )
}
