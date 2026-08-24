import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import PushOptIn from '../shared/components/PushOptIn.jsx'
import Icon from '../shared/components/Icon.jsx'
import { getPublicServices, getSalonProfile, tenantKeys } from './tenant-api.js'
import { tenantNameFallback } from './tenant-host.js'

function initials(name) {
  return String(name || 'Salon').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

const money = (value) => (value == null
  ? ''
  : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' }).format(Number(value)))

export default function TenantLayout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const profileQuery = useQuery({ queryKey: tenantKeys.profile, queryFn: getSalonProfile })
  const servicesQuery = useQuery({ queryKey: tenantKeys.publicServices, queryFn: getPublicServices })
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
            <a href="/#services" className="font-body text-label-md text-on-surface-variant hover:text-secondary-fixed transition-colors">Services</a>
            <NavLink to="/book" className={({ isActive }) => `font-body text-label-md transition-colors ${isActive ? 'text-secondary border-b-2 border-secondary pb-1' : 'text-on-surface-variant hover:text-secondary-fixed'}`}>Book</NavLink>
            <a href="/#team" className="font-body text-label-md text-on-surface-variant hover:text-secondary-fixed transition-colors">Team</a>
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
            <a href="/#services" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">Services</a>
            <NavLink to="/book" onClick={closeMenu} className="font-body text-label-md text-on-surface-variant">Book</NavLink>
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
            <NavLink to="/book" className="salon-footer-cta">Book a Slot</NavLink>
          </div>

          <div>
            <h2 className="salon-footer-title">Visit Us</h2>
            {addressLine && (
              <p className="salon-footer-line">
                <Icon name="location_on" className="text-[15px]" />{addressLine}
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
          </div>

          <div>
            <h2 className="salon-footer-title">Services</h2>
            {servicesQuery.data?.length ? servicesQuery.data.map((service) => (
              <p className="salon-footer-service" key={service.id}>
                <span>{service.name}</span>
                <span>{money(service.price)}</span>
              </p>
            )) : <p className="salon-footer-line">Services coming soon.</p>}
          </div>
        </div>
        <p className="salon-footer-mark">{salonName}</p>
      </footer>
    </div>
  )
}
