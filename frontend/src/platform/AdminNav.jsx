import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }) =>
  `font-body text-label-md px-3 py-1.5 rounded transition-colors ${isActive
    ? 'bg-secondary/20 text-secondary'
    : 'text-on-surface-variant hover:text-secondary-fixed'}`

export default function AdminNav() {
  return (
    <div className="flex items-center gap-2 mb-6 border-b border-outline-variant/30 pb-4">
      <NavLink to="/admin/approvals" className={linkClass}>Approvals</NavLink>
      <NavLink to="/admin/salons" className={linkClass}>Salons</NavLink>
      <NavLink to="/admin/customers" className={linkClass}>Customers</NavLink>
    </div>
  )
}
