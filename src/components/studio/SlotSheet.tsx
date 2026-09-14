import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, type Category } from '@/data/props'
import { haptic } from '@/lib/haptics'
import { slotId, type Slot } from '@/lib/studio'
import { BottomSheet } from '@/overlays/BottomSheet'
import { Button, Chip, TextArea, TextField } from '@/ui'

interface SlotSheetProps {
  open: boolean
  onClose: () => void
  /** Slot being edited, or null to add one. */
  initial: Slot | null
  /** Field to focus: "Rename" focuses the name, "Note" the note. */
  focus?: 'name' | 'note'
  onSave: (slot: Slot) => void
}

/** Add a slot, or rename / note one. Give it a new `key` each time it opens. */
export function SlotSheet({ open, onClose, initial, focus = 'name', onSave }: SlotSheetProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? 'Decor')
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState<string>()
  const nameRef = useRef<HTMLInputElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  // Focus after the sheet has slid up.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => (focus === 'note' ? noteRef.current : nameRef.current)?.focus(), 380)
    return () => clearTimeout(t)
  }, [open, focus])

  const save = () => {
    if (name.trim().length < 2) {
      setError('Name what the scene needs')
      haptic('warning')
      return
    }
    const trimmed = name.trim()
    onSave(
      initial
        ? { ...initial, name: trimmed, category, note: note.trim(), hint: initial.name === trimmed ? initial.hint : trimmed }
        : { id: slotId(), name: trimmed, category, note: note.trim(), hint: trimmed, periodCorrect: false, haveIt: false },
    )
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={initial ? 'Edit slot' : 'Add a slot'}
      description="Something the scene needs. We’ll match props to it."
      footer={
        <Button size="lg" block onClick={save}>
          {initial ? 'Save slot' : 'Add slot'}
        </Button>
      }
    >
      <div className="space-y-4">
        <TextField
          ref={nameRef}
          label="What is it?"
          value={name}
          maxLength={40}
          autoComplete="off"
          error={error}
          hint="e.g. Bentwood chairs, Ceiling fan, Street lamp"
          onChange={(e) => {
            setName(e.target.value)
            setError(undefined)
          }}
        />
        <div>
          <p className="px-1 text-xs font-bold uppercase tracking-[0.07em] text-muted">Category</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip key={c.id} icon={c.icon} selected={category === c.id} onClick={() => setCategory(c.id)}>
                {c.id}
              </Chip>
            ))}
          </div>
        </div>
        <TextArea
          ref={noteRef}
          label="Note (optional)"
          rows={2}
          value={note}
          maxLength={120}
          hint="Colour, size, condition, where it goes…"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </BottomSheet>
  )
}
