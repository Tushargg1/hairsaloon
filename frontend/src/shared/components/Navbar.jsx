import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import useAuth from '../auth/useAuth.js'
import BrassButton from './BrassButton.jsx'
import Icon from './Icon.jsx'

const navClass = ({ isActive }) =>
  `font-body text-label-md transition-colors ${isActive
    ? 'text-secondary border-b-2 border-secondary pb-1'
    : 'text-on-surface-variant hover:text-secondary-fixed'}`

export default function Navbar() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#230F08]/60 backdrop-blur-xl border-b border-outline-variant/30 shadow-md transition-all duration-300">
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
          <NavLink to="/salons" className={navClass}>Find a Salon</NavLink>
          <NavLink to="/pricing" className={navClass}>Pricing</NavLink>
          <NavLink to="/about" className={navClass}>About</NavLink>
          {user?.role === 'SALON_OWNER' && (
            <NavLink to="/salon-signup" className={navClass}>My Salon</NavLink>
          )}
          {user?.role === 'PLATFORM_ADMIN' && (
            <NavLink to="/admin/approvals" className={navClass}>Admin</NavLink>
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
            <>
              <NavLink to="/for-business" className="font-body text-label-md text-secondary hover:text-secondary-fixed transition-colors">
                List your salon
              </NavLink>
              <BrassButton to="/login" size="sm">Login / Signup</BrassButton>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-secondary p-1 rounded hover:bg-surface-container-high transition-colors"
          onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
          <Icon name={menuOpen ? 'close' : 'menu'} filled />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-outline-variant/30 bg-[#230F08]/90 backdrop-blur-xl px-4 py-4 flex flex-col gap-4">
          <NavLink to="/salons" onClick={close} className="font-body text-label-md text-on-surface-variant">Find a Salon</NavLink>
          <NavLink to="/pricing" onClick={close} className="font-body text-label-md text-on-surface-variant">Pricing</NavLink>
          <NavLink to="/about" onClick={close} className="font-body text-label-md text-on-surface-variant">About</NavLink>
          <NavLink to="/for-business" onClick={close} className="font-body text-label-md text-secondary">List your salon</NavLink>
          {user?.role === 'SALON_OWNER' && (
            <NavLink to="/salon-signup" onClick={close} className="font-body text-label-md text-secondary">My Salon</NavLink>
          )}
          {user?.role === 'PLATFORM_ADMIN' && (
            <NavLink to="/admin/approvals" onClick={close} className="font-body text-label-md text-secondary">Admin</NavLink>
          )}
          {user ? (
            <button onClick={() => { close(); logout() }} className="font-body text-label-sm text-on-surface-variant text-left">Logout</button>
          ) : (
            <NavLink to="/login" onClick={close} className="font-body text-label-md text-secondary">Login / Signup</NavLink>
          )}
        </div>
      )}
    </nav>
  )
}
