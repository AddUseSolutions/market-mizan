import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { ROLES, hasAnyRole } from "../constants/roles";
import { cn } from "../utils/cn";

const navLinkBase =
  "relative block rounded-2xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-brand-muted hover:text-brand-deep";

function MobileNavItem({ to, end, onClick, children }) {
  return (
    <NavLink to={to} end={end} onClick={onClick} className={({ isActive }) => cn(navLinkBase, "w-full text-left", isActive && "bg-brand-muted font-semibold text-brand-deep")}>
      {children}
    </NavLink>
  );
}

export function MainNavLinks({ user, onNavigate, variant = "mobile", showFullMenu = false }) {
  const { t } = useLanguage();
  const isMobile = variant === "mobile";

  const linkClass = ({ isActive }) =>
    cn(navLinkBase, isMobile ? "w-full text-left" : "inline-block", isActive && "font-semibold text-brand-deep");

  if (showFullMenu && isMobile) {
    return (
      <>
        <MobileNavItem to="/?listing_mode=for_rent" onClick={onNavigate}>{t("rent")}</MobileNavItem>
        <MobileNavItem to="/?listing_mode=for_sale" onClick={onNavigate}>{t("buy")}</MobileNavItem>
        <MobileNavItem to="/list-your-property" onClick={onNavigate}>{t("sell")}</MobileNavItem>
        <MobileNavItem to="/contact" onClick={onNavigate}>{t("findAgent")}</MobileNavItem>
        <MobileNavItem to="/dashboard" onClick={onNavigate}>{t("manageRentals")}</MobileNavItem>
        <MobileNavItem to="/list-your-property" onClick={onNavigate}>{t("verifyListing")}</MobileNavItem>
        <MobileNavItem to="/contact?subject=advertise" onClick={onNavigate}>{t("advertise")}</MobileNavItem>
        <MobileNavItem to="/contact" onClick={onNavigate}>{t("getHelp")}</MobileNavItem>
        <div className="my-2 border-t border-line" aria-hidden />
        <MobileNavItem to="/" end onClick={onNavigate}>{t("footerExplore")}</MobileNavItem>
        <MobileNavItem to="/list-your-property" onClick={onNavigate}>{t("footerListYourProperty")}</MobileNavItem>
        {hasAnyRole(user, ROLES.ADMIN, ROLES.AGENCY_BROKER, ROLES.PREMIUM_BUYER) ? (
          <MobileNavItem to="/dashboard" onClick={onNavigate}>{t("dashboard")}</MobileNavItem>
        ) : null}
        {hasAnyRole(user, ROLES.ADMIN) ? (
          <MobileNavItem to="/admin" onClick={onNavigate}>{t("navAdmin")}</MobileNavItem>
        ) : null}
      </>
    );
  }

  return (
    <>
      <NavLink to="/" className={linkClass} onClick={onNavigate} end>
        {({ isActive }) => (
          <>
            {t("footerExplore")}
            {isActive ? (
              <span className="absolute bottom-1.5 left-3 h-0.5 w-8 rounded-full bg-gold" aria-hidden />
            ) : null}
          </>
        )}
      </NavLink>
      <NavLink to="/contact" className={linkClass} onClick={onNavigate}>
        {({ isActive }) => (
          <>
            {t("findAgent")}
            {isActive ? (
              <span className="absolute bottom-1.5 left-3 h-0.5 w-8 rounded-full bg-gold" aria-hidden />
            ) : null}
          </>
        )}
      </NavLink>
      <NavLink to="/list-your-property" className={linkClass} onClick={onNavigate}>
        {({ isActive }) => (
          <>
            {t("footerListYourProperty")}
            {isActive ? (
              <span className="absolute bottom-1.5 left-3 h-0.5 w-8 rounded-full bg-gold" aria-hidden />
            ) : null}
          </>
        )}
      </NavLink>
      {hasAnyRole(user, ROLES.ADMIN, ROLES.AGENCY_BROKER, ROLES.PREMIUM_BUYER) ? (
        <NavLink to="/dashboard" className={linkClass} onClick={onNavigate}>
          {({ isActive }) => (
            <>
              {t("dashboard")}
              {isActive ? (
                <span className="absolute bottom-1.5 left-3 h-0.5 w-8 rounded-full bg-gold" aria-hidden />
              ) : null}
            </>
          )}
        </NavLink>
      ) : null}
      {hasAnyRole(user, ROLES.ADMIN) ? (
        <NavLink to="/admin" className={linkClass} onClick={onNavigate}>
          {({ isActive }) => (
            <>
              {t("navAdmin")}
              {isActive ? (
                <span className="absolute bottom-1.5 left-3 h-0.5 w-8 rounded-full bg-gold" aria-hidden />
              ) : null}
            </>
          )}
        </NavLink>
      ) : null}
    </>
  );
}
