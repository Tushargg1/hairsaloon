import { Link } from 'react-router-dom'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import Icon from '../shared/components/Icon.jsx'

const CHANNELS = [
  {
    icon: 'mail',
    label: 'Email us',
    value: 'hello@groomit.in',
    href: 'mailto:hello@groomit.in',
    note: 'General questions, feedback, and account help. We reply within two working days.',
  },
  {
    icon: 'storefront',
    label: 'Salon partnerships',
    value: 'partners@groomit.in',
    href: 'mailto:partners@groomit.in',
    note: 'Listing your salon, pricing questions, or onboarding support.',
  },
  {
    icon: 'shield',
    label: 'Privacy and data requests',
    value: 'privacy@groomit.in',
    href: 'mailto:privacy@groomit.in',
    note: 'Access, correction, or deletion of your personal information.',
  },
]

const FAQS = [
  {
    q: 'I need to cancel an appointment',
    a: 'Open your bookings page and cancel from there. If the salon\'s cancellation window has passed, contact the salon directly using the details on its page.',
  },
  {
    q: 'The service I received was not as expected',
    a: 'Please raise it with the salon first, since they delivered the service. If you cannot reach a resolution, email us and we will help where we can.',
  },
  {
    q: 'I want to list my salon',
    a: 'Register on our business signup page. Your listing goes live once we review and approve it.',
  },
  {
    q: 'I forgot my password',
    a: 'Use the "Forgot password?" link on the login page. We will verify your phone by one-time code and let you set a new password.',
  },
]

export default function ContactPage() {
  return (
    <main className="max-w-[1000px] mx-auto px-4 py-12">
      <div className="mb-8">
        <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">Support</p>
        <h1 className="font-display text-headline-md text-on-surface">Contact Us</h1>
        <p className="font-body text-body-lg text-on-surface-variant mt-2 max-w-2xl">
          Whether you are booking an appointment or running a salon, we are here to help.
        </p>
      </div>

      {/* Channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {CHANNELS.map((c) => (
          <GlassPanel key={c.label} className="flex flex-col">
            <div className="w-11 h-11 rounded-full bg-secondary-container/50 flex items-center justify-center mb-4">
              <Icon name={c.icon} filled className="text-secondary text-xl" />
            </div>
            <h2 className="font-display text-title-lg text-on-surface mb-1">{c.label}</h2>
            <a href={c.href} className="font-body text-body-md text-secondary hover:underline break-all mb-2">
              {c.value}
            </a>
            <p className="font-body text-label-sm text-on-surface-variant">{c.note}</p>
          </GlassPanel>
        ))}
      </div>

      {/* Quick answers */}
      <GlassPanel className="mb-10">
        <h2 className="font-display text-headline-sm text-on-surface mb-6 flex items-center gap-3">
          <Icon name="help" className="text-secondary text-2xl" />
          Before you write to us
        </h2>
        <div className="flex flex-col divide-y divide-outline-variant/20">
          {FAQS.map((f) => (
            <div key={f.q} className="py-4 first:pt-0 last:pb-0">
              <h3 className="font-body text-title-lg text-on-surface text-base mb-1">{f.q}</h3>
              <p className="font-body text-body-md text-on-surface-variant">{f.a}</p>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Business CTA */}
      <GlassPanel className="text-center">
        <h2 className="font-display text-headline-sm text-on-surface mb-2">Ready to list your salon?</h2>
        <p className="font-body text-body-md text-on-surface-variant mb-6 max-w-lg mx-auto">
          Set up your profile, services, and staff in a few minutes. Free to start.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <BrassButton to="/for-business">Get Started</BrassButton>
          <BrassButton to="/pricing" variant="outline">View Pricing</BrassButton>
        </div>
      </GlassPanel>

      <p className="text-center font-body text-label-sm text-on-surface-variant mt-8">
        See also our <Link to="/terms" className="text-secondary hover:underline">Terms of Service</Link>,{' '}
        <Link to="/privacy" className="text-secondary hover:underline">Privacy Policy</Link>, and{' '}
        <Link to="/refund-policy" className="text-secondary hover:underline">Refund Policy</Link>.
      </p>
    </main>
  )
}
