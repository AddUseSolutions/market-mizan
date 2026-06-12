import { useLanguage } from "../context/LanguageContext";
import { buildHolisticServiceMessage, buildWhatsAppUrl } from "../utils/whatsapp";

const SERVICES = [
  { labelKey: "supplierPropertyManagement", descKey: "supplierPropertyManagementDesc" },
  { labelKey: "supplierInteriorDesign", descKey: "supplierInteriorDesignDesc" },
  { labelKey: "supplierCraftsmanship", descKey: "supplierCraftsmanshipDesc" },
  { labelKey: "supplierMortgage", descKey: "supplierMortgageDesc" },
  { labelKey: "supplierInsurance", descKey: "supplierInsuranceDesc" }
];

export default function SupplierLinks({ property }) {
  const { t } = useLanguage();

  return (
    <section className="supplier-links">
      <h2 className="detail-section-title">{t("holisticServicesTitle")}</h2>
      <p className="supplier-links-lead">{t("holisticServicesLead")}</p>

      <ul className="supplier-services-list">
        {SERVICES.map((s) => {
          const label = t(s.labelKey);
          const desc = t(s.descKey);
          const waUrl = buildWhatsAppUrl(buildHolisticServiceMessage({ label, desc }, property));

          return (
            <li key={s.labelKey} className="supplier-service-item">
              <div className="supplier-service-row">
                <div className="supplier-service-info">
                  <span className="supplier-service-label">{label}</span>
                  <span className="supplier-service-desc">{desc}</span>
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
