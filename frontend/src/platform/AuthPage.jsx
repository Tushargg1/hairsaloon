import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import { retryAfterSeconds } from '../shared/api/client.js'
import { errorMessage } from './salon-api.js'

function useCountdown(value, setValue) {
  useEffect(() => {
    if (value <= 0) return undefined
    const timer = window.setTimeout(() => setValue((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [value, setValue])
}

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup'
  const { user, login, signup, requestOtp, verifyOtp, resetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ phone: '', email: '', password: '', newPassword: '', code: '' })
  const [signupStage, setSignupStage] = useState('request')
  const [resetStage, setResetStage] = useState(null)
  const [challengeId, setChallengeId] = useState('')
  const [verificationProof, setVerificationProof] = useState('')
  const [status, setStatus] = useState({ pending: false, error: '', success: '' })
  const [retryIn, setRetryIn] = useState(0)
  const [resendIn, setResendIn] = useState(0)

  useCountdown(retryIn, setRetryIn)
  useCountdown(resendIn, setResendIn)

  const requestedPath = location.state?.from?.pathname
  if (user) {
    const roleDestination = user.role === 'SALON_OWNER'
      ? '/salon-signup'
      : user.role === 'PLATFORM_ADMIN' ? '/admin/approvals' : requestedPath || '/salons'
    return <Navigate to={roleDestination} replace />
  }

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function fail(error, fallback) {
    setRetryIn(retryAfterSeconds(error))
    setStatus({ pending: false, success: '', error: errorMessage(error, fallback) })
  }

  async function sendOtp(purpose) {
    setStatus({ pending: true, error: '', success: '' })
    try {
      const challenge = await requestOtp({ phone: form.phone.trim(), purpose })
      setChallengeId(challenge.challengeId)
      setForm((current) => ({ ...current, code: '' }))
      setResendIn(Number(challenge.resendAfterSeconds) || 0)
      setStatus({ pending: false, error: '', success: 'Verification code sent.' })
      return true
    } catch (error) {
      fail(error, 'Unable to send a verification code. Please try again.')
      return false
    }
  }
  async function submitSignup(event) {
    event.preventDefault()
    if (signupStage === 'request') {
      if (await sendOtp('SIGNUP')) setSignupStage('verify')
      return
    }
    if (signupStage === 'verify') {
      setStatus({ pending: true, error: '', success: '' })
      try {
        const proof = await verifyOtp({ challengeId, code: form.code.trim() })
        setVerificationProof(proof.verificationProof)
        setSignupStage('details')
        setStatus({ pending: false, error: '', success: 'Phone verified. Complete your account details.' })
      } catch (error) {
        fail(error, 'That verification code could not be confirmed.')
      }
      return
    }

    setStatus({ pending: true, error: '', success: '' })
    try {
      await signup({
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
        verificationProof,
      })
      navigate('/salons', { replace: true })
    } catch (error) {
      fail(error, 'Unable to create your account with those details.')
    }
  }

  async function submitLogin(event) {
    event.preventDefault()
    setStatus({ pending: true, error: '', success: '' })
    try {
      await login({ phone: form.phone.trim(), password: form.password })
      const requestedPath = location.state?.from?.pathname
      navigate(requestedPath || '/salons', { replace: true })
    } catch (error) {
      fail(error, 'Unable to log in with those details.')
    }
  }

  async function submitReset(event) {
    event.preventDefault()
    if (resetStage === 'request') {
      if (await sendOtp('PASSWORD_RESET')) setResetStage('verify')
      return
    }
    if (resetStage === 'verify') {
      setStatus({ pending: true, error: '', success: '' })
      try {
        const proof = await verifyOtp({ challengeId, code: form.code.trim() })
        setVerificationProof(proof.verificationProof)
        setResetStage('reset')
        setStatus({ pending: false, error: '', success: 'Code verified. Choose a new password.' })
      } catch (error) {
        fail(error, 'That verification code could not be confirmed.')
      }
      return
    }

    setStatus({ pending: true, error: '', success: '' })
    try {
      await resetPassword({
        phone: form.phone.trim(),
        newPassword: form.newPassword,
        verificationProof,
      })
      setForm((current) => ({ ...current, password: '', newPassword: '', code: '' }))
      setResetStage(null)
      setChallengeId('')
      setVerificationProof('')
      setStatus({ pending: false, error: '', success: 'Password reset. You can now log in.' })
    } catch (error) {
      fail(error, 'Unable to reset your password. Please try again.')
    }
  }

  async function resend(purpose) {
    if (resendIn > 0 || retryIn > 0 || status.pending) return
    await sendOtp(purpose)
  }

  function changePhone() {
    setSignupStage('request')
    setResetStage(resetStage ? 'request' : null)
    setChallengeId('')
    setVerificationProof('')
    setResendIn(0)
    setStatus({ pending: false, error: '', success: '' })
  }

  const otpStage = isSignup ? signupStage : resetStage
  const inOtpFlow = isSignup || Boolean(resetStage)
  const heading = isSignup ? 'Sign up' : resetStage ? 'Reset password' : 'Log in'
  const submit = isSignup ? submitSignup : resetStage ? submitReset : submitLogin
  const otpPurpose = isSignup ? 'SIGNUP' : 'PASSWORD_RESET'
  return (
    <main className="auth-page page-width">
      <section className="auth-intro">
        <p className="eyebrow">{isSignup ? 'Join the community' : resetStage ? 'Account recovery' : 'Welcome back'}</p>
        <h1>{isSignup ? 'Create your account.' : resetStage ? 'Set a new password.' : 'Good to see you.'}</h1>
        <p>{isSignup ? 'Verify your phone, then add your account details.' : resetStage ? 'We’ll verify your phone before changing your password.' : 'Sign in to continue where you left off.'}</p>
      </section>
      <section className="form-card" aria-labelledby="auth-heading">
        <h2 id="auth-heading">{heading}</h2>
        {inOtpFlow && <p className="form-switch">Step {otpStage === 'request' ? '1' : otpStage === 'verify' ? '2' : '3'} of 3</p>}
        <form onSubmit={submit}>
          {(otpStage === 'request' || !inOtpFlow) && (
            <label>Phone number<input name="phone" type="tel" inputMode="tel" autoComplete="tel" required minLength="10" maxLength="15" placeholder="e.g. 9876543210" value={form.phone} onChange={update} /></label>
          )}

          {otpStage === 'verify' && (
            <>
              <p>Enter the code sent to <strong>{form.phone}</strong>.</p>
              <label>Verification code<input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required minLength="4" maxLength="9" value={form.code} onChange={update} /></label>
              <div className="form-switch">
                <button className="button button-secondary" type="button" onClick={changePhone}>Change phone</button>{' '}
                <button className="button button-secondary" type="button" disabled={resendIn > 0 || retryIn > 0 || status.pending} onClick={() => resend(otpPurpose)}>
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                </button>
              </div>
            </>
          )}

          {isSignup && signupStage === 'details' && (
            <>
              <label>Verified phone number<input type="tel" value={form.phone} readOnly /></label>
              <label>Email <span className="optional">(optional)</span><input name="email" type="email" autoComplete="email" maxLength="320" value={form.email} onChange={update} /></label>
              <label>Password<input name="password" type="password" autoComplete="new-password" minLength="8" maxLength="72" required value={form.password} onChange={update} /></label>
            </>
          )}

          {!isSignup && resetStage === 'reset' && (
            <label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength="8" maxLength="72" required value={form.newPassword} onChange={update} /></label>
          )}

          {!isSignup && !resetStage && (
            <label>Password<input name="password" type="password" autoComplete="current-password" minLength="8" maxLength="72" required value={form.password} onChange={update} /></label>
          )}

          {status.error && <p className="form-status error" role="alert">{status.error}</p>}
          {status.success && <p className="form-status success" role="status">{status.success}</p>}
          <button className="button button-full" disabled={status.pending || retryIn > 0} type="submit">
            {status.pending ? 'Please wait…' : retryIn > 0 ? `Try again in ${retryIn}s` : otpStage === 'request' ? 'Send verification code' : otpStage === 'verify' ? 'Verify code' : isSignup ? 'Create account' : resetStage ? 'Reset password' : 'Log in'}
          </button>
        </form>

        {!isSignup && !resetStage && <p className="form-switch"><button className="button button-secondary" type="button" onClick={() => { setResetStage('request'); setStatus({ pending: false, error: '', success: '' }) }}>Forgot password?</button></p>}
        {!isSignup && resetStage && <p className="form-switch"><button className="button button-secondary" type="button" onClick={() => { setResetStage(null); setStatus({ pending: false, error: '', success: '' }) }}>Back to login</button></p>}
        <p className="form-switch">
          {isSignup ? 'Already have an account?' : 'New to Groomit?'}{' '}
          <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Log in' : 'Create one'}</Link>
        </p>
      </section>
    </main>
  )
}
