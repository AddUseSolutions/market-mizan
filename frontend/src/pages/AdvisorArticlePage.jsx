import { Link, Navigate, useParams } from "react-router-dom";
import { Container, Section } from "../components/ui";
import { IconArrowRight } from "../components/icons/HeroIcons";
import { advisorArticle, advisorSection } from "../content/advisor";

export default function AdvisorArticlePage() {
  const { section: sectionSlug, article: articleSlug } = useParams();
  const found = advisorArticle(sectionSlug, articleSlug);
  if (!found) {
    const section = advisorSection(sectionSlug);
    return <Navigate to={section ? `/insights/${section.slug}` : "/insights"} replace />;
  }
  const { section, article } = found;

  return (
    <main className="bg-bg">
      <Section className="pb-16 pt-10 sm:pt-14">
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
            <Link to={`/insights/${section.slug}`} className="hover:text-primary">
              {section.title}
            </Link>
          </p>
          <div className="mt-6 grid items-start gap-10 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl">
              <img
                src={article.image}
                alt={article.imageAlt}
                className="aspect-[4/3] w-full object-cover lg:aspect-[5/4]"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{section.title}</p>
              <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight text-heading">{article.title}</h1>
              <p className="mt-3 text-base leading-relaxed text-muted">{article.lead}</p>
              <ol className="mt-8 space-y-6">
                {article.steps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold text-heading">{step.title}</h2>
                      <p className="mt-1 text-[15px] leading-relaxed text-brand-deep">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link
                to={article.to}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                {article.cta}
                <IconArrowRight size={16} />
              </Link>
              {Array.isArray(article.related) && article.related.length ? (
                <aside className="mt-10 border-t border-line pt-8">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Also consider</h2>
                  <ul className="mt-4 space-y-2">
                    {article.related.map((item) => (
                      <li key={`${item.section}/${item.article}`}>
                        <Link
                          to={`/insights/${item.section}/${item.article}`}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-heading transition-colors hover:text-primary"
                        >
                          {item.label}
                          <IconArrowRight size={14} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </aside>
              ) : null}
            </div>
          </div>
        </Container>
      </Section>
    </main>
  );
}
