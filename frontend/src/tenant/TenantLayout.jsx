import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import { getSalonProfile, tenantKeys } from './tenant-api.js'
import { tenantNameFallback } from './tenant-host.js'

function initials(name) {
  return String(name || 'Salon').split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}

export default function TenantLayout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const profileQuery = useQuery({ queryKey: tenantKeys.profile, queryFn: getSalonProfile })
  const salonName = profileQuery.data?.name || profileQuery.data?.salonName || tenantNameFallback()

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
    <div className="site-frame tenant-site">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header tenant-header">
        <NavLink className="brand" to="/" aria-label={`${salonName} home`}>
          {profileQuery.data?.logoUrl ? <img className="tenant-logo" src={profileQuery.data.logoUrl} alt="" /> : <span className="brand-mark" aria-hidden="true">{initials(salonName)}</span>}
          <span>{salonName}</span>
        </NavLink>
        <nav className="main-nav" aria-label="Salon navigation">
          <a href="/#services">Services</a>
          <NavLink to="/book">Book</NavLink>
          <a href="/#team">Team</a>
          <a href="/#gallery">Gallery</a>
          <a href="/#contact">Contact</a>
        </nav>
        <div className="account-actions">
          {logoutError && <span className="header-error" role="alert">{logoutError}</span>}
          {loading ? <span className="muted">Checking account…</span> : user ? (
            <>
              {user.role === 'SALON_OWNER' && <NavLink className="text-link" to="/dashboard">Dashboard</NavLink>}
              {user.role === 'CUSTOMER' && <NavLink className="text-link" to="/bookings">My bookings</NavLink>}
              <button className="button button-ghost button-small" type="button" disabled={loggingOut} onClick={handleLogout}>
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </>
          ) : <NavLink className="button button-small" to="/login">Customer login</NavLink>}
        </div>
      </header>
      <div className="site-content" id="main-content" tabIndex="-1">
        <Outlet context={{ profile: profileQuery.data, profileQuery, salonName }} />
      </div>
      <footer className="site-footer">
        <div><strong>{salonName}</strong><p>{profileQuery.data?.address || profileQuery.data?.city || 'Your local salon.'}</p></div>
        <a href="/#contact">Contact</a>
      </footer>
    </div>
  )
}