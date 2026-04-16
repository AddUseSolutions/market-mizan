import { Link } from "react-router-dom";

const social = [
  { label: "Facebook", href: "https://www.facebook.com/" },
  { label: "X", href: "https://x.com/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/" },
  { label: "Instagram", href: "https://www.instagram.com/" }
];

function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-accent" aria-hidden />
      <div className="site-footer-main">
        <div className="container site-footer-grid">
          <div className="site-footer-brand">
            <Link to="/" className="site-footer-logo-wrap">
              <img src="/logo-market-mizan.svg" alt="" className="site-footer-logo" />
              <span className="site-footer-name">Market Mizan</span>
            </Link>
            <p className="site-footer-tagline">
              Your trusted property aggregator for Addis Ababa — search listings from multiple sources in one place.
            </p>
          </div>

          <nav className="site-footer-col" aria-labelledby="footer-sitemap-heading">
            <h2 id="footer-sitemap-heading" className="site-footer-heading">
              Sitemap
            </h2>
            <ul className="site-footer-links">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/">Listings</Link>
              </li>
              <li>
                <Link to="/about">About us</Link>
              </li>
              <li>
                <Link to="/list-your-property">Upload listing</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
              <li>
                <Link to="/login">Login</Link>
              </li>
              <li>
                <Link to="/sitemap">Full sitemap</Link>
              </li>
            </ul>
          </nav>

          <nav className="site-footer-col" aria-labelledby="footer-legal-heading">
            <h2 id="footer-legal-heading" className="site-footer-heading">
              Legal
            </h2>
            <ul className="site-footer-links">
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

          <div className="site-footer-col">
            <h2 className="site-footer-heading">Connect</h2>
            <p className="site-footer-contact">
              <a href="mailto:hello@mmizan.com">hello@mmizan.com</a>
            </p>
            <ul className="site-footer-social" aria-label="Social media">
              {social.map(({ label, href }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="site-footer-bottom">
        <div className="container site-footer-bottom-inner">
          <span>© {year} Market Mizan · mmizan.com</span>
          <span className="site-footer-bottom-links">
            <Link to="/privacy">Privacy</Link>
            <span className="site-footer-dot" aria-hidden>
              ·
            </span>
            <Link to="/terms">Terms</Link>
            <span className="site-footer-dot" aria-hidden>
              ·
            </span>
            <Link to="/legal-notice">Imprint</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
