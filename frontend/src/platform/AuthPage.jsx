import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import { errorMessage } from './salon-api.js'

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup'
  const { user, login, signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '', role: 'CUSTOMER' })
  const [status, setStatus] = useState({ pending: false, error: '' })

  if (user) return <Navigate to="/" replace />

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setStatus({ pending: true, error: '' })
    try {
      const credentials = isSignup ? form : { email: form.email, password: form.password }
      const signedInUser = await (isSignup ? signup(credentials) : login(credentials))
      const requestedPath = location.state?.from?.pathname
      const roleDestination = signedInUser.role === 'PLATFORM_ADMIN' ? '/admin/approvals'
        : signedInUser.role === 'SALON_OWNER' ? '/salon-signup' : '/salons'
      navigate(requestedPath || roleDestination, { replace: true })
    } catch (error) {
      setStatus({ pending: false, error: errorMessage(error, 'Unable to continue with those details.') })
    }
  }

  return (
    <main className="auth-page page-width">
      <section className="auth-intro">
        <p className="eyebrow">{isSignup ? 'Join the community' : 'Welcome back'}</p>
        <h1>{isSignup ? 'Create your account.' : 'Good to see you.'}</h1>
        <p>{isSignup ? 'Discover salons or build a polished presence for your business.' : 'Sign in to continue where you left off.'}</p>
      </section>
      <section className="form-card" aria-labelledby="auth-heading">
        <h2 id="auth-heading">{isSignup ? 'Sign up' : 'Log in'}</h2>
        <form onSubmit={submit}>
          <label>Email address<input name="email" type="email" autoComplete="email" required value={form.email} onChange={update} /></label>
          <label>Password<input name="password" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} minLength="8" maxLength="72" required value={form.password} onChange={update} /></label>
          {isSignup && (
            <fieldset>
              <legend>I’m joining as</legend>
              <label className="radio-option">
                <input type="radio" name="role" value="CUSTOMER" checked={form.role === 'CUSTOMER'} onChange={update} />
                <span><strong>Customer</strong><small>Find salons that fit your style</small></span>
              </label>
              <label className="radio-option">
                <input type="radio" name="role" value="SALON_OWNER" checked={form.role === 'SALON_OWNER'} onChange={update} />
                <span><strong>Salon owner</strong><small>Create and submit your salon</small></span>
              </label>
            </fieldset>
          )}
          {status.error && <p className="form-status error" role="alert">{status.error}</p>}
          <button className="button button-full" disabled={status.pending} type="submit">
            {status.pending ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
          </button>
        </form>
        <p className="form-switch">
          {isSignup ? 'Already have an account?' : 'New to HairSaloon?'}{' '}
          <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Log in' : 'Create one'}</Link>
        </p>
      </section>
    </main>
  )
}
