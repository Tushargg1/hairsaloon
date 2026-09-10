import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import AdminNav from './AdminNav.jsx'
import PageLoader from '../shared/components/PageLoader.jsx'
import {
  errorMessage, getAdminLeads, getAdminReferrals, getAdminReferrers, markReferralPaid, referralKeys,
  adminSetLeadStatus, rejectReferral, setReferrerApproval, setReferrerHold, setReferrerSiteLimit,
  verifyReferral,
} from './referral-api.js'

function money(v) { return `₹${Number(v || 0).toFixed(2)}` }

const STATUS_STYLE = {
  VERIFYING: 'text-amber-400',
  PENDING: 'text-sky-400',
  PAID: 'text-emerald-400',
  REJECTED: 'text-error',
}

function ReferralCard({ r, amounts, setAmounts, verify, reject, paid }) {
  return (
    <div className="rounded-lg border border-outline-variant/20 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-display text-on-surface">{r.salonName}</p>
          <p className="font-body text-label-sm text-on-surface-variant">
            {r.salonPhone}{r.contactName ? ` · ${r.contactName}` : ''}
          </p>
          {r.salonAddress && <p className="font-body text-label-sm text-on-surface-variant">{r.salonAddress}</p>}
          {r.mapsUrl && <a href={r.mapsUrl} target="_blank" rel="noreferrer"
            className="font-body text-label-sm text-secondary underline break-all">Map link</a>}
        </div>
        <div className="text-right">
          <p className={`font-body text-label-md ${STATUS_STYLE[r.status] || ''}`}>{r.status}</p>
          {(r.status === 'PAID' || r.status === 'PENDING') && <p className="font-body text-on-surface">{money(r.amount)}</p>}
          {r.status === 'REJECTED' && r.rejectReason && <p className="font-body text-label-sm text-error">{r.rejectReason}</p>}
        </div>
      </div>
      {r.status === 'VERIFYING' && (
        <div className="flex items-center gap-2 flex-wrap">
          <input type="number" min="0" step="0.01" placeholder="Amount"
            value={amounts[r.id] ?? ''} onChange={(e) => setAmounts((a) => ({ ...a, [r.id]: e.target.value }))}
            className="w-28 rounded border border-outline-variant/40 bg-transparent px-3 py-1.5 font-body" />
          <button className="button" disabled={verify.isPending || !amounts[r.id]}
            onClick={() => verify.mutate({ id: r.id, amount: Number(amounts[r.id]) })}>Verify</button>
          <button className="button button-secondary" disabled={reject.isPending}
            onClick={() => reject.mutate({ id: r.id, reason: 'Salon already referred or not eligible' })}>Reject</button>
        </div>
      )}
      {r.status === 'PENDING' && (
        <button className="button self-start" disabled={paid.isPending} onClick={() => paid.mutate(r.id)}>Mark paid</button>
      )}
    </div>
  )
}

const LEAD_STATUS_OPTIONS = [
  { key: 'NEW', label: 'New' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'INTERESTED', label: 'Interested' },
  { key: 'NOT_INTERESTED', label: 'Not interested' },
  { key: 'ONBOARDED', label: 'Onboarded' },
  { key: 'NOT_ON_WHATSAPP', label: 'Not on WhatsApp' },
  { key: 'NOT_PICKING_CALL', label: 'Not picking call' },
]
const LEAD_TABS = [
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'INTERESTED', label: 'Interested' },
  { key: 'NOT_INTERESTED', label: 'Not interested' },
  { key: 'ONBOARDED', label: 'Onboarded' },
  { key: 'NOT_ON_WHATSAPP', label: 'Not on WhatsApp' },
  { key: 'NOT_PICKING_CALL', label: 'Not picking call' },
]

// Collapsible per-referrer lead list with a status sub-navbar. Hidden by default.
function ReferrerLeads({ leads, onStatus }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('CONTACTED')
  const shown = leads.filter((l) => (l.contactStatus || 'NEW') === status)
  return (
    <div className="border-t border-outline-variant/20 pt-3">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 font-body text-label-sm uppercase tracking-wider text-on-surface-variant">
        <span className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        Referred salons ({leads.length})
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex gap-1 overflow-x-auto border-b border-outline-variant/20">
            {LEAD_TABS.map((t) => {
              const n = leads.filter((l) => (l.contactStatus || 'NEW') === t.key).length
              return (
                <button key={t.key} type="button" onClick={() => setStatus(t.key)}
                  className={`font-body text-label-sm px-3 py-1.5 whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    status === t.key ? 'border-secondary text-secondary'
                      : 'border-transparent text-on-surface-variant hover:text-secondary-fixed'}`}>
                  {t.label}{n ? ` (${n})` : ''}
                </button>
              )
            })}
          </div>
          {shown.length === 0 ? (
            <p className="font-body text-label-sm text-on-surface-variant">None.</p>
          ) : shown.map((l, i) => (
            <div key={i} className="rounded-lg border border-outline-variant/20 p-3">
              <p className="font-body text-on-surface font-medium">{l.salonName || 'Unknown salon'}</p>
              <p className="font-body text-label-sm text-on-surface-variant">
                {l.salonPhone && l.salonPhone !== 'N/A' ? l.salonPhone : 'No phone'}
                {l.salonAddress ? ` · ${l.salonAddress}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                {l.mapsUrl && <a href={l.mapsUrl} target="_blank" rel="noreferrer" className="text-secondary underline text-label-sm">Map</a>}
                {l.siteUrl && <a href={l.siteUrl} target="_blank" rel="noreferrer"
                  className={`text-label-sm underline ${l.trialSite ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {l.trialSite ? 'Trial site' : 'Live site'}</a>}
                <select value={l.contactStatus || 'NEW'}
                  onChange={(e) => onStatus(l.leadId, e.target.value)}
                  className="font-body text-label-sm rounded border border-outline-variant/40 bg-transparent px-2 py-1">
                  {LEAD_STATUS_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminReferrals() {
  const client = useQueryClient()
  const [tab, setTab] = useState('referrers')
  const [amounts, setAmounts] = useState({})
  const [rates, setRates] = useState({})
  const [limits, setLimits] = useState({})
  const [feedback, setFeedback] = useState('')
  const [salonSearch, setSalonSearch] = useState('')

  const referrers = useQuery({ queryKey: referralKeys.adminReferrers, queryFn: getAdminReferrers })
  const submissions = useQuery({ queryKey: referralKeys.admin, queryFn: getAdminReferrals })
  const adminLeads = useQuery({ queryKey: ['referrals', 'admin', 'leads'], queryFn: getAdminLeads,
    enabled: tab === 'leads' || tab === 'referrers' })

  const invalidate = () => {
    client.invalidateQueries({ queryKey: referralKeys.admin })
    client.invalidateQueries({ queryKey: referralKeys.adminReferrers })
  }
  const fail = (e) => setFeedback(errorMessage(e, 'Action failed.'))

  const verify = useMutation({ mutationFn: ({ id, amount }) => verifyReferral(id, amount),
    onSuccess: () => { setFeedback('Referral verified.'); invalidate() }, onError: fail })
  const reject = useMutation({ mutationFn: ({ id, reason }) => rejectReferral(id, reason),
    onSuccess: () => { setFeedback('Referral rejected.'); invalidate() }, onError: fail })
  const paid = useMutation({ mutationFn: (id) => markReferralPaid(id),
    onSuccess: () => { setFeedback('Marked as paid.'); invalidate() }, onError: fail })
  const approve = useMutation({
    mutationFn: ({ userId, approved, amount }) => setReferrerApproval(userId, approved, amount),
    onSuccess: () => { setFeedback('Referrer updated.'); invalidate() }, onError: fail })
  const hold = useMutation({
    mutationFn: ({ userId, onHold }) => setReferrerHold(userId, onHold, null),
    onSuccess: () => { setFeedback('Referrer status updated.'); invalidate() }, onError: fail })
  const siteLimit = useMutation({
    mutationFn: ({ userId, limit }) => setReferrerSiteLimit(userId, limit),
    onSuccess: () => { setFeedback('Trial-site limit updated.'); invalidate() }, onError: fail })
  const leadStatus = useMutation({
    mutationFn: ({ leadId, status }) => adminSetLeadStatus(leadId, status),
    onMutate: ({ leadId, status }) => {
      client.setQueryData(['referrals', 'admin', 'leads'], (old) =>
        (old || []).map((l) => (l.leadId === leadId ? { ...l, contactStatus: status } : l)))
    },
    onSuccess: () => setFeedback('Lead status updated.'), onError: fail })

  return (
    <main className="max-w-[1280px] mx-auto px-4 py-12">
      <AdminNav />
      <div className="mb-6">
        <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-1">Platform administration</p>
        <h1 className="font-display text-headline-md text-on-surface">Referrals</h1>
        <p className="font-body text-body-md text-on-surface-variant mt-1">
          Approve referrers and set their payout rate, then verify each referral and mark it paid.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {['referrers', 'submissions', 'leads'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`font-body text-label-md px-4 py-2 rounded ${tab === t ? 'bg-secondary/20 text-secondary' : 'text-on-surface-variant hover:text-secondary-fixed'}`}>
            {t === 'referrers' ? 'Referrers' : t === 'submissions' ? 'All submissions' : 'All leads'}
          </button>
        ))}
      </div>

      {feedback && <p className="font-body text-body-md rounded px-3 py-2 mb-6 text-[#A89048] bg-[rgba(168,144,72,0.1)]">{feedback}</p>}

      {tab === 'referrers' && (
        <div className="mb-6">
          <input type="search" value={salonSearch} onChange={(e) => setSalonSearch(e.target.value)}
            placeholder="Search any salon by name or phone…"
            className="w-full sm:max-w-md rounded border border-outline-variant/40 bg-transparent px-3 py-2 font-body" />
          {salonSearch.trim() && (() => {
            const q = salonSearch.trim().toLowerCase()
            const qDigits = q.replace(/\D/g, '')
            const matches = (adminLeads.data || []).filter((l) =>
              (l.salonName || '').toLowerCase().includes(q)
              || (qDigits && String(l.salonPhone || '').replace(/\D/g, '').includes(qDigits)))
            return (
              <div className="glass-panel rounded-xl p-4 mt-3 flex flex-col gap-2">
                <p className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant">
                  {matches.length} match{matches.length === 1 ? '' : 'es'}
                </p>
                {matches.length === 0 ? (
                  <p className="font-body text-label-sm text-on-surface-variant">
                    No salon found. If you refer it, no one holds it yet.
                  </p>
                ) : matches.map((l, i) => (
                  <div key={i} className="rounded-lg border border-outline-variant/20 p-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-body text-on-surface font-medium">{l.salonName || 'Unknown salon'}</p>
                      <p className="font-body text-label-sm text-on-surface-variant">
                        {l.salonPhone && l.salonPhone !== 'N/A' ? l.salonPhone : 'No phone'} · {l.contactStatus}
                      </p>
                    </div>
                    <p className="font-body text-label-sm">
                      {l.referrerName || l.referrerCode
                        ? <>Referred by <span className="text-on-surface">{l.referrerName || 'Referrer'}</span>
                            {' · '}<span className="text-secondary">{l.referrerCode || `#${l.referrerId}`}</span></>
                        : <span className="text-on-surface-variant">No referrer</span>}
                    </p>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {tab === 'referrers' && (
        referrers.isLoading ? <PageLoader />
        : referrers.isError ? (
          <div className="glass-panel rounded-xl p-6 text-center">
            <p className="text-error mb-3">{errorMessage(referrers.error)}</p>
            <button className="button button-secondary" onClick={() => referrers.refetch()}>Try again</button>
          </div>
        ) : (referrers.data || []).length === 0 ? (
          <p className="font-body text-on-surface-variant">No referrers have signed up yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {referrers.data.map((ref) => (
              <div key={ref.userId} className="glass-panel rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-display text-on-surface text-lg">{ref.name || 'Unnamed'} · <span className="text-secondary">{ref.referralCode}</span></p>
                    <p className="font-body text-label-sm text-on-surface-variant">
                      {ref.phone}{ref.email ? ` · ${ref.email}` : ''} · #{ref.userId}
                    </p>
                    <p className="font-body text-label-sm text-on-surface-variant mt-1">
                      {ref.approved
                        ? <span className="text-emerald-400">Approved</span>
                        : <span className="text-amber-400">Not approved</span>}
                      {' · '}Rate {money(ref.perReferralAmount)}
                      {' · '}Site limit {ref.siteLimit ?? 50}
                      {ref.onHold && <span className="text-error"> · ON HOLD</span>}
                    </p>
                    {ref.onHold && ref.holdReason && (
                      <p className="font-body text-label-sm text-error">{ref.holdReason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input type="number" min="0" step="0.01" placeholder="Payout rate"
                      value={rates[ref.userId] ?? (ref.perReferralAmount || '')}
                      onChange={(e) => setRates((s) => ({ ...s, [ref.userId]: e.target.value }))}
                      className="w-32 rounded border border-outline-variant/40 bg-transparent px-3 py-1.5 font-body" />
                    <button className="button" disabled={approve.isPending}
                      onClick={() => approve.mutate({ userId: ref.userId, approved: true, amount: Number(rates[ref.userId] ?? ref.perReferralAmount ?? 0) })}>
                      {ref.approved ? 'Update rate' : 'Approve'}
                    </button>
                    <button className="button button-secondary" disabled={hold.isPending}
                      onClick={() => hold.mutate({ userId: ref.userId, onHold: !ref.onHold })}>
                      {ref.onHold ? 'Reactivate' : 'Hold'}
                    </button>
                    <input type="number" min="0" step="1" placeholder="Site limit"
                      value={limits[ref.userId] ?? (ref.siteLimit ?? 50)}
                      onChange={(e) => setLimits((s) => ({ ...s, [ref.userId]: e.target.value }))}
                      className="w-24 rounded border border-outline-variant/40 bg-transparent px-3 py-1.5 font-body" />
                    <button className="button button-secondary" disabled={siteLimit.isPending}
                      onClick={() => siteLimit.mutate({ userId: ref.userId, limit: Number(limits[ref.userId] ?? ref.siteLimit ?? 50) })}>
                      Set limit
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <Stat label="Earned" value={money(ref.totalPaid)} />
                  <Stat label="This month" value={money(ref.paidThisMonth)} />
                  <Stat label="Awaiting" value={money(ref.totalPending)} />
                  <Stat label="Successful" value={ref.successful} />
                  <Stat label="Declined" value={ref.declined} />
                </div>

                <ReferrerLeads leads={(adminLeads.data || []).filter((l) => l.referrerId === ref.userId)}
                  onStatus={(leadId, status) => leadStatus.mutate({ leadId, status })} />
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'submissions' && (
        submissions.isLoading ? <PageLoader />
        : (submissions.data || []).length === 0 ? (
          <p className="font-body text-on-surface-variant">No referrals submitted yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {submissions.data.map((r) => (
              <div key={r.id} className="glass-panel rounded-xl p-4">
                <p className="font-body text-label-sm text-on-surface-variant mb-2">referrer #{r.referrerId}</p>
                <ReferralCard r={r} amounts={amounts} setAmounts={setAmounts}
                  verify={verify} reject={reject} paid={paid} />
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'leads' && (
        adminLeads.isLoading ? <PageLoader />
        : (adminLeads.data || []).length === 0 ? (
          <p className="font-body text-on-surface-variant">No leads have been delivered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="font-body text-label-sm text-on-surface-variant">
                  <th className="p-2">Referrer</th>
                  <th className="p-2">Salon</th>
                  <th className="p-2">Phone</th>
                  <th className="p-2">Location</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Site</th>
                  <th className="p-2">Links</th>
                </tr>
              </thead>
              <tbody>
                {adminLeads.data.map((l, i) => (
                  <tr key={i} className="border-t border-outline-variant/20 font-body text-label-sm">
                    <td className="p-2 text-on-surface-variant">
                      <span className="text-on-surface">{l.referrerName || `#${l.referrerId}`}</span>
                      {l.referrerCode && <><br /><span className="text-secondary">{l.referrerCode}</span></>}
                    </td>
                    <td className="p-2 text-on-surface">{l.salonName || 'Unknown'}</td>
                    <td className="p-2 text-on-surface-variant">{l.salonPhone && l.salonPhone !== 'N/A' ? l.salonPhone : '—'}</td>
                    <td className="p-2 text-on-surface-variant">{l.salonAddress || '—'}</td>
                    <td className="p-2">
                      <select value={l.contactStatus || 'NEW'}
                        onChange={(e) => leadStatus.mutate({ leadId: l.leadId, status: e.target.value })}
                        className="font-body text-label-sm rounded border border-outline-variant/40 bg-transparent px-2 py-1 text-secondary">
                        {LEAD_STATUS_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="p-2 text-on-surface-variant">{l.assignedOn}</td>
                    <td className="p-2">
                      {l.siteUrl
                        ? <a href={l.siteUrl} target="_blank" rel="noreferrer"
                            className={l.trialSite ? 'text-amber-400 underline' : 'text-emerald-400 underline'}>
                            {l.trialSite ? 'Trial' : 'Live'}
                          </a>
                        : <span className="text-on-surface-variant">—</span>}
                    </td>
                    <td className="p-2">
                      {l.mapsUrl && <a href={l.mapsUrl} target="_blank" rel="noreferrer" className="text-secondary underline mr-2">Map</a>}
                      {l.website && <a href={l.website} target="_blank" rel="noreferrer" className="text-secondary underline">Web</a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </main>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-outline-variant/20 p-3">
      <p className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="font-display text-on-surface">{value}</p>
    </div>
  )
}
