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
import BusinessSignup from './platform/BusinessSignup.jsx'
import AdminApprovals from './platform/AdminApprovals.jsx'
import AdminSalons from './platform/AdminSalons.jsx'
import AdminCustomers from './platform/AdminCustomers.jsx'
import AdminAddSalon from './platform/AdminAddSalon.jsx'
import ProfilePage from './platform/ProfilePage.jsx'
import PricingPage from './platform/PricingPage.jsx'
import AboutPage from './platform/AboutPage.jsx'
import ContactPage from './platform/ContactPage.jsx'
import TermsPage from './platform/legal/TermsPage.jsx'
import PrivacyPage from './platform/legal/PrivacyPage.jsx'
import RefundPolicyPage from './platform/legal/RefundPolicyPage.jsx'
import TenantRoutes from './tenant/TenantRoutes.jsx'

function PlatformRoutes() {
  const loadingFallback = <main className="state-page" aria-live="polite">Checking access…</main>
  return (
    <Routes>
      <Route element={<PlatformLayout />}>
        <Route index element={<HomePage />} />
        <Route path="salons" element={<SalonDirectory />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="refund-policy" element={<RefundPolicyPage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="signup" element={<AuthPage mode="signup" />} />
        <Route path="for-business" element={<BusinessSignup />} />
        <Route path="manage/login" element={<ManagementLoginPage />} />
        <Route element={<RequireRole roles="SALON_OWNER" unauthenticatedTo="/manage/login" loadingFallback={loadingFallback} />}>
          <Route path="salon-signup" element={<SalonSignup />} />
        </Route>
        <Route element={<RequireRole roles="PLATFORM_ADMIN" unauthenticatedTo="/manage/login" loadingFallback={loadingFallback} />}>
          <Route path="admin/approvals" element={<AdminApprovals />} />
          <Route path="admin/add-salon" element={<AdminAddSalon />} />
          <Route path="admin/salons" element={<AdminSalons />} />
          <Route path="admin/customers" element={<AdminCustomers />} />
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
