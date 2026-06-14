import { getPriceLines, formatPricePerSqm, hasPlausiblePrice } from "../utils/pricing";
import { HmloBadge } from "./HmloBadge";
import { Button } from "./ui";
import { IconArrowRight, IconBuilding } from "./icons/HeroIcons";
import { cn } from "../utils/cn";

function PriceWavePattern() {
  return (
    <div className="pointer-events-none absolute bottom-0 right-0 h-20 w-32 overflow-hidden opacity-40" aria-hidden>
      <svg className="h-full w-full" viewBox="0 0 120 80" preserveAspectRatio="none" fill="none">
        <path d="M0 60 C30 40 50 70 80 50 C100 35 110 45 120 30 V80 H0 Z" fill="rgba(240,180,41,0.15)" />
        <path d="M20 70 C45 55 65 75 95 58" stroke="#f0b429" strokeWidth="1" opacity="0.5" />
        <path d="M40 65 C60 50 80 68 110 52" stroke="#f0b429" strokeWidth="1" opacity="0.35" />
      </svg>
    </div>
  );
}

function IconTag({ className = "", size = 18 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12V4h8l8 8-8 8-8-8z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconStatus({ className = "", size = 18 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 border-b border-line px-5 py-4 last:border-0">
      <span className="mt-0.5 shrink-0 text-gold">
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-gold">{label}</div>
        <div className="mt-1 text-sm font-semibold text-heading">{children}</div>
      </div>
    </div>
  );
}

function parseSqmLines(sqm) {
  if (!sqm) return { etb: null, usd: null };
  const parts = sqm.split("\n");
  return { etb: parts[0] || null, usd: parts[1] || null };
}

export default function PropertyPricingSidebar({
  property,
  objectTypeLabel,
  onContact,
  isAdmin = false,
  t,
  className,
}) {
  const lines = getPriceLines(property, { onRequestLabel: t("priceOnRequest") });
  const sqmRaw = formatPricePerSqm(property);
  const sqm = parseSqmLines(sqmRaw);
  const hasPrice = hasPlausiblePrice(property);

  return (
    <aside
      aria-label="Key figures"
      className={cn("min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-card lg:sticky lg:top-24", className)}
    >
      <div className="relative bg-brand-deep px-5 py-6">
        <PriceWavePattern />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold">
            <span className="h-px w-4 bg-gold/60" aria-hidden />
            {t("detailPrice")}
          </div>
          {lines.onRequest ? (
            <p className="mt-2 text-lg font-semibold text-white/90">{lines.label}</p>
          ) : (
            <>
              {lines.etb ? (
                <p className="mt-2 break-words text-xl font-bold leading-tight text-white sm:text-2xl">{lines.etb}</p>
              ) : null}
              {lines.usd ? (
                <p className="mt-1 text-base font-semibold text-gold">{lines.usd}</p>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div>
        {hasPrice && sqmRaw ? (
          <DetailRow icon={IconTag} label={t("detailPricePerSqm")}>
            <div className="space-y-0.5">
              {sqm.etb ? <div>{sqm.etb}</div> : null}
              {sqm.usd ? <div className="text-sm font-medium text-muted">{sqm.usd}</div> : null}
            </div>
          </DetailRow>
        ) : null}

        {objectTypeLabel ? (
          <DetailRow icon={IconBuilding} label={t("detailObjectType")}>
            {objectTypeLabel}
          </DetailRow>
        ) : null}

        {property.property_status ? (
          <DetailRow icon={IconStatus} label={t("detailStatus")}>
            {property.property_status}
          </DetailRow>
        ) : null}

        {isAdmin ? (
          <DetailRow icon={IconTag} label={t("detailPriceGuidance")}>
            <HmloBadge score={property.hmlo_score} />
          </DetailRow>
        ) : null}
      </div>

      <div className="border-t border-line p-5">
        <Button
          variant="primary-gold"
          className="w-full bg-brand-deep hover:bg-brand-deep-hover"
          onClick={onContact}
        >
          {t("contactUs")}
          <IconArrowRight className="text-gold" size={18} />
        </Button>
      </div>
    </aside>
  );
}
