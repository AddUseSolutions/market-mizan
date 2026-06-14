import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { ROLES, hasAnyRole } from "../constants/roles";
import { cn } from "../utils/cn";

const navLinkBase =
  "rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-hero-navy/5 hover:text-hero-navy";

export function MainNavLinks({ user, isAuthenticated, logout, onNavigate, variant = "desktop" }) {
  const { t } = useLanguage();
  const isMobile = variant === "mobile";

  const linkClass = ({ isActive }) =>
    cn(
      navLinkBase,
      isMobile ? "block w-full text-left" : "inline-block",
      isActive && "bg-hero-navy/10 font-semibold text-hero-navy"
    );

  const adminLinkClass = ({ isActive }) =>
    cn(linkClass({ isActive }), !isMobile && "text-accent");

  return (
    <>
      <NavLink to="/" className={linkClass} onClick={onNavigate}>
        {t("navListings")}
      </NavLink>
      <NavLink to="/about" className={linkClass} onClick={onNavigate}>
        {t("navAbout")}
      </NavLink>
      <NavLink to="/neighborhoods" className={linkClass} onClick={onNavigate}>
        {t("navMap")}
      </NavLink>
      <NavLink to="/list-your-property" className={linkClass} onClick={onNavigate}>
        {t("navUpload")}
      </NavLink>
      {hasAnyRole(user, ROLES.ADMIN, ROLES.AGENCY_BROKER, ROLES.PREMIUM_BUYER) ? (
        <NavLink to="/dashboard" className={adminLinkClass} onClick={onNavigate}>
          {t("dashboard")}
        </NavLink>
      ) : null}
      {hasAnyRole(user, ROLES.ADMIN) ? (
        <NavLink to="/admin" className={adminLinkClass} onClick={onNavigate}>
          {t("navAdmin")}
        </NavLink>
      ) : null}
      <NavLink to="/login" className={linkClass} onClick={onNavigate}>
        {isAuthenticated ? user?.firstName || t("navAccount") : t("navLogin")}
      </NavLink>
      {isAuthenticated ? (
        <button
          type="button"
          className={cn(navLinkBase, isMobile ? "block w-full text-left" : "inline-block")}
          onClick={() => {
            logout();
            onNavigate?.();
          }}
        >
          {t("navLogout")}
        </button>
      ) : null}
    </>
  );
}
