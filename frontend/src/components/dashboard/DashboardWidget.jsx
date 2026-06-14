import { cn } from "../../utils/cn";

export function DashboardWidget({ title, subtitle, children, className }) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface p-5 shadow-soft", className)}>
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-heading">{title}</h2>
        {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

export const dashStat = "rounded-lg border border-line bg-bg p-3 text-center";
export const dashStatValue = "block text-2xl font-semibold text-heading";
export const dashStatLabel = "mt-1 block text-xs text-muted";
export const dashMuted = "text-sm text-muted";
export const dashTable = "w-full text-sm";
export const dashTableTh = "border-b border-line px-2 py-1.5 text-left text-xs font-medium uppercase text-muted";
export const dashTableTd = "border-b border-line px-2 py-2";
