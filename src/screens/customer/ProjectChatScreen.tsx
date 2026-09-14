import { ChatsCircleIcon, PaperPlaneRightIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CHAT_REPLIES } from '@/data/ops'
import { formatDayShort, toISODate } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { EASE_OUT } from '@/lib/motion'
import type { ChatMessage } from '@/lib/ops'
import { nav, useParams } from '@/navigation'
import { useMessages, useProjectMembers, useProjectOps } from '@/store/projectOps'
import { useProject } from '@/store/projects'
import { useDisplayName } from '@/store/session'
import { AppBar, Avatar, Button, EmptyState, IconButton, Screen } from '@/ui'

const timeOf = (at: number) => new Date(at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

/** TEAM → Project chat. Teammates "reply" after a moment (simulated). */
export default function ProjectChatScreen() {
  const { id } = useParams<{ id: string }>()
  const project = useProject(id)
  const messages = useMessages(id)
  const members = useProjectMembers(id)
  const send = useProjectOps((s) => s.sendMessage)
  const myName = useDisplayName()
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages.length, typing])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  if (!project) {
    return (
      <Screen header={<AppBar title="Project chat" />}>
        <EmptyState icon={ChatsCircleIcon} title="Project not found" action={<Button onClick={() => nav.pop()}>Go back</Button>} />
      </Screen>
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    send({ projectId: project.id, author: myName, role: 'Art Director', text, mine: true })
    setDraft('')
    haptic()
    const others = members.filter((m) => !m.you)
    if (!others.length) return
    const who = others[Math.floor(Math.random() * others.length)]
    const reply = CHAT_REPLIES[Math.floor(Math.random() * CHAT_REPLIES.length)]
    timers.current.push(
      window.setTimeout(() => setTyping(who.name), 900),
      window.setTimeout(() => {
        setTyping(null)
        send({ projectId: project.id, author: who.name, role: who.role, text: reply })
      }, 2600),
    )
  }

  // Group by day for the date separators.
  const days: { day: string; list: ChatMessage[] }[] = []
  for (const m of messages) {
    const day = toISODate(new Date(m.at))
    if (days[days.length - 1]?.day !== day) days.push({ day, list: [] })
    days[days.length - 1].list.push(m)
  }

  return (
    <Screen
      header={<AppBar title="Project chat" subtitle={`${project.name} · ${members.length} members`} />}
      footer={
        <form onSubmit={submit} className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message the team…"
            aria-label="Message"
            enterKeyHint="send"
            maxLength={500}
            className="h-11 min-w-0 flex-1 rounded-full bg-surface-2 px-4 text-[15px] text-fg outline-none placeholder:text-subtle focus:shadow-[0_0_0_2px_var(--color-accent)]"
          />
          <IconButton type="submit" icon={PaperPlaneRightIcon} weight="fill" label="Send" variant="solid" disabled={!draft.trim()} className="disabled:opacity-40" />
        </form>
      }
    >
      <div className="space-y-4 px-4 py-4 @medium:mx-auto @medium:max-w-2xl">
        {days.map(({ day, list }) => (
          <section key={day} className="space-y-2.5">
            <p className="text-center text-xs font-semibold text-muted">
              <span className="rounded-full bg-surface-2 px-3 py-1">{formatDayShort(day)}</span>
            </p>
            {list.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className={m.mine ? 'flex justify-end' : 'flex items-end gap-2'}
              >
                {!m.mine && <Avatar name={m.author} size="sm" />}
                <div className={m.mine ? 'max-w-[78%]' : 'max-w-[74%]'}>
                  {!m.mine && (
                    <p className="mb-0.5 px-1 text-xs text-muted">
                      <b className="font-semibold text-fg-2">{m.author}</b> · {m.role}
                    </p>
                  )}
                  <div
                    className={
                      m.mine
                        ? 'rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-[15px] leading-snug text-accent-fg'
                        : 'rounded-2xl rounded-bl-md bg-surface px-3.5 py-2 text-[15px] leading-snug text-fg shadow-card'
                    }
                  >
                    {m.text}
                  </div>
                  <p className={`mt-0.5 px-1 text-[11px] text-subtle ${m.mine ? 'text-right' : ''}`}>{timeOf(m.at)}</p>
                </div>
              </motion.div>
            ))}
          </section>
        ))}
        <AnimatePresence>
          {typing && (
            <motion.div key="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-end gap-2" aria-live="polite">
              <Avatar name={typing} size="sm" />
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-surface px-3.5 py-3 shadow-card" aria-label={`${typing} is typing`}>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="size-1.5 rounded-full bg-muted"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
    </Screen>
  )
}
