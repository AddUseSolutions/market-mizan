import { IconBed, IconBath, IconRuler, IconMap, IconArmchair } from "./icons/HeroIcons";
import { cn } from "../utils/cn";

function FeatureCard({ icon: Icon, value, label }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-soft"
      role="listitem"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <div className="text-lg font-bold text-brand-deep">{value}</div>
        <div className="text-sm text-muted">{label}</div>
      </div>
    </div>
  );
}

export default function PropertyFeatureCards({ items, className }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5",
        "max-sm:[&>*:last-child:nth-child(odd)]:col-span-2 max-sm:[&>*:last-child:nth-child(odd)]:mx-auto max-sm:[&>*:last-child:nth-child(odd)]:w-[calc(50%-0.375rem)]",
        className
      )}
      role="list"
      aria-label="Key facts"
    >
      {items.map(({ value, label, icon }) => (
        <FeatureCard key={label} icon={icon} value={value} label={label} />
      ))}
    </div>
  );
}
