import { cn } from "../../utils/cn";

export default function Select({ className, children, ...props }) {
  return (
    <div className="relative">
      <select
        className={cn(
          "w-full appearance-none rounded-2xl border border-[#DDE7F5] bg-surface px-3 py-2.5 pr-10 text-sm font-medium text-brand-deep shadow-soft transition-colors",
          "focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brand-deep"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
