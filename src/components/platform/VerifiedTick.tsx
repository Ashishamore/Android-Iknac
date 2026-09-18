import { SealCheckIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { useVendorVerified } from '@/store/platform'

/**
 * The verified tick on a vendor, wherever it appears: prop cards, the vendor
 * page, the map and the booking flow. It reads the admin panel's answer, so
 * granting or removing a tick there changes every one of them.
 */
export function VerifiedTick({ vendorId, size = 14, className }: { vendorId: string; size?: number; className?: string }) {
  const verified = useVendorVerified(vendorId)
  if (!verified) return null
  return <SealCheckIcon size={size} weight="fill" aria-label="Verified" className={cn('shrink-0 text-accent', className)} />
}
