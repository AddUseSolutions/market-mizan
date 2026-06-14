import { useLanguage } from "../context/LanguageContext";
import { cn } from "../utils/cn";

function buildPageItems(current, total) {
  if (total <= 1) return [];

  const set = new Set(
    [1, total, current, current - 1, current + 1].filter((p) => p >= 1 && p <= total)
  );
  const sorted = [...set].sort((a, b) => a - b);
  const items = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      items.push("ellipsis");
    }
    items.push(sorted[i]);
  }
  return items;
}

function Pagination({ page, totalPages, onChange, variant = "default" }) {
  const { t } = useLanguage();

  if (totalPages <= 1) return null;

  const items = buildPageItems(page, totalPages);
  const isWalde = variant === "walde";

  const pageBtn = (active) =>
    cn(
      "flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors",
      active
        ? "bg-hero-navy text-white"
        : "border border-line bg-surface text-muted hover:border-hero-navy hover:text-hero-navy"
    );

  return (
    <nav className="flex items-center justify-center gap-2" aria-label={t("paginationLabel")}>
      {!isWalde ? (
        <button
          type="button"
          className={pageBtn(false)}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label={t("paginationPrev")}
        >
          ‹
        </button>
      ) : null}

      <ul className="flex items-center gap-1">
        {items.map((item, idx) =>
          item === "ellipsis" ? (
            <li key={`e-${idx}`} className="px-1 text-muted" aria-hidden>
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={pageBtn(item === page)}
                onClick={() => onChange(item)}
                aria-label={t("paginationPage", { n: item })}
                aria-current={item === page ? "page" : undefined}
              >
                {item}
              </button>
            </li>
          )
        )}
      </ul>

      <button
        type="button"
        className={pageBtn(false)}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label={t("paginationNext")}
      >
        {isWalde ? "→" : "›"}
      </button>
    </nav>
  );
}

export default Pagination;
