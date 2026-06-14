import { cn } from "../../utils/cn";

export default function SegmentedControl({
  options,
  value,
  onChange,
  size = "md",
  className,
  "aria-label": ariaLabel,
}) {
  const sizeClass =
    size === "sm"
      ? "rounded-md px-2 py-1.5 text-xs"
      : size === "lg"
        ? "rounded-xl px-4 py-3.5 text-base"
        : "rounded-lg px-4 py-2 text-sm";

  return (
    <div
      className={cn("flex rounded-lg border border-line p-1", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map(({ value: optValue, label }) => {
        const active = value === optValue;
        return (
          <button
            key={optValue}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "flex-1 font-medium transition-colors",
              sizeClass,
              active ? "bg-primary text-white" : "text-muted hover:text-primary"
            )}
            onClick={() => onChange(optValue)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
