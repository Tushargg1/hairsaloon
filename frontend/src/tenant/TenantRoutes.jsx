import { Navigate, Route, Routes } from 'react-router-dom'
import RequireRole from '../shared/auth/RequireRole.jsx'
import BookingFlow from './BookingFlow.jsx'
import CustomerBookings from './CustomerBookings.jsx'
import BookingsCalendar from './dashboard/BookingsCalendar.jsx'
import DashboardLayout from './dashboard/DashboardLayout.jsx'
import DashboardOverview from './dashboard/DashboardOverview.jsx'
import ReviewsManager from './dashboard/ReviewsManager.jsx'
import ServicesManager from './dashboard/ServicesManager.jsx'
import StaffManager from './dashboard/StaffManager.jsx'
import SalonPublicPage from './SalonPublicPage.jsx'
import TenantLayout from './TenantLayout.jsx'
import TenantLoginPage from './TenantLoginPage.jsx'

export default function TenantRoutes() {
  const loadingFallback = <main className="state-page" aria-live="polite">Checking salon access…</main>
  return (
    <Routes>
      <Route element={<TenantLayout />}>
        <Route index element={<SalonPublicPage />} />
        <Route path="book" element={<BookingFlow />} />
        <Route path="login" element={<TenantLoginPage />} />
        <Route element={<RequireRole roles="CUSTOMER" unauthenticatedTo="/login" forbiddenTo="/" loadingFallback={loadingFallback} />}>
          <Route path="bookings" element={<CustomerBookings />} />
        </Route>
        <Route element={<RequireRole roles="SALON_OWNER" unauthenticatedTo="/login" forbiddenTo="/" loadingFallback={loadingFallback} />}>
          <Route path="dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="bookings" element={<BookingsCalendar />} />
            <Route path="services" element={<ServicesManager />} />
            <Route path="staff" element={<StaffManager />} />
            <Route path="reviews" element={<ReviewsManager />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}