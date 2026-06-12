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

  return (
    <section className="supplier-links">
      <h2 className="detail-section-title">{t("holisticServicesTitle")}</h2>
      <p className="supplier-links-lead">{t("holisticServicesLead")}</p>

      <ul className="supplier-services-list">
        {SERVICES.map((s) => {
          const waUrl = buildWhatsAppUrl(buildHolisticServiceMessage(s, property));

          return (
            <li key={s.label} className="supplier-service-item">
              <div className="supplier-service-row">
                <div className="supplier-service-info">
                  <span className="supplier-service-label">{s.label}</span>
                  <span className="supplier-service-desc">{s.desc}</span>
                </div>
                {waUrl ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="supplier-service-contact whatsapp-cta"
                  >
                    {t("contactUs")}
                  </a>
                ) : (
                  <span className="supplier-service-contact supplier-service-contact--disabled">
                    {t("contactUs")}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
