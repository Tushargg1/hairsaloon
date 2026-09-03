import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Icon from '../../shared/components/Icon.jsx'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: 'dashboard', end: true },
  { to: '/dashboard/bookings', label: 'Bookings', icon: 'calendar_month' },
  { to: '/dashboard/services', label: 'Services', icon: 'content_cut' },
  { to: '/dashboard/staff', label: 'Staff', icon: 'group' },
  { to: '/dashboard/reviews', label: 'Reviews', icon: 'rate_review' },
  { to: '/dashboard/promotions', label: 'Promotions', icon: 'local_offer' },
  { to: '/dashboard/whatsapp', label: 'WhatsApp', icon: 'chat' },
  { to: '/dashboard/settings', label: 'Salon details', icon: 'storefront' },
]

const THEME_KEY = 'groomit-dashboard-theme'

function pageTitle(pathname) {
  const match = [...NAV_ITEMS].reverse().find((item) => (
    item.end ? pathname === item.to : pathname.startsWith(item.to)
  ))
  return match?.label || 'Overview'
}

export default function DashboardLayout() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark')
  const light = theme === 'light'
  const location = useLocation()

  useEffect(() => { localStorage.setItem(THEME_KEY, theme) }, [theme])

  // The theme toggle lives in the top nav; follow the change it broadcasts.
  useEffect(() => {
    const onChange = (e) => setTheme(e.detail === 'light' ? 'light' : 'dark')
    window.addEventListener('groomit-theme-change', onChange)
    return () => window.removeEventListener('groomit-theme-change', onChange)
  }, [])

  useEffect(() => {
    document.body.classList.add('has-scrollbar')
    return () => document.body.classList.remove('has-scrollbar')
  }, [])

  const navClass = ({ isActive }) => `dash-nav-link${isActive ? ' is-active' : ''}`

  return (
    <div className={`dash-shell ${light ? 'theme-light' : ''}`}>
      <aside className="dash-sidebar">
        <p className="dash-sidebar-brand">
          <Icon name="content_cut" className="text-[18px]" />
          Management
        </p>
        <nav className="dash-nav" aria-label="Dashboard navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              <Icon name={item.icon} className="text-[20px]" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="dash-main">
        <header className="dash-header">
          <p className="eyebrow">Owner dashboard</p>
          <h1 className="dash-title">{pageTitle(location.pathname)}</h1>
        </header>

        {/* Horizontal nav for small screens (sidebar is hidden there). */}
        <nav className="dash-tabs" aria-label="Dashboard navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `dash-tab${isActive ? ' is-active' : ''}`}>
              <Icon name={item.icon} className="text-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="dash-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
