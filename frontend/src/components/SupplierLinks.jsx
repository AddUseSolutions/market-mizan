import { useLanguage } from "../context/LanguageContext";
import { buildHolisticServiceMessage, buildWhatsAppUrl } from "../utils/whatsapp";
import { Button } from "./ui";

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
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-heading">{t("holisticServicesTitle")}</h2>
      <p className="mt-2 text-sm text-muted">{t("holisticServicesLead")}</p>

      <ul className="mt-4 space-y-3">
        {SERVICES.map((s) => {
          const label = t(s.labelKey);
          const desc = t(s.descKey);
          const waUrl = buildWhatsAppUrl(buildHolisticServiceMessage({ label, desc }, property));

          return (
            <li key={s.labelKey} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-medium text-heading">{label}</span>
                  <span className="mt-1 block text-sm text-muted">{desc}</span>
                </div>
                {waUrl ? (
                  <Button as="a" href={waUrl} target="_blank" rel="noreferrer" variant="whatsapp" size="sm">
                    {t("contactUs")}
                  </Button>
                ) : (
                  <span className="text-sm text-muted">{t("contactUs")}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
