import { NavLink, Outlet } from 'react-router-dom'

export default function DashboardLayout() {
  return (
    <main className="tenant-dashboard page-width">
      <header className="dashboard-heading">
        <div><p className="eyebrow">Owner dashboard</p><h1>Salon management</h1></div>
        <div className="dashboard-nav-shell">
          <span className="nav-scroll-hint">Management sections</span>
          <nav className="dashboard-nav" aria-label="Dashboard navigation">
            <NavLink to="/dashboard" end>Overview</NavLink>
            <NavLink to="/dashboard/bookings">Bookings</NavLink>
            <NavLink to="/dashboard/services">Services</NavLink>
            <NavLink to="/dashboard/staff">Staff</NavLink>
            <NavLink to="/dashboard/reviews">Reviews</NavLink>
          </nav>
        </div>
      </header>
      <Outlet />
    </main>
  )
}