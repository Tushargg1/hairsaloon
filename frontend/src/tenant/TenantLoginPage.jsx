import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import { errorMessage } from './tenant-api.js'
import { tenantNameFallback } from './tenant-host.js'

export default function TenantLoginPage() {
  const { user, login, signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, salonName: ctxName } = useOutletContext() || {}
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ phone: '', password: '', email: '' })
  const [status, setStatus] = useState({ pending: false, error: '' })
  const salonName = profile?.name || profile?.salonName || ctxName || tenantNameFallback()
  const signingUp = mode === 'signup'

  if (user) return <Navigate to={user.role === 'SALON_OWNER' ? '/dashboard' : '/'} replace />

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function switchMode(next) {
    setMode(next)
    setStatus({ pending: false, error: '' })
  }

  function goAfterAuth() {
    const requestedPath = location.state?.from?.pathname
    const rolePathAllowed = requestedPath
      && !/^\/(?:dashboard|admin|manage)(?:\/|$)/.test(requestedPath)
    navigate(rolePathAllowed ? requestedPath : '/', { replace: true })
  }

  async function submit(event) {
    event.preventDefault()
    setStatus({ pending: true, error: '' })
    try {
      if (signingUp) {
        await signup({
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          password: form.password,
        })
        goAfterAuth()
        return
      }
      const signedInUser = await login({ phone: form.phone.trim(), password: form.password })
      if (signedInUser.role !== 'CUSTOMER') {
        setStatus({ pending: false, error: 'Please use the management login for staff accounts.' })
        return
      }
      goAfterAuth()
    } catch (error) {
      setStatus({
        pending: false,
        error: errorMessage(error, signingUp
          ? 'Unable to create your account.'
          : 'Unable to log in with those details.'),
      })
    }
  }

  return (
    <main className="relative flex flex-col min-h-screen justify-center overflow-hidden">
      <div className="absolute inset-0 z-0 bg-contain bg-no-repeat bg-top" style={{ backgroundImage: "url('/background-windows-img.png')" }} />
      <div className="absolute inset-0 z-0 bg-black/60" />
      <section className="relative z-10 py-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto">
        <div className="booking-frame">
          <div className="booking-plate">
            <div className="booking-texture" />

            <header className="booking-head">
              <div className="booking-title-row">
                <span className="booking-title-rule" />
                <h2 className="booking-title gold-gradient-text">
                  {signingUp ? <>Create<br />Account</> : <>Customer<br />Login</>}
                </h2>
                <span className="booking-title-rule" />
              </div>
            </header>

            <div className="relative z-10 flex flex-col gap-4">
              <p className="booking-note">
                {signingUp
                  ? 'Sign up with your phone number to book and manage appointments.'
                  : 'Sign in with your phone number to manage your appointments.'}
              </p>

              <form onSubmit={submit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                  <span className="font-body text-xs uppercase tracking-[0.15em] text-on-surface-variant">Phone number</span>
                  <input className="price-search-input" name="phone" type="tel" inputMode="tel"
                    autoComplete="tel" required minLength="10" maxLength="15"
                    value={form.phone} onChange={update} />
                </label>

                {signingUp && (
                  <label className="flex flex-col gap-1">
                    <span className="font-body text-xs uppercase tracking-[0.15em] text-on-surface-variant">Email (optional)</span>
                    <input className="price-search-input" name="email" type="email"
                      autoComplete="email" value={form.email} onChange={update} />
                  </label>
                )}

                <label className="flex flex-col gap-1">
                  <span className="font-body text-xs uppercase tracking-[0.15em] text-on-surface-variant">Password</span>
                  <input className="price-search-input" name="password" type="password"
                    autoComplete={signingUp ? 'new-password' : 'current-password'}
                    minLength="8" maxLength="72" required
                    value={form.password} onChange={update} />
                </label>

                {status.error && <p className="booking-note is-error" role="alert">{status.error}</p>}

                <div className="grid grid-cols-2 gap-3">
                  <button type={signingUp ? 'button' : 'submit'}
                    onClick={signingUp ? () => switchMode('login') : undefined}
                    className={`booking-confirm ${signingUp ? 'opacity-60' : ''}`}
                    disabled={status.pending && !signingUp}>
                    {status.pending && !signingUp ? 'Signing in...' : 'Log In'}
                  </button>
                  <button type={signingUp ? 'submit' : 'button'}
                    onClick={signingUp ? undefined : () => switchMode('signup')}
                    className={`booking-confirm ${signingUp ? '' : 'opacity-60'}`}
                    disabled={status.pending && signingUp}>
                    {status.pending && signingUp ? 'Creating...' : 'Sign Up'}
                  </button>
                </div>
              </form>

              <p className="font-body text-xs text-center">
                <Link to="/manage/login" className="text-on-surface-variant hover:text-secondary transition-colors">
                  Staff or owner? Management login
                </Link>
              </p>
              <p className="font-body text-xs text-center">
                <Link to="/" className="text-on-surface-variant hover:text-secondary transition-colors">
                  Back to salon home
                </Link>
              </p>
            </div>

            <p className="price-mark mt-auto pt-6">&mdash; {salonName} &mdash;</p>
          </div>
        </div>
      </section>
    </main>
  )
}
