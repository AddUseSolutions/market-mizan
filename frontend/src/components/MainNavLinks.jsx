import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../utils/cn";

const navLinkBase =
  "rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-primary/5 hover:text-primary";

export function MainNavLinks({ onNavigate, variant = "mobile" }) {
  const { t } = useLanguage();

  const linkClass = ({ isActive }) =>
    cn(navLinkBase, variant === "mobile" && "block w-full text-left", isActive && "font-semibold text-primary");

  return (
    <>
      <NavLink to="/about" className={linkClass} onClick={onNavigate}>
        {t("navAbout")}
      </NavLink>
      <NavLink to="/neighborhoods" className={linkClass} onClick={onNavigate}>
        {t("navMap")}
      </NavLink>
    </>
  );
}
