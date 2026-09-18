import { BookmarkSimpleIcon, HeartIcon, MapPinIcon, SealCheckIcon, StarIcon, StorefrontIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { SavedSearchRow } from '@/components/discover/SavedSearchRow'
import { PropCard, PropMeta } from '@/components/PropCard'
import { propById, propCountByVendor, vendorById, type Vendor } from '@/data/props'
import { formatDistance } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { nav, useQuery } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useDiscover } from '@/store/discover'
import { usePrefs } from '@/store/prefs'
import { useSaved } from '@/store/saved'
import { AppBar, Avatar, Button, EmptyState, IconButton, Screen, Tabs } from '@/ui'

type Tab = 'props' | 'vendors' | 'searches'
const TABS: Tab[] = ['props', 'vendors', 'searches']

/** Saved items → Props · Vendors · Searches */
export default function SavedItemsScreen() {
  const query = useQuery()
  const [tab, setTab] = useState<Tab>(() => (TABS as string[]).includes(query.get('tab') ?? '') ? (query.get('tab') as Tab) : 'props')
  const saved = useSaved((s) => s.saved)
  const vendors = useSaved((s) => s.vendors)
  const searches = useDiscover((s) => s.saved)
  const props = Object.keys(saved).map(propById).filter(Boolean)
  const vendorList = Object.keys(vendors).map(vendorById).filter(Boolean)

  return (
    <Screen
      resetScrollOn={tab}
      header={
        <AppBar title="Saved items">
          <Tabs
            tabs={[
              { value: 'props', label: 'Props', count: props.length },
              { value: 'vendors', label: 'Vendors', count: vendorList.length },
              { value: 'searches', label: 'Searches', count: searches.length },
            ]}
            value={tab}
            onChange={setTab}
          />
        </AppBar>
      }
    >
      {tab === 'props' &&
        (props.length ? (
          <div className="grid grid-cols-2 gap-3 p-4 @medium:grid-cols-3 @expanded:grid-cols-4">
            {props.map((p) => (
              <PropCard key={p.id} item={p} meta={<PropMeta item={p} />} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={HeartIcon}
            title="No saved props"
            description="Tap the heart on any prop to keep it here for later."
            action={<Button onClick={() => nav.switchTab('discover')}>Browse props</Button>}
          />
        ))}

      {tab === 'vendors' &&
        (vendorList.length ? (
          <div className="grid grid-cols-1 gap-2.5 p-4 @medium:grid-cols-2">
            {vendorList.map((v) => (
              <VendorRow key={v.id} vendor={v} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={StorefrontIcon}
            title="No saved vendors"
            description="Save a vendor from a prop listing to find their catalogue quickly."
            action={<Button onClick={() => nav.switchTab('discover')}>Find vendors</Button>}
          />
        ))}

      {tab === 'searches' &&
        (searches.length ? (
          <div className="p-4 @medium:mx-auto @medium:max-w-2xl">
            <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
              {searches.map((s) => (
                <SavedSearchRow key={s.id} search={s} />
              ))}
            </div>
            <p className="mt-3 px-1 text-xs text-muted">Turn on the bell to hear when new props match a search.</p>
          </div>
        ) : (
          <EmptyState
            icon={BookmarkSimpleIcon}
            title="No saved searches"
            description="Save a search from the results screen to run it again in one tap."
            action={<Button onClick={() => nav.push('/customer/discover/search')}>Search props</Button>}
          />
        ))}
    </Screen>
  )
}

function VendorRow({ vendor }: { vendor: Vendor }) {
  const popup = usePopup()
  usePrefs((s) => s.distanceUnit) // re-render when units change
  const toggleVendor = useSaved((s) => s.toggleVendor)
  const count = propCountByVendor(vendor.id)

  const remove = () => {
    haptic()
    toggleVendor(vendor.id)
    popup.toast(`${vendor.name} removed from saved`, { action: { label: 'Undo', onClick: () => useSaved.getState().toggleVendor(vendor.id) } })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => nav.push(`/customer/vendors/${vendor.id}`)}
        className="pressable flex w-full items-center gap-3 rounded-2xl bg-surface p-3.5 pr-14 text-left shadow-card outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
      >
        <Avatar name={vendor.name} size="md" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-[15px] font-semibold text-fg">
            <span className="truncate">{vendor.name}</span>
            {vendor.verified && <SealCheckIcon size={15} weight="fill" aria-label="Verified" className="shrink-0 text-accent" />}
          </span>
          <span className="block truncate text-xs text-muted">
            {vendor.area}, {vendor.city}
          </span>
          <span className="mt-1.5 flex items-center gap-3 text-xs font-medium text-fg-2">
            <span className="inline-flex items-center gap-1">
              <MapPinIcon size={12} weight="fill" className="text-subtle" />
              {formatDistance(vendor.distanceKm)}
            </span>
            <span className="inline-flex items-center gap-1">
              <StarIcon size={12} weight="fill" className="text-amber-500" />
              {vendor.rating.toFixed(1)}
            </span>
            <span>
              {count} prop{count === 1 ? '' : 's'}
            </span>
          </span>
        </span>
      </button>
      <IconButton
        icon={HeartIcon}
        weight="fill"
        label={`Remove ${vendor.name} from saved`}
        onClick={remove}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-danger"
      />
    </div>
  )
}
