import { CaretUpDownIcon, type Icon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './controls'
import { Card, EmptyState } from './display'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** Tailwind width class, e.g. 'w-40'. */
  width?: string
  align?: 'left' | 'right'
  /** Drops the column below this breakpoint, so the table never scrolls sideways. */
  hide?: 'sm' | 'md' | 'lg' | 'xl'
  sortable?: boolean
}

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' }

/**
 * The table every page ends in: a sticky head, quiet rules, and a whole row
 * that opens the record in the right-hand drawer.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRow,
  activeKey,
  sort,
  onSort,
  empty,
  className,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRow?: (row: T) => void
  activeKey?: string
  sort?: string
  onSort?: (key: string) => void
  empty: { icon: Icon; title: string; description?: string; action?: ReactNode }
  className?: string
}) {
  if (!rows.length)
    return (
      <Card className={className}>
        <EmptyState {...empty} />
      </Card>
    )

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="thin-scroll overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-2/60">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn('whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.07em] text-muted first:pl-4 last:pr-4', c.align === 'right' && 'text-right', c.width, c.hide && HIDE[c.hide])}
                >
                  {c.sortable && onSort ? (
                    <button type="button" onClick={() => onSort(c.key)} className={cn('inline-flex items-center gap-1 rounded transition-colors hover:text-fg', sort === c.key && 'text-fg')}>
                      {c.header}
                      <CaretUpDownIcon size={11} weight="bold" className={cn(sort === c.key ? 'opacity-100' : 'opacity-40')} />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = rowKey(row)
              const active = key === activeKey
              return (
                <tr
                  key={key}
                  onClick={onRow ? () => onRow(row) : undefined}
                  tabIndex={onRow ? 0 : undefined}
                  onKeyDown={onRow ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRow(row)) : undefined}
                  aria-current={active ? 'true' : undefined}
                  className={cn('border-b border-line/70 outline-none transition-colors last:border-0', onRow && 'cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2', active && 'bg-accent-soft/60 hover:bg-accent-soft/60')}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-3 py-2.5 align-middle text-[13px] text-fg-2 first:pl-4 last:pr-4', c.align === 'right' && 'text-right tabular-nums', c.hide && HIDE[c.hide])}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/** The row of controls above a table: search on the left, filters on the right. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-3 flex flex-wrap items-center gap-2', className)}>{children}</div>
}

/** "Show 40 more", with a count of what is left. */
export function ShowMore({ shown, total, step = 40, onMore }: { shown: number; total: number; step?: number; onMore: () => void }) {
  if (shown >= total)
    return total > step ? (
      <p className="py-4 text-center text-[13px] text-muted">
        All {total.toLocaleString('en-IN')} shown
      </p>
    ) : null
  return (
    <div className="flex flex-col items-center gap-1.5 py-4">
      <Button variant="secondary" onClick={onMore}>
        Show {Math.min(step, total - shown)} more
      </Button>
      <p className="text-xs text-muted">
        {shown.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}
      </p>
    </div>
  )
}

/** A cell that shows a name with a second, quieter line under it. */
export function TwoLine({ top, bottom, className }: { top: ReactNode; bottom: ReactNode; className?: string }) {
  return (
    <span className={cn('flex min-w-0 flex-col', className)}>
      <span className="truncate font-semibold text-fg">{top}</span>
      <span className="truncate text-xs text-muted">{bottom}</span>
    </span>
  )
}
