import { useLanguage } from "../context/LanguageContext";
import { cn } from "../utils/cn";

/** Digitec/Galaxus-style 2×2 grid — add to compare list. */
export default function CompareListIcon({ selected, disabled, onClick, className, size = "md" }) {
  const { t } = useLanguage();
  const dim = size === "sm" ? 32 : 36;

  return (
    <button
      type="button"
      title={selected ? t("compareRemove") : t("compareAddTooltip")}
      aria-label={selected ? t("compareRemove") : t("compareAdd")}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded border bg-surface transition-colors",
        selected
          ? "border-primary bg-primary/10 text-primary shadow-[inset_0_0_0_1px] shadow-primary/30"
          : "border-line text-muted hover:border-primary hover:text-primary",
        disabled && !selected && "cursor-not-allowed opacity-40",
        className
      )}
      style={{ width: dim, height: dim }}
      onClick={onClick}
    >
      <svg viewBox="0 0 20 20" width={size === "sm" ? 16 : 18} height={size === "sm" ? 16 : 18} aria-hidden>
        <rect x="2" y="2" width="7" height="7" rx="1" fill="currentColor" />
        <rect x="11" y="2" width="7" height="7" rx="1" fill="currentColor" />
        <rect x="2" y="11" width="7" height="7" rx="1" fill="currentColor" />
        <rect x="11" y="11" width="7" height="7" rx="1" fill="currentColor" />
      </svg>
    </button>
  );
}
