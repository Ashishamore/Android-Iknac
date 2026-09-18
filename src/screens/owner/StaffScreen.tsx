import { CrownSimpleIcon, DotsThreeVerticalIcon, PhoneIcon, TrashIcon, UserPlusIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { STAFF_ROLES } from '@/data/owner'
import { formatPhone } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import type { StaffRole } from '@/lib/owner'
import { BottomSheet } from '@/overlays/BottomSheet'
import { Menu } from '@/overlays/Menu'
import { usePopup } from '@/overlays/popupContext'
import { useOwner } from '@/store/owner'
import { AppBar, Avatar, Button, Card, Fab, IconButton, Screen, SectionHeader, Tag, TextField } from '@/ui'

/** Staff → Owner · Manager · Warehouse · Add someone */
export default function StaffScreen() {
  const popup = usePopup()
  const staff = useOwner((s) => s.staff)
  const addStaff = useOwner((s) => s.addStaff)
  const updateStaff = useOwner((s) => s.updateStaff)
  const removeStaff = useOwner((s) => s.removeStaff)
  const [adding, setAdding] = useState({ key: 0, open: false })

  return (
    <Screen header={<AppBar title="Staff" subtitle={`${staff.length} people`} />} fab={<Fab icon={UserPlusIcon} label="Add someone" onClick={() => setAdding((s) => ({ key: s.key + 1, open: true }))} />}>
      <div className="px-4 pb-24 pt-1 @medium:mx-auto @medium:max-w-2xl">
        {STAFF_ROLES.map((role) => {
          const people = staff.filter((m) => m.role === role.id)
          return (
            <div key={role.id}>
              <SectionHeader title={role.id} subtitle={role.text} className="px-0 pt-4" />
              <Card className="overflow-hidden">
                {people.length === 0 && <p className="px-4 py-3 text-sm text-muted">Nobody yet</p>}
                {people.map((m) => (
                  <div key={m.id} className="group relative flex items-center gap-3 py-3 pl-4 pr-1.5">
                    <Avatar name={m.name} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[15px] font-semibold text-fg">
                        <span className="truncate">{m.name}</span>
                        {m.role === 'Owner' && (
                          <Tag tone="brand">
                            <CrownSimpleIcon size={11} weight="fill" /> You
                          </Tag>
                        )}
                      </span>
                      <span className="block text-[13px] text-muted">{formatPhone(m.phone)}</span>
                    </span>
                    {m.role !== 'Owner' && (
                      <Menu
                        items={[
                          ...STAFF_ROLES.filter((r) => r.id !== 'Owner' && r.id !== m.role).map((r) => ({
                            label: `Make ${r.id.toLowerCase()}`,
                            onSelect: () => {
                              updateStaff(m.id, { role: r.id })
                              popup.toast(`${m.name} is now ${r.id.toLowerCase()}`, { tone: 'success' })
                            },
                          })),
                          {
                            label: 'Call',
                            icon: PhoneIcon,
                            onSelect: () => {
                              window.location.href = `tel:+91${m.phone}`
                            },
                          },
                          {
                            label: 'Remove',
                            icon: TrashIcon,
                            destructive: true,
                            onSelect: () => {
                              const undo = removeStaff(m.id)
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
            </div>
          )
        })}
      </div>
      <AddSheet
        key={adding.key}
        open={adding.open}
        onClose={() => setAdding((s) => ({ ...s, open: false }))}
        onAdd={(m) => {
          addStaff(m)
          setAdding((s) => ({ ...s, open: false }))
          haptic('success')
          popup.toast(`Invite sent to ${m.name}`, { tone: 'success' })
        }}
      />
    </Screen>
  )
}

function AddSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (m: { name: string; phone: string; role: StaffRole }) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<StaffRole>('Warehouse')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})
  const save = () => {
    const e: typeof errors = {}
    if (name.trim().length < 2) e.name = 'Enter their name'
    if (phone.length !== 10) e.phone = 'Enter a 10-digit number'
    setErrors(e)
    if (Object.keys(e).length) return haptic('warning')
    onAdd({ name: name.trim(), phone, role })
  }
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Add someone"
      description="They get an SMS to install the app"
      footer={
        <Button size="lg" block icon={UserPlusIcon} onClick={save}>
          Send invite
        </Button>
      }
    >
      <div className="space-y-4">
        <TextField label="Name" value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Mobile number" prefix="+91" inputMode="numeric" value={phone} error={errors.phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
        <div className="-mx-2 flex flex-col gap-0.5" role="radiogroup" aria-label="Role">
          {STAFF_ROLES.filter((r) => r.id !== 'Owner').map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={role === r.id} onClick={() => setRole(r.id)} className={`rounded-2xl px-3 py-2.5 text-left transition-colors ${role === r.id ? 'bg-accent-soft' : 'active:bg-surface-2'}`}>
              <span className={`block text-[15px] font-semibold ${role === r.id ? 'text-accent-soft-fg' : 'text-fg'}`}>{r.id}</span>
              <span className="block text-[13px] text-muted">{r.text}</span>
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}
