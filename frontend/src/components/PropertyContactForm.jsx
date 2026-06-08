import { useEffect, useState } from "react";
import api from "../api";

const DEFAULT_MESSAGE = `Hello,

I am interested in this property.

Kind regards`;

export default function PropertyContactForm({
  property,
  addressLine,
  inModal = false,
  onClose = null,
  initialMessage = null,
  formTitle = "Contact us",
  leadType = null,
  serviceLabel = null
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(initialMessage || DEFAULT_MESSAGE);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setMessage(initialMessage || DEFAULT_MESSAGE);
    setSuccess(false);
    setError(null);
  }, [initialMessage, property?.property_id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/contact", {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        message,
        propertyId: property.property_id,
        propertyTitle: property.title,
        detailUrl: property.detail_url,
        propertyAddress: addressLine,
        leadType: leadType || undefined,
        serviceLabel: serviceLabel || undefined
      });
      setSuccess(true);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setMessage(initialMessage || DEFAULT_MESSAGE);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Could not send your message. Please try again later.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const content = (
    <>
      <h2 id="contact-form-title" className="detail-section-title contact-form-heading">
        {formTitle}
      </h2>
      {success ? (
        <div className="contact-form-success-wrap">
          <p className="contact-form-success" role="status">
            Thank you — your message has been sent. We will get back to you soon.
          </p>
          <div className="contact-modal-actions">
            <button
              type="button"
              className="button contact-form-reset"
              onClick={() => setSuccess(false)}
            >
              Send another message
            </button>
            {onClose ? (
              <button type="button" className="button contact-form-close" onClick={onClose}>
                Close
              </button>
            ) : null}
          </div>
        </div>
      ) : (
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
            rows={6}
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
          className="button contact-submit"
          disabled={submitting}
        >
          {submitting ? "Sending…" : "Send request"}
        </button>
      </form>
      )}
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
