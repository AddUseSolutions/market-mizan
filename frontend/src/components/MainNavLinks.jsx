import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { ROLES, hasAnyRole } from "../constants/roles";
import { cn } from "../utils/cn";

const DASHBOARD_ROLES = [ROLES.ADMIN, ROLES.AGENCY_BROKER, ROLES.PREMIUM_BUYER, ROLES.PRIVATE_LANDLORD];

const navLinkBase =
  "relative block rounded-2xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-brand-muted hover:text-brand-deep";

function NavItem({ to, end, onClick, children, isMobile }) {
  const linkClass = ({ isActive }) =>
    cn(
      navLinkBase,
      isMobile ? "w-full text-left" : "inline-block",
      isActive && "font-semibold text-brand-deep",
      isActive && isMobile && "bg-brand-muted"
    );

  return (
    <NavLink to={to} end={end} className={linkClass} onClick={onClick}>
      {({ isActive }) => (
        <>
          {children}
          {!isMobile && isActive ? (
            <span className="absolute bottom-1.5 left-3 h-0.5 w-8 rounded-full bg-primary" aria-hidden />
          ) : null}
        </>
      )}
    </NavLink>
  );
}

/**
 * Compact primary nav (mobile + desktop).
 * Dashboard for non-standard roles; Admin only for ADMIN.
 * `showFullMenu` kept for API compat (no longer dumps marketing clutter).
 */
export function MainNavLinks({ user, onNavigate, variant = "mobile", showFullMenu = false }) {
  const { t } = useLanguage();
  const isMobile = variant === "mobile";
  const showDashboard = hasAnyRole(user, ...DASHBOARD_ROLES);
  const showAdmin = hasAnyRole(user, ROLES.ADMIN);
  void showFullMenu;

  return (
    <>
      <NavItem to="/" end onClick={onNavigate} isMobile={isMobile}>
        {t("footerExplore")}
      </NavItem>
      <NavItem to="/?listing_mode=for_rent" onClick={onNavigate} isMobile={isMobile}>
        {t("rent")}
      </NavItem>
      <NavItem to="/?listing_mode=for_sale" onClick={onNavigate} isMobile={isMobile}>
        {t("buy")}
      </NavItem>
      <NavItem to="/neighborhoods" onClick={onNavigate} isMobile={isMobile}>
        {t("navMap")}
      </NavItem>
      <NavItem to="/contact" onClick={onNavigate} isMobile={isMobile}>
        {t("findAgent")}
      </NavItem>
      <NavItem to="/list-your-property" onClick={onNavigate} isMobile={isMobile}>
        {t("footerListYourProperty")}
      </NavItem>
      {showDashboard ? (
        <NavItem to="/dashboard" onClick={onNavigate} isMobile={isMobile}>
          {t("dashboard")}
        </NavItem>
      ) : null}
      {showAdmin ? (
        <NavItem to="/admin" onClick={onNavigate} isMobile={isMobile}>
          {t("navAdmin")}
        </NavItem>
      ) : null}
    </>
  );
}
