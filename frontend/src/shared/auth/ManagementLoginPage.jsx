import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { apiErrorMessage, retryAfterSeconds } from '../api/client.js'
import { isPlatformHost, platformUrl, salonUrl } from '../../platform/platform-config.js'
import useAuth from './useAuth.js'

function destinationFor(role, platformHost, subdomain) {
  if (role === 'PLATFORM_ADMIN') return platformHost ? '/admin/approvals' : platformUrl('/admin/approvals')
  if (role === 'SALON_OWNER') {
    if (platformHost && subdomain) return salonUrl(subdomain) + '/dashboard'
    if (platformHost) return '/salon-signup'
    return '/dashboard'
  }
  return null
}

function externalDestination(destination) {
  return /^https?:\/\//.test(destination || '')
}

function compatibleRequestedPath(role, requestedPath, platformHost) {
  if (!requestedPath) return false
  if (role === 'PLATFORM_ADMIN') return platformHost && /^\/admin(?:\/|$)/.test(requestedPath)
  if (role === 'SALON_OWNER') {
    return platformHost
      ? requestedPath === '/salon-signup'
      : /^\/dashboard(?:\/|$)/.test(requestedPath)
  }
  return false
}

export default function ManagementLoginPage() {
  const { user, privilegedLogin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const platformHost = isPlatformHost()
  const requestedPath = location.state?.from?.pathname
  const [form, setForm] = useState({ email: '', password: '' })
  const [status, setStatus] = useState({ pending: false, error: '' })
  const [retryIn, setRetryIn] = useState(0)

  useEffect(() => {
    if (retryIn <= 0) return undefined
    const timer = window.setTimeout(() => setRetryIn((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [retryIn])

  const authenticatedDestination = user && destinationFor(user.role, platformHost, user.subdomain)
  useEffect(() => {
    if (externalDestination(authenticatedDestination)) window.location.replace(authenticatedDestination)
  }, [authenticatedDestination])

  if (authenticatedDestination) {
    const destination = compatibleRequestedPath(user.role, requestedPath, platformHost)
      ? requestedPath
      : authenticatedDestination
    if (externalDestination(destination)) {
      return <main className="state-page" aria-live="polite">Redirecting to platform administration…</main>
    }
    return <Navigate to={destination} replace />
  }

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setStatus({ pending: true, error: '' })
    try {
      const signedInUser = await privilegedLogin({ email: form.email.trim(), password: form.password })
      const fallback = destinationFor(signedInUser.role, platformHost, signedInUser.subdomain)
      if (!fallback) {
        setStatus({ pending: false, error: 'This account does not have management access.' })
        return
      }
      const destination = compatibleRequestedPath(signedInUser.role, requestedPath, platformHost)
        ? requestedPath
        : fallback
      if (externalDestination(destination)) window.location.assign(destination)
      else navigate(destination, { replace: true })
    } catch (error) {
      const seconds = retryAfterSeconds(error)
      setRetryIn(seconds)
      setStatus({ pending: false, error: apiErrorMessage(error, 'Unable to sign in with those details.') })
    }
  }

  return (
    <main className="flex flex-col">
      <section className="py-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto">
        <div className="booking-frame">
          <div className="booking-plate">
            <div className="booking-texture" />

            <header className="booking-head">
              <div className="booking-title-row">
                <span className="booking-title-rule" />
                <h2 className="booking-title gold-gradient-text">Management<br />Login</h2>
                <span className="booking-title-rule" />
              </div>
            </header>

            <div className="relative z-10 flex flex-col gap-4">
              <p className="booking-note">Staff and platform administrators sign in here with their work email.</p>

              {user && !destinationFor(user.role, platformHost, user.subdomain) && (
                <p className="booking-note is-error" role="alert">Your current account does not have management access. Sign in with an authorised staff or administrator account.</p>
              )}

              <form onSubmit={submit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                  <span className="font-body text-xs uppercase tracking-[0.15em] text-on-surface-variant">Email address</span>
                  <input className="price-search-input" name="email" type="email" autoComplete="email"
                    required maxLength="320" value={form.email} onChange={update} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-body text-xs uppercase tracking-[0.15em] text-on-surface-variant">Password</span>
                  <input className="price-search-input" name="password" type="password" autoComplete="current-password"
                    required minLength="8" maxLength="72" value={form.password} onChange={update} />
                </label>

                {status.error && <p className="booking-note is-error" role="alert">{status.error}</p>}

                <button type="submit" className="booking-confirm" disabled={status.pending || retryIn > 0}>
                  {status.pending ? 'Signing in...' : retryIn > 0 ? `Try again in ${retryIn}s` : 'Sign In'}
                </button>
              </form>

              {platformHost && (
                <p className="font-body text-xs text-center text-on-surface-variant">
                  New salon owner? <Link to="/for-business" className="underline hover:text-secondary transition-colors">Register your salon</Link>
                </p>
              )}
              <p className="font-body text-xs text-center">
                <Link to={platformHost ? '/login' : '/'} className="text-on-surface-variant hover:text-secondary transition-colors">
                  {platformHost ? 'Customer login' : 'Back to salon home'}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
