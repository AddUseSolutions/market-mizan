import { useLanguage } from "../context/LanguageContext";
import { cn } from "../utils/cn";

function buildPageItems(current, total) {
  if (total <= 1) return [];

  // Always include first/last and a window around current. Near the edges, pad so
  // at least three page numbers are visible when totalPages >= 3 (e.g. 1 2 3 … 145).
  const set = new Set([1, total, current]);
  for (let p = current - 1; p <= current + 1; p += 1) {
    if (p >= 1 && p <= total) set.add(p);
  }
  if (total >= 3) {
    if (current <= 2) {
      set.add(1);
      set.add(2);
      set.add(3);
    } else if (current >= total - 1) {
      set.add(total - 2);
      set.add(total - 1);
      set.add(total);
    }
  }

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
        ? "bg-primary text-white"
        : "border border-line bg-surface text-muted hover:border-primary hover:text-primary"
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
