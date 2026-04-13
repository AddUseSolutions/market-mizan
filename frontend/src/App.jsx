import { Link, NavLink, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import AdminPage from "./pages/AdminPage";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import LegalNoticePage from "./pages/LegalNoticePage";
import SitemapPage from "./pages/SitemapPage";
import AboutPage from "./pages/AboutPage";
import ProtectedRoute from "./components/ProtectedRoute";
import SiteFooter from "./components/SiteFooter";
import { useAuth } from "./context/AuthContext";

function App() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="logo">
            <img src="/logo-market-mizan.svg" alt="Market Mizan" className="logo-img" />
          </Link>
          <nav className="topnav">
            <NavLink to="/search" className={({ isActive }) => `topnav-link ${isActive ? "topnav-link-active" : ""}`}>Search</NavLink>
            <NavLink to="/about" className={({ isActive }) => `topnav-link ${isActive ? "topnav-link-active" : ""}`}>About</NavLink>
            {user?.role === "admin" ? (
              <NavLink to="/admin" className={({ isActive }) => `topnav-link topnav-link-accent ${isActive ? "topnav-link-active" : ""}`}>
                Admin
              </NavLink>
            ) : null}
            <NavLink to="/contact" className={({ isActive }) => `topnav-link ${isActive ? "topnav-link-active" : ""}`}>Contact</NavLink>
            <NavLink to="/login" className={({ isActive }) => `topnav-link ${isActive ? "topnav-link-active" : ""}`}>
              {isAuthenticated ? user?.firstName || "Account" : "Login"}
            </NavLink>
            {isAuthenticated ? (
              <button type="button" className="topnav-link topnav-link-logout" onClick={logout}>
                Logout
              </button>
            ) : null}
          </nav>
        </div>
      </header>
      <div className="app-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/property/:id" element={<PropertyDetailPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/legal-notice" element={<LegalNoticePage />} />
          <Route path="/sitemap" element={<SitemapPage />} />
        </Routes>
      </div>
      <SiteFooter />
    </div>
  );
}

export default App;
