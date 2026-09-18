import { useState } from 'react'
import { DECLINE_REASONS } from '@/data/owner'
import { BottomSheet } from '@/overlays/BottomSheet'
import { Button, Chip, TextArea } from '@/ui'

/** Decline a booking request with a reason the renter sees. */
export function DeclineSheet({ open, onClose, onDecline }: { open: boolean; onClose: () => void; onDecline: (reason: string) => void }) {
  const [reason, setReason] = useState(DECLINE_REASONS[0])
  const [note, setNote] = useState('')
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Decline with a reason"
      description="The renter sees it, so they can look elsewhere quickly"
      footer={
        <Button size="lg" block variant="danger" onClick={() => onDecline(reason === 'Other' ? note.trim() || 'Other' : reason)}>
          Decline booking
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        {DECLINE_REASONS.map((r) => (
          <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
            {r}
          </Chip>
        ))}
      </div>
      {reason === 'Other' && <TextArea className="mt-4" label="Tell them why" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
    </BottomSheet>
  )
}
