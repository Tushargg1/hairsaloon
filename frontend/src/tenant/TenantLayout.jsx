import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import PushOptIn from '../shared/components/PushOptIn.jsx'
import Icon from '../shared/components/Icon.jsx'
import { getSalonProfile, tenantKeys } from './tenant-api.js'
import { tenantNameFallback } from './tenant-host.js'

function initials(name) {
  return String(name || 'Salon').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default function TenantLayout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const profileQuery = useQuery({ queryKey: tenantKeys.profile, queryFn: getSalonProfile })
  const salonName = profileQuery.data?.name || profileQuery.data?.salonName || tenantNameFallback()
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
    <div className="min-h-screen flex flex-col">
      {/* Tenant Nav */}
      <nav className="sticky top-0 z-50 w-full bg-[#230F08]/85 backdrop-blur-xl border-b border-outline-variant/30 shadow-md">
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

          <button className="md:hidden text-secondary p-1">
            <Icon name="menu" filled />
          </button>
        </div>
      </nav>

      {pushEligible && <PushOptIn role={user.role} />}

      <div className="flex-grow" id="main-content" tabIndex="-1">
        <Outlet context={{ profile: profileQuery.data, profileQuery, salonName }} />
      </div>

      {/* Footer */}
      <footer className="bg-surface-container-highest border-t border-outline-variant/50 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-4 lg:px-[80px] py-8 max-w-[1280px] mx-auto gap-4">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-display text-headline-sm text-secondary-fixed">{salonName}</span>
            <p className="font-body text-body-md text-on-surface-variant">{profileQuery.data?.address || profileQuery.data?.city || 'Premium grooming services.'}</p>
          </div>
          <div className="flex gap-6">
            <a href="/#services" className="font-body text-label-sm text-on-surface-variant hover:text-primary transition-colors">Services</a>
            <a href="/#contact" className="font-body text-label-sm text-on-surface-variant hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
