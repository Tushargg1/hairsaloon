import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import BackendStatusBanner from './shared/components/BackendStatusBanner.jsx'
import RequireRole from './shared/auth/RequireRole.jsx'
import { isPlatformHost } from './platform/platform-config.js'
import PlatformLayout from './platform/PlatformLayout.jsx'
import HomePage from './platform/HomePage.jsx'
import AuthPage from './platform/AuthPage.jsx'
import ManagementLoginPage from './shared/auth/ManagementLoginPage.jsx'
import SalonDirectory from './platform/SalonDirectory.jsx'
import SalonSignup from './platform/SalonSignup.jsx'
import AdminApprovals from './platform/AdminApprovals.jsx'
import ProfilePage from './platform/ProfilePage.jsx'
import TenantRoutes from './tenant/TenantRoutes.jsx'

function PlatformRoutes() {
  const loadingFallback = <main className="state-page" aria-live="polite">Checking access…</main>
  return (
    <Routes>
      <Route element={<PlatformLayout />}>
        <Route index element={<HomePage />} />
        <Route path="salons" element={<SalonDirectory />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="signup" element={<AuthPage mode="signup" />} />
        <Route path="manage/login" element={<ManagementLoginPage />} />
        <Route element={<RequireRole roles="SALON_OWNER" unauthenticatedTo="/manage/login" loadingFallback={loadingFallback} />}>
          <Route path="salon-signup" element={<SalonSignup />} />
        </Route>
        <Route element={<RequireRole roles="PLATFORM_ADMIN" unauthenticatedTo="/manage/login" loadingFallback={loadingFallback} />}>
          <Route path="admin/approvals" element={<AdminApprovals />} />
        </Route>
        <Route element={<RequireRole roles="CUSTOMER" loadingFallback={loadingFallback} />}>
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <BackendStatusBanner />
      {isPlatformHost() ? <PlatformRoutes /> : <TenantRoutes />}
    </BrowserRouter>
  )
}
