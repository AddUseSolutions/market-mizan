import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { MainNavLinks } from "./MainNavLinks";
import { LanguageToggle, useLanguage } from "../context/LanguageContext";
import { Container } from "./ui";
import { cn } from "../utils/cn";

const navLink =
  "relative inline-flex px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:text-primary";

function HeaderNavLink({ to, end, children, onClick, className }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(navLink, isActive && "font-semibold text-primary", className)
      }
    >
      {({ isActive }) => (
        <>
          {children}
          {isActive ? (
            <span
              className="absolute -bottom-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gold"
              aria-hidden
            />
          ) : null}
        </>
      )}
    </NavLink>
  );
}

export default function SiteHeader({ user, isAuthenticated, logout }) {
  const [navOpen, setNavOpen] = useState(false);
  const { t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname, location.search]);

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
    <header className="sticky top-0 z-50 border-t-2 border-primary bg-surface/95 shadow-soft backdrop-blur-md">
      <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-5">
          <Link to="/" className="shrink-0 lg:hidden" onClick={closeNav}>
            <img src="/logo-market-mizan-header.png" alt="Market Mizan" className="h-8 w-auto" />
          </Link>
          <nav className="hidden items-center gap-5 lg:flex" aria-label={t("footerExplore")}>
            <HeaderNavLink to="/" end onClick={closeNav}>
              {t("footerExplore")}
            </HeaderNavLink>
            <HeaderNavLink to="/contact" onClick={closeNav}>
              {t("findAgent")}
            </HeaderNavLink>
          </nav>
        </div>

        <div className="hidden justify-center lg:flex">
          <Link to="/" className="shrink-0" onClick={closeNav}>
            <img src="/logo-market-mizan-header.png" alt="Market Mizan" className="h-8 w-auto sm:h-9" />
          </Link>
        </div>

        <div className="col-start-3 flex items-center justify-end gap-1 sm:gap-2">
          <div className="hidden items-center gap-4 md:flex">
            <HeaderNavLink to="/list-your-property" onClick={closeNav}>
              {t("footerListYourProperty")}
            </HeaderNavLink>
            <LanguageToggle compact />
            {isAuthenticated ? (
              <button
                type="button"
                className="rounded-2xl bg-brand-deep px-3 py-1.5 text-sm font-semibold text-gold transition-colors hover:bg-brand-deep-hover"
                onClick={() => { logout(); closeNav(); }}
              >
                {t("signOut")}
              </button>
            ) : (
              <NavLink
                to="/login"
                onClick={closeNav}
                className={({ isActive }) =>
                  cn(
                    "rounded-2xl px-3 py-1.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-brand-deep text-gold"
                      : "bg-brand-deep text-gold hover:bg-brand-deep-hover"
                  )
                }
              >
                {t("signIn")}
              </NavLink>
            )}
          </div>
          <button
            type="button"
            className={cn(
              "relative flex h-11 w-11 flex-col items-center justify-center gap-1 rounded-2xl border border-[#DDE7F5] bg-white shadow-soft transition-colors lg:hidden",
              navOpen && "border-primary/30"
            )}
            onClick={() => setNavOpen((o) => !o)}
            aria-label={navOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={navOpen}
            aria-controls="mobile-menu"
          >
            <span className={cn("block h-0.5 w-5 bg-brand-deep transition-transform duration-200", navOpen && "translate-y-1.5 rotate-45")} />
            <span className={cn("block h-0.5 w-5 bg-brand-deep transition-opacity duration-200", navOpen && "opacity-0")} />
            <span className={cn("block h-0.5 w-5 bg-brand-deep transition-transform duration-200", navOpen && "-translate-y-1.5 -rotate-45")} />
          </button>
        </div>
      </Container>

      <div
        className={cn(
          "fixed inset-0 z-[90] bg-brand-deep/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          navOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeNav}
        aria-hidden
      />

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-[100] flex w-full max-w-sm flex-col bg-surface shadow-card transition-transform duration-300 ease-out lg:hidden",
          navOpen ? "translate-x-0" : "translate-x-full"
        )}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t("menu")}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="font-semibold font-heading text-brand-deep">{t("menu")}</span>
          <div className="flex items-center gap-2">
            <LanguageToggle compact />
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#DDE7F5] text-xl text-brand-deep hover:bg-brand-muted"
              onClick={closeNav}
              aria-label={t("closeMenu")}
            >
              ×
            </button>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4" aria-label={t("navMobile")}>
          <MainNavLinks
            user={user}
            onNavigate={closeNav}
            variant="mobile"
            showFullMenu
          />
          {!isAuthenticated ? (
            <Link
              to="/login"
              className="mt-3 rounded-2xl bg-brand-deep px-3 py-3 text-center text-sm font-semibold text-gold hover:bg-brand-deep-hover"
              onClick={closeNav}
            >
              {t("signIn")}
            </Link>
          ) : (
            <button
              type="button"
              className="mt-3 rounded-2xl bg-brand-deep px-3 py-3 text-center text-sm font-semibold text-gold hover:bg-brand-deep-hover"
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
