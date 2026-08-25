import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import PushOptIn from '../shared/components/PushOptIn.jsx'
import Icon from '../shared/components/Icon.jsx'
import { getSalonProfile, mapsUrl, tenantKeys } from './tenant-api.js'
import { tenantNameFallback } from './tenant-host.js'

function initials(name) {
  return String(name || 'Salon').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// Floating pill below navbar that links to the "previous" section on the page.
function QuickNavPill() {
  const location = useLocation()
  const [visibleSection, setVisibleSection] = useState(null)
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(null) // tracks which section was dismissed

  // Don't render on dashboard
  const isDashboard = location.pathname.startsWith('/dashboard')

  useEffect(() => {
    if (location.pathname !== '/' || isDashboard) { setVisibleSection(null); return }

    const handleScroll = () => {
      const navHeight = 80
      const viewportH = window.innerHeight
      const trigger30 = viewportH * 0.7

      const offersEl = document.getElementById('offers')
      const servicesEl = document.getElementById('services')
      const bookSlotEl = document.getElementById('book-slot')
      const reviewsEl = document.getElementById('reviews')

      const offersTriggered = offersEl && offersEl.getBoundingClientRect().top <= trigger30

      if (reviewsEl && reviewsEl.getBoundingClientRect().top <= navHeight) {
        setVisibleSection('reviews')
      } else if (bookSlotEl && bookSlotEl.getBoundingClientRect().top <= navHeight) {
        setVisibleSection('book-slot')
      } else if (servicesEl && servicesEl.getBoundingClientRect().top <= navHeight) {
        setVisibleSection('services')
      } else if (offersTriggered) {
        setVisibleSection('offers')
      } else {
        setVisibleSection(null)
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [location.pathname, isDashboard])

  // Show pill after 2 sec delay when section changes, hide if dismissed for same section
  useEffect(() => {
    setShow(false)
    if (!visibleSection || visibleSection === dismissed) return
    const timer = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(timer)
  }, [visibleSection, dismissed])

  // When section changes, reset dismissed
  useEffect(() => {
    setDismissed(null)
  }, [visibleSection])

  const handleClick = (e) => {
    e.preventDefault()
    const target = pill?.href
    setDismissed(visibleSection)
    setShow(false)
    if (!target || target === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const id = target.replace('/#', '')
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  if (isDashboard) return null

  // Show the section directly above the current one
  let pill = null
  if (location.pathname !== '/') {
    pill = { label: 'Home', href: '/' }
  } else if (!visibleSection) {
    pill = null
  } else if (visibleSection === 'offers') {
    pill = { label: 'Home', href: '/' }
  } else if (visibleSection === 'services') {
    pill = { label: 'Offers', href: '/#offers' }
  } else if (visibleSection === 'book-slot') {
    pill = { label: 'Price List', href: '/#services' }
  } else if (visibleSection === 'reviews') {
    pill = { label: 'Book a Slot', href: '/#book-slot' }
  }

  if (!pill || !show) return null

  return (
    <div className="quick-nav-pill">
      <a href={pill.href} onClick={handleClick}>
        <Icon name="arrow_upward" className="text-[14px]" />
        {pill.label}
      </a>
    </div>
  )
}

// Material Symbols has no brand glyphs, so these reuse the closest generic icon.
const SOCIALS = [
  { key: 'instagramUrl', label: 'Instagram', icon: 'photo_camera' },
  { key: 'facebookUrl', label: 'Facebook', icon: 'thumb_up' },
  { key: 'whatsappUrl', label: 'WhatsApp', icon: 'chat' },
  { key: 'youtubeUrl', label: 'YouTube', icon: 'play_circle' },
  { key: 'mapsUrl', label: 'Google Maps', icon: 'map' },
]
const socialLinks = (profile) => SOCIALS
  .filter(({ key }) => profile?.[key])
  .map((social) => ({ ...social, url: profile[social.key] }))

const navLinkClass = ({ isActive }) => `font-body text-label-md transition-colors ${isActive
  ? 'text-secondary border-b-2 border-secondary pb-1'
  : 'text-on-surface-variant hover:text-secondary-fixed'}`

export default function TenantLayout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const profileQuery = useQuery({ queryKey: tenantKeys.profile, queryFn: getSalonProfile })
  const salonName = profileQuery.data?.name || profileQuery.data?.salonName || tenantNameFallback()
  const addressLine = [profileQuery.data?.address, profileQuery.data?.city].filter(Boolean).join(', ')
  const pushEligible = user?.role === 'CUSTOMER' || user?.role === 'SALON_OWNER'

  async function handleLogout() {
    setLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
      navigate('/')
    } catch {
      setLogoutError('Could not log out. Please try again.')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#161005]">
      {/* Tenant Nav */}
      <nav className="fixed top-0 z-50 w-full bg-[#230F08]/85 backdrop-blur-xl border-b border-outline-variant/30 shadow-md">
        <div className="flex justify-between items-center w-full px-4 lg:px-[80px] py-2 max-w-[1280px] mx-auto h-16">
          <NavLink to="/" className="flex items-center gap-3" aria-label={`${salonName} home`}>
            {profileQuery.data?.logoUrl ? (
              <img src={profileQuery.data.logoUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-outline-variant/50" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center border border-outline-variant/50">
                <span className="font-display font-bold text-secondary text-sm">{initials(salonName)}</span>
              </div>
            )}
            <span className="font-display text-secondary-fixed tracking-tight text-xl">{salonName}</span>
          </NavLink>

          <div className="hidden md:flex items-center gap-6">
            <NavLink to="/about" className={navLinkClass}>About Us</NavLink>
            <NavLink to="/team" className={navLinkClass}>Our Team</NavLink>
            <NavLink to="/contact" className={navLinkClass}>Contact Us</NavLink>
            <a href="/#services" className="font-body text-label-md text-on-surface-variant hover:text-secondary-fixed transition-colors">Services</a>
            <a href="/#book-slot" className="font-body text-label-md text-on-surface-variant hover:text-secondary-fixed transition-colors">Book</a>
            <a href="/#reviews" className="font-body text-label-md text-on-surface-variant hover:text-secondary-fixed transition-colors">Reviews</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {logoutError && (
              <span className="font-body text-label-sm text-error" role="alert">{logoutError}</span>
            )}
            {loading ? <span className="font-body text-label-sm text-on-surface-variant">...</span> : user ? (
              <>
                {user.role === 'SALON_OWNER' && <NavLink to="/dashboard" className="font-body text-label-md text-secondary hover:text-secondary-fixed transition-colors">Dashboard</NavLink>}
                {user.role === 'CUSTOMER' && <NavLink to="/bookings" className="font-body text-label-md text-on-surface-variant hover:text-secondary-fixed transition-colors">My bookings</NavLink>}
                <button onClick={handleLogout} disabled={loggingOut} className="font-body text-label-sm text-on-surface-variant hover:text-error transition-colors">
                  {loggingOut ? '...' : 'Logout'}
                </button>
              </>
            ) : (
              <NavLink to="/login" className="brass-gradient text-espresso font-body text-label-md px-4 py-1.5 rounded transition-all hover:shadow-amber-glow-lg">
                Login
              </NavLink>
            )}
          </div>

          <button className="md:hidden text-secondary p-1" onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen} aria-controls="tenant-mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
            <Icon name={menuOpen ? 'close' : 'menu'} filled />
          </button>
        </div>

        {menuOpen && (
          <div id="tenant-mobile-menu"
            className="md:hidden border-t border-outline-variant/30 bg-[#230F08]/70 backdrop-blur-xl px-4 py-4 flex flex-col gap-4">
            <NavLink to="/about" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">About Us</NavLink>
            <NavLink to="/team" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">Our Team</NavLink>
            <NavLink to="/contact" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">Contact Us</NavLink>
            <a href="/#services" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">Services</a>
            <a href="/#book-slot" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">Book</a>
            <a href="/#reviews" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">Reviews</a>
            {logoutError && <span className="font-body text-label-sm text-error" role="alert">{logoutError}</span>}
            {loading ? <span className="font-body text-label-sm text-on-surface-variant">...</span> : user ? (
              <>
                {user.role === 'SALON_OWNER' && (
                  <NavLink to="/dashboard" onClick={closeMenu} className="font-body text-label-md text-secondary">Dashboard</NavLink>
                )}
                {user.role === 'CUSTOMER' && (
                  <NavLink to="/bookings" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">My bookings</NavLink>
                )}
                <button onClick={() => { closeMenu(); handleLogout() }} disabled={loggingOut}
                  className="font-body text-label-sm text-on-surface-variant text-left">
                  {loggingOut ? '...' : 'Logout'}
                </button>
              </>
            ) : (
              <NavLink to="/login" onClick={closeMenu} className="vintage-cta self-start">Login</NavLink>
            )}
          </div>
        )}
      </nav>

      {pushEligible && <PushOptIn role={user.role} />}

      <QuickNavPill />

      <div className="flex-grow pt-16" id="main-content" tabIndex="-1">
        <Outlet context={{ profile: profileQuery.data, profileQuery, salonName }} />
      </div>

      {/* Footer */}
      <footer className="salon-footer">
        <div className="salon-footer-grid">
          <div>
            <p className="salon-footer-name">{salonName}</p>
            {profileQuery.data?.description && (
              <p className="salon-footer-line">{profileQuery.data.description}</p>
            )}
            <a href="/#book-slot" className="salon-footer-cta">Book a Slot</a>
          </div>

          <div>
            <h2 className="salon-footer-title">Salon</h2>
            <p className="salon-footer-line"><NavLink to="/about">About Us</NavLink></p>
            <p className="salon-footer-line"><NavLink to="/team">Our Team</NavLink></p>
            <p className="salon-footer-line"><NavLink to="/contact">Contact Us</NavLink></p>
            <p className="salon-footer-line"><a href="/#services">Services</a></p>
            <p className="salon-footer-line"><a href="/#book-slot">Book a Slot</a></p>
            <p className="salon-footer-line"><a href="/#reviews">Reviews</a></p>
          </div>

          <div>
            <h2 className="salon-footer-title">Visit Us</h2>
            {addressLine && (
              <p className="salon-footer-line">
                <Icon name="location_on" className="text-[15px]" />
                <a href={mapsUrl(profileQuery.data || {})} target="_blank" rel="noreferrer">{addressLine}</a>
              </p>
            )}
            {profileQuery.data?.phone && (
              <p className="salon-footer-line">
                <Icon name="call" className="text-[15px]" />
                <a href={`tel:${profileQuery.data.phone}`}>{profileQuery.data.phone}</a>
              </p>
            )}
            {profileQuery.data?.email && (
              <p className="salon-footer-line">
                <Icon name="mail" className="text-[15px]" />
                <a href={`mailto:${profileQuery.data.email}`}>{profileQuery.data.email}</a>
              </p>
            )}

            {socialLinks(profileQuery.data).length > 0 && (
              <div className="salon-footer-social">
                {socialLinks(profileQuery.data).map(({ key, label, url, icon }) => (
                  <a key={key} href={url} target="_blank" rel="noreferrer" aria-label={label}
                    title={label}>
                    <Icon name={icon} className="text-[16px]" />
                    <span>{label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

        </div>
        <p className="salon-footer-site">
          <Icon name="language" className="text-[14px]" />
          {window.location.hostname}
        </p>
        <p className="salon-footer-mark">{salonName}</p>
      </footer>
    </div>
  )
}
