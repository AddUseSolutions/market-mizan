import { useLanguage } from "../context/LanguageContext";
import { useCompare } from "../context/CompareContext";
import { buildWhatsAppUrl } from "../utils/whatsapp";
import { cn } from "../utils/cn";

export default function WhatsAppFab() {
  const { t } = useLanguage();
  const { items } = useCompare();
  const href = buildWhatsAppUrl(t("whatsappFabMessage")) || "/contact";
  const isWhatsApp = href.startsWith("http");
  const lifted = items.length > 0;

  return (
    <a
      className={cn(
        "fixed right-6 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-card transition-transform hover:scale-105",
        lifted ? "bottom-36 sm:bottom-6" : "bottom-6",
        isWhatsApp ? "btn-whatsapp" : "bg-primary hover:bg-primary-dark"
      )}
      href={href}
      {...(isWhatsApp ? { target: "_blank", rel: "noreferrer" } : {})}
      aria-label={isWhatsApp ? t("contactUsWhatsApp") : t("contactUs")}
    >
      <span aria-hidden>{isWhatsApp ? "💬" : "✉"}</span>
      <span className="hidden sm:inline">{isWhatsApp ? t("whatsappFabLabel") : t("contactFabLabel")}</span>
    </a>
  );
}
