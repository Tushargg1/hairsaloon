import { Navigate, Route, Routes } from 'react-router-dom'
import ManagementLoginPage from '../shared/auth/ManagementLoginPage.jsx'
import RequireRole from '../shared/auth/RequireRole.jsx'
import BookingFlow from './BookingFlow.jsx'
import CustomerBookings from './CustomerBookings.jsx'
import BookingsCalendar from './dashboard/BookingsCalendar.jsx'
import DashboardLayout from './dashboard/DashboardLayout.jsx'
import DashboardOverview from './dashboard/DashboardOverview.jsx'
import PromotionsManager from './dashboard/PromotionsManager.jsx'
import ReviewsManager from './dashboard/ReviewsManager.jsx'
import SalonSettings from './dashboard/SalonSettings.jsx'
import ServicesManager from './dashboard/ServicesManager.jsx'
import StaffManager from './dashboard/StaffManager.jsx'
import SalonAbout from './SalonAbout.jsx'
import SalonContact from './SalonContact.jsx'
import SalonPublicPage from './SalonPublicPage.jsx'
import SalonTeam from './SalonTeam.jsx'
import TenantLayout from './TenantLayout.jsx'
import TenantLoginPage from './TenantLoginPage.jsx'

export default function TenantRoutes() {
  const loadingFallback = <main className="state-page" aria-live="polite">Checking salon access…</main>
  return (
    <Routes>
      <Route element={<TenantLayout />}>
        <Route index element={<SalonPublicPage />} />
        <Route path="about" element={<SalonAbout />} />
        <Route path="team" element={<SalonTeam />} />
        <Route path="contact" element={<SalonContact />} />
        <Route path="book" element={<BookingFlow />} />
        <Route path="login" element={<TenantLoginPage />} />
        <Route path="manage/login" element={<ManagementLoginPage />} />
        <Route element={<RequireRole roles="CUSTOMER" unauthenticatedTo="/login" forbiddenTo="/" loadingFallback={loadingFallback} />}>
          <Route path="bookings" element={<CustomerBookings />} />
        </Route>
        <Route element={<RequireRole roles="SALON_OWNER" unauthenticatedTo="/manage/login" forbiddenTo="/" loadingFallback={loadingFallback} />}>
          <Route path="dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="bookings" element={<BookingsCalendar />} />
            <Route path="services" element={<ServicesManager />} />
            <Route path="staff" element={<StaffManager />} />
            <Route path="reviews" element={<ReviewsManager />} />
            <Route path="promotions" element={<PromotionsManager />} />
            <Route path="settings" element={<SalonSettings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}