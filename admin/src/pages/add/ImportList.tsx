import { DownloadSimpleIcon, FileCsvIcon, TableIcon, UploadSimpleIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useRef, useState, type DragEvent } from 'react'
import { SAMPLE_CSV } from '@/data/owner'
import { CATEGORIES, ERAS, type Category, type Era } from '@/data/props'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { draftMissing, type Draft } from '@/lib/owner'
import { useOwner } from '@/store/owner'
import { downloadText, plural } from '~/lib/data'
import { navigate } from '~/router'
import { Button } from '~/ui/controls'
import { Card, CardHeader, PageHeader, Tag } from '~/ui/display'
import { toast } from '~/ui/feedback'

const COLUMNS = ['name', 'category', 'era', 'day rate', 'pieces', 'width cm', 'depth cm', 'height cm', 'weight kg']
type Row = Omit<Draft, 'id' | 'createdAt'>

/** Parse a simple CSV (no embedded commas) into draft rows. */
function parse(text: string): { rows: Row[]; skipped: number } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return { rows: [], skipped: 0 }
  const head = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const col = (cells: string[], name: string) => cells[head.indexOf(name)]?.trim().replace(/^"|"$/g, '') ?? ''
  const num = (v: string) => (Number(v) > 0 ? Number(v) : null)
  const find = <T extends string>(list: readonly T[], v: string) => list.find((x) => x.toLowerCase() === v.toLowerCase()) ?? null
  let skipped = 0
  const rows: Row[] = []
  for (const line of lines.slice(1)) {
    const cells = line.split(',')
    const name = col(cells, 'name')
    if (!name) {
      skipped++
      continue
    }
    const w = num(col(cells, 'width cm'))
    const d = num(col(cells, 'depth cm'))
    const h = num(col(cells, 'height cm'))
    rows.push({
      source: 'list',
      photos: [],
      name,
      category: find(CATEGORIES.map((c) => c.id) as Category[], col(cells, 'category')),
      era: find(ERAS.map((e) => e.id) as Era[], col(cells, 'era')),
      material: null,
      size: w && d && h ? [w, d, h] : null,
      weight: num(col(cells, 'weight kg')),
      pieces: Math.max(1, Number(col(cells, 'pieces')) || 1),
      condition: 'Good',
      dayRate: num(col(cells, 'day rate')),
      deposit: null,
      description: '',
      aiFilled: [],
    })
  }
  return { rows, skipped }
}

/** From a list: import a spreadsheet of stock as drafts. */
export default function ImportList() {
  const addDrafts = useOwner((s) => s.addDrafts)
  const multiple = useOwner((s) => s.policies.depositMultiple)
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<{ name: string; rows: Row[]; skipped: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const load = (name: string, text: string) => {
    const r = parse(text)
    if (!r.rows.length) return toast('No rows found. Check the first line has the column names.', { tone: 'error' })
    setResult({ name, ...r })
  }

  const readFile = async (f: File | undefined) => {
    if (f) load(f.name, await f.text())
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void readFile(e.dataTransfer.files[0])
  }

  const add = () => {
    if (!result) return
    addDrafts(result.rows.map((r) => ({ ...r, deposit: r.dayRate ? r.dayRate * multiple : null })))
    navigate('/add', { replace: true })
    toast(`${plural(result.rows.length, 'draft')} added · add photos to publish them`, { tone: 'success' })
  }

  const missingOf = (r: Row) => draftMissing({ ...r, photos: ['x'], id: '', createdAt: 0 })
  const ready = result?.rows.filter((r) => missingOf(r).length === 0).length ?? 0

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Add stock', to: '/add' }, { label: 'From a list' }]}
        title="From a list"
        subtitle="Import a spreadsheet (CSV) of your stock. Each row becomes a draft in “Waiting for details”."
        actions={
          result ? (
            <>
              <Button variant="secondary" onClick={() => setResult(null)}>
                Choose another file
              </Button>
              <Button onClick={add}>Add {plural(result.rows.length, 'draft')}</Button>
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-fg">
            <TableIcon size={18} className="text-accent" /> One row per prop
          </p>
          <p className="mt-1 text-[13px] text-muted">Columns, in any order:</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {COLUMNS.map((c) => (
              <span key={c} className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-fg-2">
                {c}
              </span>
            ))}
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={DownloadSimpleIcon}
            className="mt-4"
            onClick={() => {
              downloadText('stock-template.csv', `${COLUMNS.join(',')}\n`)
              toast('Template downloaded', { tone: 'success' })
            }}
          >
            Download the template
          </Button>
        </Card>

        {!result ? (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn('grid min-h-72 place-items-center rounded-xl border-2 border-dashed p-8 text-center transition-colors', dragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface')}
          >
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
                <FileCsvIcon size={30} weight="duotone" />
              </span>
              <p className="mt-4 text-[15px] font-semibold text-fg">Drop a CSV file here</p>
              <p className="mt-1 text-[13px] text-muted">or choose one from your computer</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button icon={UploadSimpleIcon} onClick={() => fileRef.current?.click()}>
                  Choose a CSV file
                </Button>
                <Button variant="secondary" onClick={() => load('sample-stock.csv', SAMPLE_CSV)}>
                  Use the sample sheet
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader title={result.name} subtitle={`${plural(result.rows.length, 'row')} · ${ready} ready once photos are added${result.skipped ? ` · ${result.skipped} skipped (no name)` : ''}`} icon={FileCsvIcon} />
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                    <th className="py-2.5 pl-4 pr-3">Name</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5">Era</th>
                    <th className="px-3 py-2.5 text-right">Pieces</th>
                    <th className="px-3 py-2.5 text-right">Day rate</th>
                    <th className="py-2.5 pl-3 pr-4">Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.rows.map((r, i) => {
                    const missing = missingOf(r)
                    return (
                      <tr key={i}>
                        <td className="py-2.5 pl-4 pr-3 font-semibold text-fg">{r.name}</td>
                        <td className={cn('px-3 py-2.5', r.category ? 'text-fg-2' : 'text-subtle')}>{r.category ?? '—'}</td>
                        <td className={cn('px-3 py-2.5', r.era ? 'text-fg-2' : 'text-subtle')}>{r.era ?? '—'}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-fg-2">{r.pieces}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-fg">{r.dayRate ? formatINR(r.dayRate) : <span className="text-subtle">—</span>}</td>
                        <td className="py-2.5 pl-3 pr-4">
                          {missing.length ? (
                            <Tag tone="warning">
                              <WarningCircleIcon size={11} weight="fill" /> Needs {missing.join(', ')}
                            </Tag>
                          ) : (
                            <Tag tone="success" dot>
                              Complete
                            </Tag>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
              <Button onClick={add}>Add {plural(result.rows.length, 'draft')}</Button>
            </div>
          </Card>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          void readFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </>
  )
}
