import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { buildWhatsAppUrl } from "../utils/whatsapp";
import { IconChevronRight } from "./icons/HeroIcons";
import { Container } from "./ui";

const social = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          fill="currentColor"
          d="M13.5 22v-8.2h2.7l.5-3.2H13.5V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.1c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.5H7.5v3.2h2.9V22h3.1z"
        />
      </svg>
    )
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          fill="currentColor"
          d="M6.5 8.7H3.2V22h3.3V8.7zm11.4 6.9c0-2.1-1.1-3.1-2.5-3.1-1.2 0-1.8.6-2.1 1.1V8.7H9.9c.1 1 0 10.6 0 10.6h2.9v-5.9c0-.3 0-.6.1-.8.3-.7 1-1.4 2.1-1.4 1.5 0 2.1 1.1 2.1 2.6V22H22v-6.4zM4.8 3.2C3.8 3.2 3 4 3 4.9c0 .9.8 1.7 1.8 1.7h.1c1.1 0 1.9-.8 1.9-1.7 0-.9-.8-1.7-1.9-1.7z"
        />
      </svg>
    )
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    )
  }
];

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

function IconPin({ className = "" }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="10" r="2" fill="currentColor" />
    </svg>
  );
}

function FooterWatermark() {
  return (
    <div
      className="pointer-events-none absolute bottom-0 right-0 top-0 hidden w-[min(42vw,320px)] overflow-hidden lg:block"
      aria-hidden
    >
      <svg
        className="absolute -right-8 top-1/2 h-[280px] w-[280px] -translate-y-1/2 text-primary/10"
        viewBox="0 0 200 100"
        fill="none"
      >
        <path
          d="M50 50 C50 20 80 20 100 50 C120 80 150 80 150 50 C150 20 120 20 100 50 C80 80 50 80 50 50Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="6 8"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function FooterNavLink({ to, children }) {
  return (
    <li className="border-b border-white/10 last:border-b-0">
      <Link
        to={to}
        className="group flex items-center justify-between gap-3 py-2.5 text-sm text-white/90 transition-colors hover:text-white"
      >
        <span>{children}</span>
        <IconChevronRight className="shrink-0 text-primary transition-transform group-hover:translate-x-0.5" size={14} />
      </Link>
    </li>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();
  const { t } = useLanguage();
  const waHref = buildWhatsAppUrl(t("whatsappFabMessage")) || "/contact";
  const waExternal = waHref.startsWith("http");

  const exploreLinks = [
    { to: "/", label: t("navListings") },
    { to: "/about", label: t("navAbout") },
    { to: "/list-your-property", label: t("footerListYourProperty") },
    { to: "/contact", label: t("footerContact") },
    { to: "/login", label: t("navLogin") },
    { to: "/sitemap", label: t("footerSitemap") }
  ];

  const legalLinks = [
    { to: "/privacy", label: t("footerPrivacyPolicy") },
    { to: "/terms", label: t("footerTermsOfUse") },
    { to: "/legal-notice", label: t("footerLegalNotice") }
  ];

  return (
    <footer className="relative mt-auto bg-brand-deep text-white">
      <div className="h-1 bg-primary" aria-hidden />

      <div className="relative overflow-hidden py-12 sm:py-14">
        <FooterWatermark />
        <Container>
          <div className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            <div className="sm:col-span-2 lg:col-span-1">
              <h2 className="font-heading text-xl font-bold text-white">Market Mizan</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">{t("footerLead")}</p>
              <ul className="mt-6 space-y-3.5">
                <li>
                  <a
                    className="flex items-center gap-3 text-sm text-white/85 transition-colors hover:text-white"
                    href="mailto:hello@mmizan.com"
                  >
                    <IconMail className="shrink-0 text-primary" />
                    hello@mmizan.com
                  </a>
                </li>
                <li>
                  <a
                    className="flex items-center gap-3 text-sm text-white/85 transition-colors hover:text-white"
                    href="tel:+251900000000"
                  >
                    <IconPhone className="shrink-0 text-primary" />
                    +251 90 000 0000
                  </a>
                </li>
                <li className="flex items-center gap-3 text-sm text-white/85">
                  <IconPin className="shrink-0 text-primary" />
                  {t("footerLocation")}
                </li>
              </ul>
            </div>

            <nav aria-labelledby="footer-explore-heading">
              <h2
                id="footer-explore-heading"
                className="font-heading text-xs font-bold uppercase tracking-[0.14em] text-primary"
              >
                {t("footerExplore")}
              </h2>
              <ul className="mt-3">
                {exploreLinks.map((link) => (
                  <FooterNavLink key={link.to} to={link.to}>
                    {link.label}
                  </FooterNavLink>
                ))}
              </ul>
            </nav>

            <nav aria-labelledby="footer-legal-heading">
              <h2
                id="footer-legal-heading"
                className="font-heading text-xs font-bold uppercase tracking-[0.14em] text-primary"
              >
                {t("footerLegal")}
              </h2>
              <ul className="mt-3">
                {legalLinks.map((link) => (
                  <FooterNavLink key={link.to} to={link.to}>
                    {link.label}
                  </FooterNavLink>
                ))}
              </ul>
            </nav>
          </div>
        </Container>
      </div>

      <div className="border-t border-white/10 py-5">
        <Container>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <Link to="/" className="inline-flex shrink-0 flex-col items-start gap-1" aria-label={t("footerHomeAria")}>
              <img src="/logo-mizan.png" alt="" className="h-10 w-auto brightness-0 invert opacity-90" />
            </Link>

            <ul className="flex gap-2.5" aria-label={t("navSocial")}>
              {social.map(({ label, href, icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white/80 transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {icon}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-1 text-xs text-white/65 sm:text-right lg:flex-1">
              <span>© {year} Market Mizan</span>
              <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:justify-end" aria-label={t("navLegalSub")}>
                <Link to="/privacy" className="transition-colors hover:text-white">
                  {t("footerPrivacyShort")}
                </Link>
                <span aria-hidden className="text-white/30">
                  ·
                </span>
                <Link to="/terms" className="transition-colors hover:text-white">
                  {t("footerTermsShort")}
                </Link>
                <span aria-hidden className="text-white/30">
                  ·
                </span>
                <Link to="/legal-notice" className="transition-colors hover:text-white">
                  {t("footerImprint")}
                </Link>
              </nav>
            </div>

            <a
              href={waHref}
              {...(waExternal ? { target: "_blank", rel: "noreferrer" } : {})}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-white/20 bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-primary/40 hover:bg-primary-dark"
              aria-label={t("contactUsWhatsApp")}
            >
              <span className="text-lg leading-none text-whatsapp" aria-hidden>
                💬
              </span>
              {t("whatsappFabLabel")}
            </a>
          </div>
        </Container>
      </div>
    </footer>
  );
}

export default SiteFooter;
