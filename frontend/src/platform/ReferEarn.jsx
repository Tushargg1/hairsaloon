import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import useAuth from '../shared/auth/useAuth.js'
import {
  errorMessage, getReferralOverview, referralKeys, submitReferral,
} from './referral-api.js'

function money(value) {
  return `₹${Number(value || 0).toFixed(2)}`
}

const STATUS_LABEL = {
  VERIFYING: 'Verifying',
  PENDING: 'Approved — awaiting payment',
  PAID: 'Paid',
  REJECTED: 'Rejected',
}

function AuthForm() {
  const { referrerSignup, referrerLogin } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', phone: '', password: '' })
  const [status, setStatus] = useState({ pending: false, error: '' })
  const signingUp = mode === 'signup'
  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setStatus({ pending: true, error: '' })
    try {
      if (signingUp) await referrerSignup(form)
      else await referrerLogin({ phone: form.phone, password: form.password })
    } catch (error) {
      setStatus({ pending: false, error: errorMessage(error, 'Something went wrong.') })
    }
  }

  return (
    <div className="glass-panel rounded-xl p-6 md:p-8 max-w-md mx-auto">
      <h2 className="font-display text-headline-sm text-on-surface mb-1">
        {signingUp ? 'Create referrer account' : 'Referrer login'}
      </h2>
      <p className="font-body text-label-md text-on-surface-variant mb-5">
        Sign in to get your referral code and track your earnings.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {signingUp && (
          <label className="flex flex-col gap-1 font-body text-label-md">Name
            <input name="name" required minLength="2" maxLength="160" value={form.name}
              onChange={update} className="rounded border border-outline-variant/40 bg-transparent px-3 py-2" />
          </label>
        )}
        <label className="flex flex-col gap-1 font-body text-label-md">Phone number
          <input name="phone" type="tel" inputMode="tel" required minLength="10" maxLength="15"
            value={form.phone} onChange={update}
            className="rounded border border-outline-variant/40 bg-transparent px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 font-body text-label-md">Password
          <input name="password" type="password" required minLength="8" maxLength="72"
            value={form.password} onChange={update}
            className="rounded border border-outline-variant/40 bg-transparent px-3 py-2" />
        </label>
        {status.error && <p className="font-body text-label-sm text-error" role="alert">{status.error}</p>}
        <button type="submit" disabled={status.pending}
          className="brass-gradient text-espresso font-body font-semibold px-5 py-2.5 rounded">
          {status.pending ? 'Please wait…' : signingUp ? 'Sign Up' : 'Log In'}
        </button>
      </form>
      <button type="button" onClick={() => { setMode(signingUp ? 'login' : 'signup'); setStatus({ pending: false, error: '' }) }}
        className="mt-4 font-body text-label-md text-secondary underline">
        {signingUp ? 'Already have an account? Log in' : 'New here? Create an account'}
      </button>
    </div>
  )
}

function ReferrerDashboard() {
  const client = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: referralKeys.me, queryFn: getReferralOverview })
  const [form, setForm] = useState({ salonName: '', salonPhone: '', mapsUrl: '' })
  const [error, setError] = useState('')
  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const submit = useMutation({
    mutationFn: () => submitReferral(form),
    onSuccess: () => {
      setForm({ salonName: '', salonPhone: '', mapsUrl: '' })
      setError('')
      client.invalidateQueries({ queryKey: referralKeys.me })
    },
    onError: (e) => setError(errorMessage(e, 'Could not submit this referral.')),
  })

  if (isLoading) return <p className="font-body text-on-surface-variant">Loading…</p>

  const { referralCode, approved, perReferralAmount, totalPaid, totalPending, history = [] } = data || {}

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-panel rounded-xl p-5">
          <p className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">Your code</p>
          <p className="font-display text-headline-sm text-secondary">{referralCode}</p>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <p className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">Total earned</p>
          <p className="font-display text-headline-sm text-on-surface">{money(totalPaid)}</p>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <p className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">Awaiting payment</p>
          <p className="font-display text-headline-sm text-on-surface">{money(totalPending)}</p>
        </div>
      </div>

      {!approved ? (
        <div className="glass-panel rounded-xl p-6">
          <p className="font-body text-on-surface-variant">
            Your referrer account is awaiting admin approval. Once approved you can submit salon
            referrals and start earning.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl p-6">
          <h2 className="font-display text-headline-sm text-on-surface mb-1">Refer a salon</h2>
          <p className="font-body text-label-md text-on-surface-variant mb-4">
            You earn {money(perReferralAmount)} per approved referral. Details cannot be edited
            once submitted.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); submit.mutate() }} className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 font-body text-label-md">Salon name
              <input name="salonName" required maxLength="160" value={form.salonName} onChange={update}
                className="rounded border border-outline-variant/40 bg-transparent px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 font-body text-label-md">Salon phone
              <input name="salonPhone" type="tel" required minLength="10" maxLength="15"
                value={form.salonPhone} onChange={update}
                className="rounded border border-outline-variant/40 bg-transparent px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 font-body text-label-md sm:col-span-2">Google Maps location link
              <input name="mapsUrl" type="url" required maxLength="2048" value={form.mapsUrl} onChange={update}
                placeholder="https://maps.app.goo.gl/..."
                className="rounded border border-outline-variant/40 bg-transparent px-3 py-2" />
            </label>
            {error && <p className="font-body text-label-sm text-error sm:col-span-2" role="alert">{error}</p>}
            <div className="sm:col-span-2">
              <button type="submit" disabled={submit.isPending}
                className="brass-gradient text-espresso font-body font-semibold px-6 py-2.5 rounded">
                {submit.isPending ? 'Submitting…' : 'Submit referral'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel rounded-xl p-6">
        <h2 className="font-display text-headline-sm text-on-surface mb-4">Referral history</h2>
        {history.length === 0 ? (
          <p className="font-body text-on-surface-variant">No referrals submitted yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-outline-variant/20">
            {history.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-body text-on-surface truncate">{r.salonName}</p>
                  <p className="font-body text-label-sm text-on-surface-variant">{r.salonPhone}</p>
                  {r.status === 'REJECTED' && r.rejectReason && (
                    <p className="font-body text-label-sm text-error">{r.rejectReason}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-body text-label-sm text-on-surface-variant">{STATUS_LABEL[r.status] || r.status}</p>
                  {(r.status === 'PAID' || r.status === 'PENDING') && (
                    <p className="font-body text-on-surface">{money(r.amount)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReferEarn() {
  const { user } = useAuth()
  const isReferrer = user?.role === 'REFERRER'

  return (
    <main className="max-w-[900px] mx-auto px-4 py-12">
      <div className="mb-8">
        <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">Groomit</p>
        <h1 className="font-display text-headline-md text-on-surface">Refer &amp; Earn</h1>
        <p className="font-body text-on-surface-variant mt-2">
          Refer salons to Groomit and earn a reward for every one that joins.
        </p>
      </div>
      {isReferrer ? <ReferrerDashboard /> : <AuthForm />}
    </main>
  )
}
