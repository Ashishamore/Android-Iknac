import {
  ArmchairIcon,
  ArrowRightIcon,
  CameraIcon,
  CrownIcon,
  FilmSlateIcon,
  GuitarIcon,
  LampIcon,
  StorefrontIcon,
  TelevisionSimpleIcon,
  VinylRecordIcon,
  type Icon,
} from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { APP } from '@/app/config'
import { EASE_OUT } from '@/lib/motion'
import type { Tone } from '@/lib/tones'
import { nav } from '@/navigation'
import { useStatusBar } from '@/store/chrome'
import { useSession, type Role } from '@/store/session'
import { IconTile, Screen } from '@/ui'

/** Props floating in the hero artwork. Positions are % of the hero box. */
const FLOATERS: { icon: Icon; left: string; top: string; size: number; rotate: number }[] = [
  { icon: FilmSlateIcon, left: '60%', top: '15%', size: 30, rotate: 8 },
  { icon: ArmchairIcon, left: '7%', top: '33%', size: 32, rotate: -6 },
  { icon: LampIcon, left: '36%', top: '29%', size: 24, rotate: 5 },
  { icon: CameraIcon, left: '77%', top: '40%', size: 28, rotate: -8 },
  { icon: VinylRecordIcon, left: '21%', top: '57%', size: 26, rotate: 6 },
  { icon: GuitarIcon, left: '52%', top: '52%', size: 30, rotate: -4 },
  { icon: TelevisionSimpleIcon, left: '80%', top: '69%', size: 24, rotate: 7 },
  { icon: CrownIcon, left: '3%', top: '72%', size: 22, rotate: -10 },
]

const ROLES: { role: Role; icon: Icon; tone: Tone; title: string; description: string }[] = [
  {
    role: 'customer',
    icon: FilmSlateIcon,
    tone: 'brand',
    title: 'I’m an Art Director',
    description: 'Find and rent props for my shoots',
  },
  {
    role: 'owner',
    icon: StorefrontIcon,
    tone: 'warning',
    title: 'I’m a Prop Owner',
    description: 'List my props and manage rentals',
  },
]

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: EASE_OUT, delay },
})

/** Entry point: choose whether you're renting props or listing them. */
export default function WelcomeScreen() {
  useStatusBar('light')
  const Logo = APP.logo
  const accounts = useSession((s) => s.accounts)
  const enter = useSession((s) => s.enter)

  // Already signed in to that side → go straight in; otherwise log in first.
  const choose = (role: Role) => (accounts[role] ? enter(role) : nav.push(`/login?role=${role}`))

  return (
    <Screen surface className="flex flex-col">
      <div className="relative h-[44%] min-h-72 shrink-0 overflow-hidden bg-linear-to-br from-brand-500 via-brand-700 to-brand-950 pt-safe">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-white/[0.07]" />
        {FLOATERS.map(({ icon: FIcon, left, top, size, rotate }, i) => (
          <motion.div
            key={i}
            className="absolute grid place-items-center rounded-2xl bg-white/12 text-white ring-1 ring-white/20 backdrop-blur-sm"
            style={{ left, top, width: size + 28, height: size + 28, rotate }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1, y: [0, -7, 0] }}
            transition={{
              opacity: { duration: 0.4, delay: 0.1 + i * 0.06 },
              scale: { type: 'spring', stiffness: 260, damping: 18, delay: 0.1 + i * 0.06 },
              y: { duration: 4 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 },
            }}
          >
            <FIcon size={size} weight="duotone" />
          </motion.div>
        ))}
        <div className="relative flex items-center gap-2.5 px-5 pt-4 text-white">
          <span className="grid size-9 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
            <Logo size={20} weight="fill" />
          </span>
          <span className="font-display text-lg font-bold">{APP.name}</span>
        </div>
      </div>

      <div className="relative -mt-7 flex flex-1 flex-col rounded-t-[28px] bg-surface px-5 pb-[calc(var(--sab)+20px)] pt-7">
        <motion.h1 {...rise(0.15)} className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-fg">
          Props for every shoot
        </motion.h1>
        <motion.p {...rise(0.22)} className="mt-2 text-[15px] leading-relaxed text-muted">
          Hire film and ad props from trusted owners — or list yours and start earning.
        </motion.p>

        <motion.p {...rise(0.3)} className="mb-3 mt-7 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
          Continue as
        </motion.p>
        <div className="space-y-3 @medium:max-w-md">
          {ROLES.map(({ role, icon, tone, title, description }, i) => (
            <motion.button
              key={role}
              {...rise(0.36 + i * 0.07)}
              type="button"
              onClick={() => choose(role)}
              className="pressable flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left shadow-card hover:border-line-strong"
            >
              <IconTile icon={icon} tone={tone} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-fg">{title}</span>
                <span className="mt-0.5 block text-sm text-muted">{description}</span>
              </span>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-2">
                <ArrowRightIcon size={16} weight="bold" />
              </span>
            </motion.button>
          ))}
        </div>

        <p className="mt-auto pt-6 text-center text-xs leading-relaxed text-subtle">
          By continuing you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </Screen>
  )
}
