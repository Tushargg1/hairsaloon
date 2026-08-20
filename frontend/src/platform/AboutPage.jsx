import { Link } from 'react-router-dom'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import Icon from '../shared/components/Icon.jsx'

const HERO_BG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJPIJ2JIxb3RVCeuZEKylrHaYkC9iBqr1ESDbu9hSDBMoaFnzyU30DbmY1hKpWulO2us3e3P1JsUXsjJk6hl7eRxx2By1ce08JGuW6fpEBpz6r6xrHAXom9gvHa6d4KIQ5TDgSAiw4r2DXNctX9_txwNfl026hs7P8mhismD8NaTSlW76CLZmE8PeWYe-YCVdv9UZpLROZgR_dHY3OdUK_u6oL9eaDNvA9VPY7pyeh-vMJI9gKrKEUBMz3aWqfHch-dA'

const VALUES = [
  {
    icon: 'handshake',
    title: 'Salons keep what they earn',
    text: 'We charge a flat plan fee, never a commission on your services. Your revenue stays yours.',
  },
  {
    icon: 'schedule',
    title: 'Time back for owners',
    text: 'No more phone calls during a cut. Customers book themselves, and the calendar stays accurate.',
  },
  {
    icon: 'verified_user',
    title: 'Trust by default',
    text: 'Every listing is reviewed before it goes live, and reviews only come from real completed appointments.',
  },
  {
    icon: 'devices',
    title: 'Built for a phone',
    text: 'Most bookings happen on mobile, so every screen is designed for a thumb first.',
  },
]

const CUSTOMER_STEPS = [
  { icon: 'search', title: 'Find', text: 'Browse salons by city, service, or distance from where you are.' },
  { icon: 'menu_book', title: 'Compare', text: 'See real services, prices, staff, and reviews before you commit.' },
  { icon: 'event_available', title: 'Book', text: 'Pick a slot that is genuinely free and get instant confirmation.' },
]

const OWNER_STEPS = [
  { icon: 'app_registration', title: 'Register', text: 'Claim your subdomain and add your salon details in minutes.' },
  { icon: 'tune', title: 'Set up', text: 'Add services, staff, working hours, and time off.' },
  { icon: 'trending_up', title: 'Grow', text: 'Take bookings around the clock and track how the business is doing.' },
]

export default function AboutPage() {
  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-cover bg-center opacity-30" style={{ backgroundImage: `url('${HERO_BG}')` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        </div>
        <div className="relative z-10 max-w-[900px] mx-auto text-center">
          <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-3">About Groomit</p>
          <h1 className="font-display text-headline-md md:text-display-lg text-on-surface mb-5">
            Booking a haircut should be the easy part
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            Groomit connects people with independent salons and gives those salons the booking
            tools that larger chains take for granted.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="px-4 pb-16 max-w-[900px] mx-auto w-full">
        <GlassPanel className="md:p-10 legal-prose">
          <h2>Why we built this</h2>
          <p>
            Most independent salons still run on a paper diary and a phone that rings mid-haircut.
            Customers call, get no answer, and go somewhere else. Owners lose bookings they never
            knew they had, and end their week with no clear picture of how the business did.
          </p>
          <p>
            The booking platforms that exist tend to take a cut of every appointment. For a small
            salon working on thin margins, that is a real cost. We thought a flat, predictable fee
            made more sense, and that the salon should own its customer relationship rather than
            renting it.
          </p>
          <p>
            So Groomit gives every salon its own booking site on a subdomain, a calendar that
            cannot be double booked, and reminders that reduce no-shows. Customers get one place
            to find salons nearby and book without a phone call.
          </p>

          <h2>What makes it different</h2>
          <p>
            The part we care most about is the booking engine. When two people tap the same
            10:30 slot at the same moment, exactly one of them gets it. That guarantee is
            enforced by the database itself, not by hopeful application code, and we prove it
            with a test that fires twenty simultaneous requests at a single slot and requires
            nineteen of them to fail cleanly.
          </p>
          <p>
            It is an unglamorous detail. It is also the difference between a calendar an owner
            trusts and one they double-check by phone.
          </p>
        </GlassPanel>
      </section>

      {/* Values */}
      <section className="px-4 pb-16 max-w-[1280px] mx-auto w-full">
        <h2 className="font-display text-headline-sm text-on-surface text-center mb-8">
          What we stand for
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VALUES.map((v) => (
            <GlassPanel key={v.title} className="flex gap-4">
              <div className="w-11 h-11 rounded-full bg-secondary-container/50 flex items-center justify-center flex-shrink-0">
                <Icon name={v.icon} filled className="text-secondary text-xl" />
              </div>
              <div>
                <h3 className="font-display text-title-lg text-on-surface mb-1">{v.title}</h3>
                <p className="font-body text-body-md text-on-surface-variant">{v.text}</p>
              </div>
            </GlassPanel>
          ))}
        </div>
      </section>

      {/* How it works, both sides */}
      <section className="px-4 pb-16 max-w-[1280px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            { heading: 'For customers', steps: CUSTOMER_STEPS, cta: 'Find a salon', to: '/salons' },
            { heading: 'For salon owners', steps: OWNER_STEPS, cta: 'List your salon', to: '/for-business' },
          ].map((side) => (
            <GlassPanel key={side.heading} className="flex flex-col">
              <h2 className="font-display text-headline-sm text-secondary-fixed mb-6">{side.heading}</h2>
              <ol className="flex flex-col gap-5 flex-grow mb-6">
                {side.steps.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="font-display text-brass text-label-md tracking-widest pt-1 flex-shrink-0">
                      0{i + 1}
                    </span>
                    <div>
                      <h3 className="font-body text-title-lg text-on-surface text-base mb-0.5 flex items-center gap-2">
                        <Icon name={s.icon} className="text-secondary text-[18px]" />
                        {s.title}
                      </h3>
                      <p className="font-body text-body-md text-on-surface-variant">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <BrassButton to={side.to} variant="outline" className="w-full">{side.cta}</BrassButton>
            </GlassPanel>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 max-w-[1280px] mx-auto w-full">
        <GlassPanel className="text-center py-12">
          <h2 className="font-display text-headline-sm text-on-surface mb-3">
            Join the salons already on Groomit
          </h2>
          <p className="font-body text-body-lg text-on-surface-variant mb-8 max-w-xl mx-auto">
            Free to start, no commission, and no contract. See what it looks like for your salon.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <BrassButton to="/for-business" size="lg">Get Started</BrassButton>
            <BrassButton to="/pricing" variant="outline" size="lg">See Pricing</BrassButton>
          </div>
        </GlassPanel>

        <p className="text-center font-body text-label-sm text-on-surface-variant mt-8">
          Questions? <Link to="/contact" className="text-secondary hover:underline">Get in touch</Link>.
        </p>
      </section>
    </main>
  )
}
