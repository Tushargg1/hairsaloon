import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import Icon from '../shared/components/Icon.jsx'
import VideoHero from '../shared/components/VideoHero.jsx'
import DepthCarousel from '../shared/components/DepthCarousel.jsx'

const STATS = [
  { icon: 'storefront', value: '500+', label: 'Premium Salons' },
  { icon: 'event_available', value: '50k+', label: 'Bookings Made' },
  { icon: 'star', value: '4.9/5', label: 'Client Reviews' },
]

const STEPS = [
  { step: '01', icon: 'search', title: 'Discover', desc: 'Browse curated premium salons in your city.' },
  { step: '02', icon: 'compare_arrows', title: 'Compare', desc: 'View services, prices, reviews, and availability.' },
  { step: '03', icon: 'event_available', title: 'Book', desc: 'Reserve your slot in seconds. No calls needed.' },
]

// Showcase images for the gallery carousel (branded barbershop stills bundled in /public).
const GALLERY = [
  { image: '/background-windows-img.png', alt: 'Vintage barbershop interior' },
  { image: '/background-img-mobile.jpg', alt: 'Classic barber chair' },
]

function VintageHeading({ children }) {
  return (
    <div className="vintage-heading-row">
      <span className="vintage-heading-rule" />
      <h2 className="vintage-heading gold-gradient-text">{children}</h2>
      <span className="vintage-heading-rule" />
    </div>
  )
}

function ScissorsMark() {
  return (
    <svg className="booking-scissors" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.348 5.656a4.5 4.5 0 015.656 5.656l-9.9 9.9a4.5 4.5 0 01-5.656-5.656l9.9-9.9z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.348 5.656L9.656 10.348M19.004 10.348l-4.692 4.692" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M7.5 16.5L16.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function HomePage() {
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

        {/* How It Works */}
        <section className="pt-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto" id="how-it-works">
          <div className="booking-frame">
            <div className="booking-plate">
              <div className="booking-texture" />
              <header className="booking-head">
                <ScissorsMark />
                <div className="booking-title-row">
                  <span className="booking-title-rule" />
                  <h2 className="booking-title gold-gradient-text">How It Works</h2>
                  <span className="booking-title-rule" />
                </div>
              </header>
              <div className="relative z-10 flex flex-col gap-6">
                {STEPS.map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <Icon name={item.icon} filled className="text-3xl text-secondary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-display text-title-lg gold-gradient-text mb-1">{item.title}</h3>
                      <p className="font-body text-body-md text-on-surface-variant">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="price-mark relative z-10 mt-6">&mdash; Groomit &mdash;</p>
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section className="pt-8 pb-4 px-4 lg:px-6 w-full" id="gallery">
          <div className="vintage-heading-row mb-2">
            <span className="vintage-heading-rule" />
            <h2 className="vintage-heading gold-gradient-text">Featured Salons</h2>
            <span className="vintage-heading-rule" />
          </div>
          <div className="relative w-full h-[260px] sm:h-[320px]">
            <DepthCarousel
              items={GALLERY}
              depth={160}
              spread={125}
              tilt={6}
              tiltDirection="right"
              perspective={1500}
              visibleCards={4}
              falloff={0.11}
              autoplay
              loop
              cardWidth={280}
              cardHeight={260}
              radius={16}
              tint="#1a1206"
              duration={1150}
              ease="back.out(1.4)"
              autoplayDelay={4000}
              showControls
              showIndicators
            />
          </div>
        </section>

        {/* Own a Salon CTA */}
        <section className="pt-4 pb-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto" id="for-owners">
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
