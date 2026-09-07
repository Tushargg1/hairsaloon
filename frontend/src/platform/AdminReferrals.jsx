import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import AdminNav from './AdminNav.jsx'
import {
  errorMessage, getAdminReferrals, getAdminReferrers, markReferralPaid, referralKeys,
  rejectReferral, setReferrerApproval, verifyReferral,
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

export default function AdminReferrals() {
  const client = useQueryClient()
  const [tab, setTab] = useState('referrers')
  const [amounts, setAmounts] = useState({})
  const [rates, setRates] = useState({})
  const [feedback, setFeedback] = useState('')

  const referrers = useQuery({ queryKey: referralKeys.adminReferrers, queryFn: getAdminReferrers })
  const submissions = useQuery({ queryKey: referralKeys.admin, queryFn: getAdminReferrals })

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
        {['referrers', 'submissions'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`font-body text-label-md px-4 py-2 rounded ${tab === t ? 'bg-secondary/20 text-secondary' : 'text-on-surface-variant hover:text-secondary-fixed'}`}>
            {t === 'referrers' ? 'Referrers' : 'All submissions'}
          </button>
        ))}
      </div>

      {feedback && <p className="font-body text-body-md rounded px-3 py-2 mb-6 text-[#A89048] bg-[rgba(168,144,72,0.1)]">{feedback}</p>}

      {tab === 'referrers' && (
        referrers.isLoading ? <p className="font-body text-on-surface-variant">Loading…</p>
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
                    </p>
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
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <Stat label="Earned" value={money(ref.totalPaid)} />
                  <Stat label="This month" value={money(ref.paidThisMonth)} />
                  <Stat label="Awaiting" value={money(ref.totalPending)} />
                  <Stat label="Successful" value={ref.successful} />
                  <Stat label="Declined" value={ref.declined} />
                </div>

                {ref.referrals.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant">Referred salons</p>
                    {ref.referrals.map((r) => (
                      <ReferralCard key={r.id} r={r} amounts={amounts} setAmounts={setAmounts}
                        verify={verify} reject={reject} paid={paid} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'submissions' && (
        submissions.isLoading ? <p className="font-body text-on-surface-variant">Loading…</p>
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
