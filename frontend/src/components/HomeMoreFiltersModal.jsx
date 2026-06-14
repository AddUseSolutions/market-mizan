import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { Input, Select, Button } from "./ui";
import { cn } from "../utils/cn";

const emptyDraft = () => ({
  min_price: "",
  max_price: "",
  min_size: "",
  max_size: "",
  bathrooms: "",
  furnished: "",
  source: ""
});

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
      furnished: params.get("furnished") || "",
      source: params.get("source") || ""
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
      const keys = ["min_price", "max_price", "min_size", "max_size", "bathrooms", "furnished", "source"];
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
      ["min_price", "max_price", "min_size", "max_size", "bathrooms", "furnished", "source"].forEach((k) =>
        next.delete(k)
      );
      next.set("page", "1");
      return next;
    });
    setDraft(emptyDraft());
    onClose?.();
  };

  if (!open) return null;

  const fieldLabel = "flex w-full min-w-0 flex-col gap-1.5 text-sm";

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
          "rounded-t-3xl sm:max-w-2xl sm:rounded-2xl sm:border sm:border-line"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold font-heading text-brand-deep">{t("moreFiltersTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#DDE7F5] text-xl text-brand-deep hover:bg-brand-muted"
            aria-label={t("closeMenu")}
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <p className="mb-5 text-sm text-muted">{t("moreFiltersLead")}</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={fieldLabel}>
              <span className="font-medium text-brand-deep">{t("moreFiltersMinPrice")}</span>
              <Input type="number" min="0" value={draft.min_price} onChange={(e) => setField("min_price", e.target.value)} />
            </label>
            <label className={fieldLabel}>
              <span className="font-medium text-brand-deep">{t("moreFiltersMaxPrice")}</span>
              <Input type="number" min="0" value={draft.max_price} onChange={(e) => setField("max_price", e.target.value)} />
            </label>
            <label className={fieldLabel}>
              <span className="font-medium text-brand-deep">{t("moreFiltersMinSize")}</span>
              <Input type="number" min="0" value={draft.min_size} onChange={(e) => setField("min_size", e.target.value)} />
            </label>
            <label className={fieldLabel}>
              <span className="font-medium text-brand-deep">{t("moreFiltersMaxSize")}</span>
              <Input type="number" min="0" value={draft.max_size} onChange={(e) => setField("max_size", e.target.value)} />
            </label>
            <label className={fieldLabel}>
              <span className="font-medium text-brand-deep">{t("moreFiltersBathrooms")}</span>
              <Select value={draft.bathrooms} onChange={(e) => setField("bathrooms", e.target.value)}>
                <option value="">{t("filterAny")}</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
              </Select>
            </label>
            <label className={fieldLabel}>
              <span className="font-medium text-brand-deep">{t("furnishedLabel")}</span>
              <Select value={draft.furnished} onChange={(e) => setField("furnished", e.target.value)}>
                <option value="">{t("filterAny")}</option>
                <option value="true">{t("furnishedYes")}</option>
                <option value="false">{t("furnishedNo")}</option>
              </Select>
            </label>
            <label className={`${fieldLabel} sm:col-span-2`}>
              <span className="font-medium text-brand-deep">{t("moreFiltersSource")}</span>
              <Input value={draft.source} onChange={(e) => setField("source", e.target.value)} placeholder={t("moreFiltersSourcePlaceholder")} />
            </label>
          </div>

          <p className="mt-4 text-xs text-muted">{t("moreFiltersNote")}</p>
        </div>

        <div className="sticky bottom-0 shrink-0 border-t border-line bg-surface px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={reset}>
              {t("clearExtraFilters")}
            </Button>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button variant="secondary" className="flex-1 sm:flex-none" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button variant="primary-gold" className="flex-1 bg-brand-deep sm:flex-none" onClick={apply}>
                {t("apply")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeMoreFiltersModal;
