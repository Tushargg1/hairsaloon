import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import { errorMessage } from './salon-api.js'

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup'
  const { user, login, signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ phone: '', email: '', password: '' })
  const [status, setStatus] = useState({ pending: false, error: '' })

  if (user) return <Navigate to="/" replace />

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setStatus({ pending: true, error: '' })
    try {
      const credentials = isSignup
        ? { phone: form.phone, email: form.email || undefined, password: form.password }
        : { phone: form.phone, password: form.password }
      await (isSignup ? signup(credentials) : login(credentials))
      const requestedPath = location.state?.from?.pathname
      navigate(requestedPath || '/salons', { replace: true })
    } catch (error) {
      setStatus({ pending: false, error: errorMessage(error, 'Unable to continue with those details.') })
    }
  }

  return (
    <main className="auth-page page-width">
      <section className="auth-intro">
        <p className="eyebrow">{isSignup ? 'Join the community' : 'Welcome back'}</p>
        <h1>{isSignup ? 'Create your account.' : 'Good to see you.'}</h1>
        <p>{isSignup ? 'Discover salons and book your next appointment.' : 'Sign in to continue where you left off.'}</p>
      </section>
      <section className="form-card" aria-labelledby="auth-heading">
        <h2 id="auth-heading">{isSignup ? 'Sign up' : 'Log in'}</h2>
        <form onSubmit={submit}>
          <label>Phone number<input name="phone" type="tel" autoComplete="tel" required minLength="10" maxLength="15" placeholder="e.g. 9876543210" value={form.phone} onChange={update} /></label>
          {isSignup && (
            <label>Email <span className="optional">(optional)</span><input name="email" type="email" autoComplete="email" value={form.email} onChange={update} /></label>
          )}
          <label>Password<input name="password" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} minLength="8" maxLength="72" required value={form.password} onChange={update} /></label>
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
