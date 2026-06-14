import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { MainNavLinks } from "./MainNavLinks";
import { LanguageToggle, useLanguage } from "../context/LanguageContext";
import { ROLES, hasAnyRole } from "../constants/roles";
import { Container } from "./ui";
import { cn } from "../utils/cn";

function navLinkClass(active) {
  return cn(
    "relative hidden px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-hero-navy lg:inline-flex",
    active && "font-semibold text-hero-navy after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[3px] after:rounded-full after:bg-gold"
  );
}

function NavModeButton({ active, children, onClick }) {
  return (
    <button type="button" onClick={onClick} className={navLinkClass(active)}>
      {children}
    </button>
  );
}

function NavTextLink({ to, children, onClick, className }) {
  return (
    <Link to={to} onClick={onClick} className={cn(navLinkClass(false), className)}>
      {children}
    </Link>
  );
}

function VerifyListingLink({ to, children, onClick, className }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "hidden rounded-lg border border-gold px-3 py-1.5 text-sm font-semibold text-hero-navy transition-colors hover:bg-gold/10 lg:inline-flex",
        className
      )}
    >
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

  const rentActive = listingMode === "for_rent";
  const buyActive = !rentActive;

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

  const mobileModeClass = (active) =>
    cn(
      "px-2 py-2 text-sm font-medium text-muted transition-colors",
      active && "font-semibold text-hero-navy underline decoration-gold decoration-[3px] underline-offset-8"
    );

  return (
    <header className="sticky top-0 z-50 border-t-[3px] border-primary bg-white shadow-soft">
      <Container className="relative flex h-[4.25rem] items-center">
        <nav className="flex flex-1 items-center gap-0.5" aria-label={t("navBuyOrRent")}>
          <NavModeButton active={rentActive} onClick={() => setListingMode(rentActive ? "" : "for_rent")}>
            {t("rent")}
          </NavModeButton>
          <NavModeButton active={buyActive} onClick={() => setListingMode(buyActive ? "" : "for_sale")}>
            {t("buy")}
          </NavModeButton>
          <NavTextLink to="/list-your-property" onClick={closeNav}>
            {t("sell")}
          </NavTextLink>
          <NavTextLink to="/contact" onClick={closeNav} className="hidden xl:inline-flex">
            {t("findAgent")}
          </NavTextLink>
        </nav>

        <Link
          to="/"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shrink-0"
          onClick={closeNav}
        >
          <img src="/logo-market-mizan-header.png" alt="Market Mizan" className="h-9 w-auto sm:h-10" />
        </Link>

        <div className="flex flex-1 items-center justify-end gap-1 sm:gap-1.5">
          <NavTextLink to="/list-your-property" onClick={closeNav} className="hidden md:inline-flex">
            {t("manageRentals")}
          </NavTextLink>
          <VerifyListingLink to="/list-your-property" onClick={closeNav}>
            {t("verifyListing")}
          </VerifyListingLink>
          <NavTextLink to="/contact" onClick={closeNav} className="hidden lg:inline-flex">
            {t("advertise")}
          </NavTextLink>
          <NavTextLink to="/contact" onClick={closeNav} className="hidden xl:inline-flex">
            {t("getHelp")}
          </NavTextLink>
          <LanguageToggle compact />
          {isAuthenticated && hasAnyRole(user, ROLES.ADMIN, ROLES.AGENCY_BROKER, ROLES.PREMIUM_BUYER) ? (
            <NavTextLink to="/dashboard" onClick={closeNav} className="hidden md:inline-flex">
              {t("dashboard")}
            </NavTextLink>
          ) : null}
          {isAuthenticated && hasAnyRole(user, ROLES.ADMIN) ? (
            <NavTextLink to="/admin" onClick={closeNav} className="hidden xl:inline-flex">
              {t("navAdmin")}
            </NavTextLink>
          ) : null}
          {isAuthenticated ? (
            <button
              type="button"
              className="hidden rounded-lg bg-hero-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-hero-navy-deep md:inline-flex"
              onClick={() => {
                logout();
                closeNav();
              }}
            >
              {t("signOut")}
            </button>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-lg bg-hero-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-hero-navy-deep md:inline-flex"
              onClick={closeNav}
            >
              {t("signIn")}
            </Link>
          )}
          <button
            type="button"
            className="relative ml-1 flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-lg border border-line lg:hidden"
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
        className={cn(
          "fixed inset-0 z-40 bg-text/30 backdrop-blur-sm transition-opacity lg:hidden",
          navOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeNav}
        aria-hidden
      />

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-line bg-white shadow-card transition-transform duration-300 lg:hidden",
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

        <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-line px-4 py-3">
          <button type="button" className={mobileModeClass(rentActive)} onClick={() => setListingMode("for_rent")}>
            {t("rent")}
          </button>
          <button type="button" className={mobileModeClass(buyActive)} onClick={() => setListingMode("for_sale")}>
            {t("buy")}
          </button>
          <Link to="/list-your-property" className={mobileModeClass(false)} onClick={closeNav}>
            {t("sell")}
          </Link>
          <Link to="/contact" className={mobileModeClass(false)} onClick={closeNav}>
            {t("findAgent")}
          </Link>
        </div>

        <div className="flex flex-col gap-1 border-b border-line p-4">
          <Link to="/list-your-property" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-primary/5 hover:text-primary" onClick={closeNav}>
            {t("manageRentals")}
          </Link>
          <Link
            to="/list-your-property"
            className="mx-3 inline-flex w-fit rounded-lg border border-gold px-3 py-1.5 text-sm font-semibold text-hero-navy"
            onClick={closeNav}
          >
            {t("verifyListing")}
          </Link>
          <Link to="/contact" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-primary/5 hover:text-primary" onClick={closeNav}>
            {t("advertise")}
          </Link>
          <Link to="/contact" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-primary/5 hover:text-primary" onClick={closeNav}>
            {t("getHelp")}
          </Link>
          {isAuthenticated && hasAnyRole(user, ROLES.ADMIN, ROLES.AGENCY_BROKER, ROLES.PREMIUM_BUYER) ? (
            <Link to="/dashboard" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-primary/5 hover:text-primary" onClick={closeNav}>
              {t("dashboard")}
            </Link>
          ) : null}
          {isAuthenticated && hasAnyRole(user, ROLES.ADMIN) ? (
            <Link to="/admin" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-primary/5 hover:text-primary" onClick={closeNav}>
              {t("navAdmin")}
            </Link>
          ) : null}
          {!isAuthenticated ? (
            <Link to="/login" className="mx-3 mt-2 inline-flex w-fit rounded-lg bg-hero-navy px-4 py-2 text-sm font-semibold text-white" onClick={closeNav}>
              {t("signIn")}
            </Link>
          ) : null}
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto p-4" aria-label={t("navMobile")}>
          <MainNavLinks user={user} isAuthenticated={isAuthenticated} logout={logout} onNavigate={closeNav} variant="mobile" />
        </nav>
      </div>
    </header>
  );
}
