import { useIsPresent } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Full-size popup layer that stops catching taps as soon as it starts animating out. */
export function PresenceLayer({
  children,
  className,
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  const present = useIsPresent()
  return (
    <div
      className={cn('absolute inset-0', present ? 'pointer-events-auto' : 'pointer-events-none', className)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
