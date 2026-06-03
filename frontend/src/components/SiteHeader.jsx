import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { MainNavLinks } from "./MainNavLinks";
import { LanguageToggle, useLanguage } from "../context/LanguageContext";

export default function SiteHeader({ user, isAuthenticated, logout }) {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const listingMode = params.get("listing_mode") || "";
  const { t } = useLanguage();

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

  function setListingMode(mode) {
    const next = new URLSearchParams(params);
    if (mode) next.set("listing_mode", mode);
    else next.delete("listing_mode");
    next.set("page", "1");
    const q = next.toString();
    if (location.pathname === "/") {
      navigate(q ? `/?${q}` : "/");
    } else {
      navigate(q ? `/?${q}` : "/");
    }
    closeNav();
  }

  return (
    <header className="topbar site-header">
      <div className="site-header-secondary">
        <div className="container site-header-secondary-inner">
          <div className="site-header-secondary-links">
            <Link to="/list-your-property" onClick={closeNav}>Manage rentals</Link>
            <Link to="/list-your-property" onClick={closeNav}>Verify listing</Link>
            <Link to="/contact" onClick={closeNav}>Advertise</Link>
            <Link to="/contact" onClick={closeNav}>Get help</Link>
          </div>
          <div className="site-header-secondary-auth">
            <LanguageToggle />
            {isAuthenticated ? (
              <button type="button" className="site-header-text-btn" onClick={() => { logout(); closeNav(); }}>
                Sign out
              </button>
            ) : (
              <Link to="/login" onClick={closeNav}>Sign in</Link>
            )}
          </div>
        </div>
      </div>

      <div className="container topbar-inner site-header-main">
        <Link to="/" className="logo" onClick={closeNav}>
          <img src="/logo-market-mizan-header.png" alt="Market Mizan" className="logo-img" />
        </Link>

        <nav className="site-header-modes" aria-label="Listing mode">
          <button
            type="button"
            className={`site-header-mode ${listingMode === "for_rent" ? "active" : ""}`}
            onClick={() => setListingMode(listingMode === "for_rent" ? "" : "for_rent")}
          >
            {t("rent")}
          </button>
          <button
            type="button"
            className={`site-header-mode ${listingMode === "for_sale" ? "active" : ""}`}
            onClick={() => setListingMode(listingMode === "for_sale" ? "" : "for_sale")}
          >
            {t("buy")}
          </button>
          <Link to="/list-your-property" className="site-header-mode site-header-mode-link" onClick={closeNav}>
            {t("sell")}
          </Link>
          <Link to="/contact" className="site-header-mode site-header-mode-link" onClick={closeNav}>
            {t("findAgent")}
          </Link>
        </nav>

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
        <div className="mobile-nav-modes">
          <button type="button" className="mobile-nav-mode" onClick={() => setListingMode("for_rent")}>Rent</button>
          <button type="button" className="mobile-nav-mode" onClick={() => setListingMode("for_sale")}>Buy</button>
          <Link to="/list-your-property" className="mobile-nav-mode" onClick={closeNav}>Sell</Link>
          <Link to="/contact" className="mobile-nav-mode" onClick={closeNav}>Find agent</Link>
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
  );
}
