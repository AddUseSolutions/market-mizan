import { Link } from "react-router-dom";

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
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    )
  }
];

function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer site-footer--walde">
      <div className="site-footer-accent" aria-hidden />
      <div className="site-footer-main">
        <div className="container">
          <div className="site-footer-narrow">
            <div className="site-footer-grid-walde">
              <div className="site-footer-block">
                <h2 className="site-footer-brand-title">Market Mizan</h2>
                <p className="site-footer-lead">
                  Your property aggregator for Addis Ababa — clear listings, one calm place to browse.
                </p>
                <ul className="site-footer-contact-list">
                  <li>
                    <a className="site-footer-contact-link" href="mailto:hello@mmizan.com">
                      <span className="site-footer-contact-icon" aria-hidden>
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            d="M4 6h16v12H4V6zm0 0l8 6 8-6"
                          />
                        </svg>
                      </span>
                      hello@mmizan.com
                    </a>
                  </li>
                  <li>
                    <a className="site-footer-contact-link" href="tel:+251900000000">
                      <span className="site-footer-contact-icon" aria-hidden>
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            d="M6.5 3h4l1.2 4.5-2.6 1.7c1.2 2.4 3.5 4.7 6.2 6.2l1.7-2.6L22 13.5v4c0 .8-.6 1.5-1.4 1.5C10.9 19 5 13.1 5 4.9 5 4.1 5.7 3 6.5 3z"
                          />
                        </svg>
                      </span>
                      +251 90 000 0000
                    </a>
                  </li>
                  <li>
                    <span className="site-footer-contact-link site-footer-contact-link--static">
                      <span className="site-footer-contact-icon" aria-hidden>
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"
                          />
                          <circle cx="12" cy="10" r="2" fill="currentColor" />
                        </svg>
                      </span>
                      Addis Ababa, Ethiopia
                    </span>
                  </li>
                </ul>
              </div>

              <nav className="site-footer-block" aria-labelledby="footer-explore-heading">
                <h2 id="footer-explore-heading" className="site-footer-heading-walde">
                  Explore
                </h2>
                <ul className="site-footer-links-walde">
                  <li>
                    <Link to="/">Listings</Link>
                  </li>
                  <li>
                    <Link to="/about">About</Link>
                  </li>
                  <li>
                    <Link to="/list-your-property">List your property</Link>
                  </li>
                  <li>
                    <Link to="/contact">Contact</Link>
                  </li>
                  <li>
                    <Link to="/login">Login</Link>
                  </li>
                  <li>
                    <Link to="/sitemap">Sitemap</Link>
                  </li>
                </ul>
              </nav>

              <nav className="site-footer-block" aria-labelledby="footer-legal-heading">
                <h2 id="footer-legal-heading" className="site-footer-heading-walde">
                  Legal
                </h2>
                <ul className="site-footer-links-walde">
                  <li>
                    <Link to="/privacy">Privacy policy</Link>
                  </li>
                  <li>
                    <Link to="/terms">Terms of use</Link>
                  </li>
                  <li>
                    <Link to="/legal-notice">Legal notice (Imprint)</Link>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="site-footer-sub">
        <div className="container">
          <div className="site-footer-sub-inner">
            <Link to="/" className="site-footer-sub-logo" aria-label="Market Mizan home">
              <img src="/logo-market-mizan-header.png" alt="" />
            </Link>

            <ul className="site-footer-sub-social" aria-label="Social media">
              {social.map(({ label, href, icon }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="site-footer-social-btn">
                    {icon}
                  </a>
                </li>
              ))}
            </ul>

            <div className="site-footer-sub-meta">
              <span className="site-footer-copyright">© {year} Market Mizan</span>
              <nav className="site-footer-sub-legal" aria-label="Legal">
                <Link to="/privacy">Privacy</Link>
                <span className="site-footer-sub-dot" aria-hidden>
                  ·
                </span>
                <Link to="/terms">Terms</Link>
                <span className="site-footer-sub-dot" aria-hidden>
                  ·
                </span>
                <Link to="/legal-notice">Imprint</Link>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
