import { cn } from "../../utils/cn";
import { Container } from "./Container";
import Eyebrow from "./Eyebrow";

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  action,
  image,
  compact = false,
  className,
  contentClassName,
}) {
  const hasImage = Boolean(image);

  return (
    <section
      className={cn(
        "relative overflow-hidden",
        compact ? "py-10 sm:py-14" : "flex min-h-[40vh] items-end sm:min-h-[50vh]",
        !hasImage && "bg-gradient-to-b from-brand-muted to-transparent",
        className
      )}
    >
      {hasImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${image})` }}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-brand-deep/95 via-brand-deep/60 to-brand-deep/40"
            aria-hidden
          />
        </>
      ) : null}

      <Container
        className={cn(
          "relative z-10",
          hasImage ? "pb-12 pt-24 text-white" : "text-heading",
          contentClassName
        )}
      >
        {eyebrow ? (
          <Eyebrow className={hasImage ? "text-gold" : undefined}>{eyebrow}</Eyebrow>
        ) : null}
        {title ? (
          <h1 className={cn("max-w-2xl text-3xl font-bold sm:text-4xl lg:text-5xl", eyebrow && "mt-2")}>
            {title}
          </h1>
        ) : null}
        {subtitle ? (
          <p className={cn("mt-4 max-w-xl leading-relaxed", hasImage ? "text-white/85" : "text-muted")}>
            {subtitle}
          </p>
        ) : null}
        {action ? <div className="mt-6">{action}</div> : null}
      </Container>
    </section>
  );
}
