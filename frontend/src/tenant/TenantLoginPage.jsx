import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import { errorMessage } from './tenant-api.js'
import { tenantNameFallback } from './tenant-host.js'

export default function TenantLoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [status, setStatus] = useState({ pending: false, error: '' })
  const salonName = tenantNameFallback()

  if (user) return <Navigate to={user.role === 'SALON_OWNER' ? '/dashboard' : '/'} replace />

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setStatus({ pending: true, error: '' })
    try {
      const signedInUser = await login(form)
      const requestedPath = location.state?.from?.pathname
      const destination = signedInUser.role === 'SALON_OWNER' ? '/dashboard' : '/'
      const rolePathAllowed = signedInUser.role === 'SALON_OWNER'
        ? requestedPath?.startsWith('/dashboard')
        : requestedPath && !requestedPath.startsWith('/dashboard')
      navigate(rolePathAllowed ? requestedPath : destination, { replace: true })
    } catch (error) {
      setStatus({ pending: false, error: errorMessage(error, 'Unable to log in with those details.') })
    }
  }

  return (
    <main className="auth-page page-width tenant-auth-page">
      <section className="auth-intro">
        <p className="eyebrow">{salonName}</p>
        <h1>Welcome back.</h1>
        <p>Sign in to access your salon account.</p>
      </section>
      <section className="form-card" aria-labelledby="tenant-login-heading">
        <h2 id="tenant-login-heading">Log in</h2>
        <form onSubmit={submit}>
          <label>Email address<input name="email" type="email" autoComplete="email" required value={form.email} onChange={update} /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" minLength="8" maxLength="72" required value={form.password} onChange={update} /></label>
          {status.error && <p className="form-status error" role="alert">{status.error}</p>}
          <button className="button button-full" disabled={status.pending} type="submit">{status.pending ? 'Signing in…' : 'Log in'}</button>
        </form>
        <p className="form-switch"><Link to="/">Back to salon home</Link></p>
      </section>
    </main>
  )
}