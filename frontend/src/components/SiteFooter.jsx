import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { formatContactPhoneDisplay, getContactPhoneTelHref } from "../utils/contactInfo";
import { IconChevronRight } from "./icons/HeroIcons";
import { Container } from "./ui";

const LINKEDIN_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_LINKEDIN_URL) ||
  "https://www.linkedin.com/company/mmizan";

function IconLinkedIn({ className = "" }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

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
  const exploreLinks = [
    { to: "/", label: t("navListings") },
    { to: "/neighborhoods", label: t("navMap") },
    { to: "/insights", label: t("navInsights") },
    { to: "/list-your-property", label: t("footerListYourProperty") },
    { to: "/premium", label: t("footerPremiumPlans") },
    { to: "/contact", label: t("footerContact") },
    { to: "/login", label: t("navLogin") }
  ];

  const legalLinks = [
    { to: "/privacy", label: t("footerPrivacyPolicy") },
    { to: "/terms", label: t("footerTermsOfUse") },
    { to: "/legal-notice", label: t("footerLegalNotice") }
  ];

  return (
    <footer className="relative mt-auto bg-black text-white">
      <div className="h-1 bg-primary" aria-hidden />

      <div className="relative overflow-hidden py-12 sm:py-14">
        <FooterWatermark />
        <Container>
          <div className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            <div className="sm:col-span-2 lg:col-span-1">
              <h2 className="font-heading text-xl font-bold text-white">Market Mizan</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">{t("footerLead")}</p>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-white"
              >
                <IconLinkedIn className="shrink-0" />
                {t("footerFollowLinkedIn")}
              </a>
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
                    href={getContactPhoneTelHref()}
                  >
                    <IconPhone className="shrink-0 text-primary" />
                    {formatContactPhoneDisplay()}
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
              <img src="/Market_Mizan_Logo_Footer_Black.png" alt="Market Mizan" className="h-14 w-auto" />
            </Link>

            <ul className="flex gap-2.5" aria-label={t("navSocial")}>
              <li>
                <a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("footerFollowLinkedIn")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white/80 transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <IconLinkedIn />
                </a>
              </li>
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
          </div>
        </Container>
      </div>
    </footer>
  );
}

export default SiteFooter;
