import { Link, Navigate, useParams } from "react-router-dom";
import { Container, Section } from "../components/ui";
import { IconArrowRight } from "../components/icons/HeroIcons";
import { advisorSection } from "../content/advisor";

export default function AdvisorSectionPage() {
  const { section: sectionSlug } = useParams();
  const section = advisorSection(sectionSlug);
  if (!section) return <Navigate to="/insights" replace />;

  return (
    <main className="bg-bg">
      <Section className="pb-4 pt-10 sm:pt-14">
        <Container>
          <p className="text-sm text-muted">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2 text-line">/</span>
            <Link to="/insights" className="hover:text-primary">
              Advisor
            </Link>
            <span className="mx-2 text-line">/</span>
            <span className="text-heading">{section.title}</span>
          </p>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-heading sm:text-5xl">{section.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{section.lead}</p>
        </Container>
      </Section>

      <Section className="pb-16 pt-6">
        <Container>
          <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {section.articles.map((article) => (
              <li key={article.slug}>
                <article className="group flex h-full flex-col">
                  <Link
                    to={`/insights/${section.slug}/${article.slug}`}
                    className="block overflow-hidden rounded-xl"
                  >
                    <img
                      src={article.image}
                      alt={article.imageAlt}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </Link>
                  <h2 className="mt-4 text-xl font-semibold text-heading">{article.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{article.lead}</p>
                  <Link
                    to={`/insights/${section.slug}/${article.slug}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
                  >
                    Find out more
                    <IconArrowRight size={16} />
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </main>
  );
}
