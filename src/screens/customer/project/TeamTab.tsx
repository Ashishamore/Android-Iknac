import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  CaretRightIcon,
  ChatsCircleIcon,
  CopyIcon,
  CrownSimpleIcon,
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  PhoneIcon,
  ShareNetworkIcon,
  TrashIcon,
  UserMinusIcon,
  UserPlusIcon,
} from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { ROLES } from '@/data/ops'
import { formatDateRange, timeAgo } from '@/lib/dates'
import { formatINR, formatPhone } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { nav } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { Menu } from '@/overlays/Menu'
import { usePopup } from '@/overlays/popupContext'
import { useProjectOps } from '@/store/projectOps'
import { projectStatus, useProjects, type Project } from '@/store/projects'
import { Avatar, Badge, Button, Card, Chip, IconButton, IconTile, ListGroup, ListItem, SectionHeader, Tag, TextField } from '@/ui'

/** TEAM → Members · Make admin · Add member · Project chat · Project actions */
export function TeamTab({ project }: { project: Project }) {
  const popup = usePopup()
  const allMembers = useProjectOps((s) => s.members)
  const allMessages = useProjectOps((s) => s.messages)
  const updateMember = useProjectOps((s) => s.updateMember)
  const removeMember = useProjectOps((s) => s.removeMember)
  const addMember = useProjectOps((s) => s.addMember)
  const copyBoards = useProjectOps((s) => s.copyBoards)
  const createProject = useProjects((s) => s.createProject)
  const deleteProject = useProjects((s) => s.deleteProject)
  const setWrapped = useProjects((s) => s.setWrapped)
  const members = useMemo(() => allMembers.filter((m) => m.projectId === project.id), [allMembers, project.id])
  const messages = useMemo(() => allMessages.filter((m) => m.projectId === project.id), [allMessages, project.id])
  const last = messages[messages.length - 1]
  const [adding, setAdding] = useState({ key: 0, open: false })
  const wrapped = projectStatus(project).label === 'Completed'

  const duplicate = () => {
    const id = createProject({
      name: `${project.name} (copy)`,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget,
      locations: project.locations.map((l) => ({ ...l, id: `${l.id}-copy-${Date.now().toString(36)}` })),
    })
    copyBoards(project.id, id)
    popup.toast('Project duplicated with its boards', { tone: 'success', action: { label: 'Open', onClick: () => nav.push(`/customer/projects/${id}`) } })
  }

  const share = async () => {
    const text = `${project.name} · ${formatDateRange(project.startDate, project.endDate)} · budget ${formatINR(project.budget)} · ${project.locations.map((l) => l.name).join(', ')}`
    const choice = await popup.actionSheet({
      title: 'Share project summary',
      options: [
        { id: 'copy', label: 'Copy summary', icon: CopyIcon },
        { id: 'whatsapp', label: 'WhatsApp', icon: ShareNetworkIcon },
      ],
    })
    if (choice === 'copy') {
      try {
        await navigator.clipboard.writeText(text)
        popup.toast('Summary copied', { tone: 'success' })
      } catch {
        popup.toast(text)
      }
    } else if (choice === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  const remove = async () => {
    const ok = await popup.confirm({
      title: 'Delete project?',
      message: `“${project.name}” with its boards and schedule will be removed.`,
      confirmText: 'Delete',
      tone: 'danger',
      icon: TrashIcon,
    })
    if (!ok) return
    nav.pop()
    await sleep(380)
    const undo = deleteProject(project.id)
    popup.toast('Project deleted', { action: { label: 'Undo', onClick: undo } })
  }

  return (
    <div className="pb-8 @medium:mx-auto @medium:max-w-2xl">
      {/* Members */}
      <div className="flex items-end justify-between gap-3 px-4 pb-3 pt-4">
        <div>
          <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-fg">Members</h2>
          <p className="mt-0.5 text-xs text-muted">{members.length} on this project · admins can book and pay</p>
        </div>
        <Button size="sm" variant="tonal" icon={UserPlusIcon} onClick={() => setAdding((s) => ({ key: s.key + 1, open: true }))}>
          Add member
        </Button>
      </div>
      <Card className="mx-4 overflow-hidden">
        {members.map((m) => (
          <div key={m.id} className="group relative flex items-center gap-3 py-3 pl-4 pr-1.5">
            <Avatar name={m.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
                <span className="truncate">
                  {m.name}
                  {m.you && <span className="font-normal text-muted"> (you)</span>}
                </span>
                {m.admin && (
                  <Tag tone="brand" className="shrink-0">
                    <CrownSimpleIcon size={11} weight="fill" /> Admin
                  </Tag>
                )}
              </p>
              <p className="truncate text-[13px] text-muted">
                {m.role} · {formatPhone(m.phone)}
              </p>
            </div>
            {!m.you && (
              <Menu
                items={[
                  {
                    label: m.admin ? 'Remove admin' : 'Make admin',
                    icon: CrownSimpleIcon,
                    onSelect: () => {
                      updateMember(m.id, { admin: !m.admin })
                      haptic()
                      popup.toast(m.admin ? `${m.name} is no longer an admin` : `${m.name} is now an admin`, { tone: 'success' })
                    },
                  },
                  {
                    label: 'Call',
                    icon: PhoneIcon,
                    onSelect: () => {
                      window.location.href = `tel:+91${m.phone}`
                    },
                  },
                  {
                    label: 'Remove from project',
                    icon: UserMinusIcon,
                    destructive: true,
                    onSelect: () => {
                      const undo = removeMember(m.id)
                      popup.toast(`${m.name} removed`, { action: { label: 'Undo', onClick: undo } })
                    },
                  },
                ]}
              >
                <IconButton icon={DotsThreeVerticalIcon} weight="bold" size="sm" label={`Options for ${m.name}`} />
              </Menu>
            )}
            <span aria-hidden className="absolute bottom-0 left-[68px] right-0 h-px bg-line group-last:hidden" />
          </div>
        ))}
      </Card>

      {/* Project chat */}
      <SectionHeader title="Project chat" className="pt-6" />
      <Card onClick={() => nav.push(`/customer/projects/${project.id}/chat`)} className="mx-4 flex items-center gap-3 p-3.5">
        <IconTile icon={ChatsCircleIcon} tone="brand" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            Team chat <Badge tone="brand">{messages.length}</Badge>
          </p>
          <p className="truncate text-[13px] text-muted">
            {last ? `${last.mine ? 'You' : last.author.split(' ')[0]}: ${last.text}` : 'Say hello to your team'}
          </p>
        </div>
        <span className="shrink-0 self-start pt-0.5 text-xs text-subtle">{last && timeAgo(last.at)}</span>
        <CaretRightIcon size={15} weight="bold" className="shrink-0 text-subtle" />
      </Card>

      {/* Project actions */}
      <ListGroup title="Project actions" className="pt-6">
        <ListItem icon={PencilSimpleIcon} title="Edit project" subtitle="Name, dates, budget, locations" onClick={() => nav.push(`/customer/projects/${project.id}/edit`)} />
        <ListItem icon={CopyIcon} title="Duplicate project" subtitle="Copies boards, not bookings" onClick={duplicate} />
        <ListItem icon={ShareNetworkIcon} title="Share summary" onClick={share} />
        <ListItem
          icon={wrapped ? ArrowCounterClockwiseIcon : ArchiveIcon}
          title={wrapped ? 'Reopen project' : 'Mark as wrapped'}
          subtitle={wrapped ? 'Move it back to Active' : 'Moves it to Past'}
          onClick={() => {
            setWrapped(project.id, !wrapped)
            popup.toast(wrapped ? 'Project reopened' : 'Project wrapped · moved to Past', { tone: 'success' })
          }}
        />
        <ListItem icon={TrashIcon} title="Delete project" destructive onClick={remove} />
      </ListGroup>

      <AddMemberSheet
        key={adding.key}
        open={adding.open}
        onClose={() => setAdding((s) => ({ ...s, open: false }))}
        onAdd={(m) => {
          addMember({ ...m, projectId: project.id, admin: false })
          setAdding((s) => ({ ...s, open: false }))
          popup.toast(`Invite sent to ${m.name} by SMS`, { tone: 'success' })
        }}
      />
    </div>
  )
}

function AddMemberSheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (m: { name: string; phone: string; role: string }) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState(ROLES[0])
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})

  const save = () => {
    const next: typeof errors = {}
    if (name.trim().length < 2) next.name = 'Enter their name'
    if (phone.replace(/\D/g, '').length !== 10) next.phone = 'Enter a 10-digit mobile number'
    setErrors(next)
    if (Object.keys(next).length) return haptic('warning')
    onAdd({ name: name.trim(), phone: phone.replace(/\D/g, ''), role })
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Add member"
      description="They’ll get an SMS invite to join the project"
      footer={
        <Button size="lg" block icon={UserPlusIcon} onClick={save}>
          Send invite
        </Button>
      }
    >
      <div className="space-y-4">
        <TextField label="Name" value={name} autoComplete="off" error={errors.name} onChange={(e) => setName(e.target.value)} />
        <TextField
          label="Mobile number"
          prefix="+91"
          inputMode="numeric"
          value={phone}
          error={errors.phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
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
      </div>
    </BottomSheet>
  )
}
