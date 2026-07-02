import { useState } from "react";
import api from "../../api";
import SubmissionReviewCard from "./SubmissionReviewCard";
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
            <SubmissionReviewCard
              key={s.id}
              submission={s}
              onPublish={publish}
              onReject={reject}
            />
          ))}
        </ul>
      )}
    </DashboardWidget>
  );
}
