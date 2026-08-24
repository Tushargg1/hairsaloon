import { Link } from 'react-router-dom'
import Icon from '../shared/components/Icon.jsx'
import VideoHero from '../shared/components/VideoHero.jsx'

const stats = [
  { icon: 'storefront', value: '500+', label: 'Premium Salons' },
  { icon: 'event_available', value: '50k+', label: 'Bookings Made' },
  { icon: 'star', value: '4.9/5', label: 'Client Reviews' },
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

export default function HomePage() {
  return (
    <main className="flex-grow">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] md:min-h-[92vh] flex items-end justify-center overflow-hidden">
        <VideoHero />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-[1280px] flex flex-col items-center text-center pb-[5vh]">
          <h1 className="font-display text-display-lg-mobile md:text-display-lg text-on-surface mb-6 text-shadow-lg max-w-4xl leading-tight">
            Book Your Next Look
          </h1>
          <Link to="/salons?nearby=1" className="vintage-cta">
            <Icon name="my_location" className="text-[18px]" />
            Salons Near Me
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="py-1 px-4 md:px-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-3 gap-2 sm:gap-6">
          {stats.map((stat) => (
            <div key={stat.label}
              className="vintage-panel p-3 sm:p-6 text-center items-center transition-transform hover:-translate-y-1 duration-300">
              <div className="booking-texture" />
              <Icon name={stat.icon} filled className="relative z-10 text-2xl sm:text-4xl mb-2" style={{ color: '#C8B084' }} />
              <h3 className="relative z-10 font-display text-headline-sm sm:text-headline-md gold-gradient-text mb-1">{stat.value}</h3>
              <p className="relative z-10 font-body text-[9px] sm:text-label-sm uppercase leading-tight" style={{ color: '#8A857D', letterSpacing: '0.1em' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="pt-2 pb-20 px-4 md:px-6 max-w-[1280px] mx-auto">
        <VintageHeading>How It Works</VintageHeading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', icon: 'search', title: 'Discover', desc: 'Browse curated premium salons in your city.' },
            { step: '02', icon: 'compare_arrows', title: 'Compare', desc: 'View services, prices, reviews, and availability.' },
            { step: '03', icon: 'event_available', title: 'Book', desc: 'Reserve your slot in seconds. No calls needed.' },
          ].map((item) => (
            <div key={item.step}
              className="vintage-panel p-8 text-center items-center hover:-translate-y-1 transition-transform duration-300">
              <div className="booking-texture" />
              <span className="relative z-10 font-display text-xs mb-4" style={{ color: '#8A857D', letterSpacing: '0.3em' }}>
                {item.step}
              </span>
              <Icon name={item.icon} filled className="relative z-10 text-4xl mb-4" style={{ color: '#C8B084' }} />
              <h3 className="relative z-10 font-display text-headline-sm gold-gradient-text mb-2">{item.title}</h3>
              <p className="relative z-10 font-body text-body-md" style={{ color: '#B8A074' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 md:px-6 max-w-[1280px] mx-auto text-center">
        <div className="vintage-panel p-12 md:p-16 items-center">
          <div className="booking-texture" />
          <div className="relative z-10 w-full">
            <VintageHeading>Own a Salon?</VintageHeading>
            <p className="font-body text-body-lg mb-8 max-w-xl mx-auto" style={{ color: '#B8A074' }}>
              List your business on Groomit and reach customers looking for premium grooming
              services. Free to start, and we never take commission.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/for-business" className="vintage-cta">Get Started Free</Link>
              <Link to="/pricing" className="vintage-cta">See Pricing</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
