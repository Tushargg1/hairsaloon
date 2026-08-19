import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'

const roleLabels = {
  CUSTOMER: 'Customer',
  SALON_OWNER: 'Salon owner',
  PLATFORM_ADMIN: 'Platform admin',
}

export default function PlatformLayout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

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
    <div className="site-frame">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <NavLink className="brand" to="/" aria-label="HairSaloon home">
          <span className="brand-mark" aria-hidden="true">H</span>
          <span>HairSaloon</span>
        </NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/salons">Find a salon</NavLink>
          {user?.role === 'SALON_OWNER' && <NavLink to="/salon-signup">List your salon</NavLink>}
          {user?.role === 'PLATFORM_ADMIN' && <NavLink to="/admin/approvals">Approvals</NavLink>}
        </nav>
        <div className="account-actions">
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>{dark ? '☀️' : '🌙'}</button>
          {logoutError && <span className="header-error" role="alert">{logoutError}</span>}
          {loading ? (
            <span className="muted">Checking account…</span>
          ) : user ? (
            <>
              <span className="account-label">
                <strong>{user.name || user.email || user.phone}</strong>
                <small>{roleLabels[user.role] || user.role}</small>
              </span>
              {user.role === 'CUSTOMER' && <Link to="/profile" className="text-link">Profile</Link>}
              <button className="button button-ghost button-small" type="button" disabled={loggingOut} onClick={handleLogout}>
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </>
          ) : (
            <>
              <NavLink className="text-link" to="/login">Log in</NavLink>
              <NavLink className="button button-small" to="/signup">Create account</NavLink>
            </>
          )}
        </div>
      </header>
      <div className="site-content" id="main-content" tabIndex="-1"><Outlet /></div>
      <footer className="site-footer">
        <div><strong>HairSaloon</strong><p>Independent salons, thoughtfully discovered.</p></div>
        <NavLink to="/salons">Browse salons</NavLink>
      </footer>
    </div>
  )
}
