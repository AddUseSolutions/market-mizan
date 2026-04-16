import { NavLink } from "react-router-dom";

export function MainNavLinks({ user, isAuthenticated, logout, onNavigate, variant = "desktop" }) {
  const base = variant === "mobile" ? "mobile-nav-link" : "topnav-link";
  const active = ({ isActive }) => `${base} ${isActive ? (variant === "mobile" ? "mobile-nav-link-active" : "topnav-link-active") : ""}`;
  const adminActive = ({ isActive }) =>
    `${base} ${variant === "mobile" ? "" : "topnav-link-accent"} ${isActive ? (variant === "mobile" ? "mobile-nav-link-active" : "topnav-link-active") : ""}`;

  return (
    <>
      <NavLink to="/" className={active} onClick={onNavigate}>
        Listings
      </NavLink>
      <NavLink to="/about" className={active} onClick={onNavigate}>
        About
      </NavLink>
      <NavLink to="/list-your-property" className={active} onClick={onNavigate}>
        Upload listing
      </NavLink>
      {user?.role === "admin" ? (
        <NavLink to="/admin" className={adminActive} onClick={onNavigate}>
          Admin
        </NavLink>
      ) : null}
      <NavLink to="/login" className={active} onClick={onNavigate}>
        {isAuthenticated ? user?.firstName || "Account" : "Login"}
      </NavLink>
      {isAuthenticated ? (
        <button type="button" className={variant === "mobile" ? "mobile-nav-logout" : "topnav-link topnav-link-logout"} onClick={() => { logout(); onNavigate?.(); }}>
          Logout
        </button>
      ) : null}
    </>
  );
}
