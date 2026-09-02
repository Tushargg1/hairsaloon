import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import PushOptIn from '../shared/components/PushOptIn.jsx'
import Icon from '../shared/components/Icon.jsx'
import VideoHero from '../shared/components/VideoHero.jsx'
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
  // Public salon site theme (dark by default), toggled from the navbar and persisted.
  const [siteTheme, setSiteTheme] = useState(
    () => localStorage.getItem('groomit-site-theme') || 'dark')
  const siteLight = siteTheme === 'light'
  const toggleSiteTheme = () => {
    const next = siteLight ? 'dark' : 'light'
    localStorage.setItem('groomit-site-theme', next)
    setSiteTheme(next)
  }
  // Shares the dashboard theme so the nav's Dark toggle and DashboardLayout stay in sync.
  const [dashTheme, setDashTheme] = useState(
    () => localStorage.getItem('groomit-dashboard-theme') || 'dark')
  const dashLight = dashTheme === 'light'
  const toggleDashTheme = () => {
    const next = dashLight ? 'dark' : 'light'
    localStorage.setItem('groomit-dashboard-theme', next)
    setDashTheme(next)
    window.dispatchEvent(new CustomEvent('groomit-theme-change', { detail: next }))
  }
  const closeMenu = () => setMenuOpen(false)
  const profileQuery = useQuery({ queryKey: tenantKeys.profile, queryFn: getSalonProfile })
  // Pending or suspended: the profile still loads (with status) but the site collapses to
  // a contact page, so no services, offers or prices are shown. The 404 fallback covers
  // older backends that returned SALON_INACTIVE without a body.
  const profileStatus = profileQuery.data?.status
  const location = useLocation()
  // The owner must still reach management login/dashboard on an inactive salon to see
  // their onboarding request, so those routes are never collapsed to the contact page.
  const isDashboard = location.pathname.startsWith('/dashboard')
  const managementRoute = location.pathname.startsWith('/manage') || isDashboard
  const notOnboarded = !managementRoute
    && ((profileStatus && profileStatus !== 'ACTIVE')
      || profileQuery.error?.response?.data?.error === 'SALON_INACTIVE')
  const salonName = profileQuery.data?.name || profileQuery.data?.salonName || tenantNameFallback()
  const addressLine = [profileQuery.data?.address, profileQuery.data?.city].filter(Boolean).join(', ')
  // Onboarding contact: WhatsApp the salon with a Groomit-branded note so the owner sees
  // that customers are trying to book through Groomit. Uses the WhatsApp number if set,
  // otherwise the salon phone; the message names the signed-in user when available.
  const rawContactPhone = String(profileQuery.data?.phone || '').replace(/[^\d]/g, '')
  // wa.me needs a country code; a bare 10-digit Indian number gets 91 prefixed.
  const contactPhone = rawContactPhone.length === 10 ? `91${rawContactPhone}` : rawContactPhone
  const contactMessage = `Hi ${salonName}, I ${user?.name ? `(${user.name}) ` : ''}tried to book an appointment with you on Groomit, but your salon isn't registered on Groomit yet. Please join Groomit so I can book online.`
  const contactWhatsappUrl = contactPhone
    ? `https://wa.me/${contactPhone}?text=${encodeURIComponent(contactMessage)}`
    : null
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
    <div className={`site-root min-h-screen flex flex-col ${siteLight ? 'theme-light' : ''}`}>
      {/* Tenant Nav */}
      <nav className="site-nav fixed top-0 z-[100] w-full backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex justify-between items-center w-full px-4 lg:px-[80px] py-1 max-w-[1280px] mx-auto h-12">
          <NavLink to="/" className="flex items-center gap-3 min-w-0 flex-shrink" aria-label={`${salonName} home`}>
            {profileQuery.data?.logoUrl ? (
              <img src={profileQuery.data.logoUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-outline-variant/50 flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center border border-outline-variant/50 flex-shrink-0">
                <span className="font-display font-bold text-secondary text-sm">{initials(salonName)}</span>
              </div>
            )}
            {/* Stay on one line; shrink the font as the name gets longer, then truncate. */}
            <span className={`font-display text-secondary-fixed tracking-tight truncate ${
              salonName.length > 34 ? 'text-sm'
                : salonName.length > 26 ? 'text-base'
                  : salonName.length > 18 ? 'text-lg'
                    : 'text-xl'}`}>{salonName}</span>
          </NavLink>

          {!notOnboarded && !isDashboard && (
            <div className="hidden md:flex items-center gap-6">
              <NavLink to="/about" className={navLinkClass}>About Us</NavLink>
              <NavLink to="/team" className={navLinkClass}>Our Team</NavLink>
              <NavLink to="/contact" className={navLinkClass}>Contact Us</NavLink>
              <a href="/#services" className="font-body text-label-md text-on-surface-variant hover:text-secondary-fixed transition-colors">Services</a>
              <a href="/#book-slot" className="font-body text-label-md text-on-surface-variant hover:text-secondary-fixed transition-colors">Book</a>
              <a href="/#reviews" className="font-body text-label-md text-on-surface-variant hover:text-secondary-fixed transition-colors">Reviews</a>
            </div>
          )}

          {isDashboard ? (
            /* On the dashboard, the nav is reduced to the management actions. */
            <div className="flex items-center gap-3">
              {logoutError && (
                <span className="font-body text-label-sm text-error" role="alert">{logoutError}</span>
              )}
              <NavLink to="/" className="font-body text-label-md text-on-surface-variant hover:text-secondary-fixed transition-colors">Customer view</NavLink>
              <button onClick={toggleDashTheme}
                className="font-body text-label-sm text-on-surface-variant hover:text-secondary-fixed transition-colors">
                {dashLight ? 'Dark' : 'Light'}
              </button>
              <NavLink to="/dashboard" className="font-body text-label-md text-secondary hover:text-secondary-fixed transition-colors">Dashboard</NavLink>
              <button onClick={handleLogout} disabled={loggingOut} className="font-body text-label-sm text-on-surface-variant hover:text-error transition-colors">
                {loggingOut ? '...' : 'Logout'}
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              {logoutError && (
                <span className="font-body text-label-sm text-error" role="alert">{logoutError}</span>
              )}
              <button onClick={toggleSiteTheme} aria-label="Toggle light or dark theme"
                className="font-body text-secondary hover:text-secondary-fixed transition-colors flex items-center">
                <Icon name={siteLight ? 'dark_mode' : 'light_mode'} className="text-[20px]" />
              </button>
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
          )}

          {!notOnboarded && !isDashboard && (
            <button className="md:hidden text-secondary p-1" onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen} aria-controls="tenant-mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
              <Icon name={menuOpen ? 'close' : 'menu'} filled />
            </button>
          )}
        </div>

        {menuOpen && !notOnboarded && (
          <div id="tenant-mobile-menu"
            className="site-menu md:hidden border-t border-outline-variant/10 backdrop-blur-xl px-4 py-4 flex flex-col gap-4">
            <NavLink to="/about" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">About Us</NavLink>
            <NavLink to="/team" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">Our Team</NavLink>
            <NavLink to="/contact" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">Contact Us</NavLink>
            <a href="/#services" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">Services</a>
            <a href="/#book-slot" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">Book</a>
            <a href="/#reviews" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">Reviews</a>
            <button onClick={toggleSiteTheme}
              className="font-body text-label-md text-secondary text-left flex items-center gap-2">
              <Icon name={siteLight ? 'dark_mode' : 'light_mode'} className="text-[18px]" />
              {siteLight ? 'Dark theme' : 'Light theme'}
            </button>
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

      <div className="flex-grow pt-12" id="main-content" tabIndex="-1">
        {notOnboarded ? (
          <main className="flex flex-col" aria-live="polite">
            <section className="relative w-full -mt-16 min-h-[85vh] md:min-h-[92vh] flex items-end overflow-hidden">
              <VideoHero poster={profileQuery.data?.logoUrl} alt={salonName} />
              <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 lg:px-6 pb-[5vh]">
                <h1 className="font-display text-display-lg-mobile md:text-display-lg text-on-surface mb-4">{salonName}</h1>
                {contactWhatsappUrl && (
                  <a href={contactWhatsappUrl} target="_blank" rel="noreferrer" className="vintage-cta">
                    <Icon name="chat" className="text-[18px]" />
                    Contact the salon
                  </a>
                )}
              </div>
            </section>
            <section className="w-full max-w-[1280px] mx-auto px-4 lg:px-6 py-12 text-center">
              <p className="font-body text-body-lg text-on-surface-variant">This salon is still waiting for onboarding.</p>
            </section>
          </main>
        ) : (!managementRoute && profileQuery.isLoading) ? (
          // Wait for the salon status before mounting public pages, so an inactive salon
          // does not briefly fire (and 404) the services/reviews/availability calls.
          <main className="state-page" aria-live="polite">Loading…</main>
        ) : (
          <Outlet context={{ profile: profileQuery.data, profileQuery, salonName }} />
        )}
      </div>

      {/* Footer */}
      <footer className="salon-footer">
        <div className="salon-footer-grid">
          {!notOnboarded && (
            <div>
              <p className="salon-footer-name">{salonName}</p>
              {profileQuery.data?.description && (
                <p className="salon-footer-line">{profileQuery.data.description}</p>
              )}
              <a href="/#book-slot" className="salon-footer-cta">Book a Slot</a>
            </div>
          )}

          {!notOnboarded && (
            <div>
              <h2 className="salon-footer-title">Salon</h2>
              <p className="salon-footer-line"><NavLink to="/about">About Us</NavLink></p>
              <p className="salon-footer-line"><NavLink to="/team">Our Team</NavLink></p>
              <p className="salon-footer-line"><NavLink to="/contact">Contact Us</NavLink></p>
              <p className="salon-footer-line"><a href="/#services">Services</a></p>
              <p className="salon-footer-line"><a href="/#book-slot">Book a Slot</a></p>
              <p className="salon-footer-line"><a href="/#reviews">Reviews</a></p>
            </div>
          )}

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
