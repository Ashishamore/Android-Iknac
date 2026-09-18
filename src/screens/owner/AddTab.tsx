import { CameraIcon, CaretRightIcon, DotsThreeVerticalIcon, FileCsvIcon, ImagesIcon, PencilSimpleIcon, SparkleIcon, TrashIcon, type Icon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { ListingThumb, OwnerAppBar } from '@/components/owner/OwnerUI'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { EASE_OUT } from '@/lib/motion'
import { draftMissing, type Draft } from '@/lib/owner'
import { nav } from '@/navigation'
import { Menu } from '@/overlays/Menu'
import { usePopup } from '@/overlays/popupContext'
import { useOwner } from '@/store/owner'
import { IconButton, LargeTitle, Screen, SectionHeader, Tag } from '@/ui'

const SOURCE: Record<Draft['source'], string> = { rapid: 'Rapid capture', one: 'One item', list: 'From a list', copy: 'Duplicate' }

/** ADD: many items, one item, from a list, and the drafts waiting for details. */
export default function AddTab() {
  const popup = usePopup()
  const drafts = useOwner((s) => s.drafts)
  const removeDraft = useOwner((s) => s.removeDraft)
  const ready = drafts.filter((d) => draftMissing(d).length === 0).length

  const ways: { title: string; text: string; icon: Icon; to: string; tag?: string }[] = [
    { title: 'Many items', text: 'Rapid capture: snap each prop, add details later', icon: CameraIcon, to: '/renter/add/rapid' },
    { title: 'One item', text: 'Five photos, then AI reads them and fills the form', icon: SparkleIcon, to: '/renter/add/one', tag: 'AI' },
    { title: 'From a list', text: 'Import a spreadsheet of your stock (CSV)', icon: FileCsvIcon, to: '/renter/add/import' },
  ]

  return (
    <Screen header={<OwnerAppBar />}>
      <LargeTitle title="Add stock" subtitle="New listings are checked within 2 hours" className="@medium:mx-auto @medium:max-w-2xl" />
      <div className="grid grid-cols-1 gap-2.5 px-4 @medium:mx-auto @medium:max-w-2xl @medium:grid-cols-3">
        {ways.map((w, i) => (
          <motion.button
            key={w.title}
            type="button"
            onClick={() => nav.push(w.to)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.05 }}
            className={cn(
              'pressable flex items-center gap-3 rounded-2xl p-4 text-left shadow-card outline-none focus-visible:ring-4 focus-visible:ring-accent/25 @medium:flex-col @medium:items-start',
              i === 0 ? 'bg-accent text-accent-fg' : 'bg-surface',
            )}
          >
            <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', i === 0 ? 'bg-white/15' : 'bg-accent-soft text-accent')}>
              <w.icon size={26} weight="duotone" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[16px] font-bold">
                {w.title}
                {w.tag && <Tag tone="brand">{w.tag}</Tag>}
              </span>
              <span className={cn('block text-[13px] leading-snug', i === 0 ? 'opacity-85' : 'text-muted')}>{w.text}</span>
            </span>
            <CaretRightIcon size={16} weight="bold" className={cn('shrink-0 @medium:hidden', i === 0 ? 'opacity-80' : 'text-subtle')} />
          </motion.button>
        ))}
      </div>

      <div className="pb-10 @medium:mx-auto @medium:max-w-2xl">
        <SectionHeader
          title="Waiting for details"
          subtitle={drafts.length ? `${drafts.length} draft${drafts.length === 1 ? '' : 's'} · ${ready} ready to publish` : 'Captured props land here'}
          className="pt-7"
        />
        {drafts.length === 0 ? (
          <p className="mx-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-line-strong px-6 py-7 text-center text-sm text-muted">
            <ImagesIcon size={28} weight="duotone" className="mb-2 text-accent" />
            Snap your props with rapid capture, then finish the details here when you have time.
          </p>
        ) : (
          <div className="mx-4 overflow-hidden rounded-2xl bg-surface shadow-card">
            {drafts.map((d) => {
              const missing = draftMissing(d)
              return (
                <div key={d.id} className="group relative flex items-center gap-3 py-3 pl-3.5 pr-1.5">
                  <button type="button" onClick={() => nav.push(`/renter/add/draft/${d.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="relative shrink-0">
                      <ListingThumb listing={{ photos: d.photos, category: d.category ?? 'Decor', catalogId: null }} className="size-14 rounded-xl" iconSize={20} />
                      {d.photos.length > 0 && (
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-fg px-1.5 text-[10px] font-bold text-bg">{d.photos.length}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-[15px] font-semibold', d.name ? 'text-fg' : 'italic text-muted')}>{d.name || 'Untitled prop'}</span>
                      <span className="block truncate text-xs text-muted">
                        {SOURCE[d.source]} · {timeAgo(d.createdAt)}
                      </span>
                      <span className="mt-1 block">
                        {missing.length ? (
                          <Tag tone="warning">Needs {missing.slice(0, 3).join(', ')}{missing.length > 3 ? '…' : ''}</Tag>
                        ) : (
                          <Tag tone="success" dot>
                            Ready to publish
                          </Tag>
                        )}
                      </span>
                    </span>
                  </button>
                  <Menu
                    items={[
                      { label: 'Finish capture', icon: PencilSimpleIcon, onSelect: () => nav.push(`/renter/add/draft/${d.id}`) },
                      {
                        label: 'Discard',
                        icon: TrashIcon,
                        destructive: true,
                        onSelect: () => {
                          const undo = removeDraft(d.id)
                          popup.toast('Draft discarded', { action: { label: 'Undo', onClick: undo } })
                        },
                      },
                    ]}
                  >
                    <IconButton icon={DotsThreeVerticalIcon} weight="bold" size="sm" label={`Options for ${d.name || 'untitled draft'}`} />
                  </Menu>
                  <span aria-hidden className="absolute bottom-0 left-[84px] right-0 h-px bg-line group-last:hidden" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Screen>
  )
}
