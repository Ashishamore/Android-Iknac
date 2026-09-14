import { CameraIcon, CheckCircleIcon, IdentificationCardIcon, PhoneIcon, ReceiptIcon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { usePhotoPicker } from '@/components/usePhotoPicker'
import { formatPhone } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { downscaleImage } from '@/lib/image'
import { nav } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useProfile } from '@/store/profile'
import { useAccount, useDisplayName, useSession } from '@/store/session'
import { AppBar, Avatar, Button, Card, Chip, Screen, Tag, TextField } from '@/ui'

const ROLES = ['Art Director', 'Production designer', 'Set decorator', 'Producer', 'Stylist']
const CITIES = ['Mumbai', 'Pune', 'Delhi', 'Hyderabad', 'Bengaluru', 'Chennai', 'Kolkata']

/** Me → Name · House · City · Verified */
export default function EditProfileScreen() {
  const popup = usePopup()
  const profile = useProfile()
  const update = useProfile((s) => s.update)
  const setVerified = useProfile((s) => s.setVerified)
  const setName = useSession((s) => s.setName)
  const currentName = useDisplayName()
  const phone = useAccount()?.phone
  const [name, setNameValue] = useState(currentName)
  const [house, setHouse] = useState(profile.house)
  const [role, setRole] = useState(profile.role)
  const [city, setCity] = useState(profile.city)
  const [email, setEmail] = useState(profile.email)
  const [photo, setPhoto] = useState(profile.photo)
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const [idOpen, setIdOpen] = useState({ key: 0, open: false })
  const dirty = name !== currentName || house !== profile.house || role !== profile.role || city !== profile.city || email !== profile.email || photo !== profile.photo

  const picker = usePhotoPicker({
    title: 'Profile photo',
    sample: { url: '/banners/recreate-era-latch.webp', label: 'A test photo' },
    onPick: async ({ url, file }) => {
      try {
        setPhoto(file ? await downscaleImage(file, 240, 0.8) : url)
      } finally {
        if (file) URL.revokeObjectURL(url)
      }
    },
  })

  const save = () => {
    const next: typeof errors = {}
    if (name.trim().length < 2) next.name = 'Enter your name'
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = 'Enter a valid email'
    setErrors(next)
    if (Object.keys(next).length) return haptic('warning')
    setName(name.trim())
    update({ house: house.trim(), role, city, email: email.trim(), photo })
    nav.pop()
    popup.toast('Profile updated', { tone: 'success' })
  }

  const close = async () => {
    if (dirty && !(await popup.confirm({ title: 'Discard changes?', confirmText: 'Discard', tone: 'danger' }))) return
    nav.pop()
  }

  return (
    <Screen
      surface
      header={<AppBar close back={close} title="Edit profile" />}
      footer={
        <Button size="lg" block onClick={save}>
          Save
        </Button>
      }
    >
      <div className="space-y-5 px-4 pb-6 pt-2 @medium:mx-auto @medium:max-w-xl">
        <div className="flex flex-col items-center">
          <button type="button" onClick={picker.pick} className="relative" aria-label="Change photo">
            <Avatar name={name || currentName} src={photo ?? undefined} size="xl" />
            <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-accent text-accent-fg ring-4 ring-surface">
              <CameraIcon size={15} weight="fill" />
            </span>
          </button>
          {photo && (
            <button type="button" onClick={() => setPhoto(null)} className="mt-2 text-sm font-semibold text-muted">
              Remove photo
            </button>
          )}
        </div>

        <TextField label="Name" value={name} autoComplete="name" error={errors.name} onChange={(e) => setNameValue(e.target.value)} />
        <TextField label="Production house" value={house} autoComplete="organization" hint="Shown to vendors on your bookings" onChange={(e) => setHouse(e.target.value)} />
        <Group title="Role">
          {ROLES.map((r) => (
            <Chip key={r} selected={role === r} onClick={() => setRole(r)}>
              {r}
            </Chip>
          ))}
        </Group>
        <Group title="City">
          {CITIES.map((c) => (
            <Chip key={c} selected={city === c} onClick={() => setCity(c)}>
              {c}
            </Chip>
          ))}
        </Group>
        <TextField label="Email" type="email" value={email} autoComplete="email" inputMode="email" error={errors.email} hint="For invoices and receipts" onChange={(e) => setEmail(e.target.value)} />

        <div>
          <p className="px-1 text-xs font-bold uppercase tracking-[0.07em] text-muted">Verification</p>
          <Card className="mt-2 overflow-hidden">
            <VerifyRow icon={PhoneIcon} title="Mobile number" detail={formatPhone(phone)} verified={profile.verified.phone} />
            <VerifyRow
              icon={IdentificationCardIcon}
              title="Government ID"
              detail={profile.verified.id ? 'PAN checked' : 'Aadhaar, PAN or driving licence'}
              verified={profile.verified.id}
              action={!profile.verified.id ? () => setIdOpen((s) => ({ key: s.key + 1, open: true })) : undefined}
            />
            <VerifyRow
              icon={ReceiptIcon}
              title="Company GST"
              detail={profile.verified.gst ? profile.gst.gstin : 'Needed for GST invoices'}
              verified={profile.verified.gst}
              action={!profile.verified.gst ? () => nav.push('/customer/profile/invoices') : undefined}
            />
          </Card>
          <p className="mt-2 px-1 text-xs text-muted">Verified art directors get priority slots and lower deposits from verified vendors.</p>
        </div>
      </div>
      {picker.element}
      <IdSheet
        key={idOpen.key}
        open={idOpen.open}
        onClose={() => setIdOpen((s) => ({ ...s, open: false }))}
        onVerified={() => {
          setVerified('id', true)
          setIdOpen((s) => ({ ...s, open: false }))
          haptic('success')
          popup.toast('ID verified', { tone: 'success' })
        }}
      />
    </Screen>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="px-1 text-xs font-bold uppercase tracking-[0.07em] text-muted">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function VerifyRow({ icon: VIcon, title, detail, verified, action }: { icon: typeof PhoneIcon; title: string; detail: string; verified: boolean; action?: () => void }) {
  return (
    <div className="group relative flex items-center gap-3 px-4 py-3">
      <VIcon size={20} className="shrink-0 text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-fg">{title}</span>
        <span className="block truncate text-[13px] text-muted">{detail}</span>
      </span>
      {verified ? (
        <Tag tone="success">
          <CheckCircleIcon size={12} weight="fill" /> Verified
        </Tag>
      ) : (
        <Button size="sm" variant="tonal" onClick={action}>
          Verify
        </Button>
      )}
      <span aria-hidden className="absolute bottom-0 left-12 right-0 h-px bg-line group-last:hidden" />
    </div>
  )
}

const DOCS = ['PAN', 'Aadhaar', 'Driving licence']

function IdSheet({ open, onClose, onVerified }: { open: boolean; onClose: () => void; onVerified: () => void }) {
  const popup = usePopup()
  const [doc, setDoc] = useState(DOCS[0])
  const [number, setNumber] = useState('')
  const [error, setError] = useState<string>()
  const valid = doc === 'PAN' ? /^[A-Z]{5}\d{4}[A-Z]$/.test(number) : doc === 'Aadhaar' ? /^\d{12}$/.test(number) : number.length >= 8

  const verify = async () => {
    if (!valid) return setError(doc === 'PAN' ? 'PAN looks like ABCDE1234F' : doc === 'Aadhaar' ? 'Aadhaar has 12 digits' : 'Enter the licence number')
    const hide = popup.loading('Checking with the registry…')
    await sleep(1400)
    hide()
    onVerified()
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Verify your ID"
      description="Checked instantly. Only the last 4 characters are stored."
      footer={
        <Button size="lg" block onClick={verify}>
          Verify {doc}
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        {DOCS.map((d) => (
          <Chip
            key={d}
            selected={doc === d}
            onClick={() => {
              setDoc(d)
              setNumber('')
              setError(undefined)
            }}
          >
            {d}
          </Chip>
        ))}
      </div>
      <TextField
        className="mt-4"
        label={`${doc} number`}
        value={number}
        autoComplete="off"
        inputMode={doc === 'Aadhaar' ? 'numeric' : 'text'}
        error={error}
        onChange={(e) => {
          setNumber(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, doc === 'Aadhaar' ? 12 : 16))
          setError(undefined)
        }}
      />
    </BottomSheet>
  )
}
