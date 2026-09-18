import { BankIcon, CheckCircleIcon, ClockIcon, IdentificationCardIcon, MapPinIcon, PhoneIcon, ReceiptIcon, SealCheckIcon, type Icon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { BUSINESS_TYPES } from '@/data/owner'
import { formatPhone } from '@/lib/format'
import { EASE_OUT } from '@/lib/motion'
import { useOwner, type Business, type VerifyKey } from '@/store/owner'
import { navigate } from '~/router'
import { Button, Chip, Select, TextArea, TextField } from '~/ui/controls'
import { Card, CardHeader, ProgressBar, Tag } from '~/ui/display'
import { busy, confirm, sleep, toast } from '~/ui/feedback'
import { Dialog } from '~/ui/overlays'
import { ProfileLayout } from './Profile'

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

/** Business → Type · Name · Owner · Phone · Pincode · Email · Address · GST */
export function BusinessPage() {
  const business = useOwner((s) => s.business)
  const setBusiness = useOwner((s) => s.setBusiness)
  const setVerification = useOwner((s) => s.setVerification)
  const [v, setV] = useState<Business>(business)
  const [errors, setErrors] = useState<Partial<Record<keyof Business, string>>>({})
  const dirty = JSON.stringify(v) !== JSON.stringify(business)
  const set = (patch: Partial<Business>) => {
    setV((x) => ({ ...x, ...patch }))
    setErrors((e) => ({ ...e, ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) }))
  }

  const save = () => {
    const e: typeof errors = {}
    if (v.name.trim().length < 2) e.name = 'Enter the business name'
    if (v.owner.trim().length < 2) e.owner = 'Enter the owner’s name'
    if (v.phone.length !== 10) e.phone = 'Enter a 10-digit number'
    if (!/^\d{6}$/.test(v.pincode)) e.pincode = 'Pincodes have 6 digits'
    if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) e.email = 'Enter a valid email'
    if (v.gst && !GSTIN_RE.test(v.gst)) e.gst = 'GSTIN has 15 characters, like 27AAKFK1234M1Z8'
    setErrors(e)
    if (Object.keys(e).length) return toast('Check the highlighted fields', { tone: 'error' })
    const gstChanged = v.gst !== business.gst
    const next = { ...v, name: v.name.trim(), owner: v.owner.trim(), address: v.address.trim() }
    setBusiness(next)
    setV(next)
    if (gstChanged) setVerification('gst', v.gst ? 'pending' : 'todo')
    toast(gstChanged && v.gst ? 'Saved · new GSTIN sent for verification' : 'Business details saved', { tone: 'success' })
  }

  return (
    <ProfileLayout section="business" title="Business" subtitle="Renters see your name, area and rating">
      <Card>
        <CardHeader title="Business details" subtitle="Used on invoices, your vendor page and payouts" />
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="mb-1.5 text-[13px] font-semibold text-fg-2">Type</p>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_TYPES.map((t) => (
                <Chip key={t} selected={v.type === t} onClick={() => set({ type: t })}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          <TextField label="Business name" value={v.name} error={errors.name} autoComplete="organization" onChange={(e) => set({ name: e.target.value })} />
          <TextField label="Owner" value={v.owner} error={errors.owner} autoComplete="name" onChange={(e) => set({ owner: e.target.value })} />
          <TextField label="Phone" prefix="+91" inputClassName="pl-11" inputMode="numeric" value={v.phone} error={errors.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
          <TextField label="Pincode" inputMode="numeric" value={v.pincode} error={errors.pincode} onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
          <TextField label="Email" type="email" value={v.email} error={errors.email} autoComplete="email" onChange={(e) => set({ email: e.target.value })} className="md:col-span-2" />
          <TextArea label="Warehouse address" rows={2} value={v.address} hint="Pickups and returns happen here" onChange={(e) => set({ address: e.target.value })} className="md:col-span-2" />
          <TextField
            label="GSTIN"
            optional
            value={v.gst}
            error={errors.gst}
            autoComplete="off"
            hint="Needed for GST invoices to production houses"
            inputClassName="font-mono tracking-wide"
            onChange={(e) => set({ gst: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15) })}
          />
        </div>
      </Card>

      {/* Unsaved changes bar */}
      <AnimatePresence>
        {dirty && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.2, ease: EASE_OUT }} className="sticky bottom-4 z-10 mt-4">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 shadow-float">
              <span className="mr-auto text-[13px] font-semibold text-fg">You have unsaved changes</span>
              <Button
                variant="secondary"
                onClick={async () => {
                  if (await confirm({ title: 'Discard changes?', confirmText: 'Discard', tone: 'danger' })) {
                    setV(business)
                    setErrors({})
                  }
                }}
              >
                Discard
              </Button>
              <Button onClick={save}>Save</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ProfileLayout>
  )
}

const STEPS: { key: VerifyKey; title: string; icon: Icon; why: string }[] = [
  { key: 'phone', title: 'Phone', icon: PhoneIcon, why: 'So renters and drivers can reach you' },
  { key: 'identity', title: 'Identity', icon: IdentificationCardIcon, why: 'PAN or Aadhaar of the owner' },
  { key: 'warehouse', title: 'Warehouse address', icon: MapPinIcon, why: 'Where pickups and returns happen' },
  { key: 'bank', title: 'Bank', icon: BankIcon, why: 'Where your payouts land' },
  { key: 'gst', title: 'GST', icon: ReceiptIcon, why: 'For tax invoices to production houses' },
]

const BANKS: Record<string, string> = { HDFC: 'HDFC Bank', ICIC: 'ICICI Bank', SBIN: 'State Bank of India', UTIB: 'Axis Bank', KKBK: 'Kotak Mahindra Bank' }

/** Verification → Phone · Identity · Warehouse address · Bank · GST */
export function VerificationPage() {
  const verification = useOwner((s) => s.verification)
  const business = useOwner((s) => s.business)
  const bank = useOwner((s) => s.bank)
  const setVerification = useOwner((s) => s.setVerification)
  const setBank = useOwner((s) => s.setBank)
  const [dialog, setDialog] = useState<{ key: number; open: boolean; step: VerifyKey | null }>({ key: 0, open: false, step: null })
  const done = STEPS.filter((s) => verification[s.key] === 'done').length

  const detail = (k: VerifyKey) => (k === 'phone' ? formatPhone(business.phone) : k === 'warehouse' ? business.address : k === 'bank' ? `${bank.name} •••• ${bank.last4}` : k === 'gst' ? business.gst || 'Not added' : 'PAN checked')

  const verify = async (k: VerifyKey, bankInfo?: { name: string; last4: string; ifsc: string }) => {
    setDialog((s) => ({ ...s, open: false }))
    const hide = busy(k === 'bank' ? 'Sending ₹1 to check the account…' : k === 'gst' ? 'Checking with the GST portal…' : 'Checking…')
    await sleep(1400)
    hide()
    if (bankInfo) setBank({ ...bankInfo, holder: business.name })
    setVerification(k, 'done')
    toast(`${STEPS.find((s) => s.key === k)!.title} verified`, { tone: 'success' })
  }

  return (
    <ProfileLayout section="verification" title="Verification" subtitle={`${done} of 5 done`}>
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <SealCheckIcon size={20} weight="fill" className="text-accent" /> {done >= 4 ? 'You show as a verified vendor' : 'Finish these to get the verified tick'}
          </p>
          <ProgressBar value={(done / 5) * 100} tone={done === 5 ? 'success' : 'brand'} className="mt-3 h-2" />
          <p className="mt-2 text-[13px] text-muted">Verified vendors get up to 3× more booking requests.</p>
        </Card>
        <Card>
          <ul className="divide-y divide-line">
            {STEPS.map((s) => {
              const state = verification[s.key]
              return (
                <li key={s.key} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${state === 'done' ? 'bg-success-soft text-success' : state === 'pending' ? 'bg-warning-soft text-warning' : 'bg-surface-2 text-muted'}`}>
                    <s.icon size={20} weight="duotone" />
                  </span>
                  <span className="min-w-0 flex-1 basis-48">
                    <span className="block text-sm font-semibold text-fg">{s.title}</span>
                    <span className="block truncate text-[13px] text-muted">{state === 'todo' ? s.why : detail(s.key)}</span>
                  </span>
                  {state === 'done' ? (
                    <Tag tone="success">
                      <CheckCircleIcon size={11} weight="fill" /> Verified
                    </Tag>
                  ) : (
                    <Button size="sm" variant={state === 'pending' ? 'secondary' : 'primary'} icon={state === 'pending' ? ClockIcon : undefined} onClick={() => setDialog((x) => ({ key: x.key + 1, open: true, step: s.key }))}>
                      {state === 'pending' ? 'Checking · check now' : 'Verify'}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
        <p className="text-xs text-muted">Details you verify are only used for checks and payouts. Renters see your business name, area and rating.</p>
      </div>
      <VerifyDialog key={dialog.key} open={dialog.open} step={dialog.step} gst={business.gst} onClose={() => setDialog((s) => ({ ...s, open: false }))} onVerify={verify} />
    </ProfileLayout>
  )
}

function VerifyDialog({ open, step, gst, onClose, onVerify }: { open: boolean; step: VerifyKey | null; gst: string; onClose: () => void; onVerify: (k: VerifyKey, bank?: { name: string; last4: string; ifsc: string }) => void }) {
  const [doc, setDoc] = useState('PAN')
  const [value, setValue] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [error, setError] = useState<string>()
  if (!step) return null
  const meta = STEPS.find((s) => s.key === step)!

  const submit = () => {
    if (step === 'identity' && !(doc === 'PAN' ? /^[A-Z]{5}\d{4}[A-Z]$/.test(value) : /^\d{12}$/.test(value))) return setError(doc === 'PAN' ? 'PAN looks like ABCDE1234F' : 'Aadhaar has 12 digits')
    if (step === 'bank') {
      if (value.length < 9) return setError('Enter the full account number')
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return setError('IFSC looks like HDFC0001234')
      return onVerify('bank', { name: BANKS[ifsc.slice(0, 4)] ?? `${ifsc.slice(0, 4)} Bank`, last4: value.slice(-4), ifsc })
    }
    onVerify(step)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Verify ${meta.title.toLowerCase()}`}
      description={meta.why}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {step === 'gst' && !gst ? (
            <Button
              onClick={() => {
                onClose()
                navigate('/profile/business')
              }}
            >
              Add your GSTIN first
            </Button>
          ) : (
            <Button onClick={submit}>{step === 'warehouse' || step === 'gst' || step === 'phone' ? 'Check now' : 'Verify'}</Button>
          )}
        </>
      }
    >
      {step === 'identity' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
          <Select
            label="Document"
            value={doc}
            onChange={(e) => {
              setDoc(e.target.value)
              setValue('')
              setError(undefined)
            }}
          >
            <option>PAN</option>
            <option>Aadhaar</option>
          </Select>
          <TextField
            label={`${doc} number`}
            autoFocus
            value={value}
            error={error}
            inputClassName="font-mono uppercase"
            onChange={(e) => {
              setValue(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 12))
              setError(undefined)
            }}
          />
        </div>
      )}
      {step === 'bank' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Account number"
            autoFocus
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/\D/g, '').slice(0, 18))
              setError(undefined)
            }}
          />
          <TextField
            label="IFSC"
            value={ifsc}
            error={error}
            inputClassName="font-mono"
            onChange={(e) => {
              setIfsc(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 11))
              setError(undefined)
            }}
          />
          <p className="text-[13px] text-muted sm:col-span-2">We send ₹1 to check the name on the account matches your business.</p>
        </div>
      )}
      {step === 'warehouse' && <p className="text-sm leading-relaxed text-fg-2">A field agent confirms the address on their next visit, or you can share a live location from the warehouse now.</p>}
      {step === 'gst' && (
        <p className="text-sm leading-relaxed text-fg-2">
          {gst ? (
            <>
              We’ll check <span className="font-mono font-semibold">{gst}</span> with the GST portal.
            </>
          ) : (
            'Add your GSTIN in Business first.'
          )}
        </p>
      )}
      {step === 'phone' && <p className="text-sm leading-relaxed text-fg-2">We’ll send an OTP to your registered number.</p>}
    </Dialog>
  )
}
