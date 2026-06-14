import { useState } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { Input, Textarea, Button } from "./ui";
import { Card, CardContent } from "./ui/Card";

const fieldLabel = "flex flex-col gap-1.5 text-sm";

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
    <Card>
      <CardContent>
        <h3 className="text-xl font-semibold text-heading">{t("removalTitle")}</h3>
        <p className="mt-2 text-sm text-muted">{t("removalLead")}</p>
        <form className="mt-4 flex flex-col gap-4" onSubmit={submit}>
          <label className={fieldLabel}>
            <span className="font-medium">
              {t("removalEmail")} <span className="text-destructive">{t("requiredStar")}</span>
            </span>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className={fieldLabel}>
            <span className="font-medium">{t("removalReason")}</span>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-success">{success}</p> : null}
          <div className="flex flex-wrap gap-2">
            {onClose ? (
              <Button type="button" variant="secondary" onClick={onClose}>{t("confirmListingClose")}</Button>
            ) : null}
            <Button type="submit" disabled={submitting}>
              {submitting ? t("removalSending") : t("removalSubmit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
