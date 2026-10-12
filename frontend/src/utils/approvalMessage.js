function mailNote(mail, kind) {
  if (!mail) return "";
  if (mail.sent) return ` ${kind} email sent to ${mail.to}.`;
  if (mail.reason === "Not requested") return " No email sent.";
  return ` ${kind} email NOT sent${mail.reason ? ` (${mail.reason})` : ""}.`;
}

/** Admin feedback after publishing a submission (POST /admin/submissions/:id/publish). */
export function approvalMessage(data) {
  const ref = data?.listingRef || data?.propertyId;
  return `Approved and verified as ${ref}.${mailNote(data?.approvalEmail, "Approval")}`;
}

/** Admin feedback after rejecting a submission (POST /admin/submissions/:id/reject). */
export function rejectionMessage(data) {
  return `Rejected (${data?.reason || "no reason"}).${mailNote(data?.rejectionEmail, "Rejection")}`;
}
