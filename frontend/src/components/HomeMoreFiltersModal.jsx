import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

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

  return (
    <div className="walde-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="walde-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-filters-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="walde-modal-head">
          <h2 id="more-filters-title" className="walde-modal-title">
            {t("moreFiltersTitle")}
          </h2>
          <button type="button" className="walde-modal-close" onClick={onClose} aria-label={t("closeMenu")}>
            ×
          </button>
        </div>
        <p className="walde-modal-lead">{t("moreFiltersLead")}</p>

        <div className="walde-modal-grid">
          <label className="walde-field">
            <span>{t("moreFiltersMinPrice")}</span>
            <input type="number" min="0" value={draft.min_price} onChange={(e) => setField("min_price", e.target.value)} />
          </label>
          <label className="walde-field">
            <span>{t("moreFiltersMaxPrice")}</span>
            <input type="number" min="0" value={draft.max_price} onChange={(e) => setField("max_price", e.target.value)} />
          </label>
          <label className="walde-field">
            <span>{t("moreFiltersMinSize")}</span>
            <input type="number" min="0" value={draft.min_size} onChange={(e) => setField("min_size", e.target.value)} />
          </label>
          <label className="walde-field">
            <span>{t("moreFiltersMaxSize")}</span>
            <input type="number" min="0" value={draft.max_size} onChange={(e) => setField("max_size", e.target.value)} />
          </label>
          <label className="walde-field">
            <span>{t("moreFiltersBathrooms")}</span>
            <select value={draft.bathrooms} onChange={(e) => setField("bathrooms", e.target.value)}>
              <option value="">{t("filterAny")}</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
            </select>
          </label>
          <label className="walde-field">
            <span>{t("furnishedLabel")}</span>
            <select value={draft.furnished} onChange={(e) => setField("furnished", e.target.value)}>
              <option value="">{t("filterAny")}</option>
              <option value="true">{t("furnishedYes")}</option>
              <option value="false">{t("furnishedNo")}</option>
            </select>
          </label>
          <label className="walde-field walde-field-wide">
            <span>{t("moreFiltersSource")}</span>
            <input value={draft.source} onChange={(e) => setField("source", e.target.value)} placeholder={t("moreFiltersSourcePlaceholder")} />
          </label>
        </div>

        <p className="walde-modal-note">{t("moreFiltersNote")}</p>

        <div className="walde-modal-actions">
          <button type="button" className="button walde-btn-text" onClick={reset}>
            {t("clearExtraFilters")}
          </button>
          <div className="walde-modal-actions-right">
            <button type="button" className="button walde-btn-ghost" onClick={onClose}>
              {t("cancel")}
            </button>
            <button type="button" className="button walde-btn-primary" onClick={apply}>
              {t("apply")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeMoreFiltersModal;
