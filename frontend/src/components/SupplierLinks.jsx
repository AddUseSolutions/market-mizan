import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { buildHolisticServiceMessage, buildWhatsAppUrl } from "../utils/whatsapp";
import { IconArrowRight, IconBuilding, IconChevronRight } from "./icons/HeroIcons";
import { cn } from "../utils/cn";

const SERVICES = [
  { labelKey: "supplierPropertyManagement", descKey: "supplierPropertyManagementDesc", icon: IconBuilding },
  { labelKey: "supplierInteriorDesign", descKey: "supplierInteriorDesignDesc", icon: IconBuilding },
  { labelKey: "supplierCraftsmanship", descKey: "supplierCraftsmanshipDesc", icon: IconBuilding },
  { labelKey: "supplierMortgage", descKey: "supplierMortgageDesc", icon: IconBuilding },
  { labelKey: "supplierInsurance", descKey: "supplierInsuranceDesc", icon: IconBuilding },
];

export default function SupplierLinks({ property, onRequestHelp }) {
  const { t } = useLanguage();
  const [openKey, setOpenKey] = useState(null);

  return (
    <section className="mt-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
        <div>
          <h2 className="text-xl font-bold text-brand-deep">{t("holisticServicesTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("holisticServicesLead")}</p>
        </div>

        <ul className="space-y-2">
          {SERVICES.map((s) => {
            const label = t(s.labelKey);
            const desc = t(s.descKey);
            const isOpen = openKey === s.labelKey;
            const waUrl = buildWhatsAppUrl(buildHolisticServiceMessage({ label, desc }, property));

            return (
              <li
                key={s.labelKey}
                className={cn(
                  "overflow-hidden rounded-[20px] border bg-surface transition-colors",
                  isOpen ? "border-gold/60 bg-gold/5 shadow-soft" : "border-[#DDE7F5] shadow-soft"
                )}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-4 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpenKey(isOpen ? null : s.labelKey)}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-muted text-gold">
                    <s.icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-brand-deep">{label}</span>
                    {!isOpen ? (
                      <span className="mt-0.5 block truncate text-sm text-muted">{desc}</span>
                    ) : null}
                  </span>
                  <IconChevronRight
                    className={cn("shrink-0 text-gold transition-transform", isOpen && "rotate-90")}
                    size={18}
                  />
                </button>

                {isOpen ? (
                  <div className="border-t border-line/80 px-4 pb-4 pt-2">
                    <p className="text-sm leading-relaxed text-muted">{desc}</p>
                    {waUrl ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand-deep px-4 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-brand-deep-hover"
                        onClick={() => onRequestHelp?.({ label, desc })}
                      >
                        {t("requestExpertHelp")}
                        <IconArrowRight size={16} className="text-gold" />
                      </a>
                    ) : (
                      <p className="mt-3 text-sm text-muted">{t("holisticServicesNoWhatsApp")}</p>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
