import { useState } from "react";
import api from "../api";

const MAP_EMBED_SRC =
  "https://maps.google.com/maps?q=Addis+Ababa,+Ethiopia&hl=en&z=12&ie=UTF8&iwloc=&output=embed";

export default function ContactPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

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
        message
      });
      setSuccess(true);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Could not send your message. Please try again or email us directly."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-walde contact-page">
      <section className="contact-page-hero">
        <div className="container contact-page-hero-inner">
          <p className="contact-page-eyebrow">Contact</p>
          <h1>We are here to help</h1>
          <p className="contact-page-lead">
            Questions about listings, partnerships, or your account — send a message and we will respond as soon as we can.
          </p>
        </div>
      </section>

      <div className="container section-space contact-page-body">
        <div className="contact-page-grid">
          <div className="contact-page-card">
            <h2 className="contact-page-card-title">Send a message</h2>
            <p className="contact-page-card-sub muted-inline">
              Fields marked by the form are required where applicable. We treat your data confidentially.
            </p>
            {success ? (
              <div className="contact-success-actions">
                <p className="contact-form-success" role="status">
                  Thank you — your message has been sent. We will get back to you soon.
                </p>
                <button type="button" className="button walde-btn-ghost" onClick={() => setSuccess(false)}>
                  Send another message
                </button>
              </div>
            ) : (
              <form className="contact-form contact-form--walde" onSubmit={handleSubmit} noValidate>
                <div className="contact-form-row">
                  <label className="contact-field">
                    <span>First name</span>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                      required
                      maxLength={80}
                    />
                  </label>
                  <label className="contact-field">
                    <span>Last name</span>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                      required
                      maxLength={80}
                    />
                  </label>
                </div>
                <label className="contact-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="contact-field">
                  <span>Phone (optional)</span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={40} />
                </label>
                <label className="contact-field">
                  <span>Message</span>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} required maxLength={10000} />
                </label>
                {error ? (
                  <p className="contact-form-error" role="alert">
                    {error}
                  </p>
                ) : null}
                <button type="submit" className="button contact-submit" disabled={submitting}>
                  {submitting ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>

          <aside className="contact-page-aside">
            <div className="contact-page-card contact-page-card--aside">
              <h2 className="contact-page-card-title">Visit</h2>
              <p className="contact-aside-line">
                <strong>Email</strong>
                <a href="mailto:hello@mmizan.com">hello@mmizan.com</a>
              </p>
              <p className="contact-aside-line">
                <strong>Phone</strong>
                <span>+251 90 000 0000</span>
              </p>
              <p className="contact-aside-line">
                <strong>Hours</strong>
                <span>
                  Mon–Fri 09:00–18:00
                  <br />
                  Sat 09:00–14:00
                </span>
              </p>
            </div>
            <div className="contact-map-frame" aria-label="Map of Addis Ababa">
              <iframe title="Addis Ababa map" src={MAP_EMBED_SRC} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
