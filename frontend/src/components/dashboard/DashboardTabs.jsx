import { NavLink } from "react-router-dom";
import { cn } from "../../utils/cn";

const TABS = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/dashboard/market-intelligence", label: "Market intelligence" },
  { to: "/analytics", label: "Analytics" }
];

export default function DashboardTabs() {
  return (
    <nav className="mb-6 flex gap-1 border-b border-line" aria-label="Dashboard sections">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={Boolean(tab.end)}
          className={({ isActive }) =>
            cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
              isActive ? "border-primary text-primary" : "border-transparent text-muted hover:text-heading"
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
