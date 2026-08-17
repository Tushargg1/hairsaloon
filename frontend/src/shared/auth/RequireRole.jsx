import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from './useAuth.js'

export default function RequireRole({
  roles,
  children,
  unauthenticatedTo = '/login',
  forbiddenTo = '/',
  loadingFallback = null,
}) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const allowedRoles = Array.isArray(roles) ? roles : [roles]

  if (loading) return loadingFallback
  if (!user) {
    return <Navigate to={unauthenticatedTo} replace state={{ from: location }} />
  }
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={forbiddenTo} replace />
  }
  return children ?? <Outlet />
}
