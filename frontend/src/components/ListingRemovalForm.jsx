import { useState } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";

export default function ListingRemovalForm({ property, onClose }) {
  const { t } = useLanguage();
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
      setSuccess(t("removalSuccess"));
    } catch (err) {
      setError(err.response?.data?.message || t("removalError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="removal-form-wrap">
      <h3 className="detail-section-title">{t("removalTitle")}</h3>
      <p className="muted-inline">{t("removalLead")}</p>
      <form className="removal-form" onSubmit={submit}>
        <label className="contact-field">
          <span>
            {t("removalEmail")} <span className="required-star">{t("requiredStar")}</span>
          </span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="contact-field">
          <span>{t("removalReason")}</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
        </label>
        {error ? <p className="contact-form-error">{error}</p> : null}
        {success ? <p className="upload-success">{success}</p> : null}
        <div className="upload-actions">
          {onClose ? (
            <button type="button" className="button upload-secondary" onClick={onClose}>
              {t("confirmListingClose")}
            </button>
          ) : null}
          <button type="submit" disabled={submitting}>
            {submitting ? t("removalSending") : t("removalSubmit")}
          </button>
        </div>
      </form>
    </div>
  );
}
