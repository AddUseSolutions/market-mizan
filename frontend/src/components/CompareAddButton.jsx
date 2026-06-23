import { useCompare } from "../context/CompareContext";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../utils/cn";

export default function CompareAddButton({ property, className }) {
  const { t } = useLanguage();
  const { enterCompareMode, isSelected, canSelect, toggleProperty } = useCompare();

  if (!property?.property_id) return null;

  const selected = isSelected(property.property_id);
  const disabled = !selected && !canSelect(property.property_id);

  function handleClick() {
    enterCompareMode();
    toggleProperty(property);
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-line bg-surface text-brand-deep hover:border-primary hover:text-primary",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      disabled={disabled}
      onClick={handleClick}
    >
      {selected ? t("detailInCompare") : t("detailAddCompare")}
    </button>
  );
}
