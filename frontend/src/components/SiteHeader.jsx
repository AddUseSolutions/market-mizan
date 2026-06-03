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
    navigate(q ? `/?${q}` : "/");
    closeNav();
  }

  return (
    <header className="topbar site-header zillow-header">
      <div className="container zillow-header-inner">
        <nav className="zillow-nav zillow-nav-left" aria-label="Buy or rent">
          <button
            type="button"
            className={`zillow-nav-link${listingMode === "for_rent" ? " zillow-nav-link--active" : ""}`}
            onClick={() => setListingMode(listingMode === "for_rent" ? "" : "for_rent")}
          >
            {t("rent")}
          </button>
          <button
            type="button"
            className={`zillow-nav-link${listingMode === "for_sale" ? " zillow-nav-link--active" : ""}`}
            onClick={() => setListingMode(listingMode === "for_sale" ? "" : "for_sale")}
          >
            {t("buy")}
          </button>
          <Link to="/list-your-property" className="zillow-nav-link" onClick={closeNav}>
            {t("sell")}
          </Link>
          <Link to="/contact" className="zillow-nav-link zillow-nav-link--hide-mobile" onClick={closeNav}>
            {t("findAgent")}
          </Link>
        </nav>

        <Link to="/" className="logo zillow-header-logo" onClick={closeNav}>
          <img src="/logo-market-mizan-header.png" alt="Market Mizan" className="logo-img" />
        </Link>

        <div className="zillow-nav zillow-nav-right">
          <Link to="/list-your-property" className="zillow-nav-link zillow-nav-link--utility zillow-nav-link--hide-phone" onClick={closeNav}>
            {t("manageRentals")}
          </Link>
          <Link to="/list-your-property" className="zillow-nav-link zillow-nav-link--utility zillow-nav-link--hide-mobile" onClick={closeNav}>
            {t("verifyListing")}
          </Link>
          <Link to="/contact" className="zillow-nav-link zillow-nav-link--utility zillow-nav-link--hide-mobile" onClick={closeNav}>
            {t("advertise")}
          </Link>
          <Link to="/contact" className="zillow-nav-link zillow-nav-link--utility zillow-nav-link--hide-phone zillow-nav-link--hide-tablet" onClick={closeNav}>
            {t("getHelp")}
          </Link>
          <LanguageToggle compact />
          {isAuthenticated ? (
            <button type="button" className="zillow-nav-link zillow-nav-link--signin zillow-nav-link--hide-phone" onClick={() => { logout(); closeNav(); }}>
              {t("signOut")}
            </button>
          ) : (
            <Link to="/login" className="zillow-nav-link zillow-nav-link--signin zillow-nav-link--hide-phone" onClick={closeNav}>
              {t("signIn")}
            </Link>
          )}
          <button
            type="button"
            className={`topbar-burger zillow-burger ${navOpen ? "topbar-burger-open" : ""}`}
            onClick={() => setNavOpen((o) => !o)}
            aria-label={navOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={navOpen}
            aria-controls="mobile-menu"
          >
            <span className="burger-line" />
            <span className="burger-line" />
            <span className="burger-line" />
          </button>
        </div>
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
        aria-label={t("menu")}
      >
        <div className="mobile-nav-header">
          <span className="mobile-nav-title">{t("menu")}</span>
          <div className="mobile-nav-header-actions">
            <LanguageToggle compact />
            <button type="button" className="mobile-nav-close" onClick={closeNav} aria-label={t("closeMenu")}>
              ×
            </button>
          </div>
        </div>
        <div className="mobile-nav-modes">
          <button type="button" className="mobile-nav-mode" onClick={() => setListingMode("for_rent")}>{t("rent")}</button>
          <button type="button" className="mobile-nav-mode" onClick={() => setListingMode("for_sale")}>{t("buy")}</button>
          <Link to="/list-your-property" className="mobile-nav-mode" onClick={closeNav}>{t("sell")}</Link>
          <Link to="/contact" className="mobile-nav-mode" onClick={closeNav}>{t("findAgent")}</Link>
        </div>
        <div className="mobile-nav-utilities">
          <Link to="/list-your-property" className="mobile-nav-utility" onClick={closeNav}>{t("manageRentals")}</Link>
          <Link to="/list-your-property" className="mobile-nav-utility" onClick={closeNav}>{t("verifyListing")}</Link>
          <Link to="/contact" className="mobile-nav-utility" onClick={closeNav}>{t("advertise")}</Link>
          <Link to="/contact" className="mobile-nav-utility" onClick={closeNav}>{t("getHelp")}</Link>
          {!isAuthenticated ? (
            <Link to="/login" className="mobile-nav-utility mobile-nav-utility--signin" onClick={closeNav}>{t("signIn")}</Link>
          ) : null}
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
