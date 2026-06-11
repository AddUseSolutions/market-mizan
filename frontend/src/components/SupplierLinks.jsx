import { useLanguage } from "../context/LanguageContext";
import { buildHolisticServiceMessage, buildWhatsAppUrl } from "../utils/whatsapp";

const SERVICES = [
  { label: "Property management", desc: "Tenant & maintenance support" },
  { label: "Interior design", desc: "Staging and renovation" },
  { label: "Craftsmanship", desc: "Repairs and build-out" },
  { label: "Mortgage / bank", desc: "Financing options" },
  { label: "Insurance", desc: "Property coverage" }
];

export default function SupplierLinks({ property, onContact }) {
  const { t } = useLanguage();
  const hasWhatsApp = Boolean(buildWhatsAppUrl("test"));
  const generalWaUrl = buildWhatsAppUrl(
    `Hello Market Mizan,\n\nI have a question about this property:\n${property?.title || property?.property_id}\nReference: ${property?.property_id}`
  );

  return (
    <section className="supplier-links">
      <h2 className="detail-section-title">{t("holisticServicesTitle")}</h2>
      <p className="supplier-links-lead">{t("holisticServicesLead")}</p>

      <div className="supplier-services-layout">
        <div className="supplier-services-main">
          <div className="supplier-grid">
            {SERVICES.map((s) => {
              const waUrl = buildWhatsAppUrl(buildHolisticServiceMessage(s, property));
              const className = "supplier-card";

              if (waUrl) {
                return (
                  <a
                    key={s.label}
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={className}
                  >
                    <strong>{s.label}</strong>
                    <span>{s.desc}</span>
                    <span className="supplier-card-wa">{t("whatsapp")}</span>
                  </a>
                );
              }

              return (
                <a key={s.label} href="/contact" className={className}>
                  <strong>{s.label}</strong>
                  <span>{s.desc}</span>
                </a>
              );
            })}
          </div>
          {!hasWhatsApp ? (
            <p className="supplier-links-fallback muted-inline">{t("holisticServicesNoWhatsApp")}</p>
          ) : null}
        </div>

        <aside className="supplier-contact-panel" aria-label="Contact">
          <h3 className="supplier-contact-panel-title">{t("contactUs")}</h3>
          <p className="supplier-contact-panel-lead">{t("contactPanelLead")}</p>
          {generalWaUrl ? (
            <a
              href={generalWaUrl}
              target="_blank"
              rel="noreferrer"
              className="supplier-contact-panel-btn"
            >
              {t("whatsapp")}
            </a>
          ) : (
            <button type="button" className="supplier-contact-panel-btn" onClick={onContact}>
              {t("contactUs")}
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}
