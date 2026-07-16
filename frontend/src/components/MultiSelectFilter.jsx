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
  okLabel = "OK",
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => (Array.isArray(selected) ? selected : []));
  const rootRef = useRef(null);
  const listId = useId();

  const values = Array.isArray(selected) ? selected : [];
  const valueOf = getOptionValue || ((o) => (typeof o === "string" ? o : o.value));
  const labelOf = getOptionLabel || ((o) => (typeof o === "string" ? o : o.label));

  useEffect(() => {
    if (!open) setDraft(values);
  }, [open, values]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setDraft(values);
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, values]);

  function toggle(val) {
    setDraft((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));
  }

  function applyAndClose() {
    onChange(draft);
    setOpen(false);
  }

  function openMenu() {
    setDraft(values);
    setOpen(true);
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
        onClick={() => (open ? setOpen(false) : openMenu())}
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
          className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-2xl border border-line bg-white shadow-card"
        >
          <div
            role="listbox"
            aria-label={label}
            aria-multiselectable="true"
            className="max-h-56 overflow-y-auto py-1"
          >
            {options.map((opt) => {
              const val = valueOf(opt);
              const checked = draft.includes(val);
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
          <div className="border-t border-line bg-white p-2">
            <button
              type="button"
              className="w-full rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
              onClick={applyAndClose}
            >
              {okLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
