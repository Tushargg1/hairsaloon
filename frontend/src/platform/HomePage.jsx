import Icon from '../shared/components/Icon.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import VideoHero from '../shared/components/VideoHero.jsx'

const HERO_BG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJPIJ2JIxb3RVCeuZEKylrHaYkC9iBqr1ESDbu9hSDBMoaFnzyU30DbmY1hKpWulO2us3e3P1JsUXsjJk6hl7eRxx2By1ce08JGuW6fpEBpz6r6xrHAXom9gvHa6d4KIQ5TDgSAiw4r2DXNctX9_txwNfl026hs7P8mhismD8NaTSlW76CLZmE8PeWYe-YCVdv9UZpLROZgR_dHY3OdUK_u6oL9eaDNvA9VPY7pyeh-vMJI9gKrKEUBMz3aWqfHch-dA'
const stats = [
  { icon: 'storefront', value: '500+', label: 'Premium Salons' },
  { icon: 'event_available', value: '50k+', label: 'Bookings Made' },
  { icon: 'star', value: '4.9/5', label: 'Client Reviews' },
]

export default function HomePage() {
  return (
    <main className="flex-grow">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <VideoHero poster={HERO_BG} />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-[1280px] flex flex-col items-center text-center mt-20">
          <h1 className="font-display text-display-lg-mobile md:text-display-lg text-on-surface mb-6 text-shadow-lg max-w-4xl leading-tight">
            Book Your Next Look
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant mb-20 max-w-2xl">
            Discover and reserve appointments at the finest premium grooming establishments. Experience craftsmanship and heritage in every cut.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
            <BrassButton to="/salons" size="lg" icon={<Icon name="search" className="text-[20px]" />}>
              Explore Salons
            </BrassButton>
            <BrassButton to="/salons?nearby=1" size="lg" variant="outline"
              icon={<Icon name="my_location" className="text-[20px]" />}>
              Salons Near Me
            </BrassButton>
          </div>

          {/* Floating Stats */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="glass-panel rounded-lg p-6 text-center flex flex-col items-center transform transition-transform hover:-translate-y-1 duration-300 amber-glow"
              >
                <Icon name={stat.icon} filled className="text-secondary text-4xl mb-2" />
                <h3 className="font-display text-headline-md text-secondary-fixed mb-1">{stat.value}</h3>
                <p className="font-body text-label-sm text-on-surface-variant tracking-wider uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 md:px-6 max-w-[1280px] mx-auto">
        <h2 className="font-display text-headline-md text-on-surface text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', icon: 'search', title: 'Discover', desc: 'Browse curated premium salons in your city.' },
            { step: '02', icon: 'compare_arrows', title: 'Compare', desc: 'View services, prices, reviews, and availability.' },
            { step: '03', icon: 'event_available', title: 'Book', desc: 'Reserve your slot in seconds. No calls needed.' },
          ].map((item) => (
            <div key={item.step} className="glass-surface metallic-border rounded-lg p-8 text-center flex flex-col items-center group hover:-translate-y-1 transition-transform duration-300">
              <span className="font-display text-brass text-sm mb-4 tracking-widest">{item.step}</span>
              <Icon name={item.icon} filled className="text-secondary text-4xl mb-4" />
              <h3 className="font-display text-headline-sm text-on-surface mb-2">{item.title}</h3>
              <p className="font-body text-body-md text-on-surface-variant">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 md:px-6 max-w-[1280px] mx-auto text-center">
        <div className="glass-panel rounded-2xl p-12 md:p-16">
          <h2 className="font-display text-headline-md text-on-surface mb-4">Own a Salon?</h2>
          <p className="font-body text-body-lg text-on-surface-variant mb-8 max-w-xl mx-auto">
            List your business on Groomit and reach customers looking for premium grooming
            services. Free to start, and we never take commission.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <BrassButton to="/for-business" size="lg">Get Started Free</BrassButton>
            <BrassButton to="/pricing" variant="outline" size="lg">See Pricing</BrassButton>
          </div>
        </div>
      </section>
    </main>
  )
}
