import { useLanguage } from "../context/LanguageContext";
import { buildHolisticServiceMessage, buildWhatsAppUrl } from "../utils/whatsapp";

const SERVICES = [
  { label: "Property management", desc: "Tenant & maintenance support" },
  { label: "Interior design", desc: "Staging and renovation" },
  { label: "Craftsmanship", desc: "Repairs and build-out" },
  { label: "Mortgage / bank", desc: "Financing options" },
  { label: "Insurance", desc: "Property coverage" }
];

export default function SupplierLinks({ property }) {
  const { t } = useLanguage();
  const hasWhatsApp = Boolean(buildWhatsAppUrl("test"));

  return (
    <section className="supplier-links">
      <h2 className="detail-section-title">{t("holisticServicesTitle")}</h2>
      <p className="supplier-links-lead">{t("holisticServicesLead")}</p>
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
    </section>
  );
}
