import { ArrowBendUpLeftIcon, StarIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { timeAgo } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { ratingSummary, type OwnerReview } from '@/lib/owner'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useOwner } from '@/store/owner'
import { AppBar, Avatar, Button, Card, Chip, ChipRow, Screen, TextArea } from '@/ui'

/** Reviews → Rating · Breakdown · Unreplied count · Review → Reply */
export default function OwnerReviewsScreen() {
  const popup = usePopup()
  const reviews = useOwner((s) => s.reviews)
  const listings = useOwner((s) => s.listings)
  const reply = useOwner((s) => s.replyReview)
  const [filter, setFilter] = useState<'all' | 'unreplied'>('all')
  const [sheet, setSheet] = useState<{ key: number; open: boolean; review: OwnerReview | null }>({ key: 0, open: false, review: null })
  const sum = ratingSummary(reviews)
  const shown = [...reviews].filter((r) => filter === 'all' || !r.reply).sort((a, b) => b.at - a.at)

  return (
    <Screen header={<AppBar title="Reviews" subtitle={`${reviews.length} from renters`} />}>
      <div className="px-4 pt-1 @medium:mx-auto @medium:max-w-2xl">
        <Card className="flex items-center gap-5 p-4">
          <div className="text-center">
            <p className="font-display text-[40px] font-extrabold leading-none tabular-nums text-fg">{sum.avg.toFixed(1)}</p>
            <p className="mt-1 flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <StarIcon key={n} size={13} weight="fill" className={n <= Math.round(sum.avg) ? 'text-amber-500' : 'text-line-strong'} />
              ))}
            </p>
            <p className="mt-1 text-xs text-muted">{reviews.length} reviews</p>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            {sum.counts.map(({ star, n }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-right font-semibold text-fg-2">{star}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <span className="block h-full rounded-full bg-amber-500" style={{ width: `${reviews.length ? (n / reviews.length) * 100 : 0}%` }} />
                </span>
                <span className="w-4 tabular-nums text-muted">{n}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <ChipRow className="pb-1 pt-4 @medium:mx-auto @medium:max-w-2xl">
        <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
          All · {reviews.length}
        </Chip>
        <Chip selected={filter === 'unreplied'} onClick={() => setFilter('unreplied')}>
          Unreplied · {sum.unreplied}
        </Chip>
      </ChipRow>
      <div className="grid grid-cols-1 gap-2.5 px-4 pb-10 pt-2 @medium:mx-auto @medium:max-w-2xl">
        {shown.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-center gap-3">
              <Avatar name={r.renter} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{r.renter}</p>
                <p className="truncate text-xs text-muted">{listings.find((l) => l.id === r.listingId)?.name}</p>
              </div>
              <span className="shrink-0 text-xs text-subtle">{timeAgo(r.at)}</span>
            </div>
            <p className="mt-2 flex gap-0.5" aria-label={`${r.rating} out of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <StarIcon key={n} size={14} weight="fill" className={n <= r.rating ? 'text-amber-500' : 'text-line-strong'} />
              ))}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-fg">{r.text}</p>
            {r.reply ? (
              <div className="mt-3 rounded-xl bg-surface-2 p-3">
                <p className="text-xs font-semibold text-fg-2">Your reply</p>
                <p className="text-sm text-fg">{r.reply}</p>
              </div>
            ) : (
              <Button size="sm" variant="tonal" icon={ArrowBendUpLeftIcon} className="mt-3" onClick={() => setSheet((s) => ({ key: s.key + 1, open: true, review: r }))}>
                Reply
              </Button>
            )}
          </Card>
        ))}
        {shown.length === 0 && <p className="rounded-2xl bg-surface p-5 text-center text-sm text-muted shadow-card">Every review has a reply. Nice.</p>}
      </div>
      <ReplySheet
        key={sheet.key}
        open={sheet.open}
        review={sheet.review}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSend={(text) => {
          if (!sheet.review) return
          reply(sheet.review.id, text)
          setSheet((s) => ({ ...s, open: false }))
          haptic('success')
          popup.toast('Reply posted', { tone: 'success' })
        }}
      />
    </Screen>
  )
}

function ReplySheet({ open, review, onClose, onSend }: { open: boolean; review: OwnerReview | null; onClose: () => void; onSend: (text: string) => void }) {
  const [text, setText] = useState(() => (review && review.rating >= 5 ? `Thank you! Hope to see you on the next shoot.` : ''))
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Reply to ${review?.renter ?? ''}`}
      description="Replies are public on your vendor page"
      footer={
        <Button size="lg" block disabled={text.trim().length < 2} onClick={() => onSend(text.trim())}>
          Post reply
        </Button>
      }
    >
      {review && <p className="mb-3 rounded-xl bg-surface-2 p-3 text-sm text-fg-2">“{review.text}”</p>}
      <TextArea label="Your reply" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
    </BottomSheet>
  )
}
