import { useEffect, useState } from "react";
import {
  buildContactFormWhatsAppMessage,
  buildPropertyFormPrefillMessage,
  buildWhatsAppUrl
} from "../utils/whatsapp";

export default function PropertyContactForm({
  property,
  addressLine,
  inModal = false,
  onClose = null,
  initialMessage = null,
  formTitle = "Contact us",
  serviceLabel = null
}) {
  const defaultMessage =
    initialMessage ||
    (property ? buildPropertyFormPrefillMessage(property, addressLine) : "Hello,\n\nI am interested in this property.\n\n");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(defaultMessage);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const next =
      initialMessage ||
      (property ? buildPropertyFormPrefillMessage(property, addressLine) : "Hello,\n\nI am interested in this property.\n\n");
    setMessage(next);
    setError(null);
  }, [initialMessage, property?.property_id, addressLine, serviceLabel]);

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const waText = buildContactFormWhatsAppMessage({
      firstName,
      lastName,
      email,
      phone,
      message,
      property,
      addressLine,
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
    setMessage(
      initialMessage ||
        (property ? buildPropertyFormPrefillMessage(property, addressLine) : "Hello,\n\nI am interested in this property.\n\n")
    );
    setSubmitting(false);
    onClose?.();
  }

  const content = (
    <>
      <h2 id="contact-form-title" className="detail-section-title contact-form-heading">
        {formTitle}
      </h2>
      <form className="contact-form" onSubmit={handleSubmit} noValidate>
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
          <span>Phone (optional)</span>
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
          />
        </label>
        <label className="contact-field">
          <span>Message</span>
          <textarea
            name="message"
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={10000}
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
