import { useState } from "react";
import api from "../../api";

export default function PendingSubmissionsWidget({ moderation, onRefresh }) {
  const [msg, setMsg] = useState("");
  const submissions = moderation?.submissions || [];

  async function publish(id) {
    const publisherType = window.prompt("Publisher type: broker or landlord", "landlord") || "landlord";
    const isPaid = window.confirm("Is this a paid listing?");
    try {
      const r = await api.post(`/admin/submissions/${id}/publish`, { publisherType, isPaid });
      setMsg(`Published as ${r.data.propertyId}`);
      onRefresh?.();
    } catch (e) {
      setMsg(e.response?.data?.message || "Publish failed.");
    }
  }

  async function reject(id) {
    const reason = window.prompt("Rejection reason", "Does not meet guidelines");
    if (!reason) return;
    try {
      await api.post(`/admin/submissions/${id}/reject`, { reason });
      setMsg("Submission rejected.");
      onRefresh?.();
    } catch {
      setMsg("Reject failed.");
    }
  }

  return (
    <section className="dash-widget dash-widget--moderation">
      <header className="dash-widget-header">
        <h2 className="dash-widget-title">Pending submissions</h2>
        <p className="dash-widget-sub">
          {moderation?.pendingSubmissions ?? 0} open · {moderation?.crowdFlags ?? 0} crowd flags
        </p>
      </header>

      {msg ? <p className="dash-inline-msg">{msg}</p> : null}

      {submissions.length === 0 ? (
        <p className="dash-meta-muted">No pending uploads.</p>
      ) : (
        <ul className="dash-list">
          {submissions.map((s) => (
            <li key={s.id} className="dash-list-item">
              <div className="dash-list-main">
                <strong>{s.title}</strong>
                <span className="dash-meta-muted">
                  {s.property_type} · {s.listing_mode} · ETB {Number(s.price_etb || s.price || 0).toLocaleString()}
                </span>
                <span className="dash-meta-muted">
                  {s.location_area || s.location_city} · {s.contact_email}
                </span>
              </div>
              <div className="dash-list-actions">
                <button type="button" onClick={() => publish(s.id)}>Approve</button>
                <button type="button" className="button upload-secondary" onClick={() => reject(s.id)}>
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
