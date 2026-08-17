import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from './useAuth.js'

export default function RequireAuth({ children, redirectTo = '/login', loadingFallback = null }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return loadingFallback
  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }
  return children ?? <Outlet />
}
