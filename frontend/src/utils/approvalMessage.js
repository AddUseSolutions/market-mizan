/** Admin feedback after publishing a submission (POST /admin/submissions/:id/publish). */
export function approvalMessage(data) {
  const ref = data?.listingRef || data?.propertyId;
  const mail = data?.approvalEmail;
  const mailNote = mail?.sent
    ? ` Approval email sent to ${mail.to}.`
    : mail
      ? ` Approval email NOT sent${mail.reason ? ` (${mail.reason})` : ""}.`
      : "";
  return `Approved and verified as ${ref}.${mailNote}`;
}
