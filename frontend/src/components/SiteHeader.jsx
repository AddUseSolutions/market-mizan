import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MainNavLinks } from "./MainNavLinks";
import { LanguageToggle, useLanguage } from "../context/LanguageContext";
import { ROLES, hasAnyRole } from "../constants/roles";
import { Container } from "./ui";
import { cn } from "../utils/cn";

const navLink =
  "rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:text-primary";

function NavLinkItem({ to, children, onClick, className }) {
  return (
    <Link to={to} onClick={onClick} className={cn(navLink, className)}>
      {children}
    </Link>
  );
}

function NavSeparator() {
  return <span className="px-0.5 text-muted/50" aria-hidden>·</span>;
}

export default function SiteHeader({ user, isAuthenticated, logout }) {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
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

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur-md">
      <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3">
        <nav className="hidden items-center lg:flex" aria-label={t("footerExplore")}>
          <NavLinkItem to="/" onClick={closeNav}>{t("footerExplore")}</NavLinkItem>
          <NavSeparator />
          <NavLinkItem to="/contact" onClick={closeNav}>{t("findAgent")}</NavLinkItem>
        </nav>

        <div className="flex justify-start lg:justify-center">
          <Link to="/" className="shrink-0" onClick={closeNav}>
            <img src="/logo-market-mizan-header.png" alt="Market Mizan" className="h-8 w-auto sm:h-9" />
          </Link>
        </div>

        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <div className="hidden items-center md:flex">
            <NavLinkItem to="/list-your-property" onClick={closeNav}>
              {t("footerListYourProperty")}
            </NavLinkItem>
            <NavSeparator />
            <LanguageToggle compact />
            <NavSeparator />
            {isAuthenticated ? (
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                onClick={() => { logout(); closeNav(); }}
              >
                {t("signOut")}
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                onClick={closeNav}
              >
                {t("signIn")}
              </Link>
            )}
          </div>
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
        <nav className="flex flex-col gap-1 overflow-y-auto p-4" aria-label={t("navMobile")}>
          <MainNavLinks
            user={user}
            isAuthenticated={isAuthenticated}
            logout={logout}
            onNavigate={closeNav}
            variant="mobile"
          />
          {!isAuthenticated ? (
            <Link to="/login" className="mt-2 rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-primary-dark" onClick={closeNav}>
              {t("signIn")}
            </Link>
          ) : (
            <button
              type="button"
              className="mt-2 rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-primary-dark"
              onClick={() => { logout(); closeNav(); }}
            >
              {t("signOut")}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
