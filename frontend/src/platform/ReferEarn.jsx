import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import useAuth from '../shared/auth/useAuth.js'
import DeleteAccount from '../shared/components/DeleteAccount.jsx'
import {
  errorMessage, getReferralOverview, previewReferral, referralKeys, submitReferral,
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

// Group the four backend statuses into the three columns the referrer sees.
const COLUMNS = [
  { key: 'completed', title: 'Completed', statuses: ['PAID'] },
  { key: 'processing', title: 'Pending / Processing', statuses: ['VERIFYING', 'PENDING'] },
  { key: 'denied', title: 'Cancelled / Denied', statuses: ['REJECTED'] },
]

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
    <div className="booking-frame">
      <div className="booking-plate">
        <div className="booking-texture" />

        <header className="booking-head">
          <div className="booking-title-row">
            <span className="booking-title-rule" />
            <h2 className="booking-title gold-gradient-text">
              {signingUp ? <>Referrer<br />Sign Up</> : <>Referrer<br />Login</>}
            </h2>
            <span className="booking-title-rule" />
          </div>
        </header>

        <div className="relative z-10 flex flex-col gap-4">
          <p className="booking-note">Sign in to get your referral code and track your earnings.</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {signingUp && (
              <label className="flex flex-col gap-1">
                <span className="font-body text-xs uppercase tracking-[0.15em] text-on-surface-variant">Name</span>
                <input className="price-search-input" name="name" required minLength="2" maxLength="160"
                  value={form.name} onChange={update} />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="font-body text-xs uppercase tracking-[0.15em] text-on-surface-variant">Phone number</span>
              <input className="price-search-input" name="phone" type="tel" inputMode="tel"
                required minLength="10" maxLength="15" value={form.phone} onChange={update} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-body text-xs uppercase tracking-[0.15em] text-on-surface-variant">Password</span>
              <input className="price-search-input" name="password" type="password"
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                required minLength="8" maxLength="72" value={form.password} onChange={update} />
            </label>
            {status.error && <p className="booking-note is-error" role="alert">{status.error}</p>}
            <button type="submit" className="booking-confirm !w-full" disabled={status.pending}>
              {status.pending ? 'Please wait…' : signingUp ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <button type="button"
            onClick={() => { setMode(signingUp ? 'login' : 'signup'); setStatus({ pending: false, error: '' }) }}
            className="font-body text-xs text-center underline text-on-surface-variant hover:text-secondary transition-colors">
            {signingUp ? 'Already have an account? Log in' : 'New here? Create an account'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReferrerDashboard() {
  const client = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: referralKeys.me, queryFn: getReferralOverview })
  const [form, setForm] = useState({ salonName: '', salonPhone: '', mapsUrl: '', contactName: '', salonAddress: '' })
  const [error, setError] = useState('')
  const [lookupUrl, setLookupUrl] = useState('')
  const [lookupMsg, setLookupMsg] = useState('')
  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const lookup = useMutation({
    mutationFn: () => previewReferral(lookupUrl.trim()),
    onSuccess: (d) => {
      setForm((f) => ({
        ...f,
        salonName: d.salonName || f.salonName,
        salonPhone: (d.salonPhone || f.salonPhone || '').replace(/[^\d+]/g, ''),
        salonAddress: d.salonAddress || f.salonAddress,
        mapsUrl: d.mapsUrl || lookupUrl.trim(),
      }))
      setLookupMsg('Details filled in from Google. Review and submit.')
    },
    onError: (e) => setLookupMsg(errorMessage(e, 'Could not read that Google link.')),
  })

  const submit = useMutation({
    mutationFn: () => submitReferral(form),
    onSuccess: () => {
      setForm({ salonName: '', salonPhone: '', mapsUrl: '', contactName: '', salonAddress: '' })
      setLookupUrl('')
      setLookupMsg('')
      setError('')
      client.invalidateQueries({ queryKey: referralKeys.me })
    },
    onError: (e) => setError(errorMessage(e, 'Could not submit this referral.')),
  })

  if (isLoading) return <p className="font-body text-on-surface-variant">Loading…</p>

  const { referralCode, approved, perReferralAmount, totalPaid, totalPending, history = [] } = data || {}
  const successful = history.filter((r) => r.status === 'PAID').length
  const processing = history.filter((r) => r.status === 'VERIFYING' || r.status === 'PENDING').length
  const declined = history.filter((r) => r.status === 'REJECTED').length

  const Stat = ({ label, value, accent }) => (
    <div className="glass-panel rounded-xl p-5">
      <p className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">{label}</p>
      <p className={`font-display text-headline-sm ${accent || 'text-on-surface'}`}>{value}</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Your code" value={referralCode} accent="text-secondary" />
        <Stat label="Total earned" value={money(totalPaid)} />
        <Stat label="Awaiting payment" value={money(totalPending)} />
        <Stat label="Successful referrals" value={successful} />
        <Stat label="Pending / processing" value={processing} />
        <Stat label="Declined" value={declined} accent="text-error" />
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

          {/* Option 1: paste a Google link to auto-fill the details. */}
          <div className="mb-5 rounded-lg border border-outline-variant/30 p-4">
            <label className="flex flex-col gap-1 font-body text-label-md mb-2">Paste Google Maps link to auto-fill
              <input type="url" value={lookupUrl} onChange={(e) => setLookupUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className="rounded border border-outline-variant/40 bg-transparent px-3 py-2" />
            </label>
            <button type="button" disabled={lookup.isPending || !lookupUrl.trim()}
              onClick={() => { setLookupMsg(''); lookup.mutate() }}
              className="font-body text-label-md px-4 py-2 rounded border border-secondary/60 text-secondary hover:bg-secondary hover:text-on-secondary transition-colors disabled:opacity-40">
              {lookup.isPending ? 'Fetching…' : 'Fetch details'}
            </button>
            {lookupMsg && <p className="font-body text-label-sm text-on-surface-variant mt-2">{lookupMsg}</p>}
          </div>

          {/* Option 2: enter/adjust details manually. */}
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
            <label className="flex flex-col gap-1 font-body text-label-md">Contact person (whose number)
              <input name="contactName" maxLength="160" value={form.contactName} onChange={update}
                className="rounded border border-outline-variant/40 bg-transparent px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 font-body text-label-md">Location / address
              <input name="salonAddress" maxLength="500" value={form.salonAddress} onChange={update}
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

      <div>
        <h2 className="font-display text-headline-sm text-on-surface mb-4">Your referrals</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = history.filter((r) => col.statuses.includes(r.status))
            return (
              <div key={col.key} className="glass-panel rounded-xl p-4">
                <p className="font-body text-label-md text-secondary uppercase tracking-wider mb-3">
                  {col.title} ({items.length})
                </p>
                {items.length === 0 ? (
                  <p className="font-body text-label-sm text-on-surface-variant">None yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {items.map((r) => (
                      <div key={r.id} className="rounded-lg border border-outline-variant/20 p-3">
                        <p className="font-body text-on-surface font-medium">{r.salonName}</p>
                        <p className="font-body text-label-sm text-on-surface-variant">{r.salonPhone}{r.contactName ? ` · ${r.contactName}` : ''}</p>
                        {r.salonAddress && <p className="font-body text-label-sm text-on-surface-variant">{r.salonAddress}</p>}
                        {r.mapsUrl && (
                          <a href={r.mapsUrl} target="_blank" rel="noreferrer"
                            className="font-body text-label-sm text-secondary underline break-all">Map link</a>
                        )}
                        <p className="font-body text-label-sm text-on-surface-variant mt-1">{STATUS_LABEL[r.status] || r.status}</p>
                        {(r.status === 'PAID' || r.status === 'PENDING') && (
                          <p className="font-body text-on-surface">{money(r.amount)}</p>
                        )}
                        {r.status === 'REJECTED' && r.rejectReason && (
                          <p className="font-body text-label-sm text-error">{r.rejectReason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <DeleteAccount note="This permanently closes your referrer account. Your referral history stays on record but you won't be able to sign in again." />
    </div>
  )
}

export default function ReferEarn() {
  const { user } = useAuth()
  const isReferrer = user?.role === 'REFERRER'

  if (isReferrer) {
    return (
      <main className="max-w-[900px] mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">Groomit</p>
          <h1 className="font-display text-headline-md text-on-surface">Refer &amp; Earn</h1>
          <p className="font-body text-on-surface-variant mt-2">
            Refer salons to Groomit and earn a reward for every one that joins.
          </p>
        </div>
        <ReferrerDashboard />
      </main>
    )
  }

  // Logged-out: vintage plate on the Groomit backdrop, matching the login pages.
  return (
    <main className="relative flex flex-col min-h-[90vh] justify-center overflow-hidden -mt-12 pt-12">
      <div className="absolute inset-0 z-0 bg-cover bg-top md:hidden" style={{ backgroundImage: "url('/background-img-mobile.jpg')" }} />
      <div className="absolute inset-0 z-0 bg-cover bg-top hidden md:block" style={{ backgroundImage: "url('/background-windows-img.png')" }} />
      <div className="absolute inset-0 z-0 bg-black/60" />
      <section className="relative z-10 py-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto">
        <AuthForm />
      </section>
    </main>
  )
}
