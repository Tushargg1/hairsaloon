import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import { retryAfterSeconds } from '../shared/api/client.js'
import { errorMessage } from './salon-api.js'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import InputField from '../shared/components/InputField.jsx'
import Icon from '../shared/components/Icon.jsx'

const AUTH_BG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlRph_NbANkQiitgPiFLyVCbA-xOK3Gr9WsN5qB2N-1j9PleSEIpMOhq4dls0GnT2gy0iyQVU_OMKlgRDKlOh9FpoSaV-FXEJ82dwhTj8QBLv02JDQDsLOe96tu7pe55ixfK7E3D9ZT4xU87tAte5pegfITWQy66DODqQxeE_C0S5s4ZB0aeCGINQzzFWidbQSp5iNyh0VyjiIvU1tbQ-PCnK3PMMnZSSjcPdMMs8GJV5utDtNIf0sLxDMu1RoqbsLGQ'

function useCountdown(value, setValue) {
  useEffect(() => {
    if (value <= 0) return undefined
    const timer = window.setTimeout(() => setValue((s) => Math.max(0, s - 1)), 1000)
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

  function update(e) { setForm((c) => ({ ...c, [e.target.name]: e.target.value })) }
  function fail(error, fallback) {
    setRetryIn(retryAfterSeconds(error))
    setStatus({ pending: false, success: '', error: errorMessage(error, fallback) })
  }

  async function sendOtp(purpose) {
    setStatus({ pending: true, error: '', success: '' })
    try {
      const challenge = await requestOtp({ phone: form.phone.trim(), purpose })
      setChallengeId(challenge.challengeId)
      setForm((c) => ({ ...c, code: '' }))
      setResendIn(Number(challenge.resendAfterSeconds) || 0)
      setStatus({ pending: false, error: '', success: 'Verification code sent.' })
      return true
    } catch (error) { fail(error, 'Unable to send verification code.'); return false }
  }

  async function submitSignup(e) {
    e.preventDefault()
    if (signupStage === 'request') { if (await sendOtp('SIGNUP')) setSignupStage('verify'); return }
    if (signupStage === 'verify') {
      setStatus({ pending: true, error: '', success: '' })
      try {
        const proof = await verifyOtp({ challengeId, code: form.code.trim() })
        setVerificationProof(proof.verificationProof)
        setSignupStage('details')
        setStatus({ pending: false, error: '', success: 'Phone verified. Complete your details.' })
      } catch (error) { fail(error, 'Verification code could not be confirmed.') }
      return
    }
    setStatus({ pending: true, error: '', success: '' })
    try {
      await signup({ phone: form.phone.trim(), email: form.email.trim() || undefined, password: form.password, verificationProof })
      navigate('/salons', { replace: true })
    } catch (error) { fail(error, 'Unable to create account.') }
  }

  async function submitLogin(e) {
    e.preventDefault()
    setStatus({ pending: true, error: '', success: '' })
    try {
      await login({ phone: form.phone.trim(), password: form.password })
      navigate(requestedPath || '/salons', { replace: true })
    } catch (error) { fail(error, 'Unable to log in.') }
  }

  async function submitReset(e) {
    e.preventDefault()
    if (resetStage === 'request') { if (await sendOtp('PASSWORD_RESET')) setResetStage('verify'); return }
    if (resetStage === 'verify') {
      setStatus({ pending: true, error: '', success: '' })
      try {
        const proof = await verifyOtp({ challengeId, code: form.code.trim() })
        setVerificationProof(proof.verificationProof)
        setResetStage('reset')
        setStatus({ pending: false, error: '', success: 'Code verified. Choose a new password.' })
      } catch (error) { fail(error, 'Verification code could not be confirmed.') }
      return
    }
    setStatus({ pending: true, error: '', success: '' })
    try {
      await resetPassword({ phone: form.phone.trim(), newPassword: form.newPassword, verificationProof })
      setForm((c) => ({ ...c, password: '', newPassword: '', code: '' }))
      setResetStage(null); setChallengeId(''); setVerificationProof('')
      setStatus({ pending: false, error: '', success: 'Password reset. You can now log in.' })
    } catch (error) { fail(error, 'Unable to reset password.') }
  }

  async function resend(purpose) {
    if (resendIn > 0 || retryIn > 0 || status.pending) return
    await sendOtp(purpose)
  }

  function changePhone() {
    setSignupStage('request'); setResetStage(resetStage ? 'request' : null)
    setChallengeId(''); setVerificationProof(''); setResendIn(0)
    setStatus({ pending: false, error: '', success: '' })
  }

  const otpStage = isSignup ? signupStage : resetStage
  const inOtpFlow = isSignup || Boolean(resetStage)
  const heading = isSignup ? 'Sign Up' : resetStage ? 'Reset Password' : 'Log In'
  const submit = isSignup ? submitSignup : resetStage ? submitReset : submitLogin
  const otpPurpose = isSignup ? 'SIGNUP' : 'PASSWORD_RESET'
  const currentStep = otpStage === 'request' ? 1 : otpStage === 'verify' ? 2 : 3

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 md:p-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-cover bg-center opacity-40 mix-blend-overlay" style={{ backgroundImage: `url('${AUTH_BG}')` }} />
        <div className="absolute inset-0 bg-background/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl grid md:grid-cols-2 gap-6 md:gap-20 items-center">
        {/* Left: Branding (desktop) */}
        <div className="hidden md:flex flex-col justify-center pr-6">
          <div className="w-24 h-24 rounded-full bg-secondary-container flex items-center justify-center mb-12 border border-outline-variant/50">
            <span className="font-display font-bold text-secondary text-4xl">G</span>
          </div>
          <h1 className="font-display text-display-lg text-secondary-fixed mb-3">A cut above the rest.</h1>
          <p className="font-body text-body-lg text-on-surface-variant max-w-md">
            Experience the tradition of fine grooming. Sign in to manage your appointments and discover premium services.
          </p>
        </div>

        {/* Right: Auth Form */}
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="md:hidden flex justify-center mb-12">
            <div className="w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center border border-outline-variant/50">
              <span className="font-display font-bold text-secondary text-3xl">G</span>
            </div>
          </div>

          <GlassPanel className="relative overflow-hidden">
            {/* Tabs (Login / Signup) */}
            {!resetStage && (
              <div className="flex border-b border-outline-variant/30 mb-8">
                <Link to="/login" className={`flex-1 pb-3 font-body text-title-lg text-center transition-colors ${!isSignup ? 'text-secondary border-b-2 border-brass' : 'text-on-surface-variant'}`}>
                  Log In
                </Link>
                <Link to="/signup" className={`flex-1 pb-3 font-body text-title-lg text-center transition-colors ${isSignup ? 'text-secondary border-b-2 border-brass' : 'text-on-surface-variant'}`}>
                  Sign Up
                </Link>
              </div>
            )}

            {/* Progress dots for OTP flow */}
            {inOtpFlow && (
              <div className="flex justify-center gap-3 mb-8">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`w-12 h-1 rounded-full transition-colors duration-300 ${s <= currentStep ? 'bg-brass' : 'bg-outline-variant/30'}`} />
                ))}
              </div>
            )}

            {/* Heading */}
            <h2 className="font-display text-headline-sm text-on-surface mb-2">{heading}</h2>
            {inOtpFlow && <p className="font-body text-body-md text-on-surface-variant mb-6">Step {currentStep} of 3</p>}

            <form onSubmit={submit} className="flex flex-col gap-5">
              {/* Step 1: Phone (for OTP) or Login fields */}
              {(otpStage === 'request' || !inOtpFlow) && (
                <InputField
                  label="Phone Number"
                  icon="phone_iphone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={update}
                  placeholder="9876543210"
                  required
                  minLength={10}
                  maxLength={15}
                  autoComplete="tel"
                  inputMode="tel"
                />
              )}

              {/* Login password */}
              {!isSignup && !resetStage && (
                <InputField
                  label="Password"
                  icon="lock"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={update}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete="current-password"
                />
              )}

              {/* Step 2: OTP Verification */}
              {otpStage === 'verify' && (
                <>
                  <p className="font-body text-body-md text-on-surface-variant">
                    Enter the code sent to <strong className="text-on-surface">{form.phone}</strong>.
                  </p>
                  <InputField
                    label="Verification Code"
                    icon="pin"
                    type="text"
                    name="code"
                    value={form.code}
                    onChange={update}
                    placeholder="123456"
                    required
                    minLength={4}
                    maxLength={9}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                  />
                  <div className="flex gap-3">
                    <button type="button" onClick={changePhone} className="flex-1 border border-outline-variant rounded-lg py-2 font-body text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
                      Change phone
                    </button>
                    <button type="button" onClick={() => resend(otpPurpose)} disabled={resendIn > 0 || retryIn > 0 || status.pending} className="flex-1 border border-outline-variant rounded-lg py-2 font-body text-label-md text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: Details (Signup) */}
              {isSignup && signupStage === 'details' && (
                <>
                  <InputField label="Verified Phone" icon="check_circle" type="tel" value={form.phone} readOnly />
                  <InputField
                    label="Email (optional)"
                    icon="mail"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={update}
                    placeholder="you@example.com"
                    maxLength={320}
                    autoComplete="email"
                  />
                  <InputField
                    label="Password"
                    icon="lock"
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={update}
                    placeholder="Create a strong password"
                    required
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                  />
                </>
              )}

              {/* Reset: new password */}
              {!isSignup && resetStage === 'reset' && (
                <InputField
                  label="New Password"
                  icon="lock"
                  type="password"
                  name="newPassword"
                  value={form.newPassword}
                  onChange={update}
                  placeholder="Choose a new password"
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                />
              )}

              {/* Status messages */}
              {status.error && <p className="font-body text-body-md text-error bg-error-container/20 rounded px-3 py-2" role="alert">{status.error}</p>}
              {status.success && <p className="font-body text-body-md text-[#A89048] bg-[rgba(168,144,72,0.1)] rounded px-3 py-2" role="status">{status.success}</p>}

              {/* Submit */}
              <BrassButton type="submit" disabled={status.pending || retryIn > 0} size="lg" className="w-full mt-2">
                {status.pending ? 'Please wait...' : retryIn > 0 ? `Try again in ${retryIn}s`
                  : otpStage === 'request' ? 'Send verification code'
                  : otpStage === 'verify' ? 'Verify code'
                  : isSignup ? 'Create account'
                  : resetStage ? 'Reset password'
                  : 'Log In'}
              </BrassButton>
            </form>

            {/* Forgot password / back to login */}
            {!isSignup && !resetStage && (
              <p className="text-center mt-6">
                <button type="button" onClick={() => { setResetStage('request'); setStatus({ pending: false, error: '', success: '' }) }} className="font-body text-label-md text-secondary hover:text-secondary-fixed transition-colors">
                  Forgot password?
                </button>
              </p>
            )}
            {!isSignup && resetStage && (
              <p className="text-center mt-6">
                <button type="button" onClick={() => { setResetStage(null); setStatus({ pending: false, error: '', success: '' }) }} className="font-body text-label-md text-secondary hover:text-secondary-fixed transition-colors">
                  Back to login
                </button>
              </p>
            )}

            {/* Switch link */}
            <p className="text-center font-body text-label-sm text-on-surface-variant mt-6">
              {isSignup ? 'Already have an account?' : 'New to Groomit?'}{' '}
              <Link to={isSignup ? '/login' : '/signup'} className="text-secondary hover:underline">
                {isSignup ? 'Log in' : 'Create one'}
              </Link>
            </p>
          </GlassPanel>

          <p className="text-center font-body text-label-sm text-on-surface-variant/70 mt-6">
            By proceeding, you agree to our <a href="#" className="text-secondary hover:underline">Terms of Service</a> and <a href="#" className="text-secondary hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </main>
  )
}
