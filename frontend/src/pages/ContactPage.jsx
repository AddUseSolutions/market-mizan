import { useState } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { formatContactPhoneDisplay, getContactPhoneTelHref } from "../utils/contactInfo";
import { IconArrowRight } from "../components/icons/HeroIcons";
import { Container, Section, Input, Textarea, Button, Eyebrow } from "../components/ui";

const MAP_EMBED_SRC =
  "https://maps.google.com/maps?q=Addis+Ababa,+Ethiopia&hl=en&z=12&ie=UTF8&iwloc=&output=embed";

const fieldLabel = "flex flex-col gap-1.5 text-sm";

function IconMail({ className = "" }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16v12H4V6zm0 0 8 6 8-6" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

function IconPhone({ className = "" }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconPin({ className = "" }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="10" r="2" fill="currentColor" />
    </svg>
  );
}

function GoldIconCircle({ children }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-brand-muted text-primary">
      {children}
    </div>
  );
}

function ContactVisitRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <GoldIconCircle>
        <Icon />
      </GoldIconCircle>
      <div className="min-w-0 text-sm">
        <strong className="block font-semibold text-white">{label}</strong>
        <div className="mt-0.5 text-white/80">{children}</div>
      </div>
    </div>
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
  const labelClass = "font-semibold text-primary";

  return (
    <main>
      <section className="bg-gradient-to-b from-brand-muted to-transparent py-10 sm:py-14">
        <Container>
          <Eyebrow>{t("contactPageEyebrow")}</Eyebrow>
          <h1 className="relative mt-2 max-w-2xl text-3xl font-bold text-heading sm:text-4xl">
            {t("contactPageTitle")}
            <span className="absolute -bottom-3 left-0 h-1 w-16 rounded-full bg-primary" aria-hidden />
          </h1>
          <p className="mt-8 max-w-2xl text-muted">{t("contactPageLead")}</p>
        </Container>
      </section>

      <Section className="pt-0">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <article className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
              <header className="bg-primary px-6 py-5 sm:px-8 sm:py-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/15 text-primary">
                    <IconMail />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{t("contactPageSendMessage")}</h2>
                    <p className="mt-1 text-sm text-white/75">{t("contactPagePrivacyNote")}</p>
                  </div>
                </div>
              </header>

              <div className="p-6 sm:p-8">
                {success ? (
                  <div className="space-y-4">
                    <p className="text-sm text-success" role="status">{t("contactPageSuccess")}</p>
                    <Button variant="secondary" onClick={() => setSuccess(false)}>{t("contactPageSendAnother")}</Button>
                  </div>
                ) : (
                  <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className={fieldLabel}>
                        <span className={labelClass}>{t("contactFirstName")}</span>
                        <Input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          autoComplete="given-name"
                          placeholder={t("contactFirstNamePlaceholder")}
                          required
                          maxLength={80}
                        />
                      </label>
                      <label className={fieldLabel}>
                        <span className={labelClass}>{t("contactLastName")}</span>
                        <Input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          autoComplete="family-name"
                          placeholder={t("contactLastNamePlaceholder")}
                          required
                          maxLength={80}
                        />
                      </label>
                    </div>
                    <label className={fieldLabel}>
                      <span className={labelClass}>{t("contactEmail")}</span>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        placeholder={t("contactEmailPlaceholder")}
                        required
                      />
                    </label>
                    <label className={fieldLabel}>
                      <span className={labelClass}>{t("contactPhoneOptional")}</span>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="tel"
                        placeholder={t("contactPhonePlaceholder")}
                        maxLength={40}
                      />
                    </label>
                    <label className={fieldLabel}>
                      <span className={labelClass}>{t("contactMessage")}</span>
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={6}
                        placeholder={t("contactMessagePlaceholder")}
                        required
                        maxLength={10000}
                      />
                    </label>
                    {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
                    <Button
                      type="submit"
                      variant="primary-gold"
                      size="lg"
                      className="w-full justify-between"
                      disabled={submitting}
                    >
                      <span>{submitting ? t("contactSending") : t("contactSendMessage")}</span>
                      <IconArrowRight className="text-white" size={20} />
                    </Button>
                  </form>
                )}
              </div>
            </article>

            <aside className="space-y-6">
              <article className="rounded-xl bg-brand-deep p-6 text-white shadow-card">
                <h2 className="relative inline-block text-xl font-semibold">
                  {t("contactPageVisit")}
                  <span className="absolute -bottom-2 left-0 h-0.5 w-10 rounded-full bg-primary" aria-hidden />
                </h2>
                <div className="mt-8 space-y-5">
                  <ContactVisitRow icon={IconMail} label={t("contactEmail")}>
                    <a href="mailto:hello@mmizan.com" className="transition-colors hover:text-primary">
                      hello@mmizan.com
                    </a>
                  </ContactVisitRow>
                  <ContactVisitRow icon={IconPhone} label={t("contactPhone")}>
                    <a href={getContactPhoneTelHref()} className="transition-colors hover:text-primary">
                      {formatContactPhoneDisplay()}
                    </a>
                  </ContactVisitRow>
                  <ContactVisitRow icon={IconClock} label={t("contactPageHours")}>
                    {hoursLines.map((line, i) => (
                      <span key={line}>{i > 0 ? <br /> : null}{line}</span>
                    ))}
                  </ContactVisitRow>
                </div>
              </article>

              <div
                className="relative overflow-hidden rounded-xl border border-line shadow-soft"
                aria-label={t("contactPageMapLabel")}
              >
                <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-md">
                  <IconPin className="text-primary" />
                  {t("contactPageMapLocation")}
                </div>
                <iframe
                  title={t("contactPageMapTitle")}
                  src={MAP_EMBED_SRC}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-72 w-full border-0 sm:h-80"
                />
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </main>
  );
}
