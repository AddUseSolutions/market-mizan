import { useLanguage } from "../context/LanguageContext";
import { buildWhatsAppUrl } from "../utils/whatsapp";

export default function WhatsAppFab() {
  const { t } = useLanguage();
  const href = buildWhatsAppUrl(t("whatsappFabMessage")) || "/contact";

  if (href.startsWith("http")) {
    return (
      <a className="whatsapp-fab whatsapp-cta" href={href} target="_blank" rel="noreferrer" aria-label={t("contactUsWhatsApp")}>
        <span className="whatsapp-fab-icon" aria-hidden>💬</span>
        <span className="whatsapp-fab-label">{t("whatsappFabLabel")}</span>
      </a>
    );
  }

  return (
    <a className="whatsapp-fab whatsapp-fab-contact" href={href} aria-label={t("contactUs")}>
      <span className="whatsapp-fab-icon" aria-hidden>✉</span>
      <span className="whatsapp-fab-label">{t("contactFabLabel")}</span>
    </a>
  );
}
