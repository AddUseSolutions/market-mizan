import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { Modal, Input, Select, Button } from "./ui";

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

  const fieldLabel = "flex flex-col gap-1.5 text-sm";

  return (
    <Modal open={open} onClose={onClose} title={t("moreFiltersTitle")} className="max-w-2xl">
      <p className="mb-5 text-sm text-muted">{t("moreFiltersLead")}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabel}>
          <span className="font-medium text-text">{t("moreFiltersMinPrice")}</span>
          <Input type="number" min="0" value={draft.min_price} onChange={(e) => setField("min_price", e.target.value)} />
        </label>
        <label className={fieldLabel}>
          <span className="font-medium text-text">{t("moreFiltersMaxPrice")}</span>
          <Input type="number" min="0" value={draft.max_price} onChange={(e) => setField("max_price", e.target.value)} />
        </label>
        <label className={fieldLabel}>
          <span className="font-medium text-text">{t("moreFiltersMinSize")}</span>
          <Input type="number" min="0" value={draft.min_size} onChange={(e) => setField("min_size", e.target.value)} />
        </label>
        <label className={fieldLabel}>
          <span className="font-medium text-text">{t("moreFiltersMaxSize")}</span>
          <Input type="number" min="0" value={draft.max_size} onChange={(e) => setField("max_size", e.target.value)} />
        </label>
        <label className={fieldLabel}>
          <span className="font-medium text-text">{t("moreFiltersBathrooms")}</span>
          <Select value={draft.bathrooms} onChange={(e) => setField("bathrooms", e.target.value)}>
            <option value="">{t("filterAny")}</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
          </Select>
        </label>
        <label className={fieldLabel}>
          <span className="font-medium text-text">{t("furnishedLabel")}</span>
          <Select value={draft.furnished} onChange={(e) => setField("furnished", e.target.value)}>
            <option value="">{t("filterAny")}</option>
            <option value="true">{t("furnishedYes")}</option>
            <option value="false">{t("furnishedNo")}</option>
          </Select>
        </label>
        <label className={`${fieldLabel} sm:col-span-2`}>
          <span className="font-medium text-text">{t("moreFiltersSource")}</span>
          <Input value={draft.source} onChange={(e) => setField("source", e.target.value)} placeholder={t("moreFiltersSourcePlaceholder")} />
        </label>
      </div>

      <p className="mt-4 text-xs text-muted">{t("moreFiltersNote")}</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={reset}>{t("clearExtraFilters")}</Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>{t("cancel")}</Button>
          <Button onClick={apply}>{t("apply")}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default HomeMoreFiltersModal;
