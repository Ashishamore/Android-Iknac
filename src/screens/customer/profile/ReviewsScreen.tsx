import { StarIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { REVIEW_TAGS } from '@/data/profile'
import { vendorById } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatDateRangeShort, timeAgo } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { EASE_OUT } from '@/lib/motion'
import { pendingReviews } from '@/lib/ops'
import { useQuery } from '@/navigation'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useProfile } from '@/store/profile'
import { useProjectOps } from '@/store/projectOps'
import { useProjects } from '@/store/projects'
import { AppBar, Avatar, Button, Card, Chip, EmptyState, Screen, Tabs, TextArea } from '@/ui'

type Tab = 'pending' | 'written'
const RATING_LABEL = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

interface Target {
  vendorId: string
  bookingId: string
  rating: number
}

/** Reviews: rate vendors after a booking is returned; see what you've written. */
export default function ReviewsScreen() {
  const popup = usePopup()
  const query = useQuery()
  const bookings = useProjectOps((s) => s.bookings)
  const runs = useProjectOps((s) => s.runs)
  const boards = useProjectOps((s) => s.boards)
  const projects = useProjects((s) => s.projects)
  const reviews = useProfile((s) => s.reviews)
  const addReview = useProfile((s) => s.addReview)
  const pending = useMemo(() => pendingReviews(bookings, runs, boards, reviews), [bookings, runs, boards, reviews])
  const [tab, setTab] = useState<Tab>(() => (query.get('tab') === 'written' || !pending.length ? 'written' : 'pending'))
  const [sheet, setSheet] = useState<{ key: number; open: boolean; target: Target | null }>({ key: 0, open: false, target: null })
  const open = (target: Target) => setSheet((s) => ({ key: s.key + 1, open: true, target }))

  return (
    <Screen
      resetScrollOn={tab}
      header={
        <AppBar title="Reviews">
          <Tabs
            tabs={[
              { value: 'pending', label: 'To review', count: pending.length },
              { value: 'written', label: 'Written', count: reviews.length },
            ]}
            value={tab}
            onChange={setTab}
          />
        </AppBar>
      }
    >
      <div className="grid grid-cols-1 gap-3 px-4 pb-10 pt-4 @medium:mx-auto @medium:max-w-2xl">
        {tab === 'pending' &&
          (pending.length ? (
            pending.map(({ booking, vendorId, items }, i) => {
              const vendor = vendorById(vendorId)
              return (
                <motion.div key={`${booking.id}-${vendorId}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.04 }}>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={vendor.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-fg">{vendor.name}</p>
                        <p className="truncate text-[13px] text-muted">
                          {projects.find((p) => p.id === booking.projectId)?.name} · {items} item{items === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-fg-2">Returned {formatDateRangeShort(booking.returnDate, booking.returnDate)}. How was it?</p>
                    <Stars value={0} size={30} onPick={(rating) => open({ vendorId, bookingId: booking.id, rating })} className="mt-1.5" />
                  </Card>
                </motion.div>
              )
            })
          ) : (
            <EmptyState icon={StarIcon} title="All caught up" description="After a booking is returned, rate each vendor here. It helps other art directors pick well." />
          ))}

        {tab === 'written' &&
          (reviews.length ? (
            reviews.map((r) => {
              const vendor = vendorById(r.vendorId)
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={vendor?.name ?? 'Vendor'} size="sm" />
                    <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-fg">{vendor?.name}</p>
                    <span className="shrink-0 text-xs text-subtle">{timeAgo(r.at)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Stars value={r.rating} size={16} />
                    <span className="text-[13px] font-semibold text-fg-2">{RATING_LABEL[r.rating]}</span>
                    {r.bookingId && <span className="text-xs text-muted">· {r.bookingId}</span>}
                  </div>
                  {r.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.tags.map((t) => (
                        <span key={t} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-fg-2">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.text && <p className="mt-2 text-sm leading-relaxed text-fg">{r.text}</p>}
                </Card>
              )
            })
          ) : (
            <EmptyState icon={StarIcon} title="No reviews yet" description="Your reviews of vendors show up here." />
          ))}
      </div>

      <ReviewSheet
        key={sheet.key}
        open={sheet.open}
        target={sheet.target}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSubmit={(r) => {
          addReview(r)
          setSheet((s) => ({ ...s, open: false }))
          haptic('success')
          popup.toast('Thanks! Your review is live', { tone: 'success' })
          if (pending.length <= 1) setTab('written')
        }}
      />
    </Screen>
  )
}

function Stars({ value, size, onPick, className }: { value: number; size: number; onPick?: (n: number) => void; className?: string }) {
  if (!onPick) {
    return (
      <span className={cn('flex gap-0.5', className)} aria-label={`${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <StarIcon key={n} size={size} weight="fill" className={n <= value ? 'text-amber-500' : 'text-line-strong'} />
        ))}
      </span>
    )
  }
  return (
    <span className={cn('flex gap-1', className)} role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          whileTap={{ scale: 0.82 }}
          onClick={() => {
            haptic()
            onPick(n)
          }}
          className="rounded-lg p-0.5 outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
        >
          <StarIcon size={size} weight={n <= value ? 'fill' : 'regular'} className={n <= value ? 'text-amber-500' : 'text-subtle'} />
        </motion.button>
      ))}
    </span>
  )
}

function ReviewSheet({
  open,
  target,
  onClose,
  onSubmit,
}: {
  open: boolean
  target: Target | null
  onClose: () => void
  onSubmit: (r: { vendorId: string; bookingId: string; rating: number; tags: string[]; text: string }) => void
}) {
  const [rating, setRating] = useState(target?.rating ?? 0)
  const [tags, setTags] = useState<string[]>([])
  const [text, setText] = useState('')
  if (!target) return <BottomSheet open={false} onClose={onClose} />
  const vendor = vendorById(target.vendorId)

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Rate ${vendor.name}`}
      description={`Booking ${target.bookingId}`}
      footer={
        <Button size="lg" block disabled={!rating} onClick={() => onSubmit({ vendorId: target.vendorId, bookingId: target.bookingId, rating, tags, text: text.trim() })}>
          Post review
        </Button>
      }
    >
      <div className="flex flex-col items-center">
        <Stars value={rating} size={38} onPick={setRating} />
        <p className="mt-1 h-5 text-sm font-semibold text-fg-2">{RATING_LABEL[rating]}</p>
      </div>
      <p className="mt-4 px-1 text-xs font-bold uppercase tracking-[0.07em] text-muted">What went well?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {REVIEW_TAGS.map((t) => (
          <Chip key={t} selected={tags.includes(t)} onClick={() => setTags((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]))}>
            {t}
          </Chip>
        ))}
      </div>
      <TextArea className="mt-4" label="Anything else? (optional)" value={text} rows={3} onChange={(e) => setText(e.target.value)} />
    </BottomSheet>
  )
}
