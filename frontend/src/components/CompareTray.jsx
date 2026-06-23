import { useNavigate } from "react-router-dom";
import { useCompare } from "../context/CompareContext";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../utils/cn";
import { displayCompareTitle } from "../utils/compareProperty";

function thumb(images) {
  if (!Array.isArray(images) || !images.length) return null;
  return images[0];
}

export default function CompareTray() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { items, compareMode, maxCompare, isFull, removeProperty, clear, exitCompareMode } = useCompare();

  if (!compareMode && items.length === 0) return null;

  function goCompare() {
    if (items.length < maxCompare) return;
    const [a, b] = items;
    navigate(`/compare?a=${encodeURIComponent(a.property_id)}&b=${encodeURIComponent(b.property_id)}`);
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-surface/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-md sm:rounded-2xl sm:border"
      role="region"
      aria-label={t("compareTrayLabel")}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-brand-deep">
          {t("compareTrayTitle", { count: items.length, max: maxCompare })}
        </p>
        <button
          type="button"
          className="text-xs font-medium text-muted underline-offset-2 hover:text-brand-deep hover:underline"
          onClick={() => {
            clear();
            exitCompareMode();
          }}
        >
          {t("compareExit")}
        </button>
      </div>

      <div className="flex gap-2">
        {Array.from({ length: maxCompare }).map((_, idx) => {
          const item = items[idx];
          return (
            <div
              key={idx}
              className={cn(
                "flex min-h-[56px] flex-1 items-center gap-2 rounded-xl border border-dashed p-2",
                item ? "border-primary/40 bg-primary/5" : "border-line bg-brand-muted/40"
              )}
            >
              {item ? (
                <>
                  {thumb(item.images) ? (
                    <img
                      src={thumb(item.images)}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-line text-xs text-muted">
                      —
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-brand-deep">
                      {displayCompareTitle(item)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-full px-2 py-1 text-xs text-muted hover:bg-surface hover:text-brand-deep"
                    aria-label={t("compareRemove")}
                    onClick={() => removeProperty(item.property_id)}
                  >
                    ×
                  </button>
                </>
              ) : (
                <span className="w-full text-center text-xs text-muted">{t("compareSlotEmpty")}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-brand-deep hover:bg-brand-muted"
          onClick={clear}
        >
          {t("compareClear")}
        </button>
        <button
          type="button"
          className={cn(
            "flex-[2] rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors",
            isFull ? "bg-primary hover:bg-primary-dark" : "cursor-not-allowed bg-line text-muted"
          )}
          disabled={!isFull}
          onClick={goCompare}
        >
          {t("compareCta")}
        </button>
      </div>
    </div>
  );
}
