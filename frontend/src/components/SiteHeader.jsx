import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { MainNavLinks } from "./MainNavLinks";
import { LanguageToggle, useLanguage } from "../context/LanguageContext";
import { ROLES, hasAnyRole } from "../constants/roles";
import { Container } from "./ui";
import { cn } from "../utils/cn";

const navLink =
  "rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:text-hero-navy hidden lg:inline-flex";

function NavButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(navLink, active && "font-semibold text-hero-navy")}
    >
      {children}
    </button>
  );
}

function NavLinkItem({ to, children, onClick, className }) {
  return (
    <Link to={to} onClick={onClick} className={cn(navLink, className)}>
      {children}
    </Link>
  );
}

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
    <header className="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        <nav className="hidden items-center gap-1 lg:flex" aria-label={t("navBuyOrRent")}>
          <NavButton active={listingMode === "for_rent"} onClick={() => setListingMode(listingMode === "for_rent" ? "" : "for_rent")}>
            {t("rent")}
          </NavButton>
          <NavButton active={listingMode === "for_sale"} onClick={() => setListingMode(listingMode === "for_sale" ? "" : "for_sale")}>
            {t("buy")}
          </NavButton>
          <NavLinkItem to="/list-your-property" onClick={closeNav}>{t("sell")}</NavLinkItem>
          <NavLinkItem to="/contact" onClick={closeNav} className="hidden xl:inline-flex">{t("findAgent")}</NavLinkItem>
        </nav>

        <Link to="/" className="shrink-0" onClick={closeNav}>
          <img src="/logo-market-mizan-header.png" alt="Market Mizan" className="h-8 w-auto sm:h-9" />
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <NavLinkItem to="/list-your-property" onClick={closeNav} className="hidden md:inline-flex">{t("manageRentals")}</NavLinkItem>
          <NavLinkItem to="/list-your-property" onClick={closeNav} className="hidden lg:inline-flex">{t("verifyListing")}</NavLinkItem>
          <NavLinkItem to="/contact" onClick={closeNav} className="hidden lg:inline-flex">{t("advertise")}</NavLinkItem>
          <NavLinkItem to="/contact" onClick={closeNav} className="hidden xl:inline-flex">{t("getHelp")}</NavLinkItem>
          <LanguageToggle compact />
          {isAuthenticated && hasAnyRole(user, ROLES.ADMIN, ROLES.AGENCY_BROKER, ROLES.PREMIUM_BUYER) ? (
            <NavLinkItem to="/dashboard" onClick={closeNav} className="hidden md:inline-flex">{t("dashboard")}</NavLinkItem>
          ) : null}
          {isAuthenticated && hasAnyRole(user, ROLES.ADMIN) ? (
            <NavLinkItem to="/admin" onClick={closeNav} className="hidden xl:inline-flex">{t("navAdmin")}</NavLinkItem>
          ) : null}
          {isAuthenticated ? (
            <button
              type="button"
              className="hidden rounded-lg bg-hero-navy px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-hero-navy-deep md:inline-flex"
              onClick={() => { logout(); closeNav(); }}
            >
              {t("signOut")}
            </button>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-lg bg-hero-navy px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-hero-navy-deep md:inline-flex"
              onClick={closeNav}
            >
              {t("signIn")}
            </Link>
          )}
          <button
            type="button"
            className="relative flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-lg border border-line lg:hidden"
            onClick={() => setNavOpen((o) => !o)}
            aria-label={navOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={navOpen}
            aria-controls="mobile-menu"
          >
            <span className={cn("block h-0.5 w-5 bg-text transition-transform", navOpen && "translate-y-1.5 rotate-45")} />
            <span className={cn("block h-0.5 w-5 bg-text transition-opacity", navOpen && "opacity-0")} />
            <span className={cn("block h-0.5 w-5 bg-text transition-transform", navOpen && "-translate-y-1.5 -rotate-45")} />
          </button>
        </div>
      </Container>

      <div
        className={cn("fixed inset-0 z-40 bg-text/30 backdrop-blur-sm transition-opacity lg:hidden", navOpen ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={closeNav}
        aria-hidden
      />

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-surface shadow-card transition-transform duration-300 lg:hidden",
          navOpen ? "translate-x-0" : "translate-x-full"
        )}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t("menu")}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="font-semibold font-heading text-heading">{t("menu")}</span>
          <div className="flex items-center gap-2">
            <LanguageToggle compact />
            <button type="button" className="rounded-lg p-2 text-xl text-muted hover:bg-line/50" onClick={closeNav} aria-label={t("closeMenu")}>
              ×
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-b border-line p-4">
          <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-hero-navy hover:text-hero-navy" onClick={() => setListingMode("for_rent")}>{t("rent")}</button>
          <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-hero-navy hover:text-hero-navy" onClick={() => setListingMode("for_sale")}>{t("buy")}</button>
          <Link to="/list-your-property" className="rounded-lg border border-line px-3 py-2 text-center text-sm font-medium hover:border-hero-navy hover:text-hero-navy" onClick={closeNav}>{t("sell")}</Link>
          <Link to="/contact" className="rounded-lg border border-line px-3 py-2 text-center text-sm font-medium hover:border-hero-navy hover:text-hero-navy" onClick={closeNav}>{t("findAgent")}</Link>
        </div>
        <div className="flex flex-col gap-1 border-b border-line p-4">
          <Link to="/list-your-property" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-hero-navy/5 hover:text-hero-navy" onClick={closeNav}>{t("manageRentals")}</Link>
          <Link to="/list-your-property" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-hero-navy/5 hover:text-hero-navy" onClick={closeNav}>{t("verifyListing")}</Link>
          <Link to="/contact" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-hero-navy/5 hover:text-hero-navy" onClick={closeNav}>{t("advertise")}</Link>
          <Link to="/contact" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-hero-navy/5 hover:text-hero-navy" onClick={closeNav}>{t("getHelp")}</Link>
          {isAuthenticated && hasAnyRole(user, ROLES.ADMIN, ROLES.AGENCY_BROKER, ROLES.PREMIUM_BUYER) ? (
            <Link to="/dashboard" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-hero-navy/5 hover:text-hero-navy" onClick={closeNav}>{t("dashboard")}</Link>
          ) : null}
          {isAuthenticated && hasAnyRole(user, ROLES.ADMIN) ? (
            <Link to="/admin" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-hero-navy/5 hover:text-hero-navy" onClick={closeNav}>{t("navAdmin")}</Link>
          ) : null}
          {!isAuthenticated ? (
            <Link to="/login" className="mt-2 rounded-lg bg-hero-navy px-3 py-2 text-center text-sm font-semibold text-white hover:bg-hero-navy-deep" onClick={closeNav}>{t("signIn")}</Link>
          ) : null}
        </div>
        <nav className="flex flex-col gap-1 overflow-y-auto p-4" aria-label={t("navMobile")}>
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
