import { Link, useOutletContext } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import Icon from '../shared/components/Icon.jsx'
import VideoHero from '../shared/components/VideoHero.jsx'
import ThemeSwitch from '../shared/components/ThemeSwitch.jsx'

// The core things a salon gets — each maps to a real problem it solves.
const FEATURES = [
  { icon: 'language', title: 'Your own booking website', text: 'A branded page at yourname.groomit.in so customers find you on Google and book online.' },
  { icon: 'event_available', title: 'Online appointments 24/7', text: 'Customers book themselves anytime — even when the salon is closed. No more missed calls.' },
  { icon: 'chat', title: 'WhatsApp automation', text: 'Confirmations and reminders sent automatically on WhatsApp, cutting no-shows almost in half.' },
  { icon: 'smart_toy', title: 'AI chatbot', text: 'Answers customer questions and books appointments round the clock — even when you are busy.', soon: true },
  { icon: 'groups', title: 'Customer records (CRM)', text: 'Every customer and their booking history in one place, so you can bring them back.' },
  { icon: 'insights', title: 'AI sales insights', text: 'See your busiest hours, top services, and where your money comes from.' },
  { icon: 'star', title: 'Reviews that build trust', text: 'Show your Google rating and collect real reviews from completed appointments.' },
]

// Three-step "how it works" for owners.
const STEPS = [
  { icon: 'app_registration', title: 'Register', text: 'Claim your subdomain and add your salon details in minutes.' },
  { icon: 'tune', title: 'Set up', text: 'Add your services, staff, working hours and time off.' },
  { icon: 'trending_up', title: 'Grow', text: 'Take bookings around the clock and watch your chair stay full.' },
]

export default function HomePage() {
  const { siteLight, toggleSiteTheme } = useOutletContext() || {}
  const spacerRef = useRef(null)
  const [loadVideo, setLoadVideo] = useState(false)

  // Load the heavy hero video shortly after first paint so the image shows instantly.
  useEffect(() => {
    const t = setTimeout(() => setLoadVideo(true), 200)
    return () => clearTimeout(t)
  }, [])

  // Hero snap: when scrolling stops part-way over the hero, settle either back on
  // the hero or fully onto the content (same behaviour as the salon page).
  useEffect(() => {
    let timer
    let snapping = false
    const onScroll = () => {
      if (snapping) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        const limit = spacerRef.current?.offsetHeight || 0
        const y = window.scrollY
        if (!limit || y <= 0 || y >= limit) return
        snapping = true
        window.scrollTo({ top: y < limit / 2 ? 0 : limit, behavior: 'smooth' })
        setTimeout(() => { snapping = false }, 700)
      }, 140)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(timer) }
  }, [])

  return (
    <main className="flex flex-col">
      {/* Fixed hero; content below scrolls up and over it. */}
      <section className="fixed top-0 left-0 right-0 w-full h-[85vh] md:h-[92vh] flex items-end overflow-hidden z-0">
        <VideoHero alt="Groomit" loadVideo={loadVideo} />
        {toggleSiteTheme && (
          <ThemeSwitch checked={!siteLight} onChange={toggleSiteTheme}
            className="absolute top-[67px] right-4 lg:right-6 z-20 drop-shadow-lg" style={{ '--toggle-size': '8px' }} />
        )}
        <div className="hero-content relative z-10 w-full max-w-[1280px] mx-auto px-4 lg:px-6 pb-[5vh] flex flex-col items-center text-center">
          <h1 className="font-display text-display-lg-mobile md:text-display-lg text-white mb-6 max-w-4xl leading-tight">
            Grow Your Salon with Groomit
          </h1>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/for-business" className="vintage-cta">
              <Icon name="storefront" className="text-[18px]" />
              List Your Salon
            </Link>
            <Link to="/pricing" className="vintage-cta">
              <Icon name="sell" className="text-[18px]" />
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Transparent spacer matching the fixed hero height. */}
      <div ref={spacerRef} className="h-[calc(85vh-3rem)] md:h-[calc(92vh-3rem)] pointer-events-none bg-transparent" aria-hidden="true" />

      <div className="site-content-top flex flex-col relative z-10">
        {/* What you get — the core value props */}
        <section className="pt-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto">
          <div className="booking-frame">
            <div className="booking-plate !min-h-0">
              <div className="booking-texture" />
              <div className="vintage-heading-row relative z-10">
                <span className="vintage-heading-rule" />
                <h2 className="vintage-heading gold-gradient-text">What You Get</h2>
                <span className="vintage-heading-rule" />
              </div>
              <p className="relative z-10 font-body text-body-md text-center mb-6 max-w-xl mx-auto text-on-surface-variant">
                Everything a salon needs to get found, get booked, and keep customers coming back — in one place.
              </p>
              <div className="relative z-10 flex flex-col gap-5">
                {FEATURES.map((f) => (
                  <div key={f.title} className="flex items-start gap-4">
                    <Icon name={f.icon} filled className="text-2xl text-secondary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-display text-title-lg gold-gradient-text mb-0.5 flex items-center gap-2 flex-wrap">
                        {f.title}
                        {f.soon && (
                          <span className="font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-secondary/50 text-secondary">
                            Coming soon
                          </span>
                        )}
                      </h3>
                      <p className="font-body text-body-md text-on-surface-variant">{f.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="price-mark relative z-10 mt-6">&mdash; Groomit &mdash;</p>
            </div>
          </div>
        </section>

        {/* How it works — three steps */}
        <section className="pt-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto">
          <div className="booking-frame">
            <div className="booking-plate !min-h-0">
              <div className="booking-texture" />
              <div className="vintage-heading-row relative z-10">
                <span className="vintage-heading-rule" />
                <h2 className="vintage-heading gold-gradient-text">How It Works</h2>
                <span className="vintage-heading-rule" />
              </div>
              <div className="relative z-10 flex flex-col gap-5">
                {STEPS.map((s, i) => (
                  <div key={s.title} className="flex items-start gap-4">
                    <span className="font-display text-secondary text-label-md tracking-widest pt-1 flex-shrink-0">0{i + 1}</span>
                    <div>
                      <h3 className="font-display text-title-lg gold-gradient-text mb-0.5 flex items-center gap-2">
                        <Icon name={s.icon} className="text-secondary text-[18px]" />
                        {s.title}
                      </h3>
                      <p className="font-body text-body-md text-on-surface-variant">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="price-mark relative z-10 mt-6">&mdash; Groomit &mdash;</p>
            </div>
          </div>
        </section>

        {/* Own a Salon CTA */}
        <section className="pt-12 pb-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto" id="for-owners">
          <div className="booking-frame">
            <div className="booking-plate !min-h-0 text-center">
              <div className="booking-texture" />
              <div className="vintage-heading-row relative z-10">
                <span className="vintage-heading-rule" />
                <h2 className="vintage-heading gold-gradient-text">Own a Salon?</h2>
                <span className="vintage-heading-rule" />
              </div>
              <p className="relative z-10 font-body text-body-md mb-8 max-w-xl mx-auto text-on-surface-variant">
                List your business on Groomit and reach customers looking for premium grooming
                services. Free to start, and we never take commission.
              </p>
              <div className="relative z-10 flex flex-wrap gap-3 justify-center">
                <Link to="/for-business" className="vintage-cta">Get Started Free</Link>
                <Link to="/pricing" className="vintage-cta">See Pricing</Link>
              </div>
              <p className="price-mark relative z-10 mt-6">&mdash; Groomit &mdash;</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
