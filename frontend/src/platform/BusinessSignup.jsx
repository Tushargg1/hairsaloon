import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import { retryAfterSeconds } from '../shared/api/client.js'
import { errorMessage } from './salon-api.js'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import InputField from '../shared/components/InputField.jsx'
import Icon from '../shared/components/Icon.jsx'

const BG = '/background-windows-img.png'

const BENEFITS = [
  { icon: 'event_available', text: 'Take bookings 24/7 without answering the phone' },
  { icon: 'language', text: 'Your own site at yourname.groomit.in' },
  { icon: 'groups', text: 'Manage staff, hours, and time off in one place' },
  { icon: 'insights', text: 'See revenue and no-show trends at a glance' },
]

function useCountdown(value, setValue) {
  useEffect(() => {
    if (value <= 0) return undefined
    const timer = window.setTimeout(() => setValue((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [value, setValue])
}

export default function BusinessSignup() {
  const { user, businessSignup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' })
  const [status, setStatus] = useState({ pending: false, error: '', success: '' })
  const [retryIn, setRetryIn] = useState(0)

  useCountdown(retryIn, setRetryIn)

  if (user) {
    const destination = user.role === 'SALON_OWNER' ? '/salon-signup'
      : user.role === 'PLATFORM_ADMIN' ? '/admin/approvals' : '/salons'
    return <Navigate to={destination} replace />
  }

  function update(e) { setForm((c) => ({ ...c, [e.target.name]: e.target.value })) }
  function fail(error, fallback) {
    setRetryIn(retryAfterSeconds(error))
    setStatus({ pending: false, success: '', error: errorMessage(error, fallback) })
  }

  async function submit(e) {
    e.preventDefault()
    setStatus({ pending: true, error: '', success: '' })
    try {
      await businessSignup({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      navigate('/salon-signup', { replace: true })
    } catch (error) { fail(error, 'Unable to create your business account.') }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 md:p-6 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-cover bg-center opacity-40 mix-blend-overlay" style={{ backgroundImage: `url('${BG}')` }} />
        <div className="absolute inset-0 bg-background/80" />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid md:grid-cols-2 gap-8 md:gap-16 items-center py-12">
        {/* Left: Pitch */}
        <div className="hidden md:flex flex-col justify-center">
          <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-3">For salon owners</p>
          <h1 className="font-display text-display-lg text-secondary-fixed mb-4">Grow your salon.</h1>
          <p className="font-body text-body-lg text-on-surface-variant mb-8">
            Join Groomit and let customers book you online. Free to start, no card required.
          </p>
          <ul className="flex flex-col gap-4">
            {BENEFITS.map((b) => (
              <li key={b.text} className="flex items-start gap-3">
                <Icon name={b.icon} filled className="text-secondary text-xl mt-0.5" />
                <span className="font-body text-body-md text-on-surface">{b.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="md:hidden text-center mb-8">
            <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">For salon owners</p>
            <h1 className="font-display text-headline-md text-on-surface">Grow your salon</h1>
          </div>

          <GlassPanel>
            <h2 className="font-display text-headline-sm text-on-surface mb-1">Create your account</h2>
            <p className="font-body text-body-md text-on-surface-variant mb-6">Fill in your details to get started.</p>

            <form onSubmit={submit} className="flex flex-col gap-5">
              <InputField
                label="Your name" icon="person" name="name" value={form.name} onChange={update}
                placeholder="Full name" required minLength={2} maxLength={160} autoComplete="name"
              />
              <InputField
                label="Business phone number" icon="phone_iphone" type="tel" name="phone"
                value={form.phone} onChange={update} placeholder="9876543210"
                required minLength={10} maxLength={15} autoComplete="tel" inputMode="tel"
              />
              <InputField
                label="Business email" icon="mail" type="email" name="email" value={form.email}
                onChange={update} placeholder="owner@yoursalon.com" required maxLength={320} autoComplete="email"
              >
                <p className="font-body text-label-sm text-outline mt-1">
                  You'll sign in with this email at the management login.
                </p>
              </InputField>
              <InputField
                label="Password" icon="lock" type="password" name="password" value={form.password}
                onChange={update} placeholder="At least 8 characters" required minLength={8}
                maxLength={72} autoComplete="new-password"
              />

              {status.error && <p className="font-body text-body-md text-error bg-error-container/20 rounded px-3 py-2" role="alert">{status.error}</p>}
              {status.success && <p className="font-body text-body-md text-[#A89048] bg-[rgba(168,144,72,0.1)] rounded px-3 py-2" role="status">{status.success}</p>}

              <BrassButton type="submit" disabled={status.pending || retryIn > 0} size="lg" className="w-full">
                {status.pending ? 'Please wait...'
                  : retryIn > 0 ? `Try again in ${retryIn}s`
                  : 'Create business account'}
              </BrassButton>
            </form>

            <p className="text-center font-body text-label-sm text-on-surface-variant mt-6">
              Already registered?{' '}
              <Link to="/manage/login" className="text-secondary hover:underline">Sign in here</Link>
            </p>
          </GlassPanel>

          <p className="text-center font-body text-label-sm text-on-surface-variant/70 mt-6">
            By proceeding, you agree to our{' '}
            <Link to="/terms" className="text-secondary hover:underline">Terms of Service</Link> and{' '}
            <Link to="/privacy" className="text-secondary hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </main>
  )
}
