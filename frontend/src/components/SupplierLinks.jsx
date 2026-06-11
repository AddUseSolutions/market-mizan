import { useLanguage } from "../context/LanguageContext";
import { buildHolisticServiceMessage } from "../utils/whatsapp";

const SERVICES = [
  { label: "Property management", desc: "Tenant & maintenance support" },
  { label: "Interior design", desc: "Staging and renovation" },
  { label: "Craftsmanship", desc: "Repairs and build-out" },
  { label: "Mortgage / bank", desc: "Financing options" },
  { label: "Insurance", desc: "Property coverage" }
];

export default function SupplierLinks({ property, onContact }) {
  const { t } = useLanguage();

  function openServiceContact(service) {
    onContact?.({
      title: t("contactUs"),
      message: buildHolisticServiceMessage(service, property),
      serviceLabel: service.label,
      leadType: "holistic_service"
    });
  }

  return (
    <section className="supplier-links">
      <h2 className="detail-section-title">{t("holisticServicesTitle")}</h2>
      <p className="supplier-links-lead">{t("holisticServicesLead")}</p>

      <ul className="supplier-services-list">
        {SERVICES.map((s) => (
          <li key={s.label} className="supplier-service-item">
            <div className="supplier-service-row">
              <div className="supplier-service-info">
                <span className="supplier-service-label">{s.label}</span>
                <span className="supplier-service-desc">{s.desc}</span>
              </div>
              <button
                type="button"
                className="supplier-service-contact"
                onClick={() => openServiceContact(s)}
              >
                {t("contactUs")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
