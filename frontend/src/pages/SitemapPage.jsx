import { Link } from "react-router-dom";
import { Container, Section, PageHero } from "../components/ui";

const pages = [
  { to: "/", label: "Home / listings" },
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
    <main>
      <PageHero compact eyebrow="Explore" title="Sitemap" subtitle="All main pages on Market Mizan." />
      <Section className="pt-0">
        <Container className="max-w-3xl">
          <ul className="space-y-2">
            {pages.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="text-primary hover:underline">{label}</Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </main>
  );
}
