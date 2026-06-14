import { useState } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { Container, Section, Card, CardContent, Input, Textarea, Button, PageHero } from "../components/ui";

const MAP_EMBED_SRC =
  "https://maps.google.com/maps?q=Addis+Ababa,+Ethiopia&hl=en&z=12&ie=UTF8&iwloc=&output=embed";

const fieldLabel = "flex flex-col gap-1.5 text-sm";

function IconMail({ className = "" }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16v12H4V6zm0 0 8 6 8-6" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

function IconPhone({ className = "" }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 3h4l1.2 4.5-2.6 1.7c1.2 2.4 3.5 4.7 6.2 6.2l1.7-2.6L22 13.5v4c0 .8-.6 1.5-1.4 1.5C10.9 19 5 13.1 5 4.9 5 4.1 5.7 3 6.5 3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClock({ className = "" }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

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
      await api.post("/contact", { firstName, lastName, email, phone: phone || undefined, message });
      setSuccess(true);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err) {
      setError(err.response?.data?.message || err.message || t("contactPageError"));
    } finally {
      setSubmitting(false);
    }
  }

  const hoursLines = t("contactPageHoursValue").split("\n");

  return (
    <main>
      <PageHero
        compact
        eyebrow={t("contactPageEyebrow")}
        title={t("contactPageTitle")}
        subtitle={t("contactPageLead")}
      />

      <Section className="pt-0">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <Card>
              <CardContent>
                <h2 className="text-xl font-semibold text-heading">{t("contactPageSendMessage")}</h2>
                <p className="mt-1 text-sm text-muted">{t("contactPagePrivacyNote")}</p>
                {success ? (
                  <div className="mt-6 space-y-4">
                    <p className="text-sm text-success" role="status">{t("contactPageSuccess")}</p>
                    <Button variant="secondary" onClick={() => setSuccess(false)}>{t("contactPageSendAnother")}</Button>
                  </div>
                ) : (
                  <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className={fieldLabel}>
                        <span className="font-medium">{t("contactFirstName")}</span>
                        <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" required maxLength={80} />
                      </label>
                      <label className={fieldLabel}>
                        <span className="font-medium">{t("contactLastName")}</span>
                        <Input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" required maxLength={80} />
                      </label>
                    </div>
                    <label className={fieldLabel}>
                      <span className="font-medium">{t("contactEmail")}</span>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                    </label>
                    <label className={fieldLabel}>
                      <span className="font-medium">{t("contactPhoneOptional")}</span>
                      <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={40} />
                    </label>
                    <label className={fieldLabel}>
                      <span className="font-medium">{t("contactMessage")}</span>
                      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} required maxLength={10000} />
                    </label>
                    {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
                    <Button type="submit" disabled={submitting}>
                      {submitting ? t("contactSending") : t("contactSendMessage")}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <aside className="space-y-6">
              <Card>
                <CardContent>
                  <h2 className="text-xl font-semibold text-heading">{t("contactPageVisit")}</h2>
                  <div className="mt-4 space-y-4 text-sm">
                    <p className="flex items-start gap-3">
                      <IconMail className="mt-0.5 shrink-0 icon-accent" />
                      <span>
                        <strong className="block text-text">{t("contactEmail")}</strong>
                        <a href="mailto:hello@mmizan.com" className="text-primary hover:underline">hello@mmizan.com</a>
                      </span>
                    </p>
                    <p className="flex items-start gap-3">
                      <IconPhone className="mt-0.5 shrink-0 icon-accent" />
                      <span>
                        <strong className="block text-text">{t("contactPhone")}</strong>
                        <span className="text-muted">+251 90 000 0000</span>
                      </span>
                    </p>
                    <p className="flex items-start gap-3">
                      <IconClock className="mt-0.5 shrink-0 icon-accent" />
                      <span>
                        <strong className="block text-text">{t("contactPageHours")}</strong>
                        <span className="text-muted">
                          {hoursLines.map((line, i) => (
                            <span key={line}>{i > 0 ? <br /> : null}{line}</span>
                          ))}
                        </span>
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
              <div className="overflow-hidden rounded-xl border border-line" aria-label={t("contactPageMapLabel")}>
                <iframe title={t("contactPageMapTitle")} src={MAP_EMBED_SRC} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-64 w-full border-0" />
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </main>
  );
}
