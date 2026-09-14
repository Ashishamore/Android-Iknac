import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends Omit<ComponentProps<'div'>, 'onClick'> {
  onClick?: () => void
}

/** Elevated surface. Becomes a tappable button when `onClick` is given. */
export function Card({ className, onClick, children, ...rest }: CardProps) {
  const interactive = !!onClick
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={cn(
        'rounded-2xl bg-surface shadow-card',
        interactive && 'pressable cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-accent/25',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
