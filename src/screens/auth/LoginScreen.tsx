import { FilmSlateIcon, StorefrontIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { nav, useQuery } from '@/navigation'
import { ROLE_LABEL, type Role } from '@/store/session'
import { AppBar, Button, Screen, Tag, TextField } from '@/ui'

/** Step 1 of login: mobile number. The role comes from the Welcome screen. */
export default function LoginScreen() {
  const query = useQuery()
  const role: Role = query.get('role') === 'owner' ? 'owner' : 'customer'
  /** Page the user originally asked for (e.g. /customer/discover), opened after login. */
  const next = query.get('next')
  const RoleIcon = role === 'owner' ? StorefrontIcon : FilmSlateIcon
  const inputRef = useRef<HTMLInputElement>(null)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string>()
  const [sending, setSending] = useState(false)

  // Focus after the slide-in so the keyboard doesn't interrupt the animation.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 420)
    return () => clearTimeout(t)
  }, [])

  const submit = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number')
      haptic('warning')
      return
    }
    setSending(true)
    await sleep(800)
    setSending(false)
    nav.push(`/verify?role=${role}&phone=${phone}${next ? `&next=${encodeURIComponent(next)}` : ''}`)
  }

  return (
    <Screen
      surface
      header={<AppBar />}
      footer={
        <Button block size="lg" loading={sending} disabled={phone.length < 10} onClick={submit}>
          Get OTP
        </Button>
      }
      className="px-5"
    >
      <Tag tone={role === 'owner' ? 'warning' : 'brand'} className="gap-1.5 px-2.5 py-1 text-xs">
        <RoleIcon size={14} weight="fill" />
        {ROLE_LABEL[role]}
      </Tag>
      <h1 className="mt-4 font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-fg">
        Log in or sign up
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Enter your mobile number. We’ll send a 6-digit code to verify it.
      </p>
      <form
        className="mt-7 @medium:max-w-md"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <TextField
          ref={inputRef}
          label="Mobile number"
          prefix="+91"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          enterKeyHint="go"
          maxLength={10}
          value={phone}
          error={error}
          onChange={(e) => {
            setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
            setError(undefined)
          }}
        />
      </form>
      <p className="mt-4 text-xs leading-relaxed text-subtle">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </Screen>
  )
}
