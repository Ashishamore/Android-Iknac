import { useState } from 'react'
import { BottomSheet } from '@/overlays/BottomSheet'
import { Button, Switch, TextField } from '@/ui'

interface SaveSearchSheetProps {
  open: boolean
  onClose: () => void
  defaultName: string
  summary: string
  onSave: (name: string, alerts: boolean) => void
}

/** Name a search and choose whether to get alerts. Give it a new `key` each time it opens. */
export function SaveSearchSheet({ open, onClose, defaultName, summary, onSave }: SaveSearchSheetProps) {
  const [name, setName] = useState(defaultName)
  const [alerts, setAlerts] = useState(true)
  const [error, setError] = useState<string>()

  const save = () => {
    if (name.trim().length < 2) return setError('Give this search a name')
    onSave(name.trim(), alerts)
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Save this search"
      description={summary}
      footer={
        <Button size="lg" block onClick={save}>
          Save search
        </Button>
      }
    >
      <TextField
        label="Name"
        value={name}
        maxLength={48}
        autoComplete="off"
        error={error}
        onChange={(e) => {
          setName(e.target.value)
          setError(undefined)
        }}
      />
      <label className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-fg">Alert me</span>
          <span className="block text-[13px] text-muted">When new props match this search</span>
        </span>
        <Switch checked={alerts} onChange={setAlerts} label="Alert me" />
      </label>
    </BottomSheet>
  )
}
