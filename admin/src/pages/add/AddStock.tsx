import { CameraIcon, DotsThreeIcon, FileCsvIcon, ImagesIcon, PencilSimpleIcon, SparkleIcon, TrashIcon, WarningCircleIcon, type Icon } from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { draftMissing, type Draft } from '@/lib/owner'
import { useOwner } from '@/store/owner'
import { plural } from '~/lib/data'
import { linkProps, navigate } from '~/router'
import { Button, IconButton, Segmented } from '~/ui/controls'
import { Card, CardHeader, EmptyState, PageHeader, Tag, Thumb } from '~/ui/display'
import { toast } from '~/ui/feedback'
import { Menu } from '~/ui/overlays'

const SOURCE: Record<Draft['source'], string> = { rapid: 'Rapid capture', one: 'One item', list: 'From a list', copy: 'Duplicate' }

/** ADD: many items, one item, from a list, and the drafts waiting for details. */
export default function AddStock() {
  const drafts = useOwner((s) => s.drafts)
  const removeDraft = useOwner((s) => s.removeDraft)
  const [filter, setFilter] = useState<'all' | 'ready' | 'needs'>('all')
  const ready = drafts.filter((d) => draftMissing(d).length === 0)
  const shown = drafts.filter((d) => filter === 'all' || (filter === 'ready') === (draftMissing(d).length === 0))

  const ways: { title: string; text: string; icon: Icon; to: string; tag?: string; steps: string }[] = [
    { title: 'Many items', text: 'Rapid capture: snap each prop, add the details later.', icon: CameraIcon, to: '/add/rapid', steps: 'Shoot · Next prop · Done' },
    { title: 'One item', text: 'Five photos, then AI reads them and fills the form.', icon: SparkleIcon, to: '/add/one', tag: 'AI', steps: 'Front · Back · Detail · In use · Scale' },
    { title: 'From a list', text: 'Import a spreadsheet of your stock as drafts.', icon: FileCsvIcon, to: '/add/import', steps: 'CSV · check · add drafts' },
  ]

  const discard = (d: Draft) => {
    const undo = removeDraft(d.id)
    toast('Draft discarded', { action: { label: 'Undo', onClick: undo } })
  }

  return (
    <>
      <PageHeader crumbs={[{ label: 'Add stock' }]} title="Add stock" subtitle="New listings are checked by our team within 2 hours" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ways.map((w, i) => (
          <a
            key={w.title}
            {...linkProps(w.to)}
            className={cn(
              'group relative flex flex-col overflow-hidden rounded-xl border p-5 shadow-card transition-[box-shadow,border-color,transform] hover:-translate-y-0.5 hover:shadow-float',
              i === 0 ? 'border-transparent bg-accent text-accent-fg' : 'border-line bg-surface hover:border-accent/40',
            )}
          >
            <span className={cn('grid size-11 place-items-center rounded-xl', i === 0 ? 'bg-white/15' : 'bg-accent-soft text-accent')}>
              <w.icon size={24} weight="duotone" />
            </span>
            <span className="mt-4 flex items-center gap-2 font-display text-lg font-bold">
              {w.title}
              {w.tag && <Tag tone="brand">{w.tag}</Tag>}
            </span>
            <span className={cn('mt-1 text-[13px] leading-snug', i === 0 ? 'opacity-85' : 'text-muted')}>{w.text}</span>
            <span className={cn('mt-4 border-t pt-3 text-xs font-semibold', i === 0 ? 'border-white/20 opacity-80' : 'border-line text-subtle')}>{w.steps}</span>
          </a>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Waiting for details"
          subtitle={drafts.length ? `${plural(drafts.length, 'draft')} · ${ready.length} ready to publish` : 'Captured props land here'}
          icon={ImagesIcon}
          actions={
            drafts.length > 0 && (
              <Segmented
                size="sm"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'All', count: drafts.length },
                  { value: 'ready', label: 'Ready', count: ready.length },
                  { value: 'needs', label: 'Needs details', count: drafts.length - ready.length },
                ]}
              />
            )
          }
        />
        {drafts.length === 0 ? (
          <EmptyState icon={ImagesIcon} title="No drafts" description="Snap your props with rapid capture, then finish the details here when you have time." action={<Button onClick={() => navigate('/add/rapid')}>Start rapid capture</Button>} />
        ) : shown.length === 0 ? (
          <EmptyState icon={ImagesIcon} title="Nothing in this filter" />
        ) : (
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                  <th className="py-2.5 pl-4 pr-3">Draft</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="hidden px-3 py-2.5 sm:table-cell">Source</th>
                  <th className="px-3 py-2.5 text-right">Day rate</th>
                  <th className="hidden px-3 py-2.5 md:table-cell">Captured</th>
                  <th className="py-2.5 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((d) => {
                  const missing = draftMissing(d)
                  return (
                    <tr key={d.id} onClick={() => navigate(`/add/draft/${d.id}`)} className="cursor-pointer transition-colors hover:bg-surface-2/70">
                      <td className="py-2.5 pl-4 pr-3">
                        <div className="flex items-center gap-3">
                          <span className="relative">
                            <Thumb listing={{ photos: d.photos, category: d.category ?? 'Decor', catalogId: null }} className="size-11 rounded-lg" iconSize={18} />
                            {d.photos.length > 0 && <span className="absolute -bottom-1 -right-1 rounded-full bg-fg px-1.5 text-[10px] font-bold text-bg">{d.photos.length}</span>}
                          </span>
                          <div className="min-w-0">
                            <p className={cn('truncate font-semibold', d.name ? 'text-fg' : 'italic text-muted')}>{d.name || 'Untitled prop'}</p>
                            <p className="truncate text-xs text-muted">{[d.category, d.era, plural(d.pieces, 'piece')].filter(Boolean).join(' · ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {missing.length ? (
                          <Tag tone="warning">
                            <WarningCircleIcon size={11} weight="fill" /> Needs {missing.slice(0, 3).join(', ')}
                            {missing.length > 3 ? '…' : ''}
                          </Tag>
                        ) : (
                          <Tag tone="success" dot>
                            Ready to publish
                          </Tag>
                        )}
                      </td>
                      <td className="hidden px-3 py-2.5 text-fg-2 sm:table-cell">
                        {SOURCE[d.source]}
                        {d.aiFilled.length > 0 && (
                          <Tag tone="brand" className="ml-1.5">
                            <SparkleIcon size={10} weight="fill" /> AI
                          </Tag>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-fg">{d.dayRate ? formatINR(d.dayRate) : <span className="text-subtle">—</span>}</td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-muted md:table-cell">{timeAgo(d.createdAt)}</td>
                      <td className="py-2.5 pl-3 pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="xs" variant={missing.length ? 'secondary' : 'primary'} icon={PencilSimpleIcon} onClick={() => navigate(`/add/draft/${d.id}`)}>
                            Finish capture
                          </Button>
                          <Menu items={[{ label: 'Finish capture', icon: PencilSimpleIcon, onSelect: () => navigate(`/add/draft/${d.id}`) }, 'divider', { label: 'Discard', icon: TrashIcon, destructive: true, onSelect: () => discard(d) }]}>
                            <IconButton icon={DotsThreeIcon} weight="bold" size="sm" label={`Options for ${d.name || 'untitled draft'}`} />
                          </Menu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
