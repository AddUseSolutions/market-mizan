import { useLanguage } from "../context/LanguageContext";
import { buildWhatsAppUrl } from "../utils/whatsapp";
import { cn } from "../utils/cn";

export default function WhatsAppFab() {
  const { t } = useLanguage();
  const href = buildWhatsAppUrl(t("whatsappFabMessage")) || "/contact";
  const isWhatsApp = href.startsWith("http");

  return (
    <a
      className={cn(
        "fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-card transition-transform hover:scale-105",
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
