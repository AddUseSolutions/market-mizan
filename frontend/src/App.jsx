import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
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
import ListYourPropertyPage from "./pages/ListYourPropertyPage";
import ProtectedRoute from "./components/ProtectedRoute";
import SiteFooter from "./components/SiteFooter";
import { MainNavLinks } from "./components/MainNavLinks";
import { useAuth } from "./context/AuthContext";

function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    if (navOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  const closeNav = () => setNavOpen(false);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="logo" onClick={closeNav}>
            <img src="/logo-market-mizan-header.png" alt="Market Mizan" className="logo-img" />
          </Link>

          <nav className="topnav topnav-desktop" aria-label="Main navigation">
            <MainNavLinks
              user={user}
              isAuthenticated={isAuthenticated}
              logout={logout}
              variant="desktop"
            />
          </nav>

          <button
            type="button"
            className={`topbar-burger ${navOpen ? "topbar-burger-open" : ""}`}
            onClick={() => setNavOpen((o) => !o)}
            aria-label={navOpen ? "Close menu" : "Open menu"}
            aria-expanded={navOpen}
            aria-controls="mobile-menu"
          >
            <span className="burger-line" />
            <span className="burger-line" />
            <span className="burger-line" />
          </button>
        </div>

        <div
          className={`mobile-nav-backdrop ${navOpen ? "mobile-nav-backdrop-visible" : ""}`}
          onClick={closeNav}
          aria-hidden="true"
        />

        <div
          className={`mobile-nav-panel ${navOpen ? "mobile-nav-panel-open" : ""}`}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile menu"
        >
          <div className="mobile-nav-header">
            <span className="mobile-nav-title">Menu</span>
            <button type="button" className="mobile-nav-close" onClick={closeNav} aria-label="Close menu">
              ×
            </button>
          </div>
          <nav className="mobile-nav-inner" aria-label="Mobile navigation">
            <MainNavLinks
              user={user}
              isAuthenticated={isAuthenticated}
              logout={logout}
              onNavigate={closeNav}
              variant="mobile"
            />
          </nav>
        </div>
      </header>
      <div className="app-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/list-your-property" element={<ListYourPropertyPage />} />
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
