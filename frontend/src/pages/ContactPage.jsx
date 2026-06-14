import { useState } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { Container, Section, Card, CardContent, Input, Textarea, Button } from "../components/ui";

const MAP_EMBED_SRC =
  "https://maps.google.com/maps?q=Addis+Ababa,+Ethiopia&hl=en&z=12&ie=UTF8&iwloc=&output=embed";

const fieldLabel = "flex flex-col gap-1.5 text-sm";

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
      <section className="bg-gradient-to-b from-primary/5 to-transparent py-10 sm:py-14">
        <Container>
          <p className="text-sm font-medium uppercase tracking-wider text-accent">{t("contactPageEyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold text-heading sm:text-4xl">{t("contactPageTitle")}</h1>
          <p className="mt-3 max-w-2xl text-muted">{t("contactPageLead")}</p>
        </Container>
      </section>

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
                  <div className="mt-4 space-y-3 text-sm">
                    <p>
                      <strong className="block text-text">{t("contactEmail")}</strong>
                      <a href="mailto:hello@mmizan.com" className="text-primary hover:underline">hello@mmizan.com</a>
                    </p>
                    <p>
                      <strong className="block text-text">{t("contactPhone")}</strong>
                      <span className="text-muted">+251 90 000 0000</span>
                    </p>
                    <p>
                      <strong className="block text-text">{t("contactPageHours")}</strong>
                      <span className="text-muted">
                        {hoursLines.map((line, i) => (
                          <span key={line}>{i > 0 ? <br /> : null}{line}</span>
                        ))}
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
