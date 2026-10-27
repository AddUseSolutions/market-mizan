import { Link } from "react-router-dom";
import { IconArrowRight, IconBuilding, IconSearch, IconShield } from "../components/icons/HeroIcons";
import { Container, Section, Eyebrow } from "../components/ui";

const benefits = [
  {
    icon: IconSearch,
    title: "More visibility",
    text: "A Premium Plan puts your listing in front of more people who are looking to buy or rent in Addis Ababa."
  },
  {
    icon: IconBuilding,
    title: "More serious enquiries",
    text: "Buyers and tenants see a listing that stands out, so you spend less time waiting to be found."
  },
  {
    icon: IconShield,
    title: "Still verified",
    text: "Your listing stays live and verified. Premium is an extra placement, not a different kind of listing."
  }
];

const steps = [
  {
    title: "Your listing is live",
    text: "After we approve it, the property is already visible. Premium is optional."
  },
  {
    title: "Tell us the reference",
    text: "Send the MM reference from your approval email, or open Manage listing and contact us from there."
  },
  {
    title: "We confirm payment",
    text: "We agree the plan with you and only mark the listing as Premium after payment is confirmed."
  }
];

export default function PremiumPlansPage() {
  return (
    <main>
      <section className="bg-gradient-to-b from-brand-muted to-transparent py-10 sm:py-14">
        <Container>
          <Eyebrow>Premium</Eyebrow>
          <h1 className="relative mt-2 max-w-2xl text-3xl font-bold text-heading sm:text-4xl">
            Reach more buyers and tenants
            <span className="absolute -bottom-3 left-0 h-1 w-16 rounded-full bg-primary" aria-hidden />
          </h1>
          <p className="mt-8 max-w-2xl leading-relaxed text-muted">
            Thank you for listing on Market Mizan. A Premium Plan is a paid placement that increases visibility for a
            property that is already live.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/contact?topic=premium"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              Explore Premium Plans
              <IconArrowRight className="text-white" size={18} />
            </Link>
            <Link
              to="/my-listings"
              className="inline-flex items-center rounded-lg border border-line bg-surface px-6 py-3 text-sm font-semibold text-heading transition-colors hover:border-primary hover:text-primary"
            >
              Manage listing
            </Link>
          </div>
        </Container>
      </section>

      <Section className="pt-2">
        <Container>
          <div className="grid gap-4 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-xl border border-line bg-surface p-6 shadow-card">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                  <Icon className="text-primary" size={20} />
                </div>
                <h2 className="mt-4 text-lg font-bold text-heading">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-brand-muted/40 pt-0">
        <Container className="max-w-3xl">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-2 text-2xl font-bold text-heading sm:text-3xl">Three steps, no checkout on the site</h2>
          <ol className="mt-8 space-y-4">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4 rounded-xl border border-line bg-surface p-5 shadow-soft">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-bold text-heading">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm leading-relaxed text-muted">
            Prices are confirmed with you directly. Email{" "}
            <a href="mailto:hello@mmizan.com?subject=Premium%20Plan" className="font-semibold text-primary hover:underline">
              hello@mmizan.com
            </a>{" "}
            with your listing reference, or use the contact form.
          </p>
        </Container>
      </Section>
    </main>
  );
}
