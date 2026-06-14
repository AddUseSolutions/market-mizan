import { Link } from "react-router-dom";
import { Container, Section } from "../components/ui";

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
    <Section>
      <Container className="max-w-3xl">
        <h1 className="text-3xl font-bold text-heading">Sitemap</h1>
        <p className="mt-2 text-muted">All main pages on Market Mizan.</p>
        <ul className="mt-6 space-y-2">
          {pages.map(({ to, label }) => (
            <li key={to}>
              <Link to={to} className="text-primary hover:underline">{label}</Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
