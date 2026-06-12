import { useState } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";

const MAP_EMBED_SRC =
  "https://maps.google.com/maps?q=Addis+Ababa,+Ethiopia&hl=en&z=12&ie=UTF8&iwloc=&output=embed";

export default function ContactPage() {
  const { t } = useLanguage();
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
        err.response?.data?.message || err.message || t("contactPageError")
      );
    } finally {
      setSubmitting(false);
    }
  }

  const hoursLines = t("contactPageHoursValue").split("\n");

  return (
    <main className="page-walde contact-page">
      <section className="contact-page-hero">
        <div className="container contact-page-hero-inner">
          <p className="contact-page-eyebrow">{t("contactPageEyebrow")}</p>
          <h1>{t("contactPageTitle")}</h1>
          <p className="contact-page-lead">{t("contactPageLead")}</p>
        </div>
      </section>

      <div className="container section-space contact-page-body">
        <div className="contact-page-grid">
          <div className="contact-page-card">
            <h2 className="contact-page-card-title">{t("contactPageSendMessage")}</h2>
            <p className="contact-page-card-sub muted-inline">{t("contactPagePrivacyNote")}</p>
            {success ? (
              <div className="contact-success-actions">
                <p className="contact-form-success" role="status">
                  {t("contactPageSuccess")}
                </p>
                <button type="button" className="button walde-btn-ghost" onClick={() => setSuccess(false)}>
                  {t("contactPageSendAnother")}
                </button>
              </div>
            ) : (
              <form className="contact-form contact-form--walde" onSubmit={handleSubmit} noValidate>
                <div className="contact-form-row">
                  <label className="contact-field">
                    <span>{t("contactFirstName")}</span>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                      required
                      maxLength={80}
                    />
                  </label>
                  <label className="contact-field">
                    <span>{t("contactLastName")}</span>
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
                  <span>{t("contactEmail")}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="contact-field">
                  <span>{t("contactPhoneOptional")}</span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={40} />
                </label>
                <label className="contact-field">
                  <span>{t("contactMessage")}</span>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} required maxLength={10000} />
                </label>
                {error ? (
                  <p className="contact-form-error" role="alert">
                    {error}
                  </p>
                ) : null}
                <button type="submit" className="button contact-submit" disabled={submitting}>
                  {submitting ? t("contactSending") : t("contactSendMessage")}
                </button>
              </form>
            )}
          </div>

          <aside className="contact-page-aside">
            <div className="contact-page-card contact-page-card--aside">
              <h2 className="contact-page-card-title">{t("contactPageVisit")}</h2>
              <p className="contact-aside-line">
                <strong>{t("contactEmail")}</strong>
                <a href="mailto:hello@mmizan.com">hello@mmizan.com</a>
              </p>
              <p className="contact-aside-line">
                <strong>{t("contactPhone")}</strong>
                <span>+251 90 000 0000</span>
              </p>
              <p className="contact-aside-line">
                <strong>{t("contactPageHours")}</strong>
                <span>
                  {hoursLines.map((line, i) => (
                    <span key={line}>
                      {i > 0 ? <br /> : null}
                      {line}
                    </span>
                  ))}
                </span>
              </p>
            </div>
            <div className="contact-map-frame" aria-label={t("contactPageMapLabel")}>
              <iframe title={t("contactPageMapTitle")} src={MAP_EMBED_SRC} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
