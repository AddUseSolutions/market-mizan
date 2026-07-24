import { Link } from "react-router-dom";
import { Container, Section, PageHero } from "../components/ui";

const pages = [
  { to: "/", label: "Home — Market Mizan (mmizan)" },
  { to: "/?listing_mode=for_rent", label: "Homes for rent in Addis Ababa" },
  { to: "/?listing_mode=for_sale", label: "Homes for sale in Addis Ababa" },
  { to: "/neighborhoods", label: "Neighborhood map" },
  { to: "/list-your-property", label: "List your property" },
  { to: "/contact", label: "Contact / find an agent" },
  { to: "/privacy", label: "Privacy policy" },
  { to: "/terms", label: "Terms of use" },
  { to: "/legal-notice", label: "Legal notice (Imprint)" }
];

export default function SitemapPage() {
  return (
    <main>
      <PageHero
        compact
        eyebrow="Market Mizan"
        title="Sitemap"
        subtitle="Public pages on mmizan.com — Market Mizan real estate for Addis Ababa."
      />
      <Section className="pt-0">
        <Container className="max-w-3xl">
          <ul className="space-y-2">
            {pages.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="text-primary hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted">
            XML sitemaps for Google:{" "}
            <a className="text-primary hover:underline" href="/sitemap.xml">
              sitemap.xml
            </a>
            {" · "}
            <a className="text-primary hover:underline" href="/sitemap-index.xml">
              sitemap-index.xml
            </a>
            {" · "}
            <a className="text-primary hover:underline" href="/robots.txt">
              robots.txt
            </a>
          </p>
        </Container>
      </Section>
    </main>
  );
}
