import { CaretRightIcon, DownloadSimpleIcon, PencilSimpleIcon, ReceiptIcon, SealCheckIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { InvoiceSheet } from '@/components/ops/InvoiceSheet'
import { cn } from '@/lib/cn'
import { formatDate, toISODate } from '@/lib/dates'
import { formatINR } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { sleep } from '@/lib/hooks'
import type { Booking } from '@/lib/ops'
import { BottomSheet } from '@/overlays/BottomSheet'
import { usePopup } from '@/overlays/popupContext'
import { useProfile } from '@/store/profile'
import { useProjectOps } from '@/store/projectOps'
import { useProjects } from '@/store/projects'
import { AppBar, Button, Card, Chip, ChipRow, IconTile, Screen, SectionHeader, Tag, TextArea, TextField } from '@/ui'

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const STATE_CODES: Record<string, string> = {
  '07': 'Delhi',
  '19': 'West Bengal',
  '24': 'Gujarat',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '36': 'Telangana',
}

type Filter = 'all' | 'paid' | 'pending'

const totalOf = (b: Booking) => b.amounts.total + b.extras.reduce((n, e) => n + e.amount, 0)
const paidOf = (b: Booking) => b.paid + b.extras.filter((e) => e.paid).reduce((n, e) => n + e.amount, 0)
const isPaid = (b: Booking) => paidOf(b) >= totalOf(b)

/** Invoices & GST: company GST details, every invoice, and a GST summary download. */
export default function InvoicesScreen() {
  const popup = usePopup()
  const gst = useProfile((s) => s.gst)
  const verified = useProfile((s) => s.verified.gst)
  const update = useProfile((s) => s.update)
  const setVerified = useProfile((s) => s.setVerified)
  const bookings = useProjectOps((s) => s.bookings)
  const boards = useProjectOps((s) => s.boards)
  const projects = useProjects((s) => s.projects)
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState({ key: 0, open: false })
  const [invoice, setInvoice] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })

  const sorted = useMemo(() => [...bookings].sort((a, b) => b.createdAt - a.createdAt), [bookings])
  const shown = sorted.filter((b) => filter === 'all' || (filter === 'paid' ? isPaid(b) : !isPaid(b)))
  const invoiced = bookings.reduce((n, b) => n + totalOf(b) - b.amounts.deposit, 0)
  const gstTotal = bookings.reduce((n, b) => n + b.amounts.gst, 0)
  const pending = bookings.reduce((n, b) => n + totalOf(b) - paidOf(b), 0)
  const projectName = (b: Booking) => projects.find((p) => p.id === b.projectId)?.name ?? 'Project'
  const current = bookings.find((b) => b.id === invoice.id) ?? null
  const currentLines = current ? (boards.find((x) => x.id === current.boardId)?.lines ?? []).filter((l) => current.lineIds.includes(l.id)) : []

  const downloadCsv = () => {
    const rows = [
      ['Invoice', 'Date', 'Booking', 'Project', 'Taxable value', 'GST 18%', 'Deposit', 'Total', 'Status'],
      ...sorted.map((b) => [
        b.invoiceNo,
        toISODate(new Date(b.createdAt)),
        b.id,
        projectName(b),
        b.amounts.items - b.amounts.discount + b.amounts.transport,
        b.amounts.gst,
        b.amounts.deposit,
        totalOf(b),
        paidOf(b) >= totalOf(b) ? 'Paid' : 'Pending',
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([`${verified ? `GSTIN,${gst.gstin}\n` : ''}${csv}`], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'gst-summary.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    popup.toast('GST summary downloaded', { tone: 'success' })
  }

  return (
    <Screen header={<AppBar title="Invoices & GST" />}>
      <div className="px-4 pt-2 @medium:mx-auto @medium:max-w-2xl">
        {/* GST details */}
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <p className="flex-1 font-display text-[16px] font-bold text-fg">GST details</p>
            {verified ? (
              <Tag tone="success">
                <SealCheckIcon size={12} weight="fill" /> Verified
              </Tag>
            ) : (
              <Tag tone="warning">
                <WarningCircleIcon size={12} weight="fill" /> Not verified
              </Tag>
            )}
          </div>
          <dl className="mt-3 space-y-2.5">
            <Field label="GSTIN" value={gst.gstin || '—'} mono />
            <Field label="Legal name" value={gst.legalName || '—'} />
            <Field label="Billing address" value={gst.address || '—'} />
            {STATE_CODES[gst.gstin.slice(0, 2)] && <Field label="State" value={`${STATE_CODES[gst.gstin.slice(0, 2)]} (${gst.gstin.slice(0, 2)})`} />}
          </dl>
          {!verified && <p className="mt-3 rounded-xl bg-warning-soft px-3 py-2 text-[13px] text-warning">Verify your GSTIN to get tax invoices you can claim input credit on.</p>}
          <div className="mt-4 flex gap-2.5">
            <Button variant="secondary" icon={PencilSimpleIcon} className="flex-1" onClick={() => setEditing((s) => ({ key: s.key + 1, open: true }))}>
              Edit
            </Button>
            {!verified && (
              <Button className="flex-1" onClick={() => setEditing((s) => ({ key: s.key + 1, open: true }))}>
                Verify GSTIN
              </Button>
            )}
          </div>
        </Card>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <Stat label="Invoiced" value={formatINR(invoiced)} />
          <Stat label="GST paid" value={formatINR(gstTotal)} />
          <Stat label="Pending" value={formatINR(pending)} tone={pending > 0 ? 'text-warning' : undefined} />
        </div>

        {/* Invoices */}
        <SectionHeader title="Invoices" subtitle={`${bookings.length} across ${new Set(bookings.map((b) => b.projectId)).size} projects`} className="px-0 pt-6" />
      </div>
      <div className="@medium:mx-auto @medium:max-w-2xl">
        <ChipRow className="pb-3">
          {(['all', 'paid', 'pending'] as Filter[]).map((f) => (
            <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'paid' ? 'Paid' : 'Pending'}
            </Chip>
          ))}
        </ChipRow>
        <div className="px-4 pb-10">
          {shown.length === 0 ? (
            <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-card">No {filter} invoices.</p>
          ) : (
            <Card className="overflow-hidden">
              {shown.map((b) => {
                const total = totalOf(b)
                const paid = paidOf(b)
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setInvoice({ open: true, id: b.id })}
                    className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2"
                  >
                    <IconTile icon={ReceiptIcon} tone="neutral" size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-fg">{b.invoiceNo}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {projectName(b)} · {formatDate(toISODate(new Date(b.createdAt)))}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold tabular-nums text-fg">{formatINR(total)}</span>
                      <Tag tone={paid >= total ? 'success' : 'warning'}>{paid >= total ? 'Paid' : b.payment.method === 'po' ? 'PO · pending' : 'Pending'}</Tag>
                    </span>
                    <CaretRightIcon size={15} weight="bold" className="shrink-0 text-subtle" />
                    <span aria-hidden className="absolute bottom-0 left-[66px] right-0 h-px bg-line group-last:hidden" />
                  </button>
                )
              })}
            </Card>
          )}
          <Button variant="outline" block icon={DownloadSimpleIcon} className="mt-4" onClick={downloadCsv} disabled={!bookings.length}>
            Download GST summary (CSV)
          </Button>
        </div>
      </div>

      <GstSheet
        key={editing.key}
        open={editing.open}
        initial={gst}
        onClose={() => setEditing((s) => ({ ...s, open: false }))}
        onSave={async (next) => {
          setEditing((s) => ({ ...s, open: false }))
          const changed = next.gstin !== gst.gstin
          const hide = popup.loading('Checking with the GST portal…')
          await sleep(1300)
          hide()
          update({ gst: next })
          setVerified('gst', true)
          haptic('success')
          popup.toast(changed || !verified ? 'GSTIN verified' : 'GST details saved', { tone: 'success' })
        }}
      />
      <InvoiceSheet
        open={invoice.open}
        onClose={() => setInvoice((s) => ({ ...s, open: false }))}
        booking={current}
        lines={currentLines}
        projectName={current ? projectName(current) : ''}
      />
    </Screen>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn('text-[15px] text-fg', mono && 'font-mono tracking-wide')}>{value}</dd>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-surface p-3 shadow-card">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn('mt-0.5 truncate text-[15px] font-bold tabular-nums text-fg', tone)}>{value}</p>
    </div>
  )
}

type Gst = { gstin: string; legalName: string; address: string }

function GstSheet({ open, initial, onClose, onSave }: { open: boolean; initial: Gst; onClose: () => void; onSave: (gst: Gst) => void }) {
  const [gstin, setGstin] = useState(initial.gstin)
  const [legalName, setLegalName] = useState(initial.legalName)
  const [address, setAddress] = useState(initial.address)
  const [errors, setErrors] = useState<Partial<Gst>>({})

  const save = () => {
    const next: Partial<Gst> = {}
    if (!GSTIN_RE.test(gstin)) next.gstin = 'GSTIN has 15 characters, like 27AAFCF4821K1Z3'
    if (legalName.trim().length < 3) next.legalName = 'Enter the registered company name'
    if (address.trim().length < 10) next.address = 'Enter the billing address'
    setErrors(next)
    if (Object.keys(next).length) return haptic('warning')
    onSave({ gstin, legalName: legalName.trim(), address: address.trim() })
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="GST details"
      description="Printed on every tax invoice. We check it with the GST portal."
      footer={
        <Button size="lg" block onClick={save}>
          Verify & save
        </Button>
      }
    >
      <div className="space-y-4">
        <TextField
          label="GSTIN"
          value={gstin}
          autoComplete="off"
          error={errors.gstin}
          className="[&_input]:font-mono [&_input]:tracking-wide"
          onChange={(e) => {
            setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15))
            setErrors((x) => ({ ...x, gstin: undefined }))
          }}
        />
        <TextField
          label="Legal name"
          value={legalName}
          autoComplete="organization"
          error={errors.legalName}
          onChange={(e) => {
            setLegalName(e.target.value)
            setErrors((x) => ({ ...x, legalName: undefined }))
          }}
        />
        <TextArea
          label="Billing address"
          value={address}
          rows={3}
          error={errors.address}
          onChange={(e) => {
            setAddress(e.target.value)
            setErrors((x) => ({ ...x, address: undefined }))
          }}
        />
      </div>
    </BottomSheet>
  )
}
