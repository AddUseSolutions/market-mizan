/**
 * Builds [1, 2, 'ellipsis', 50] style sequences for compact pagination.
 */
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

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const items = buildPageItems(page, totalPages);

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination-nav pagination-prev"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        ‹
      </button>

      <ul className="pagination-list">
        {items.map((item, idx) =>
          item === "ellipsis" ? (
            <li key={`e-${idx}`} className="pagination-ellipsis" aria-hidden>
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={`pagination-page ${item === page ? "pagination-page-active" : ""}`}
                onClick={() => onChange(item)}
                aria-label={`Page ${item}`}
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
        className="pagination-nav pagination-next"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}

export default Pagination;
