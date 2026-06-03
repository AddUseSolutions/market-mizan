import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export function MainNavLinks({ user, isAuthenticated, logout, onNavigate, variant = "desktop" }) {
  const { t } = useLanguage();
  const base = variant === "mobile" ? "mobile-nav-link" : "topnav-link";
  const active = ({ isActive }) => `${base} ${isActive ? (variant === "mobile" ? "mobile-nav-link-active" : "topnav-link-active") : ""}`;
  const adminActive = ({ isActive }) =>
    `${base} ${variant === "mobile" ? "" : "topnav-link-accent"} ${isActive ? (variant === "mobile" ? "mobile-nav-link-active" : "topnav-link-active") : ""}`;

  return (
    <>
      <NavLink to="/" className={active} onClick={onNavigate}>
        {t("navListings")}
      </NavLink>
      <NavLink to="/about" className={active} onClick={onNavigate}>
        {t("navAbout")}
      </NavLink>
      <NavLink to="/neighborhoods" className={active} onClick={onNavigate}>
        {t("navMap")}
      </NavLink>
      <NavLink to="/list-your-property" className={active} onClick={onNavigate}>
        {t("navUpload")}
      </NavLink>
      {String(user?.role || "").toUpperCase() === "ADMIN" ? (
        <NavLink to="/admin" className={adminActive} onClick={onNavigate}>
          {t("navAdmin")}
        </NavLink>
      ) : null}
      <NavLink to="/login" className={active} onClick={onNavigate}>
        {isAuthenticated ? user?.firstName || t("navAccount") : t("navLogin")}
      </NavLink>
      {isAuthenticated ? (
        <button type="button" className={variant === "mobile" ? "mobile-nav-logout" : "topnav-link topnav-link-logout"} onClick={() => { logout(); onNavigate?.(); }}>
          {t("navLogout")}
        </button>
      ) : null}
    </>
  );
}
