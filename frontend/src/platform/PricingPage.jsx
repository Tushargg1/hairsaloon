import { Link } from 'react-router-dom'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import Icon from '../shared/components/Icon.jsx'

/**
 * Plan definitions. Every listed capability maps to a feature that exists in the
 * product today, so the page does not promise anything we cannot deliver.
 */
const PLAN = {
  name: 'Complete',
  tagline: 'Every feature, no limits',
  oneMonth: 999,
  oneMonthWas: 1999,
  twoMonth: 1499,
  twoMonthWas: 3999,
  features: [
    'Your own booking page at yourname.groomit.in',
    'Unlimited staff members and services',
    'Unlimited online bookings',
    'Walk-in bookings from the calendar',
    'Email confirmations and reminders',
    'Customer reviews on your page',
    'Day and week calendar view',
    'Promotional discount codes and combo offers',
    'Photo gallery and logo uploads',
    'Analytics dashboard with revenue and no-show trends',
    'Per-staff working hours, breaks and time off',
    'Web push notifications',
    'Priority email support',
  ],
}

const FAQS = [
  {
    q: 'What is included in the plan?',
    a: 'Everything. There is a single plan with unlimited staff, services and bookings, plus promotions, gallery, analytics and notifications.',
  },
  {
    q: 'Do customers pay Groomit anything?',
    a: 'No. Customers book for free. Payment for the service is collected by the salon, usually at the appointment.',
  },
  {
    q: 'Do you charge commission per booking?',
    a: 'No. The plan is a flat fee. We do not take a cut of your service revenue.',
  },
  {
    q: 'Can I switch between 1 month and 2 months?',
    a: 'Yes. Choose either term at checkout and change it when the current term ends.',
  },
  {
    q: 'What happens if I cancel?',
    a: 'Your listing stays active until the end of the period you have paid for. Your bookings and customer history are preserved.',
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

  return (
    <main className="max-w-[1280px] mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">Pricing</p>
        <h1 className="font-display text-headline-md md:text-display-lg text-on-surface mb-3">
          One plan, no commission
        </h1>
        <p className="font-body text-body-lg text-on-surface-variant max-w-2xl mx-auto">
          Every feature is included, with unlimited staff, services and appointments. No tiers
          to compare and no per-booking cut.
        </p>
      </div>

      {/* Plans side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
        {/* 1 Month Plan */}
        <GlassPanel className="flex flex-col relative border-secondary/50 amber-glow">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full font-body text-label-sm whitespace-nowrap brass-gradient">
            Launch offer
          </span>

          <div className="mb-6 pt-2">
            <h2 className="font-display text-headline-sm text-secondary-fixed mb-1">{PLAN.name}</h2>
            <p className="font-body text-label-sm text-on-surface-variant">1 month</p>
          </div>

          <div className="mb-6">
            <span className="font-display text-headline-sm text-outline line-through mr-3">
              {rupees(PLAN.oneMonthWas)}
            </span>
            <span className="font-display text-display-lg-mobile text-on-surface">
              {rupees(PLAN.oneMonth)}
            </span>
            <span className="font-body text-body-md text-on-surface-variant"> / month</span>
            <p className="font-body text-label-sm text-outline mt-1">
              Offer price, down from {rupees(PLAN.oneMonthWas)}
            </p>
          </div>

          <BrassButton to="/for-business" className="w-full mb-6">Get started</BrassButton>

          <ul className="flex flex-col gap-2.5">
            {PLAN.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Icon name="check" className="text-[#A89048] text-[18px] mt-0.5 flex-shrink-0" />
                <span className="font-body text-body-md text-on-surface-variant">{f}</span>
              </li>
            ))}
          </ul>
        </GlassPanel>

        {/* 2 Months Plan */}
        <GlassPanel className="flex flex-col relative border-secondary/50 amber-glow">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full font-body text-label-sm whitespace-nowrap brass-gradient">
            Best value
          </span>

          <div className="mb-6 pt-2">
            <h2 className="font-display text-headline-sm text-secondary-fixed mb-1">{PLAN.name}</h2>
            <p className="font-body text-label-sm text-on-surface-variant">2 months</p>
          </div>

          <div className="mb-6">
            <span className="font-display text-headline-sm text-outline line-through mr-3">
              {rupees(PLAN.twoMonthWas)}
            </span>
            <span className="font-display text-display-lg-mobile text-on-surface">
              {rupees(PLAN.twoMonth)}
            </span>
            <span className="font-body text-body-md text-on-surface-variant"> / 2 months</span>
            <p className="font-body text-label-sm text-outline mt-1">
              Save {rupees(PLAN.twoMonthWas - PLAN.twoMonth)} — works out to {rupees(Math.round(PLAN.twoMonth / 2))}/mo
            </p>
          </div>

          <BrassButton to="/for-business" className="w-full mb-6">Get started</BrassButton>

          <ul className="flex flex-col gap-2.5">
            {PLAN.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Icon name="check" className="text-[#A89048] text-[18px] mt-0.5 flex-shrink-0" />
                <span className="font-body text-body-md text-on-surface-variant">{f}</span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </div>

      {/* Trust strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
        {[
          { icon: 'payments', title: 'No commission', text: 'Keep every rupee your services earn.' },
          { icon: 'style', title: 'All features included', text: 'No tiers, no locked features.' },
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
          Set up your salon in a few minutes and take bookings the same day.
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
