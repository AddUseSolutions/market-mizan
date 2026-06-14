import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { Container } from "./ui";

const social = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
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
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
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
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    )
  }
];

function SiteFooter() {
  const year = new Date().getFullYear();
  const { t } = useLanguage();

  const footerLink = "text-sm text-white/80 transition-colors hover:text-white";

  return (
    <footer className="mt-auto bg-primary-dark text-white">
      <div className="h-1 bg-gradient-to-r from-accent via-primary-light to-accent" aria-hidden />
      <div className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-10 sm:grid-cols-3">
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-wide">Market Mizan</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/75">{t("footerLead")}</p>
                <ul className="mt-5 space-y-3 text-sm">
                  <li>
                    <a className="flex items-center gap-2 text-white/80 hover:text-white" href="mailto:hello@mmizan.com">
                      <span className="text-accent" aria-hidden>✉</span>
                      hello@mmizan.com
                    </a>
                  </li>
                  <li>
                    <a className="flex items-center gap-2 text-white/80 hover:text-white" href="tel:+251900000000">
                      <span className="text-accent" aria-hidden>☎</span>
                      +251 90 000 0000
                    </a>
                  </li>
                  <li className="flex items-center gap-2 text-white/80">
                    <span className="text-accent" aria-hidden>📍</span>
                    {t("footerLocation")}
                  </li>
                </ul>
              </div>

              <nav aria-labelledby="footer-explore-heading">
                <h2 id="footer-explore-heading" className="font-heading text-sm font-semibold uppercase tracking-wider text-white/90">
                  {t("footerExplore")}
                </h2>
                <ul className="mt-4 space-y-2">
                  <li><Link to="/" className={footerLink}>{t("navListings")}</Link></li>
                  <li><Link to="/about" className={footerLink}>{t("navAbout")}</Link></li>
                  <li><Link to="/list-your-property" className={footerLink}>{t("footerListYourProperty")}</Link></li>
                  <li><Link to="/contact" className={footerLink}>{t("footerContact")}</Link></li>
                  <li><Link to="/login" className={footerLink}>{t("navLogin")}</Link></li>
                  <li><Link to="/sitemap" className={footerLink}>{t("footerSitemap")}</Link></li>
                </ul>
              </nav>

              <nav aria-labelledby="footer-legal-heading">
                <h2 id="footer-legal-heading" className="font-heading text-sm font-semibold uppercase tracking-wider text-white/90">
                  {t("footerLegal")}
                </h2>
                <ul className="mt-4 space-y-2">
                  <li><Link to="/privacy" className={footerLink}>{t("footerPrivacyPolicy")}</Link></li>
                  <li><Link to="/terms" className={footerLink}>{t("footerTermsOfUse")}</Link></li>
                  <li><Link to="/legal-notice" className={footerLink}>{t("footerLegalNotice")}</Link></li>
                </ul>
              </nav>
            </div>
          </div>
        </Container>
      </div>

      <div className="border-t border-white/10 py-6">
        <Container>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <Link to="/" aria-label={t("footerHomeAria")}>
              <img src="/logo-market-mizan-header.png" alt="" className="h-7 brightness-0 invert" />
            </Link>

            <ul className="flex gap-3" aria-label={t("navSocial")}>
              {social.map(({ label, href, icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors hover:border-white/40 hover:text-white"
                  >
                    {icon}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-center gap-1 text-center text-xs text-white/60 sm:items-end">
              <span>© {year} Market Mizan</span>
              <nav className="flex flex-wrap items-center justify-center gap-2" aria-label={t("navLegalSub")}>
                <Link to="/privacy" className="hover:text-white">{t("footerPrivacyShort")}</Link>
                <span aria-hidden>·</span>
                <Link to="/terms" className="hover:text-white">{t("footerTermsShort")}</Link>
                <span aria-hidden>·</span>
                <Link to="/legal-notice" className="hover:text-white">{t("footerImprint")}</Link>
              </nav>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}

export default SiteFooter;
