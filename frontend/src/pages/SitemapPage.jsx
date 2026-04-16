import { Link } from "react-router-dom";

const pages = [
  { to: "/", label: "Home / listings" },
  { to: "/about", label: "About us" },
  { to: "/list-your-property", label: "Upload listing" },
  { to: "/contact", label: "Contact" },
  { to: "/login", label: "Login" },
  { to: "/admin", label: "Admin (restricted)" },
  { to: "/privacy", label: "Privacy policy" },
  { to: "/terms", label: "Terms of use" },
  { to: "/legal-notice", label: "Legal notice (Imprint)" }
];

export default function SitemapPage() {
  return (
    <main className="container section-space legal-page">
      <h1>Sitemap</h1>
      <p className="detail-subtitle">All main pages on Market Mizan.</p>
      <ul className="sitemap-list">
        {pages.map(({ to, label }) => (
          <li key={to}>
            <Link to={to}>{label}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
