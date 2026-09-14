import {
  ImageSquareIcon,
  PlusIcon,
  ScrollIcon,
  SparkleIcon,
  TextAaIcon,
  type Icon,
} from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { BoardCard } from '@/components/studio/BoardCard'
import { CreditsPill, CreditsSheet } from '@/components/studio/CreditsSheet'
import { EASE_OUT } from '@/lib/motion'
import type { SceneSource } from '@/lib/studio'
import { nav } from '@/navigation'
import { useProjects } from '@/store/projects'
import { useStudio } from '@/store/studio'
import { AppBar, Chip, ChipRow, EmptyState, Button, Screen, SectionHeader } from '@/ui'

const newBoard = (mode: SceneSource = 'describe') => nav.push(`/customer/ai-studio/new?mode=${mode}`)

const INPUTS: { mode: SceneSource; icon: Icon; title: string; text: string }[] = [
  { mode: 'describe', icon: TextAaIcon, title: 'Describe it', text: 'Type the brief' },
  { mode: 'photo', icon: ImageSquareIcon, title: 'Reference photo', text: 'Match a look' },
  { mode: 'script', icon: ScrollIcon, title: 'Script page', text: 'Paste or scan' },
]

/** "All", a project id, or "none" (boards without a project). */
type BoardFilter = 'all' | 'none' | string

export default function AiStudioTab() {
  const credits = useStudio((s) => s.credits)
  const boards = useStudio((s) => s.boards)
  const projects = useProjects((s) => s.projects)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const [filter, setFilter] = useState<BoardFilter>('all')

  /** Projects that have boards (the filter chips). */
  const boardProjects = useMemo(
    () => projects.filter((p) => boards.some((b) => b.limits.projectId === p.id)),
    [projects, boards],
  )
  const shown = useMemo(() => {
    const list = [...boards].sort((a, b) => b.updatedAt - a.updatedAt)
    if (filter === 'all') return list
    if (filter === 'none') return list.filter((b) => !b.limits.projectId || !projects.some((p) => p.id === b.limits.projectId))
    return list.filter((b) => b.limits.projectId === filter)
  }, [boards, filter, projects])

  return (
    <Screen
      header={
        <AppBar
          title="AI Studio"
          subtitle="Scene to prop board"
          actions={<CreditsPill onClick={() => setCreditsOpen(true)} />}
        />
      }
    >
      {/* Credits → Top up */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="relative mx-4 mt-3 overflow-hidden rounded-3xl bg-linear-to-br from-accent to-accent-strong p-5 text-accent-fg shadow-float"
      >
        <SparkleIcon aria-hidden size={120} weight="fill" className="absolute -right-6 -top-6 opacity-15" />
        <SparkleIcon aria-hidden size={40} weight="fill" className="absolute bottom-5 right-24 opacity-20" />
        <h2 className="relative max-w-64 font-display text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
          Turn a scene into a prop board
        </h2>
        <p className="relative mt-1.5 max-w-72 text-sm leading-snug opacity-85">
          Tell us the scene. We’ll list what it needs and match props you can hire.
        </p>
        <div className="relative mt-4 flex items-center gap-3">
          <p className="flex-1 text-sm font-semibold">
            <SparkleIcon size={14} weight="fill" className="-mt-0.5 mr-1 inline" />
            {credits} credit{credits === 1 ? '' : 's'} left
          </p>
          <button
            type="button"
            onClick={() => setCreditsOpen(true)}
            className="pressable h-9 rounded-xl bg-accent-fg px-4 text-sm font-bold text-accent"
          >
            Top up
          </button>
        </div>
      </motion.section>

      {/* Tell us the scene */}
      <SectionHeader title="Tell us the scene" subtitle="Start a new board from any of these" className="pt-6" />
      <div className="grid grid-cols-3 gap-2.5 px-4 @medium:max-w-2xl">
        {INPUTS.map((it, i) => (
          <motion.button
            key={it.mode}
            type="button"
            onClick={() => newBoard(it.mode)}
            className="pressable flex flex-col items-start rounded-2xl bg-surface p-3 text-left shadow-card outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.05 + i * 0.04 }}
          >
            <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
              <it.icon size={21} weight="duotone" />
            </span>
            <span className="mt-2.5 text-[13px] font-semibold leading-tight text-fg">{it.title}</span>
            <span className="mt-0.5 text-xs text-muted">{it.text}</span>
          </motion.button>
        ))}
      </div>

      {/* My boards (filter by project) */}
      <SectionHeader
        title="My boards"
        subtitle={`${boards.length} board${boards.length === 1 ? '' : 's'}`}
        action="New"
        onAction={() => newBoard()}
        className="pt-7"
      />
      {boards.length > 0 && (
        <ChipRow className="pb-3">
          <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </Chip>
          {boardProjects.map((p) => (
            <Chip key={p.id} selected={filter === p.id} onClick={() => setFilter(p.id)}>
              {p.name}
            </Chip>
          ))}
          <Chip selected={filter === 'none'} onClick={() => setFilter('none')}>
            No project
          </Chip>
        </ChipRow>
      )}
      {shown.length === 0 ? (
        <EmptyState
          icon={SparkleIcon}
          title={boards.length ? 'No boards here' : 'No boards yet'}
          description={boards.length ? 'Try another project filter.' : 'Describe a scene and we’ll build your first prop board.'}
          action={
            !boards.length && (
              <Button icon={PlusIcon} onClick={() => newBoard()}>
                New board
              </Button>
            )
          }
          className="py-10"
        />
      ) : (
        <div className="grid gap-2.5 px-4 @medium:grid-cols-2">
          {shown.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: EASE_OUT, delay: Math.min(i, 6) * 0.04 }}
            >
              <BoardCard board={b} onClick={() => nav.push(`/customer/ai-studio/boards/${b.id}`)} />
            </motion.div>
          ))}
        </div>
      )}
      <div className="h-8" />

      <CreditsSheet open={creditsOpen} onClose={() => setCreditsOpen(false)} />
    </Screen>
  )
}
