import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import { ROLES } from "./constants/roles";
import ProtectedRoute from "./components/ProtectedRoute";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import ScrollToTop from "./components/ScrollToTop";
import CompareTray from "./components/CompareTray";
import WhatsAppFab from "./components/WhatsAppFab";
import { useAuth } from "./context/AuthContext";

const AdminPage = lazy(() => import("./pages/AdminPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const LegalNoticePage = lazy(() => import("./pages/LegalNoticePage"));
const SitemapPage = lazy(() => import("./pages/SitemapPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const SetPasswordPage = lazy(() => import("./pages/SetPasswordPage"));
const ListYourPropertyPage = lazy(() => import("./pages/ListYourPropertyPage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const NeighborhoodMapPage = lazy(() => import("./pages/NeighborhoodMapPage"));

const DASHBOARD_ROLES = [ROLES.ADMIN, ROLES.AGENCY_BROKER, ROLES.PREMIUM_BUYER, ROLES.PRIVATE_LANDLORD];

function LegacySearchRedirect() {
  const location = useLocation();
  const suffix = location.search || "";
  return <Navigate to={`/${suffix}`} replace />;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
      Loading…
    </div>
  );
}

function App() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <SiteHeader user={user} isAuthenticated={isAuthenticated} logout={logout} />
      <div className="flex-1 overflow-x-hidden">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/about"
              element={
                <ProtectedRoute adminOnly>
                  <AboutPage />
                </ProtectedRoute>
              }
            />
            <Route path="/set-password" element={<SetPasswordPage />} />
            <Route path="/list-your-property" element={<ListYourPropertyPage />} />
            <Route path="/search" element={<LegacySearchRedirect />} />
            <Route path="/property/:id" element={<PropertyDetailPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={DASHBOARD_ROLES}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="/neighborhoods" element={<NeighborhoodMapPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/legal-notice" element={<LegalNoticePage />} />
            <Route path="/sitemap" element={<SitemapPage />} />
          </Routes>
        </Suspense>
      </div>
      <SiteFooter />
      <CompareTray />
      <WhatsAppFab />
    </div>
  );
}

export default App;
