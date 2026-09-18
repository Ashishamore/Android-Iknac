import { useState } from 'react'
import { BUSINESS_TYPES } from '@/data/owner'
import { haptic } from '@/lib/haptics'
import { nav } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useOwner, type Business } from '@/store/owner'
import { AppBar, Button, Chip, Screen, TextArea, TextField } from '@/ui'

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

/** Business → Type · Name · Owner · Phone · Pincode · Email · Address · GST */
export default function BusinessScreen() {
  const popup = usePopup()
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
    if (Object.keys(e).length) return haptic('warning')
    const gstChanged = v.gst !== business.gst
    setBusiness({ ...v, name: v.name.trim(), owner: v.owner.trim(), address: v.address.trim() })
    if (gstChanged) setVerification('gst', v.gst ? 'pending' : 'todo')
    haptic('success')
    nav.pop()
    popup.toast(gstChanged && v.gst ? 'Saved · new GSTIN sent for verification' : 'Business details saved', { tone: 'success' })
  }

  const close = async () => {
    if (dirty && !(await popup.confirm({ title: 'Discard changes?', confirmText: 'Discard', tone: 'danger' }))) return
    nav.pop()
  }

  return (
    <Screen
      surface
      header={<AppBar back={close} title="Business" subtitle="Renters see your name, area and rating" />}
      footer={
        <div className="@medium:mx-auto @medium:max-w-md">
          <Button size="lg" block disabled={!dirty} onClick={save}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4 px-4 pb-10 pt-2 @medium:mx-auto @medium:max-w-xl">
        <div>
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.07em] text-muted">Type</p>
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
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Phone" prefix="+91" inputMode="numeric" value={v.phone} error={errors.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
          <TextField label="Pincode" inputMode="numeric" value={v.pincode} error={errors.pincode} onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
        </div>
        <TextField label="Email" type="email" inputMode="email" value={v.email} error={errors.email} autoComplete="email" onChange={(e) => set({ email: e.target.value })} />
        <TextArea label="Warehouse address" rows={2} value={v.address} hint="Pickups and returns happen here" onChange={(e) => set({ address: e.target.value })} />
        <TextField
          label="GSTIN (optional)"
          value={v.gst}
          error={errors.gst}
          autoComplete="off"
          hint="Needed for GST invoices to production houses"
          className="[&_input]:font-mono [&_input]:tracking-wide"
          onChange={(e) => set({ gst: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15) })}
        />
      </div>
    </Screen>
  )
}
