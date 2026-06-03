import { useState } from "react";
import api from "../api";

export default function ListingRemovalForm({ property, onClose }) {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/listings/request-removal", {
        email,
        reason,
        propertyId: property.property_id,
        propertyTitle: property.title,
        detailUrl: property.detail_url
      });
      setSuccess("Your removal request was sent. We will review it shortly.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="removal-form-wrap">
      <h3 className="detail-section-title">Request removal of this listing</h3>
      <p className="muted-inline">If you are the owner or agent, tell us why this listing should be removed.</p>
      <form className="removal-form" onSubmit={submit}>
        <label className="contact-field">
          <span>
            Your email <span className="required-star">*</span>
          </span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="contact-field">
          <span>Reason</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
        </label>
        {error ? <p className="contact-form-error">{error}</p> : null}
        {success ? <p className="upload-success">{success}</p> : null}
        <div className="upload-actions">
          {onClose ? (
            <button type="button" className="button upload-secondary" onClick={onClose}>
              Close
            </button>
          ) : null}
          <button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Submit request"}
          </button>
        </div>
      </form>
    </div>
  );
}
