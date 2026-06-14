import { useEffect, useMemo, useState } from "react";
import { cleanTitle } from "../utils/cleanTitle";
import { buildContactFormWhatsAppMessage, buildWhatsAppUrl } from "../utils/whatsapp";
import { useLanguage } from "../context/LanguageContext";
import { Input, Textarea, Button, Card, CardContent } from "./ui";

function propertyReferenceLabel(property) {
  if (!property) return "";
  const ref = property.property_id || "—";
  const title = cleanTitle(property.title) || property.title || "—";
  return `${ref} · ${title}`;
}

const fieldLabel = "flex flex-col gap-1.5 text-sm";

export default function PropertyContactForm({
  property,
  inModal = false,
  onClose = null,
  formTitle = null,
  serviceLabel = null,
  initialSubject = null
}) {
  const { t } = useLanguage();
  const propertyReference = useMemo(() => propertyReferenceLabel(property), [property]);
  const subject = initialSubject || serviceLabel || t("contactPropertyInquiry");
  const title = formTitle || t("contactUs");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [questions, setQuestions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
  }, [initialSubject, serviceLabel, property?.property_id]);

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const waText = buildContactFormWhatsAppMessage({
      firstName,
      lastName,
      email,
      phone,
      subject,
      propertyReference,
      questions,
      serviceLabel
    });
    const url = buildWhatsAppUrl(waText);

    if (!url) {
      setError(t("contactWhatsAppNotConfigured"));
      setSubmitting(false);
      return;
    }

    window.open(url, "_blank");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setQuestions("");
    setSubmitting(false);
    onClose?.();
  }

  const content = (
    <>
      <h2 id="contact-form-title" className="mb-4 text-xl font-semibold text-heading">
        {title}
      </h2>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <label className={fieldLabel}>
          <span className="font-medium">{t("contactSubject")}</span>
          <Input type="text" name="subject" value={subject} readOnly aria-readonly="true" className="bg-line/30" />
        </label>
        <label className={fieldLabel}>
          <span className="font-medium">{t("contactReference")}</span>
          <Input type="text" name="propertyReference" value={propertyReference} readOnly aria-readonly="true" className="bg-line/30" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={fieldLabel}>
            <span className="font-medium">{t("contactFirstName")}</span>
            <Input type="text" name="firstName" autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={80} />
          </label>
          <label className={fieldLabel}>
            <span className="font-medium">{t("contactLastName")}</span>
            <Input type="text" name="lastName" autoComplete="family-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={80} />
          </label>
        </div>
        <label className={fieldLabel}>
          <span className="font-medium">{t("contactEmail")}</span>
          <Input type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className={fieldLabel}>
          <span className="font-medium">{t("contactPhone")}</span>
          <Input type="tel" name="phone" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
        </label>
        <label className={fieldLabel}>
          <span className="font-medium">{t("contactQuestions")}</span>
          <Textarea name="questions" rows={5} value={questions} onChange={(e) => setQuestions(e.target.value)} placeholder={t("contactQuestionsPlaceholder")} maxLength={5000} />
        </label>

        {error ? (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        ) : null}

        <Button type="submit" variant="whatsapp" disabled={submitting}>
          {submitting ? t("contactOpeningWhatsApp") : t("contactContinueWhatsApp")}
        </Button>
      </form>
    </>
  );

  if (inModal) {
    return <div>{content}</div>;
  }

  return (
    <Card>
      <CardContent aria-labelledby="contact-form-title">{content}</CardContent>
    </Card>
  );
}
