import { CheckIcon, FileTextIcon, SealCheckIcon, XCircleIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { useNow } from '@/lib/hooks'
import { CHECKS, REJECT_REASONS, type VerifyDoc } from '@/lib/platform'
import { usePlatform } from '@/store/platform'
import { Button, Chip, Segmented, TextArea } from '~/ui/controls'
import { Avatar, Card, CardHeader, EmptyState, KV, PageHeader, Tag } from '~/ui/display'
import { toast } from '~/ui/feedback'
import { Drawer } from '~/ui/overlays'
import { TwoLine } from '~/ui/table'
import { AREA } from '../nav'

const kindLabel = (k: VerifyDoc['kind']) => CHECKS.find((c) => c.id === k)?.label ?? k

/** VERIFICATION: one document at a time, approved or rejected with a reason. */
export default function Verification() {
  const docs = usePlatform((s) => s.docs)
  const accounts = usePlatform((s) => s.accounts)
  const admins = usePlatform((s) => s.admins)
  const decideDoc = usePlatform((s) => s.decideDoc)
  const now = useNow(60_000).getTime()
  const [tab, setTab] = useState<'waiting' | 'decided'>('waiting')
  const [picked, setPicked] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)

  const waiting = docs.filter((d) => !d.decision).sort((a, b) => a.submitted - b.submitted)
  const decided = docs.filter((d) => d.decision).sort((a, b) => (b.decision?.at ?? 0) - (a.decision?.at ?? 0))
  const list = tab === 'waiting' ? waiting : decided
  const current = list.find((d) => d.id === picked) ?? list[0]
  const account = accounts.find((a) => a.id === current?.accountId)

  const approve = () => {
    if (!current || !account) return
    decideDoc(current.id, true)
    setPicked(null)
    toast(`${kindLabel(current.kind)} approved · ${account.business} shows the tick`, { tone: 'success' })
  }

  const reject = (reason: string) => {
    if (!current || !account) return
    decideDoc(current.id, false, reason)
    setRejecting(false)
    setPicked(null)
    toast(`${account.business} told why it was rejected`, { tone: 'success' })
  }

  return (
    <>
      <PageHeader
        title="Verification"
        subtitle={AREA.verification.intent}
        actions={
          <Segmented
            value={tab}
            onChange={(v) => {
              setTab(v)
              setPicked(null)
            }}
            options={[
              { value: 'waiting', label: 'Waiting', count: waiting.length },
              { value: 'decided', label: 'Decided', count: decided.length },
            ]}
          />
        }
      />

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={SealCheckIcon} title={tab === 'waiting' ? 'Nothing waiting' : 'Nothing decided yet'} description={tab === 'waiting' ? 'Every document sent in has been looked at.' : 'Approvals and rejections show up here.'} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <Card className="h-fit overflow-hidden">
            <CardHeader title={tab === 'waiting' ? 'In the queue' : 'Decided'} subtitle={`${list.length} document${list.length === 1 ? '' : 's'}`} icon={FileTextIcon} />
            <div className="thin-scroll max-h-[540px] overflow-y-auto">
              {list.map((d) => {
                const owner = accounts.find((a) => a.id === d.accountId)
                const on = d.id === current?.id
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setPicked(d.id)}
                    className={cn('flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left transition-colors last:border-0', on ? 'bg-accent-soft/60' : 'hover:bg-surface-2')}
                  >
                    <Avatar name={owner?.business ?? '?'} size="sm" />
                    <TwoLine top={owner?.business ?? 'Unknown'} bottom={`${kindLabel(d.kind)} · ${timeAgo(d.submitted, now)}`} className="flex-1" />
                    {d.decision && <Tag tone={d.decision.ok ? 'success' : 'danger'}>{d.decision.ok ? 'Approved' : 'Rejected'}</Tag>}
                  </button>
                )
              })}
            </div>
          </Card>

          {current && account && (
            <Card className="flex flex-col">
              <CardHeader
                title={`${kindLabel(current.kind)} · ${account.business}`}
                subtitle={`Sent ${timeAgo(current.submitted, now)} · ${account.side === 'provider' ? 'Providing' : 'Renting'} · ${account.city}`}
                icon={FileTextIcon}
                actions={current.decision ? <Tag tone={current.decision.ok ? 'success' : 'danger'}>{current.decision.ok ? 'Approved' : 'Rejected'}</Tag> : undefined}
              />
              <div className="p-4">
                <div className="grid place-items-center rounded-xl border border-dashed border-line-strong bg-surface-2 px-6 py-12 text-center">
                  <FileTextIcon size={34} weight="light" className="text-subtle" />
                  <p className="mt-2 text-[13px] font-semibold text-fg">{current.file}</p>
                  <p className="mt-1 max-w-sm text-xs text-muted">The uploaded file would open here. Nothing leaves the browser in this prototype.</p>
                </div>

                <dl className="mt-4 divide-y divide-line">
                  <KV label="Account" value={account.business} strong />
                  <KV label="Side" value={account.side === 'provider' ? 'Providing' : 'Renting'} />
                  <KV label="Kind" value={`${kindLabel(current.kind)} · ${current.file}`} />
                  <KV label="Submitted" value={timeAgo(current.submitted, now)} />
                  <KV
                    label="Already checked"
                    value={
                      CHECKS.filter((c) => account.checks[c.id])
                        .map((c) => c.label)
                        .join(', ') || 'Nothing yet'
                    }
                  />
                  {current.decision && (
                    <KV
                      label={current.decision.ok ? 'Approved by' : 'Rejected by'}
                      value={`${admins.find((a) => a.id === current.decision?.by)?.name ?? 'An admin'} · ${timeAgo(current.decision.at, now)}`}
                      note={current.decision.reason}
                    />
                  )}
                </dl>
              </div>
              {!current.decision && (
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/50 px-4 py-3">
                  <Button icon={CheckIcon} onClick={approve}>
                    Approve
                  </Button>
                  <Button variant="danger-ghost" icon={XCircleIcon} onClick={() => setRejecting(true)}>
                    Reject
                  </Button>
                  <p className="ml-auto text-xs text-muted">Approving grants the tick and names what was checked.</p>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      <RejectDrawer key={`reject-${current?.id ?? 'none'}`} open={rejecting} name={account?.business ?? ''} kind={current ? kindLabel(current.kind) : ''} onClose={() => setRejecting(false)} onReject={reject} />
    </>
  )
}

function RejectDrawer({ open, name, kind, onClose, onReject }: { open: boolean; name: string; kind: string; onClose: () => void; onReject: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const full = reason === 'Something else' ? note.trim() : reason ? `${reason}${note.trim() ? ` · ${note.trim()}` : ''}` : ''

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Reject this document"
      subtitle={`${kind} · ${name}`}
      footer={
        <>
          <Button variant="danger" disabled={!full} onClick={() => onReject(full)}>
            Reject and tell them
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <p className="text-[13px] text-fg-2">They are told why, so they can send the right file. A reason is required.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[...REJECT_REASONS, 'Something else'].map((r) => (
          <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
            {r}
          </Chip>
        ))}
      </div>
      <TextArea className="mt-4" label="Anything to add" optional={reason !== 'Something else'} rows={4} value={note} onChange={(e) => setNote(e.currentTarget.value)} placeholder="What they should send instead" />
      {full && (
        <Card className="mt-4 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-muted">What they will read</p>
          <p className="mt-1 text-[13px] leading-relaxed text-fg-2">Your {kind.toLowerCase()} could not be accepted: {full}. Send it again from Profile → Verification.</p>
        </Card>
      )}
    </Drawer>
  )
}
