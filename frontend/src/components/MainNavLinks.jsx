import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { ROLES, hasAnyRole } from "../constants/roles";
import { cn } from "../utils/cn";

const navLinkBase =
  "relative block rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-primary/5 hover:text-primary";

export function MainNavLinks({ user, onNavigate, variant = "mobile" }) {
  const { t } = useLanguage();
  const isMobile = variant === "mobile";

  const linkClass = ({ isActive }) =>
    cn(navLinkBase, isMobile ? "w-full text-left" : "inline-block", isActive && "font-semibold text-primary");

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
