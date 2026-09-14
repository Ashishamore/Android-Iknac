import { FolderIcon, MapPinPlusIcon, PlusIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { LocationRow } from '@/components/project'
import { LocationSheet } from '@/components/LocationSheet'
import { daysInclusive, formatDateRange } from '@/lib/dates'
import { amountInWords, formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import { nav, useParams } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useProject, useProjects, type ShootLocation } from '@/store/projects'
import { AppBar, Button, DateField, EmptyState, FieldMessage, Screen, TextField } from '@/ui'

interface FormState {
  name: string
  startDate: string | null
  endDate: string | null
  /** Digits only. */
  budget: string
  locations: ShootLocation[]
}

type FormErrors = Partial<Record<'name' | 'startDate' | 'endDate' | 'budget' | 'locations', string>>

/** Create a project (/customer/projects/new) or edit one (/customer/projects/:id/edit). */
export default function ProjectFormScreen() {
  const { id } = useParams<{ id?: string }>()
  const existing = useProject(id)
  if (id && !existing) {
    return (
      <Screen header={<AppBar close title="Edit project" />}>
        <EmptyState icon={FolderIcon} title="Project not found" description="It may have been deleted." />
      </Screen>
    )
  }
  return <ProjectForm key={existing?.id ?? 'new'} />
}

function ProjectForm() {
  const { id } = useParams<{ id?: string }>()
  const existing = useProject(id)
  const createProject = useProjects((s) => s.createProject)
  const updateProject = useProjects((s) => s.updateProject)
  const popup = usePopup()
  const editing = !!existing

  const [form, setForm] = useState<FormState>(() => ({
    name: existing?.name ?? '',
    startDate: existing?.startDate ?? null,
    endDate: existing?.endDate ?? null,
    budget: existing ? String(existing.budget) : '',
    locations: existing?.locations ?? [],
  }))
  const [initial] = useState(form)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  // A new key per opening gives the location sheet fresh fields.
  const [sheet, setSheet] = useState<{ key: number; open: boolean; editing: ShootLocation | null }>({
    key: 0,
    open: false,
    editing: null,
  })

  const { startDate, endDate } = form
  const hasDates = !!(startDate && endDate)
  const isOutside = (l: ShootLocation) => hasDates && (l.date < startDate! || l.date > endDate!)
  const locations = [...form.locations].sort((a, b) => a.date.localeCompare(b.date))
  const budget = Number(form.budget || 0)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)

  const clearError = (key: keyof FormErrors) => setErrors((e) => ({ ...e, [key]: undefined }))
  const openSheet = (editingLocation: ShootLocation | null) =>
    setSheet((s) => ({ key: s.key + 1, open: true, editing: editingLocation }))

  const saveLocation = (loc: ShootLocation) => {
    setForm((f) => ({
      ...f,
      locations: f.locations.some((l) => l.id === loc.id)
        ? f.locations.map((l) => (l.id === loc.id ? loc : l))
        : [...f.locations, loc],
    }))
    clearError('locations')
  }

  const removeLocation = (locationId: string) => {
    const removed = form.locations.find((l) => l.id === locationId)
    setForm((f) => ({ ...f, locations: f.locations.filter((l) => l.id !== locationId) }))
    if (removed) {
      popup.toast('Location removed', {
        action: { label: 'Undo', onClick: () => setForm((f) => ({ ...f, locations: [...f.locations, removed] })) },
      })
    }
  }

  const close = async () => {
    if (dirty && !saving) {
      const discard = await popup.confirm({
        title: editing ? 'Discard changes?' : 'Discard this project?',
        message: 'What you’ve entered will be lost.',
        confirmText: 'Discard',
        cancelText: 'Keep editing',
        tone: 'danger',
      })
      if (!discard) return
    }
    nav.pop()
  }

  const submit = async () => {
    const next: FormErrors = {}
    if (form.name.trim().length < 2) next.name = 'Enter a project name'
    if (!startDate) next.startDate = 'Pick a start date'
    if (!endDate) next.endDate = 'Pick an end date'
    if (!budget) next.budget = 'Enter the total budget'
    if (form.locations.some(isOutside)) next.locations = 'Some locations are outside the shoot dates'
    setErrors(next)
    if (Object.keys(next).length) {
      haptic('warning')
      popup.toast('Please fix the highlighted fields', { tone: 'error' })
      return
    }

    setSaving(true)
    await sleep(700)
    const input = { name: form.name.trim(), startDate: startDate!, endDate: endDate!, budget, locations }
    if (existing) {
      updateProject(existing.id, input)
      nav.pop()
      popup.toast('Project updated', { tone: 'success' })
    } else {
      const newId = createProject(input)
      nav.pop()
      popup.toast('Project created', {
        tone: 'success',
        action: { label: 'View', onClick: () => nav.push(`/customer/projects/${newId}`) },
      })
    }
  }

  return (
    <Screen
      surface
      header={<AppBar close back={close} title={editing ? 'Edit project' : 'New project'} />}
      footer={
        <Button block size="lg" loading={saving} onClick={submit}>
          {editing ? 'Save changes' : 'Create project'}
        </Button>
      }
      className="px-4"
    >
      {!editing && (
        <p className="pb-5 pt-1 text-[15px] leading-relaxed text-muted">
          Plan your shoot’s dates, budget and locations. You can change these later.
        </p>
      )}

      <div className="space-y-4 @medium:max-w-xl">
        <TextField
          label="Project name"
          value={form.name}
          maxLength={60}
          autoComplete="off"
          error={errors.name}
          onChange={(e) => {
            setForm((f) => ({ ...f, name: e.target.value }))
            clearError('name')
          }}
        />

        <div>
          <div className="grid grid-cols-2 gap-3">
            <DateField
              label="Start date"
              sheetTitle="Shoot start date"
              format="short"
              value={startDate}
              max={endDate}
              error={errors.startDate}
              onChange={(iso) => {
                setForm((f) => ({ ...f, startDate: iso }))
                clearError('startDate')
              }}
            />
            <DateField
              label="End date"
              sheetTitle="Shoot end date"
              format="short"
              value={endDate}
              min={startDate}
              error={errors.endDate}
              onChange={(iso) => {
                setForm((f) => ({ ...f, endDate: iso }))
                clearError('endDate')
              }}
            />
          </div>
          {hasDates && (
            <p className="mt-1.5 px-1 text-xs text-muted">
              {daysInclusive(startDate!, endDate!)}-day shoot · {formatDateRange(startDate!, endDate!)}
            </p>
          )}
        </div>

        <TextField
          label="Total budget"
          prefix="₹"
          inputMode="numeric"
          autoComplete="off"
          value={budget ? budget.toLocaleString('en-IN') : ''}
          error={errors.budget}
          hint={
            budget
              ? `${formatINR(budget)}${amountInWords(budget) ? ` · ${amountInWords(budget)}` : ''}`
              : 'Total budget for props and set dressing'
          }
          onChange={(e) => {
            setForm((f) => ({ ...f, budget: e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11) }))
            clearError('budget')
          }}
        />
      </div>

      <section className="mt-8 @medium:max-w-xl">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-fg">Shoot locations</h2>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">
              {hasDates
                ? 'Add each place you’ll shoot at, with its date.'
                : 'Set the shoot dates first to add locations.'}
            </p>
          </div>
          <Button size="sm" variant="tonal" icon={PlusIcon} disabled={!hasDates} onClick={() => openSheet(null)}>
            Add
          </Button>
        </div>
        <FieldMessage error={errors.locations} />
        {locations.length === 0 ? (
          <button
            type="button"
            disabled={!hasDates}
            onClick={() => openSheet(null)}
            className="mt-1 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong px-4 py-6 text-center text-sm font-medium text-muted transition-colors enabled:hover:border-accent/50 disabled:opacity-60"
          >
            <MapPinPlusIcon size={26} weight="duotone" className="text-accent" />
            {hasDates ? 'Add your first location' : 'Locations can be added once dates are set'}
          </button>
        ) : (
          <div className="mt-1 space-y-2.5">
            {locations.map((l) => (
              <LocationRow
                key={l.id}
                location={l}
                invalid={isOutside(l)}
                onEdit={() => openSheet(l)}
                onRemove={() => removeLocation(l.id)}
              />
            ))}
          </div>
        )}
      </section>
      <div className="h-6" />

      {hasDates && (
        <LocationSheet
          key={sheet.key}
          open={sheet.open}
          onClose={() => setSheet((s) => ({ ...s, open: false }))}
          initial={sheet.editing}
          min={startDate!}
          max={endDate!}
          onSave={saveLocation}
          onRemove={removeLocation}
        />
      )}
    </Screen>
  )
}
