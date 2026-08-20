import { NavLink, Link } from 'react-router-dom'
import useAuth from '../auth/useAuth.js'
import BrassButton from './BrassButton.jsx'
import Icon from './Icon.jsx'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#230F08]/85 backdrop-blur-xl border-b border-outline-variant/30 shadow-md transition-all duration-300">
      <div className="flex justify-between items-center w-full px-4 lg:px-[80px] py-2 max-w-[1280px] mx-auto h-20">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3" aria-label="Groomit home">
          <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center border border-outline-variant/50">
            <span className="font-display font-bold text-secondary text-xl">G</span>
          </div>
          <span className="font-display text-secondary-fixed tracking-tight text-[28px]">Groomit</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink to="/salons" className={({ isActive }) => `font-body text-label-md transition-colors ${isActive ? 'text-secondary border-b-2 border-secondary pb-1' : 'text-on-surface-variant hover:text-secondary-fixed'}`}>
            Find a Salon
          </NavLink>
          {user?.role === 'SALON_OWNER' && (
            <NavLink to="/salon-signup" className={({ isActive }) => `font-body text-label-md transition-colors ${isActive ? 'text-secondary border-b-2 border-secondary pb-1' : 'text-on-surface-variant hover:text-secondary-fixed'}`}>
              My Salon
            </NavLink>
          )}
          {user?.role === 'PLATFORM_ADMIN' && (
            <NavLink to="/admin/approvals" className={({ isActive }) => `font-body text-label-md transition-colors ${isActive ? 'text-secondary border-b-2 border-secondary pb-1' : 'text-on-surface-variant hover:text-secondary-fixed'}`}>
              Admin
            </NavLink>
          )}
        </div>

        {/* Trailing Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <NavLink to="/profile" className="font-body text-label-md text-on-surface-variant hover:text-secondary-fixed transition-colors">
                {user.name || user.phone}
              </NavLink>
              <button onClick={logout} className="font-body text-label-sm text-on-surface-variant hover:text-error transition-colors">
                Logout
              </button>
            </div>
          ) : (
            <BrassButton to="/login" size="sm">Login / Signup</BrassButton>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-secondary p-1 rounded hover:bg-surface-container-high transition-colors">
          <Icon name="menu" filled />
        </button>
      </div>
    </nav>
  )
}
