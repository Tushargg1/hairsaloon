import { Link, useOutletContext } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import Icon from '../shared/components/Icon.jsx'
import VideoHero from '../shared/components/VideoHero.jsx'
import ThemeSwitch from '../shared/components/ThemeSwitch.jsx'

const STATS = [
  { icon: 'storefront', value: '500+', label: 'Premium Salons' },
  { icon: 'event_available', value: '50k+', label: 'Bookings Made' },
  { icon: 'star', value: '4.9/5', label: 'Client Reviews' },
]

// Estimated gains a salon can expect after joining Groomit.
const GROWTH = [
  { icon: 'trending_up', value: '+40%', label: 'More bookings on average' },
  { icon: 'schedule', value: '10 hrs', label: 'Saved on calls each week' },
  { icon: 'group_add', value: '3x', label: 'Faster new-customer reach' },
  { icon: 'payments', value: '0%', label: 'Commission on every booking' },
]

// Owner testimonials.
const STORIES = [
  {
    quote: 'Groomit filled my quiet weekday slots. I stopped answering the phone for bookings and my chair is busy all day now.',
    name: 'Rakesh Sharma',
    salon: 'The Gentlemen\u2019s Chair, Bengaluru',
  },
  {
    quote: 'Setting up took ten minutes. Within a month new customers were finding us online and booking hot-towel shaves themselves.',
    name: 'Aditi Verma',
    salon: 'Verve Studio, Pune',
  },
  {
    quote: 'No commission means every rupee stays with us. The reminders alone cut our no-shows almost in half.',
    name: 'Imran Khan',
    salon: 'Fade & Co, Hyderabad',
  },
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
            Book Your Next Look
          </h1>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/salons" className="vintage-cta">
              <Icon name="search" className="text-[18px]" />
              Explore Salons
            </Link>
            <Link to="/salons?nearby=1" className="vintage-cta">
              <Icon name="my_location" className="text-[18px]" />
              Salons Near Me
            </Link>
          </div>
        </div>
      </section>

      {/* Transparent spacer matching the fixed hero height. */}
      <div ref={spacerRef} className="h-[calc(85vh-3rem)] md:h-[calc(92vh-3rem)] pointer-events-none bg-transparent" aria-hidden="true" />

      <div className="site-content-top flex flex-col relative z-10">
        {/* Stats */}
        <section className="pt-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto">
          <div className="booking-frame">
            <div className="booking-plate !min-h-0">
              <div className="booking-texture" />
              <div className="vintage-heading-row relative z-10">
                <span className="vintage-heading-rule" />
                <h2 className="vintage-heading gold-gradient-text">By The Numbers</h2>
                <span className="vintage-heading-rule" />
              </div>
              <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-6">
                {STATS.map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center text-center">
                    <Icon name={stat.icon} filled className="text-2xl sm:text-4xl mb-2 text-secondary" />
                    <h3 className="font-display text-headline-sm sm:text-headline-md gold-gradient-text mb-1">{stat.value}</h3>
                    <p className="font-body text-[9px] sm:text-label-sm uppercase leading-tight text-on-surface-variant" style={{ letterSpacing: '0.1em' }}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <p className="price-mark mt-auto pt-6">&mdash; Groomit &mdash;</p>
            </div>
          </div>
        </section>

        {/* Grow Your Business — figures & estimates */}
        <section className="pt-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto">
          <div className="booking-frame">
            <div className="booking-plate !min-h-0">
              <div className="booking-texture" />
              <div className="vintage-heading-row relative z-10">
                <span className="vintage-heading-rule" />
                <h2 className="vintage-heading gold-gradient-text">Grow Your Business</h2>
                <span className="vintage-heading-rule" />
              </div>
              <p className="relative z-10 font-body text-body-md text-center mb-6 max-w-xl mx-auto text-on-surface-variant">
                Salons on Groomit fill more chairs, spend less time on the phone, and keep every rupee they earn.
              </p>
              <div className="relative z-10 grid grid-cols-2 gap-4 sm:gap-6">
                {GROWTH.map((item) => (
                  <div key={item.label} className="flex flex-col items-center text-center">
                    <Icon name={item.icon} filled className="text-2xl sm:text-3xl mb-2 text-secondary" />
                    <h3 className="font-display text-headline-sm sm:text-headline-md gold-gradient-text mb-1">{item.value}</h3>
                    <p className="font-body text-[10px] sm:text-label-sm uppercase leading-tight text-on-surface-variant" style={{ letterSpacing: '0.08em' }}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
              <p className="relative z-10 font-body text-[10px] text-center mt-6 text-on-surface-variant/70">
                Figures are estimates based on typical salon activity after joining.
              </p>
              <p className="price-mark relative z-10 mt-4">&mdash; Groomit &mdash;</p>
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="pt-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto">
          <div className="booking-frame">
            <div className="booking-plate !min-h-0">
              <div className="booking-texture" />
              <div className="vintage-heading-row relative z-10">
                <span className="vintage-heading-rule" />
                <h2 className="vintage-heading gold-gradient-text">Success Stories</h2>
                <span className="vintage-heading-rule" />
              </div>
              <div className="relative z-10 flex flex-col">
                {STORIES.map((story) => (
                  <article key={story.name} className="review-plate-item">
                    <span className="review-plate-item-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                    <p className="review-plate-item-body">&ldquo;{story.quote}&rdquo;</p>
                    <p className="review-plate-item-date">{story.name} &middot; {story.salon}</p>
                  </article>
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
