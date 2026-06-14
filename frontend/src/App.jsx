import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import AdminPage from "./pages/AdminPage";
import DashboardPage from "./pages/DashboardPage";
import { ROLES } from "./constants/roles";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import LegalNoticePage from "./pages/LegalNoticePage";
import SitemapPage from "./pages/SitemapPage";
import AboutPage from "./pages/AboutPage";
import ListYourPropertyPage from "./pages/ListYourPropertyPage";
import NeighborhoodMapPage from "./pages/NeighborhoodMapPage";
import ProtectedRoute from "./components/ProtectedRoute";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import WhatsAppFab from "./components/WhatsAppFab";
import { useAuth } from "./context/AuthContext";

function LegacySearchRedirect() {
  const location = useLocation();
  const suffix = location.search || "";
  return <Navigate to={`/${suffix}`} replace />;
}

function App() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} isAuthenticated={isAuthenticated} logout={logout} />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/list-your-property" element={<ListYourPropertyPage />} />
          <Route path="/search" element={<LegacySearchRedirect />} />
          <Route path="/property/:id" element={<PropertyDetailPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.AGENCY_BROKER, ROLES.PREMIUM_BUYER]}>
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
      </div>
      <SiteFooter />
      <WhatsAppFab />
    </div>
  );
}

export default App;
