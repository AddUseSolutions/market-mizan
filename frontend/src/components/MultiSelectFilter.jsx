import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../utils/cn";

export default function MultiSelectFilter({
  icon: Icon,
  label,
  options,
  selected,
  onChange,
  getOptionLabel,
  getOptionValue,
  className,
  emptyLabel,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const values = Array.isArray(selected) ? selected : [];
  const valueOf = getOptionValue || ((o) => (typeof o === "string" ? o : o.value));
  const labelOf = getOptionLabel || ((o) => (typeof o === "string" ? o : o.label));

  function toggle(val) {
    const next = values.includes(val) ? values.filter((v) => v !== val) : [...values, val];
    onChange(next);
  }

  const summary =
    values.length === 0
      ? emptyLabel || label
      : values.length === 1
        ? labelOf(options.find((o) => valueOf(o) === values[0]) ?? values[0])
        : `${values.length} ${label}`;

  return (
    <div ref={rootRef} className={cn("relative block min-w-0", className)}>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-2xl border border-line bg-white px-3 py-3.5 text-left"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        {Icon ? <Icon className="shrink-0 text-muted" size={20} /> : null}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{summary}</span>
        <svg className="shrink-0 text-muted" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
          className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-line bg-white py-1 shadow-card"
        >
          {options.map((opt) => {
            const val = valueOf(opt);
            const checked = values.includes(val);
            return (
              <label
                key={val}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-brand-muted/60"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
                  checked={checked}
                  onChange={() => toggle(val)}
                />
                <span className="min-w-0 flex-1 text-brand-deep">{labelOf(opt)}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
