import { CalendarBlankIcon } from '@phosphor-icons/react'
import { useMemo, useState, type ReactNode } from 'react'
import { CATEGORIES, ERAS, MATERIALS } from '@/data/props'
import { cn } from '@/lib/cn'
import { addDays, formatDateRangeShort, todayISO } from '@/lib/dates'
import {
  EMPTY_FILTERS,
  PRICE_BANDS,
  SCOPE_HINT,
  SCOPE_LABEL,
  SCOPES,
  clearRefinements,
  searchProps,
  type Filters,
} from '@/lib/search'
import { BottomSheet } from '@/overlays/BottomSheet'
import { activeProjects, useProjects } from '@/store/projects'
import { Button, Chip, DateField, Segmented, Switch } from '@/ui'

interface FilterSheetProps {
  open: boolean
  onClose: () => void
  initial: Filters
  onApply: (filters: Filters) => void
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/**
 * Results filters: dates (from a project), where to look, price, category,
 * era, material and toggles. Shows a live result count. Give it a new `key`
 * each time it opens so it starts from the applied filters.
 */
export function FilterSheet({ open, onClose, initial, onApply }: FilterSheetProps) {
  const [draft, setDraft] = useState(initial)
  const [custom, setCustom] = useState(!!initial.from && !initial.projectId)
  const projects = activeProjects(useProjects((s) => s.projects))
  const count = useMemo(() => searchProps(draft).length, [draft])
  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }))
  const hasDates = !!(draft.from && draft.to)

  const pickCustom = () => {
    setCustom(true)
    const from = draft.from ?? addDays(todayISO(), 7)
    set({ projectId: null, from, to: draft.to && draft.to >= from ? draft.to : addDays(from, 2) })
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setCustom(false)
              setDraft({ ...clearRefinements(draft), scope: EMPTY_FILTERS.scope })
            }}
          >
            Reset
          </Button>
          <Button size="lg" className="flex-1" onClick={() => onApply(draft)}>
            {count ? `Show ${count} result${count === 1 ? '' : 's'}` : 'No exact matches — show anyway'}
          </Button>
        </div>
      }
    >
      <Section title="Dates" hint="Check availability against your shoot">
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <Chip
              key={p.id}
              selected={draft.projectId === p.id}
              onClick={() => {
                setCustom(false)
                set({ projectId: p.id, from: p.startDate, to: p.endDate })
              }}
            >
              {p.name} · {formatDateRangeShort(p.startDate, p.endDate)}
            </Chip>
          ))}
          <Chip icon={CalendarBlankIcon} selected={custom} onClick={pickCustom}>
            Custom dates
          </Chip>
          <Chip
            selected={!hasDates}
            onClick={() => {
              setCustom(false)
              set({ projectId: null, from: null, to: null, freeOnly: false })
            }}
          >
            Any dates
          </Chip>
        </div>
        {custom && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <DateField
              label="From"
              format="short"
              value={draft.from}
              min={todayISO()}
              onChange={(from) => set({ from, to: draft.to && draft.to >= from ? draft.to : from })}
            />
            <DateField label="To" format="short" value={draft.to} min={draft.from ?? todayISO()} onChange={(to) => set({ to })} />
          </div>
        )}
      </Section>

      <Section title="Where to look" hint={SCOPE_HINT[draft.scope]}>
        <Segmented
          options={SCOPES.map((s) => ({ value: s, label: SCOPE_LABEL[s] }))}
          value={draft.scope}
          onChange={(scope) => set({ scope })}
          className="[&_button]:text-[13px]"
        />
      </Section>

      <Section title="Price per day">
        <div className="flex flex-wrap gap-2">
          {PRICE_BANDS.map((b) => (
            <Chip key={b.id} selected={draft.prices.includes(b.id)} onClick={() => set({ prices: toggle(draft.prices, b.id) })}>
              {b.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Category">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              icon={c.icon}
              selected={draft.categories.includes(c.id)}
              onClick={() => set({ categories: toggle(draft.categories, c.id) })}
            >
              {c.id}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Era">
        <div className="flex flex-wrap gap-2">
          {ERAS.map((e) => (
            <Chip key={e.id} selected={draft.eras.includes(e.id)} onClick={() => set({ eras: toggle(draft.eras, e.id) })}>
              {e.id}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Material">
        <div className="flex flex-wrap gap-2">
          {MATERIALS.map((m) => (
            <Chip key={m} selected={draft.materials.includes(m)} onClick={() => set({ materials: toggle(draft.materials, m) })}>
              {m}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="More">
        <div className="-mx-1 divide-y divide-line">
          <ToggleRow
            title="Free on your dates"
            description={hasDates ? `Hide props booked ${formatDateRangeShort(draft.from!, draft.to!)}` : 'Pick dates above first'}
            checked={draft.freeOnly && hasDates}
            disabled={!hasDates}
            onChange={(freeOnly) => set({ freeOnly })}
          />
          <ToggleRow
            title="Can be modified"
            description="Owner allows repainting or alterations"
            checked={draft.modifiable}
            onChange={(modifiable) => set({ modifiable })}
          />
          <ToggleRow
            title="Delivery"
            description="Vendor delivers to your set"
            checked={draft.delivery}
            onChange={(delivery) => set({ delivery })}
          />
          <ToggleRow
            title="Verified only"
            description="ID and quality-checked vendors"
            checked={draft.verified}
            onChange={(verified) => set({ verified })}
          />
        </div>
      </Section>
    </BottomSheet>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-b border-line py-4 first:pt-1 last:border-0 last:pb-0">
      <h3 className="text-xs font-bold uppercase tracking-[0.07em] text-muted">{title}</h3>
      {hint && <p className="mt-0.5 text-[13px] text-subtle">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className={cn('flex items-center gap-3 px-1 py-3', disabled && 'opacity-60')}>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-fg">{title}</span>
        <span className="block text-[13px] text-muted">{description}</span>
      </span>
      <Switch checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </label>
  )
}
