import { useState } from "react";
import SubmissionReviewCard from "./SubmissionReviewCard";
import { DashboardWidget, dashMuted } from "./DashboardWidget";

export default function PendingSubmissionsWidget({ moderation, onRefresh }) {
  const [msg, setMsg] = useState("");
  const [resolvedIds, setResolvedIds] = useState([]);
  const allSubmissions = moderation?.submissions || [];
  const submissions = allSubmissions.filter((s) => !resolvedIds.includes(s.id));
  const hiddenStillListed = allSubmissions.length - submissions.length;
  const openCount = Math.max(0, (moderation?.pendingSubmissions ?? 0) - hiddenStillListed);

  function handleResolved(id, message) {
    setResolvedIds((prev) => [...prev, id]);
    setMsg(message);
    onRefresh?.();
  }

  return (
    <DashboardWidget
      title="Pending submissions"
      subtitle={`${openCount} open · ${moderation?.crowdFlags ?? 0} crowd flags`}
    >
      {msg ? (
        <p className="mb-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{msg}</p>
      ) : null}

      {submissions.length === 0 ? (
        <p className={dashMuted}>No pending uploads.</p>
      ) : (
        <ul className="space-y-3">
          {submissions.map((s) => (
            <SubmissionReviewCard key={s.id} submission={s} onResolved={handleResolved} />
          ))}
        </ul>
      )}
    </DashboardWidget>
  );
}
