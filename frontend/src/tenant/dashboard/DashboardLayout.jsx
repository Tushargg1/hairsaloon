import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Icon from '../../shared/components/Icon.jsx'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: 'dashboard', end: true },
  { to: '/dashboard/bookings', label: 'Bookings', icon: 'calendar_month' },
  { to: '/dashboard/services', label: 'Services', icon: 'content_cut' },
  { to: '/dashboard/staff', label: 'Staff', icon: 'group' },
  { to: '/dashboard/reviews', label: 'Reviews', icon: 'rate_review' },
  { to: '/dashboard/promotions', label: 'Promotions', icon: 'local_offer' },
  { to: '/dashboard/settings', label: 'Salon details', icon: 'storefront' },
]

const THEME_KEY = 'groomit-dashboard-theme'

export default function DashboardLayout() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark')
  const light = theme === 'light'

  useEffect(() => { localStorage.setItem(THEME_KEY, theme) }, [theme])

  useEffect(() => {
    document.body.classList.add('has-scrollbar')
    return () => document.body.classList.remove('has-scrollbar')
  }, [])

  return (
    <div className={`min-h-screen ${light ? 'theme-light' : ''}`} style={{ backgroundColor: 'var(--c-page)' }}>
      <main className="max-w-[1280px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-1">Owner dashboard</p>
            <h1 className="font-display text-headline-md text-on-surface">Salon Management</h1>
          </div>
          <button type="button" onClick={() => setTheme(light ? 'dark' : 'light')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant/50 font-body text-label-sm text-on-surface-variant hover:text-secondary transition-colors"
            aria-pressed={light} aria-label={`Switch to ${light ? 'dark' : 'light'} theme`}>
            <Icon name={light ? 'dark_mode' : 'light_mode'} className="text-[18px]" />
            {light ? 'Dark' : 'Light'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none" aria-label="Dashboard navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg font-body text-label-md transition-all whitespace-nowrap ${
                  isActive
                    ? 'brass-gradient shadow-amber-glow'
                    : 'border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-high hover:text-secondary'
                }`
              }
            >
              <Icon name={item.icon} className="text-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Content */}
        <Outlet />
      </main>
    </div>
  )
}
