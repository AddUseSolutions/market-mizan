import { useState } from "react";
import api from "../../api";
import { Button } from "../ui";
import { DashboardWidget, dashMuted } from "./DashboardWidget";

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
    <DashboardWidget
      title="Pending submissions"
      subtitle={`${moderation?.pendingSubmissions ?? 0} open · ${moderation?.crowdFlags ?? 0} crowd flags`}
    >
      {msg ? <p className="mb-3 text-sm text-success">{msg}</p> : null}

      {submissions.length === 0 ? (
        <p className={dashMuted}>No pending uploads.</p>
      ) : (
        <ul className="space-y-3">
          {submissions.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 rounded-lg border border-line p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <strong className="block text-heading">{s.title}</strong>
                <span className={dashMuted}>
                  {s.property_type} · {s.listing_mode} · ETB {Number(s.price_etb || s.price || 0).toLocaleString()}
                </span>
                <span className={`block ${dashMuted}`}>{s.location_area || s.location_city} · {s.contact_email}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => publish(s.id)}>Approve</Button>
                <Button size="sm" variant="secondary" onClick={() => reject(s.id)}>Reject</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardWidget>
  );
}
