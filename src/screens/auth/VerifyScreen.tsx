import { InfoIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { formatPhone } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { nav, useQuery } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { ROLE_LABEL, useSession, type Role } from '@/store/session'
import { AppBar, Button, OtpInput, Screen } from '@/ui'

const RESEND_AFTER = 30

/** Step 2 of login: one-time code. Any 6 digits work in the prototype. */
export default function VerifyScreen() {
  const query = useQuery()
  const role: Role = query.get('role') === 'owner' ? 'owner' : 'customer'
  const phone = query.get('phone') ?? ''
  const next = query.get('next') ?? undefined
  const login = useSession((s) => s.login)
  const popup = usePopup()
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [seconds, setSeconds] = useState(RESEND_AFTER)

  useEffect(() => {
    if (seconds <= 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  const verify = async (value: string) => {
    if (value.length < 6 || verifying) return
    setVerifying(true)
    await sleep(900)
    haptic('success')
    // Logging in swaps the whole app to this role's section (/customer or /renter).
    login(role, phone, next)
    popup.toast(`Welcome! You’re signed in as ${ROLE_LABEL[role]}`, { tone: 'success' })
  }

  return (
    <Screen
      surface
      header={<AppBar />}
      footer={
        <Button block size="lg" loading={verifying} disabled={code.length < 6} onClick={() => verify(code)}>
          Verify & continue
        </Button>
      }
      className="px-5"
    >
      <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-fg">
        Verify your number
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Enter the 6-digit code sent to <span className="font-semibold text-fg">{formatPhone(phone)}</span>{' '}
        <button type="button" onClick={() => nav.pop()} className="font-semibold text-accent">
          Edit
        </button>
      </p>

      <div className="mt-7 @medium:max-w-md">
        <OtpInput
          value={code}
          autoFocus
          disabled={verifying}
          onChange={(value) => {
            setCode(value)
            if (value.length === 6) void verify(value)
          }}
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 @medium:max-w-md">
        <span className="text-sm text-muted">Didn’t get the code?</span>
        {seconds > 0 ? (
          <span className="text-sm font-semibold tabular-nums text-subtle">
            Resend in 0:{String(seconds).padStart(2, '0')}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSeconds(RESEND_AFTER)
              popup.toast('A new code has been sent', { tone: 'success' })
            }}
            className="text-sm font-semibold text-accent"
          >
            Resend code
          </button>
        )}
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl bg-info-soft p-4 text-sm leading-relaxed text-info @medium:max-w-md">
        <InfoIcon size={20} weight="fill" className="mt-px shrink-0" />
        <p>Prototype: any 6-digit code will work.</p>
      </div>
    </Screen>
  )
}
