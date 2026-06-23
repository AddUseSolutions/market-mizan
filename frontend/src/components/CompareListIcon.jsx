import { useLanguage } from "../context/LanguageContext";
import { cn } from "../utils/cn";

function GridIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden className="shrink-0">
      <rect x="2" y="2" width="7" height="7" rx="1" fill="currentColor" />
      <rect x="11" y="2" width="7" height="7" rx="1" fill="currentColor" />
      <rect x="2" y="11" width="7" height="7" rx="1" fill="currentColor" />
      <rect x="11" y="11" width="7" height="7" rx="1" fill="currentColor" />
    </svg>
  );
}

/** Digitec/Galaxus-style 2×2 grid — add to compare list. */
export default function CompareListIcon({
  selected,
  disabled,
  onClick,
  className,
  size = "md",
  showLabel = false
}) {
  const { t } = useLanguage();
  const dim = size === "sm" ? 32 : 36;
  const label = selected ? t("compareAddedShort") : t("compareShort");

  if (showLabel) {
    return (
      <button
        type="button"
        title={selected ? t("compareRemove") : t("compareAddTooltip")}
        aria-label={selected ? t("compareRemove") : t("compareAdd")}
        aria-pressed={selected}
        disabled={disabled}
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border px-2.5 py-2.5 text-xs font-semibold transition-colors sm:px-3",
          selected
            ? "border-primary bg-primary/10 text-primary"
            : "border-line bg-surface text-brand-deep hover:border-primary hover:text-primary",
          disabled && !selected && "cursor-not-allowed opacity-40",
          className
        )}
        onClick={onClick}
      >
        <GridIcon size={size === "sm" ? 14 : 16} />
        <span className="whitespace-nowrap">{label}</span>
      </button>
    );
  }

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
      <GridIcon size={size === "sm" ? 16 : 18} />
    </button>
  );
}
