import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { ROLES, hasAnyRole } from "../constants/roles";
import { cn } from "../utils/cn";

const navLinkBase =
  "rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-primary/5 hover:text-primary";

export function MainNavLinks({ user, onNavigate, variant = "mobile" }) {
  const { t } = useLanguage();
  const isMobile = variant === "mobile";

  const linkClass = ({ isActive }) =>
    cn(
      navLinkBase,
      isMobile ? "block w-full text-left" : "inline-block",
      isActive && "bg-primary/10 font-semibold text-primary"
    );

  return (
    <>
      <NavLink to="/" className={linkClass} onClick={onNavigate} end>
        {t("footerExplore")}
      </NavLink>
      <NavLink to="/contact" className={linkClass} onClick={onNavigate}>
        {t("findAgent")}
      </NavLink>
      <NavLink to="/list-your-property" className={linkClass} onClick={onNavigate}>
        {t("footerListYourProperty")}
      </NavLink>
      {hasAnyRole(user, ROLES.ADMIN, ROLES.AGENCY_BROKER, ROLES.PREMIUM_BUYER) ? (
        <NavLink to="/dashboard" className={linkClass} onClick={onNavigate}>
          {t("dashboard")}
        </NavLink>
      ) : null}
      {hasAnyRole(user, ROLES.ADMIN) ? (
        <NavLink to="/admin" className={linkClass} onClick={onNavigate}>
          {t("navAdmin")}
        </NavLink>
      ) : null}
    </>
  );
}
