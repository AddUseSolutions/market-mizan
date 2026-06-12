import { useEffect, useMemo, useState } from "react";
import { cleanTitle } from "../utils/cleanTitle";
import { buildContactFormWhatsAppMessage, buildWhatsAppUrl } from "../utils/whatsapp";

function propertyReferenceLabel(property) {
  if (!property) return "";
  const ref = property.property_id || "—";
  const title = cleanTitle(property.title) || property.title || "—";
  return `${ref} · ${title}`;
}

export default function PropertyContactForm({
  property,
  inModal = false,
  onClose = null,
  formTitle = "Contact us",
  serviceLabel = null,
  initialSubject = null
}) {
  const propertyReference = useMemo(() => propertyReferenceLabel(property), [property]);
  const defaultSubject = initialSubject || serviceLabel || "Property inquiry";

  const [subject, setSubject] = useState(defaultSubject);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [questions, setQuestions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSubject(initialSubject || serviceLabel || "Property inquiry");
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
      setError("WhatsApp is not configured. Please contact us via the Contact page.");
      setSubmitting(false);
      return;
    }

    window.open(url, "_blank");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setQuestions("");
    setSubject(defaultSubject);
    setSubmitting(false);
    onClose?.();
  }

  const content = (
    <>
      <h2 id="contact-form-title" className="detail-section-title contact-form-heading">
        {formTitle}
      </h2>
      <form className="contact-form" onSubmit={handleSubmit} noValidate>
        <label className="contact-field">
          <span>Subject</span>
          <input
            type="text"
            name="subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
          />
        </label>
        <label className="contact-field">
          <span>Reference / Title</span>
          <input
            type="text"
            name="propertyReference"
            value={propertyReference}
            readOnly
            aria-readonly="true"
            className="contact-field-readonly"
          />
        </label>
        <div className="contact-form-row">
          <label className="contact-field">
            <span>First name</span>
            <input
              type="text"
              name="firstName"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={80}
            />
          </label>
          <label className="contact-field">
            <span>Last name</span>
            <input
              type="text"
              name="lastName"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={80}
            />
          </label>
        </div>
        <label className="contact-field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="contact-field">
          <span>Phone number</span>
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
          />
        </label>
        <label className="contact-field">
          <span>Your questions</span>
          <textarea
            name="questions"
            rows={5}
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            placeholder="Type your questions here…"
            maxLength={5000}
          />
        </label>

        {error ? (
          <p className="contact-form-error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="button contact-submit contact-submit--whatsapp"
          disabled={submitting}
        >
          {submitting ? "Opening WhatsApp…" : "Continue on WhatsApp"}
        </button>
      </form>
    </>
  );

  if (inModal) {
    return <div className="contact-form-modal-content">{content}</div>;
  }

  return (
    <section className="panel contact-form-panel" aria-labelledby="contact-form-title">
      {content}
    </section>
  );
}
