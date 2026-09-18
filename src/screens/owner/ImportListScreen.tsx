import { DownloadSimpleIcon, FileCsvIcon, TableIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useRef, useState, type ChangeEvent } from 'react'
import { SAMPLE_CSV } from '@/data/owner'
import { CATEGORIES, ERAS, type Category, type Era } from '@/data/props'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { draftMissing, type Draft } from '@/lib/owner'
import { nav } from '@/navigation'
import { usePopup } from '@/overlays/popupContext'
import { useOwner } from '@/store/owner'
import { AppBar, Button, Card, Screen, SectionHeader, Tag } from '@/ui'

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
    const dayRate = num(col(cells, 'day rate'))
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
      dayRate,
      deposit: null,
      description: '',
      aiFilled: [],
    })
  }
  return { rows, skipped }
}

/** From a list: import a spreadsheet of stock as drafts. */
export default function ImportListScreen() {
  const popup = usePopup()
  const addDrafts = useOwner((s) => s.addDrafts)
  const multiple = useOwner((s) => s.policies.depositMultiple)
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<{ name: string; rows: Row[]; skipped: number } | null>(null)

  const load = (name: string, text: string) => {
    const r = parse(text)
    if (!r.rows.length) return popup.toast('No rows found. Check the first line has the column names.', { tone: 'error' })
    setResult({ name, ...r })
    haptic('success')
  }

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) load(f.name, await f.text())
  }

  const template = () => {
    const url = URL.createObjectURL(new Blob([`${COLUMNS.join(',')}\n`], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'stock-template.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    popup.toast('Template downloaded', { tone: 'success' })
  }

  const add = () => {
    if (!result) return
    addDrafts(result.rows.map((r) => ({ ...r, deposit: r.dayRate ? r.dayRate * multiple : null })))
    haptic('success')
    nav.pop()
    popup.toast(`${result.rows.length} drafts added · add photos to publish them`, { tone: 'success' })
  }

  const ready = result?.rows.filter((r) => draftMissing({ ...r, photos: ['x'], id: '', createdAt: 0 }).length === 0).length ?? 0

  return (
    <Screen
      header={<AppBar title="From a list" subtitle="Spreadsheet (CSV)" />}
      footer={
        result ? (
          <div className="@medium:mx-auto @medium:max-w-md">
            <Button size="lg" block onClick={add}>
              Add {result.rows.length} drafts
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-3 px-4 pb-10 pt-1 @medium:mx-auto @medium:max-w-2xl">
        <Card className="p-4">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <TableIcon size={18} className="text-accent" /> One row per prop
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">Columns, in any order:</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {COLUMNS.map((c) => (
              <span key={c} className="rounded-lg bg-surface-2 px-2 py-0.5 font-mono text-xs text-fg-2">
                {c}
              </span>
            ))}
          </div>
          <Button size="sm" variant="ghost" icon={DownloadSimpleIcon} className="mt-2 -ml-2" onClick={template}>
            Download the template
          </Button>
        </Card>
        <div className="flex gap-2.5">
          <Button variant="secondary" icon={FileCsvIcon} className="flex-1" onClick={() => fileRef.current?.click()}>
            Choose a CSV file
          </Button>
          <Button variant="tonal" className="flex-1" onClick={() => load('sample-stock.csv', SAMPLE_CSV)}>
            Use the sample sheet
          </Button>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={pick} />

        {result && (
          <>
            <SectionHeader title={result.name} subtitle={`${result.rows.length} rows · ${ready} ready once photos are added${result.skipped ? ` · ${result.skipped} skipped (no name)` : ''}`} className="px-1 pt-4" />
            <Card className="overflow-hidden">
              {result.rows.map((r, i) => {
                const missing = draftMissing({ ...r, photos: ['x'], id: '', createdAt: 0 })
                return (
                  <div key={i} className="group relative px-4 py-3">
                    <p className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-fg">{r.name}</span>
                      {r.dayRate ? <span className="shrink-0 text-sm font-bold tabular-nums text-fg">{formatINR(r.dayRate)}/day</span> : null}
                    </p>
                    <p className="text-[13px] text-muted">
                      {[r.category ?? 'No category', r.era ?? 'no era', `${r.pieces} piece${r.pieces === 1 ? '' : 's'}`].join(' · ')}
                    </p>
                    <div className="mt-1.5">
                      {missing.length ? (
                        <Tag tone="warning">
                          <WarningCircleIcon size={11} weight="fill" /> Needs {missing.join(', ')}
                        </Tag>
                      ) : (
                        <Tag tone="success" dot>
                          Complete
                        </Tag>
                      )}
                    </div>
                    <span aria-hidden className="absolute bottom-0 left-4 right-0 h-px bg-line group-last:hidden" />
                  </div>
                )
              })}
            </Card>
          </>
        )}
      </div>
    </Screen>
  )
}
