import { BankIcon, CheckCircleIcon, ClockIcon, IdentificationCardIcon, MapPinIcon, PhoneIcon, ReceiptIcon, SealCheckIcon, type Icon } from '@phosphor-icons/react'
import { useState } from 'react'
import { formatPhone } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { nav } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useOwner, type VerifyKey } from '@/store/owner'
import { AppBar, Button, Card, Chip, ProgressBar, Screen, Tag, TextField } from '@/ui'

const STEPS: { key: VerifyKey; title: string; icon: Icon; why: string }[] = [
  { key: 'phone', title: 'Phone', icon: PhoneIcon, why: 'So renters and drivers can reach you' },
  { key: 'identity', title: 'Identity', icon: IdentificationCardIcon, why: 'PAN or Aadhaar of the owner' },
  { key: 'warehouse', title: 'Warehouse address', icon: MapPinIcon, why: 'Where pickups and returns happen' },
  { key: 'bank', title: 'Bank', icon: BankIcon, why: 'Where your payouts land' },
  { key: 'gst', title: 'GST', icon: ReceiptIcon, why: 'For tax invoices to production houses' },
]

const BANKS: Record<string, string> = { HDFC: 'HDFC Bank', ICIC: 'ICICI Bank', SBIN: 'State Bank of India', UTIB: 'Axis Bank', KKBK: 'Kotak Mahindra Bank' }

/** Verification → Phone · Identity · Warehouse address · Bank · GST */
export default function VerificationScreen() {
  const popup = usePopup()
  const verification = useOwner((s) => s.verification)
  const business = useOwner((s) => s.business)
  const bank = useOwner((s) => s.bank)
  const setVerification = useOwner((s) => s.setVerification)
  const setBank = useOwner((s) => s.setBank)
  const [sheet, setSheet] = useState<{ key: number; open: boolean; step: VerifyKey | null }>({ key: 0, open: false, step: null })
  const done = STEPS.filter((s) => verification[s.key] === 'done').length

  const detail = (k: VerifyKey) =>
    k === 'phone' ? formatPhone(business.phone) : k === 'warehouse' ? business.address : k === 'bank' ? `${bank.name} •••• ${bank.last4}` : k === 'gst' ? business.gst || 'Not added' : 'PAN checked'

  const verify = async (k: VerifyKey, bankInfo?: { name: string; last4: string; ifsc: string }) => {
    setSheet((s) => ({ ...s, open: false }))
    const hide = popup.loading(k === 'bank' ? 'Sending ₹1 to check the account…' : k === 'gst' ? 'Checking with the GST portal…' : 'Checking…')
    await sleep(1400)
    hide()
    if (bankInfo) setBank({ ...bankInfo, holder: business.name })
    setVerification(k, 'done')
    haptic('success')
    popup.toast(`${STEPS.find((s) => s.key === k)!.title} verified`, { tone: 'success' })
  }

  return (
    <Screen header={<AppBar title="Verification" subtitle={`${done} of 5 done`} />}>
      <div className="space-y-3 px-4 pb-10 pt-1 @medium:mx-auto @medium:max-w-2xl">
        <Card className="p-4">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <SealCheckIcon size={20} weight="fill" className="text-accent" /> {done >= 4 ? 'You show as a verified vendor' : 'Finish these to get the verified tick'}
          </p>
          <ProgressBar value={(done / 5) * 100} tone={done === 5 ? 'success' : 'brand'} className="mt-3 h-2" />
          <p className="mt-2 text-[13px] text-muted">Verified vendors get up to 3× more booking requests.</p>
        </Card>
        <Card className="overflow-hidden">
          {STEPS.map((s) => {
            const state = verification[s.key]
            return (
              <div key={s.key} className="group relative flex items-center gap-3 px-4 py-3.5">
                <s.icon size={22} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-fg">{s.title}</span>
                  <span className="block truncate text-[13px] text-muted">{state === 'todo' ? s.why : detail(s.key)}</span>
                </span>
                {state === 'done' ? (
                  <Tag tone="success">
                    <CheckCircleIcon size={11} weight="fill" /> Verified
                  </Tag>
                ) : (
                  <Button size="sm" variant={state === 'pending' ? 'secondary' : 'tonal'} icon={state === 'pending' ? ClockIcon : undefined} onClick={() => setSheet((x) => ({ key: x.key + 1, open: true, step: s.key }))}>
                    {state === 'pending' ? 'Checking' : 'Verify'}
                  </Button>
                )}
                <span aria-hidden className="absolute bottom-0 left-[52px] right-0 h-px bg-line group-last:hidden" />
              </div>
            )
          })}
        </Card>
        <p className="px-1 text-xs text-muted">Details you verify are only used for checks and payouts. Renters see your business name, area and rating.</p>
      </div>
      <VerifySheet
        key={sheet.key}
        open={sheet.open}
        step={sheet.step}
        gst={business.gst}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onVerify={verify}
        onEditBusiness={() => {
          setSheet((s) => ({ ...s, open: false }))
          nav.push('/renter/profile/business')
        }}
      />
    </Screen>
  )
}

function VerifySheet({
  open,
  step,
  gst,
  onClose,
  onVerify,
  onEditBusiness,
}: {
  open: boolean
  step: VerifyKey | null
  gst: string
  onClose: () => void
  onVerify: (k: VerifyKey, bank?: { name: string; last4: string; ifsc: string }) => void
  onEditBusiness: () => void
}) {
  const [doc, setDoc] = useState('PAN')
  const [value, setValue] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [error, setError] = useState<string>()
  if (!step) return <BottomSheet open={false} onClose={onClose} />
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
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Verify ${meta.title.toLowerCase()}`}
      description={meta.why}
      footer={
        step === 'gst' && !gst ? (
          <Button size="lg" block onClick={onEditBusiness}>
            Add your GSTIN first
          </Button>
        ) : (
          <Button size="lg" block onClick={submit}>
            {step === 'warehouse' || step === 'gst' || step === 'phone' ? 'Check now' : 'Verify'}
          </Button>
        )
      }
    >
      {step === 'identity' && (
        <>
          <div className="flex gap-2">
            {['PAN', 'Aadhaar'].map((d) => (
              <Chip
                key={d}
                selected={doc === d}
                onClick={() => {
                  setDoc(d)
                  setValue('')
                  setError(undefined)
                }}
              >
                {d}
              </Chip>
            ))}
          </div>
          <TextField className="mt-4" label={`${doc} number`} value={value} error={error} inputMode={doc === 'PAN' ? 'text' : 'numeric'} onChange={(e) => { setValue(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 12)); setError(undefined) }} />
        </>
      )}
      {step === 'bank' && (
        <div className="space-y-4">
          <TextField label="Account number" inputMode="numeric" value={value} onChange={(e) => { setValue(e.target.value.replace(/\D/g, '').slice(0, 18)); setError(undefined) }} />
          <TextField label="IFSC" value={ifsc} error={error} className="[&_input]:font-mono" onChange={(e) => { setIfsc(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 11)); setError(undefined) }} />
          <p className="text-[13px] text-muted">We send ₹1 to check the name on the account matches your business.</p>
        </div>
      )}
      {step === 'warehouse' && <p className="text-[15px] leading-relaxed text-fg-2">A field agent confirms the address on their next visit, or you can share a live location from the warehouse now.</p>}
      {step === 'gst' && <p className="text-[15px] leading-relaxed text-fg-2">{gst ? <>We’ll check <span className="font-mono font-semibold">{gst}</span> with the GST portal.</> : 'Add your GSTIN in Business first.'}</p>}
      {step === 'phone' && <p className="text-[15px] leading-relaxed text-fg-2">We’ll send an OTP to your registered number.</p>}
    </BottomSheet>
  )
}
