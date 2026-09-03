import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import AdminNav from './AdminNav.jsx'
import {
  errorMessage, getAdminReferrals, markReferralPaid, referralKeys,
  rejectReferral, setReferrerApproval, verifyReferral,
} from './referral-api.js'

function money(v) { return `₹${Number(v || 0).toFixed(2)}` }

const STATUS_STYLE = {
  VERIFYING: 'text-amber-400',
  PENDING: 'text-sky-400',
  PAID: 'text-emerald-400',
  REJECTED: 'text-error',
}

export default function AdminReferrals() {
  const client = useQueryClient()
  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: referralKeys.admin, queryFn: getAdminReferrals,
  })
  const [amounts, setAmounts] = useState({})
  const [feedback, setFeedback] = useState('')

  const invalidate = () => client.invalidateQueries({ queryKey: referralKeys.admin })
  const fail = (e) => setFeedback(errorMessage(e, 'Action failed.'))

  const verify = useMutation({
    mutationFn: ({ id, amount }) => verifyReferral(id, amount),
    onSuccess: () => { setFeedback('Referral verified.'); invalidate() }, onError: fail,
  })
  const reject = useMutation({
    mutationFn: ({ id, reason }) => rejectReferral(id, reason),
    onSuccess: () => { setFeedback('Referral rejected.'); invalidate() }, onError: fail,
  })
  const paid = useMutation({
    mutationFn: (id) => markReferralPaid(id),
    onSuccess: () => { setFeedback('Marked as paid.'); invalidate() }, onError: fail,
  })
  const approve = useMutation({
    mutationFn: ({ userId, amount }) => setReferrerApproval(userId, true, amount),
    onSuccess: () => { setFeedback('Referrer approved.'); invalidate() }, onError: fail,
  })

  return (
    <main className="max-w-[1280px] mx-auto px-4 py-12">
      <AdminNav />
      <div className="mb-6">
        <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-1">Platform administration</p>
        <h1 className="font-display text-headline-md text-on-surface">Referrals</h1>
        <p className="font-body text-body-md text-on-surface-variant mt-1">
          Verify referrals, set the payout amount, and mark them paid. Rejected or paid records cannot be changed.
        </p>
      </div>

      {feedback && <p className="font-body text-body-md rounded px-3 py-2 mb-6 text-[#A89048] bg-[rgba(168,144,72,0.1)]">{feedback}</p>}

      {isLoading ? (
        <p className="font-body text-on-surface-variant">Loading…</p>
      ) : isError ? (
        <div className="glass-panel rounded-xl p-6 text-center">
          <p className="text-error mb-3">{errorMessage(error)}</p>
          <button className="button button-secondary" onClick={() => refetch()}>Try again</button>
        </div>
      ) : data.length === 0 ? (
        <p className="font-body text-on-surface-variant">No referrals submitted yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((r) => (
            <div key={r.id} className="glass-panel rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-display text-on-surface text-lg">{r.salonName}</p>
                  <p className="font-body text-label-sm text-on-surface-variant">{r.salonPhone} · referrer #{r.referrerId}</p>
                  <a href={r.mapsUrl} target="_blank" rel="noreferrer"
                    className="font-body text-label-sm text-secondary underline break-all">{r.mapsUrl}</a>
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
                    className="w-32 rounded border border-outline-variant/40 bg-transparent px-3 py-1.5 font-body" />
                  <button className="button" disabled={verify.isPending || !amounts[r.id]}
                    onClick={() => verify.mutate({ id: r.id, amount: Number(amounts[r.id]) })}>Verify</button>
                  <button className="button button-secondary" disabled={reject.isPending}
                    onClick={() => reject.mutate({ id: r.id, reason: 'Salon already referred or not eligible' })}>Reject</button>
                  <button className="button button-secondary" disabled={approve.isPending || !amounts[r.id]}
                    onClick={() => approve.mutate({ userId: r.referrerId, amount: Number(amounts[r.id] || 0) })}>Approve referrer</button>
                </div>
              )}
              {r.status === 'PENDING' && (
                <div>
                  <button className="button" disabled={paid.isPending} onClick={() => paid.mutate(r.id)}>Mark paid</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
