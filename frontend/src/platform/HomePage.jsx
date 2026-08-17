import { stagger } from 'motion'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import AnimatedGridPattern from '../shared/components/AnimatedGridPattern.jsx'
import Marquee from '../shared/components/Marquee.jsx'
import useAuth from '../shared/auth/useAuth.js'

const heroGroup = { hidden: {}, visible: { transition: { delayChildren: stagger(0.09) } } }
const revealItem = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
}
const featureGroup = { hidden: {}, visible: { transition: { delayChildren: stagger(0.12) } } }
const serviceTags = ['Precision cuts', 'Balayage', 'Natural hair', 'Barbering', 'Braids', 'Colour', 'Blowouts', 'Styling']

export default function HomePage() {
  const { user } = useAuth()
  const shouldReduceMotion = useReducedMotion()
  const initialState = shouldReduceMotion ? false : 'hidden'
  const isAdmin = user?.role === 'PLATFORM_ADMIN'
  const isOwner = user?.role === 'SALON_OWNER'
  const primaryPath = isAdmin ? '/admin/approvals' : isOwner ? '/salon-signup' : '/salons'
  const primaryLabel = isAdmin ? 'Review approvals' : isOwner ? 'List your salon' : 'Explore salons'
  const hoverLift = shouldReduceMotion ? undefined : { y: -6, scale: 1.015 }

  return (
    <main className="home-page">
      <section className="hero page-width">
        <motion.div className="hero-copy" variants={heroGroup} initial={initialState} animate="visible">
          <motion.p className="eyebrow" variants={revealItem}>Your next great hair day starts here</motion.p>
          <motion.h1 variants={revealItem}>Find your place.<br /><em>Own your style.</em></motion.h1>
          <motion.p className="hero-lede" variants={revealItem}>Discover trusted independent salons, compare the details that matter, and book a space that feels like you.</motion.p>
          <motion.div className="button-row" variants={revealItem}>
            <Link className="button" to={primaryPath}>{primaryLabel}<span aria-hidden="true">→</span></Link>
            {!user && <Link className="button button-secondary" to="/signup">Join HairSaloon</Link>}
          </motion.div>
          <motion.ul className="hero-proof" variants={revealItem} aria-label="HairSaloon benefits">
            <li><span aria-hidden="true">01</span>Discover</li><li><span aria-hidden="true">02</span>Compare</li><li><span aria-hidden="true">03</span>Book</li>
          </motion.ul>
        </motion.div>

        <motion.div className="hero-art" initial={shouldReduceMotion ? false : { opacity: 0, scale: .96, rotate: 1.5 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 22, delay: .12 }} aria-hidden="true">
          <AnimatedGridPattern />
          <motion.div className="hero-orbit" animate={shouldReduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}><span>Cut</span><span>Colour</span><span>Care</span></motion.div>
          <div className="hero-monogram"><small>EST.</small><strong>HS</strong><small>2026</small></div>
          <motion.div className="hero-float-card hero-float-card-top" whileHover={hoverLift} transition={{ type: 'spring', stiffness: 360, damping: 24 }}><span>Find your next look</span><strong>Independent talent</strong><small>Near you</small></motion.div>
          <motion.div className="hero-float-card hero-float-card-bottom" whileHover={hoverLift} transition={{ type: 'spring', stiffness: 360, damping: 24 }}><span className="float-rating">★★★★★</span><strong>Trusted choices</strong><small>Details up front</small></motion.div>
        </motion.div>
      </section>

      <motion.section className="value-strip" variants={featureGroup} initial={initialState} whileInView="visible" viewport={{ once: true, amount: .45 }}>
        <motion.div variants={revealItem}><span className="value-number">01</span><strong>Curated discovery</strong><span>Search with practical filters</span></motion.div>
        <motion.div variants={revealItem}><span className="value-number">02</span><strong>Independent experts</strong><span>Support local salon talent</span></motion.div>
        <motion.div variants={revealItem}><span className="value-number">03</span><strong>Clear choices</strong><span>Ratings and details up front</span></motion.div>
      </motion.section>

      <section className="service-ribbon" aria-label="Popular salon services">
        <p className="sr-only">Popular services</p>
        <Marquee>{serviceTags.map((service) => <span className="service-ribbon-item" key={service}><i aria-hidden="true" />{service}</span>)}</Marquee>
      </section>

      <section className="page-width editorial-section">
        <motion.div className="editorial-intro" initial={initialState} whileInView="visible" viewport={{ once: true, amount: .5 }} variants={revealItem}>
          <p className="eyebrow">Built for both sides of the chair</p><h2>Beauty is personal.<br />Finding it should be simple.</h2>
        </motion.div>
        <motion.div className="home-bento" variants={featureGroup} initial={initialState} whileInView="visible" viewport={{ once: true, amount: .2 }}>
          <motion.article className="bento-card bento-discover" variants={revealItem} whileHover={hoverLift}>
            <div className="bento-visual bento-search-mockup"><span>Find a salon</span><div>City or postcode <b>Search</b></div><small>Colour · Cuts · Natural hair</small></div>
            <div className="bento-copy"><span>01 / Discover</span><h3>Search your way</h3><p>Explore by city, service, rating, or salon name—without the endless tabs.</p></div>
          </motion.article>
          <motion.article className="bento-card bento-compare" variants={revealItem} whileHover={hoverLift}>
            <div className="bento-rating"><strong>4.9</strong><span>★★★★★</span><small>Trusted salon reviews</small></div>
            <div className="bento-copy"><span>02 / Compare</span><h3>Meet your match</h3><p>See the details and reputation behind every salon.</p></div>
          </motion.article>
          <motion.article className="bento-card bento-grow" variants={revealItem} whileHover={hoverLift}>
            <div className="bento-calendar"><span>Today</span><i /><i /><i /></div>
            <div className="bento-copy"><span>03 / Grow</span><h3>Run a calmer day</h3><p>Owners manage services, staff, bookings, and reviews in one place.</p></div>
          </motion.article>
        </motion.div>
      </section>

      <motion.section className="home-cta page-width" initial={initialState} whileInView="visible" viewport={{ once: true, amount: .4 }} variants={revealItem}>
        <div><p className="eyebrow">Ready when you are</p><h2>Your chair is waiting.</h2></div>
        <Link className="button button-light" to={primaryPath}>{primaryLabel}<span aria-hidden="true">→</span></Link>
      </motion.section>
    </main>
  )
}
