export default function HolisticLeadsWidget({ leads, title = "Holistic service leads" }) {
  const items = leads || [];

  return (
    <section className="dash-widget dash-widget--leads">
      <header className="dash-widget-header">
        <h2 className="dash-widget-title">{title}</h2>
        <p className="dash-widget-sub">Latest inbound service requests</p>
      </header>

      {items.length === 0 ? (
        <p className="dash-meta-muted">No leads recorded yet.</p>
      ) : (
        <ul className="dash-list">
          {items.map((lead) => (
            <li key={lead.id} className="dash-list-item dash-list-item--stacked">
              <div className="dash-list-main">
                <strong>
                  {lead.first_name} {lead.last_name}
                </strong>
                <span className="dash-meta-muted">{lead.email}{lead.phone ? ` · ${lead.phone}` : ""}</span>
                {lead.service_label ? (
                  <span className="dash-tag">{lead.service_label}</span>
                ) : null}
                {lead.property_title ? (
                  <span className="dash-meta-muted">Property: {lead.property_title}</span>
                ) : null}
                {lead.message ? <p className="dash-lead-message">{lead.message.slice(0, 220)}{lead.message.length > 220 ? "…" : ""}</p> : null}
              </div>
              <time className="dash-meta-muted" dateTime={lead.created_at}>
                {String(lead.created_at || "").slice(0, 16).replace("T", " ")}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
