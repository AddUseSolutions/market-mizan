import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { Input, Select, Button } from "./ui";
import {
  IconTag,
  IconRuler,
  IconBath,
  IconBed,
  IconArmchair,
  IconArrowRight,
  IconReset,
} from "./icons/HeroIcons";
import { cn } from "../utils/cn";

const emptyDraft = () => ({
  min_price: "",
  max_price: "",
  min_size: "",
  max_size: "",
  bathrooms: "",
  bedrooms: "",
  furnished: "",
});

function FilterSection({ icon: Icon, title, children }) {
  return (
    <section className="border-b border-line py-4 last:border-b-0">
      <div className="mb-3 flex items-center gap-2.5">
        <Icon className="shrink-0 text-gold" size={20} />
        <h3 className="text-sm font-semibold text-brand-deep">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function RangeInputs({ minLabel, maxLabel, minValue, maxValue, onMinChange, onMaxChange, minPlaceholder, maxPlaceholder }) {
  return (
    <div className="flex items-center gap-2">
      <label className="min-w-0 flex-1">
        <span className="sr-only">{minLabel}</span>
        <Input
          type="number"
          min="0"
          value={minValue}
          onChange={onMinChange}
          placeholder={minPlaceholder}
          className="w-full"
        />
      </label>
      <span className="shrink-0 text-muted" aria-hidden>–</span>
      <label className="min-w-0 flex-1">
        <span className="sr-only">{maxLabel}</span>
        <Input
          type="number"
          min="0"
          value={maxValue}
          onChange={onMaxChange}
          placeholder={maxPlaceholder}
          className="w-full"
        />
      </label>
    </div>
  );
}

function HomeMoreFiltersModal({ open, onClose }) {
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState(emptyDraft);
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    setDraft({
      min_price: params.get("min_price") || "",
      max_price: params.get("max_price") || "",
      min_size: params.get("min_size") || "",
      max_size: params.get("max_size") || "",
      bathrooms: params.get("bathrooms") || "",
      bedrooms: params.get("bedrooms") || "",
      furnished: params.get("furnished") || "",
    });
  }, [open, params]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const apply = () => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      const keys = ["min_price", "max_price", "min_size", "max_size", "bathrooms", "bedrooms", "furnished"];
      keys.forEach((k) => {
        const v = String(draft[k] ?? "").trim();
        if (v) next.set(k, v);
        else next.delete(k);
      });
      next.set("page", "1");
      return next;
    });
    onClose?.();
  };

  const reset = () => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      ["min_price", "max_price", "min_size", "max_size", "bathrooms", "bedrooms", "furnished", "source"].forEach((k) =>
        next.delete(k)
      );
      next.set("page", "1");
      return next;
    });
    setDraft(emptyDraft());
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-brand-deep/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("moreFiltersTitle")}
        className={cn(
          "relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden bg-surface shadow-card",
          "rounded-t-3xl sm:max-w-lg sm:rounded-2xl sm:border sm:border-line"
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden" aria-hidden />

        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold font-heading text-brand-deep">{t("moreFiltersTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("moreFiltersLead")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#DDE7F5] text-xl text-brand-deep hover:bg-brand-muted"
            aria-label={t("closeMenu")}
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
          <FilterSection icon={IconTag} title={t("moreFiltersPrice")}>
            <RangeInputs
              minLabel={t("moreFiltersMinPrice")}
              maxLabel={t("moreFiltersMaxPrice")}
              minValue={draft.min_price}
              maxValue={draft.max_price}
              onMinChange={(e) => setField("min_price", e.target.value)}
              onMaxChange={(e) => setField("max_price", e.target.value)}
              minPlaceholder={t("moreFiltersPricePlaceholder")}
              maxPlaceholder={t("moreFiltersPricePlaceholder")}
            />
          </FilterSection>

          <FilterSection icon={IconRuler} title={t("moreFiltersSize")}>
            <RangeInputs
              minLabel={t("moreFiltersMinSize")}
              maxLabel={t("moreFiltersMaxSize")}
              minValue={draft.min_size}
              maxValue={draft.max_size}
              onMinChange={(e) => setField("min_size", e.target.value)}
              onMaxChange={(e) => setField("max_size", e.target.value)}
              minPlaceholder={t("moreFiltersSizePlaceholder")}
              maxPlaceholder={t("moreFiltersSizePlaceholder")}
            />
          </FilterSection>

          <FilterSection icon={IconBath} title={t("moreFiltersBathrooms")}>
            <Select value={draft.bathrooms} onChange={(e) => setField("bathrooms", e.target.value)} aria-label={t("moreFiltersBathrooms")}>
              <option value="">{t("filterAny")}</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
            </Select>
          </FilterSection>

          <FilterSection icon={IconBed} title={t("moreFiltersBedrooms")}>
            <Select value={draft.bedrooms} onChange={(e) => setField("bedrooms", e.target.value)} aria-label={t("moreFiltersBedrooms")}>
              <option value="">{t("filterAny")}</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </Select>
          </FilterSection>

          <FilterSection icon={IconArmchair} title={t("furnishedLabel")}>
            <Select value={draft.furnished} onChange={(e) => setField("furnished", e.target.value)} aria-label={t("furnishedLabel")}>
              <option value="">{t("filterAny")}</option>
              <option value="true">{t("furnishedYes")}</option>
              <option value="false">{t("furnishedNo")}</option>
            </Select>
          </FilterSection>
        </div>

        <div className="sticky bottom-0 shrink-0 border-t border-line bg-surface px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-brand-deep hover:text-primary sm:justify-start"
            >
              <IconReset className="text-gold" size={18} />
              {t("resetAllFilters")}
            </button>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 sm:flex-none" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button variant="primary-gold" className="flex-1 bg-brand-deep sm:flex-none" onClick={apply}>
                {t("applyFilters")}
                <IconArrowRight className="text-gold" size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeMoreFiltersModal;
