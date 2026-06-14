import { DashboardWidget, dashMuted } from "./DashboardWidget";
import { Badge } from "../ui";

export default function HolisticLeadsWidget({ leads, title = "Holistic service leads" }) {
  const items = leads || [];

  return (
    <DashboardWidget title={title} subtitle="Latest inbound service requests">
      {items.length === 0 ? (
        <p className={dashMuted}>No leads recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((lead) => (
            <li key={lead.id} className="rounded-lg border border-line p-3 text-sm">
              <div>
                <strong className="text-heading">{lead.first_name} {lead.last_name}</strong>
                <span className={`block ${dashMuted}`}>{lead.email}{lead.phone ? ` · ${lead.phone}` : ""}</span>
                {lead.service_label ? <Badge className="mt-1" variant="accent">{lead.service_label}</Badge> : null}
                {lead.property_title ? <span className={`block mt-1 ${dashMuted}`}>Property: {lead.property_title}</span> : null}
                {lead.message ? <p className="mt-2 text-text">{lead.message.slice(0, 220)}{lead.message.length > 220 ? "…" : ""}</p> : null}
              </div>
              <time className={`mt-2 block ${dashMuted}`} dateTime={lead.created_at}>
                {String(lead.created_at || "").slice(0, 16).replace("T", " ")}
              </time>
            </li>
          ))}
        </ul>
      )}
    </DashboardWidget>
  );
}
