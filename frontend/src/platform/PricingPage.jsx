import { useState } from 'react'
import { Link } from 'react-router-dom'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import Icon from '../shared/components/Icon.jsx'

/**
 * Plan definitions. Every listed capability maps to a feature that exists in the
 * product today, so the page does not promise anything we cannot deliver.
 */
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For a single chair getting online',
    monthly: 0,
    yearly: 0,
    badge: 'Free forever',
    cta: 'Start free',
    highlighted: false,
    features: [
      'Your own booking page at yourname.groomit.in',
      'Up to 2 staff members',
      'Up to 10 services',
      'Unlimited online bookings',
      'Walk-in bookings from the calendar',
      'Email confirmations and reminders',
      'Customer reviews on your page',
      'Day and week calendar view',
    ],
    absent: ['Promotional discount codes', 'Photo gallery', 'Analytics dashboard'],
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'For a growing salon with a team',
    monthly: 799,
    yearly: 7990,
    badge: 'Most popular',
    cta: 'Choose Studio',
    highlighted: true,
    features: [
      'Everything in Starter',
      'Up to 10 staff members',
      'Unlimited services',
      'Promotional discount codes',
      'Photo gallery and logo uploads',
      'Analytics dashboard with revenue and no-show trends',
      'Per-staff working hours and time off',
      'Web push notifications',
      'Priority email support',
    ],
    absent: [],
  },
  {
    id: 'signature',
    name: 'Signature',
    tagline: 'For established multi-stylist salons',
    monthly: 1999,
    yearly: 19990,
    badge: null,
    cta: 'Choose Signature',
    highlighted: false,
    features: [
      'Everything in Studio',
      'Unlimited staff members',
      'Advanced analytics with service and staff breakdowns',
      'Custom cancellation windows',
      'Featured placement in the salon directory',
      'Onboarding call and data import help',
      'Priority support with same-day response',
    ],
    absent: [],
  },
]

const FAQS = [
  {
    q: 'Is Groomit really free to start?',
    a: 'Yes. The Starter plan is free with no time limit and no card required. You can take unlimited bookings on it.',
  },
  {
    q: 'Do customers pay Groomit anything?',
    a: 'No. Customers book for free. Payment for the service is collected by the salon, usually at the appointment.',
  },
  {
    q: 'Do you charge commission per booking?',
    a: 'No. Plans are a flat monthly or yearly fee. We do not take a cut of your service revenue.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes, upgrade or downgrade at any time. Upgrades apply immediately; downgrades take effect at the end of your current billing period.',
  },
  {
    q: 'What happens if I cancel?',
    a: 'Your listing stays active until the end of the period you have paid for, then reverts to Starter. Your bookings and customer history are preserved.',
  },
  {
    q: 'How do I get paid by customers?',
    a: 'You collect payment directly at your salon, exactly as you do today. Groomit handles the booking, not the payment.',
  },
]

function rupees(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(value)
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false)

  return (
    <main className="max-w-[1280px] mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">Pricing</p>
        <h1 className="font-display text-headline-md md:text-display-lg text-on-surface mb-3">
          Simple plans, no commission
        </h1>
        <p className="font-body text-body-lg text-on-surface-variant max-w-2xl mx-auto">
          Start free and upgrade when your salon grows. Every plan includes your own booking
          page and unlimited appointments.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4 mb-10">
        <span className={`font-body text-label-md transition-colors ${yearly ? 'text-on-surface-variant' : 'text-secondary'}`}>
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={yearly}
          aria-label="Toggle yearly billing"
          onClick={() => setYearly((v) => !v)}
          className={`relative w-14 h-7 rounded-full border transition-colors ${yearly ? 'brass-gradient border-brass' : 'bg-surface-container-high border-outline-variant/50'}`}
        >
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-on-surface transition-all ${yearly ? 'left-8' : 'left-1'}`} />
        </button>
        <span className={`font-body text-label-md transition-colors ${yearly ? 'text-secondary' : 'text-on-surface-variant'}`}>
          Yearly
          <span className="ml-2 bg-[rgba(168,144,72,0.15)] text-[#A89048] px-2 py-0.5 rounded-full text-label-sm">
            2 months free
          </span>
        </span>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16 items-start">
        {PLANS.map((plan) => {
          const price = yearly ? plan.yearly : plan.monthly
          const isFree = price === 0
          return (
            <GlassPanel
              key={plan.id}
              className={`flex flex-col h-full relative ${plan.highlighted ? 'border-secondary/50 amber-glow lg:-mt-3 lg:pb-10' : ''}`}
            >
              {plan.badge && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full font-body text-label-sm whitespace-nowrap ${plan.highlighted ? 'brass-gradient' : 'bg-surface-container-high text-secondary border border-outline-variant/50'}`}>
                  {plan.badge}
                </span>
              )}

              <div className="mb-6 pt-2">
                <h2 className="font-display text-headline-sm text-secondary-fixed mb-1">{plan.name}</h2>
                <p className="font-body text-label-sm text-on-surface-variant">{plan.tagline}</p>
              </div>

              <div className="mb-6">
                <span className="font-display text-display-lg-mobile text-on-surface">
                  {isFree ? 'Free' : rupees(price)}
                </span>
                {!isFree && (
                  <span className="font-body text-body-md text-on-surface-variant">
                    {yearly ? ' / year' : ' / month'}
                  </span>
                )}
                {!isFree && yearly && (
                  <p className="font-body text-label-sm text-outline mt-1">
                    Works out to {rupees(Math.round(plan.yearly / 12))} per month
                  </p>
                )}
              </div>

              <BrassButton
                to="/for-business"
                variant={plan.highlighted ? 'primary' : 'outline'}
                className="w-full mb-6"
              >
                {plan.cta}
              </BrassButton>

              <ul className="flex flex-col gap-2.5 flex-grow">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Icon name="check" className="text-[#A89048] text-[18px] mt-0.5 flex-shrink-0" />
                    <span className="font-body text-body-md text-on-surface-variant">{f}</span>
                  </li>
                ))}
                {plan.absent.map((f) => (
                  <li key={f} className="flex items-start gap-2 opacity-50">
                    <Icon name="close" className="text-outline text-[18px] mt-0.5 flex-shrink-0" />
                    <span className="font-body text-body-md text-outline line-through">{f}</span>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          )
        })}
      </div>

      {/* Trust strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
        {[
          { icon: 'payments', title: 'No commission', text: 'Keep every rupee your services earn.' },
          { icon: 'credit_card_off', title: 'No card to start', text: 'The Starter plan needs no payment details.' },
          { icon: 'logout', title: 'Cancel anytime', text: 'No lock-in contracts or exit fees.' },
        ].map((item) => (
          <div key={item.title} className="glass-surface metallic-border rounded-lg p-6 text-center">
            <Icon name={item.icon} filled className="text-secondary text-3xl mb-3" />
            <h3 className="font-display text-title-lg text-on-surface mb-1">{item.title}</h3>
            <p className="font-body text-body-md text-on-surface-variant">{item.text}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <section className="mb-16">
        <h2 className="font-display text-headline-sm text-on-surface text-center mb-8">
          Common questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {FAQS.map((f) => (
            <GlassPanel key={f.q}>
              <h3 className="font-body text-title-lg text-on-surface text-base mb-2">{f.q}</h3>
              <p className="font-body text-body-md text-on-surface-variant">{f.a}</p>
            </GlassPanel>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <GlassPanel className="text-center py-12">
        <h2 className="font-display text-headline-sm text-on-surface mb-3">
          Ready to take bookings online?
        </h2>
        <p className="font-body text-body-lg text-on-surface-variant mb-8 max-w-xl mx-auto">
          Set up your salon in a few minutes. Start on the free plan and upgrade whenever you
          are ready.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <BrassButton to="/for-business" size="lg">List Your Salon</BrassButton>
          <BrassButton to="/contact" variant="outline" size="lg">Talk to Us</BrassButton>
        </div>
      </GlassPanel>

      <p className="text-center font-body text-label-sm text-on-surface-variant mt-8">
        Prices are in Indian Rupees and exclude applicable taxes. See our{' '}
        <Link to="/refund-policy" className="text-secondary hover:underline">Refund Policy</Link>{' '}
        and{' '}
        <Link to="/terms" className="text-secondary hover:underline">Terms of Service</Link>.
      </p>
    </main>
  )
}
