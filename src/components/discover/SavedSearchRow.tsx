import { BellIcon, BellSlashIcon, BookmarkSimpleIcon, DotsThreeVerticalIcon, PlayIcon, TrashIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { haptic } from '@/lib/haptics'
import { describeFilters, parseFilters } from '@/lib/search'
import { nav } from '@/navigation'
import { Menu } from '@/overlays/Menu'
import { usePopup } from '@/overlays/popupContext'
import { useDiscover, type SavedSearch } from '@/store/discover'
import { Badge, IconButton, IconTile } from '@/ui'

/** A saved search: tap to run; bell for alerts; menu for run, alerts and delete. */
export function SavedSearchRow({ search }: { search: SavedSearch }) {
  const popup = usePopup()
  const setAlerts = useDiscover((s) => s.setAlerts)
  const markSeen = useDiscover((s) => s.markSeen)
  const deleteSearch = useDiscover((s) => s.deleteSearch)
  const summary = useMemo(() => describeFilters(parseFilters(new URLSearchParams(search.query))), [search.query])

  const run = () => {
    markSeen(search.id)
    nav.push(`/customer/discover/results?${search.query}`)
  }
  const toggleAlerts = () => {
    haptic()
    setAlerts(search.id, !search.alerts)
    popup.toast(search.alerts ? `Alerts off for “${search.name}”` : `We’ll alert you about new “${search.name}”`, {
      tone: search.alerts ? 'default' : 'success',
    })
  }
  const remove = () => {
    const undo = deleteSearch(search.id)
    popup.toast('Saved search deleted', { action: { label: 'Undo', onClick: undo } })
  }

  return (
    <div className="group relative flex items-center gap-1 pr-1.5">
      <button
        type="button"
        onClick={run}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left transition-colors active:bg-surface-2"
      >
        <IconTile icon={BookmarkSimpleIcon} tone="brand" size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-medium text-fg">{search.name}</span>
            {search.alerts && search.newCount > 0 && <Badge tone="brand">{search.newCount} new</Badge>}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-muted">{summary}</span>
        </span>
      </button>
      <IconButton
        icon={search.alerts ? BellIcon : BellSlashIcon}
        weight={search.alerts ? 'fill' : 'regular'}
        label={search.alerts ? 'Turn alerts off' : 'Turn alerts on'}
        aria-pressed={search.alerts}
        size="sm"
        className={search.alerts ? 'text-accent' : 'text-subtle'}
        onClick={toggleAlerts}
      />
      <Menu
        items={[
          { label: 'Run search', icon: PlayIcon, onSelect: run },
          { label: search.alerts ? 'Turn alerts off' : 'Turn alerts on', icon: search.alerts ? BellSlashIcon : BellIcon, onSelect: toggleAlerts },
          { label: 'Delete', icon: TrashIcon, destructive: true, onSelect: remove },
        ]}
      >
        <IconButton icon={DotsThreeVerticalIcon} weight="bold" label={`More options for ${search.name}`} size="sm" />
      </Menu>
      <span aria-hidden className="absolute bottom-0 left-[66px] right-0 h-px bg-line group-last:hidden" />
    </div>
  )
}
