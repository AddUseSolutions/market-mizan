import { hasPlausiblePrice, isRentalListing } from "../utils/pricing";
import { cn } from "../utils/cn";

const INTEGER_FORMAT = { maximumFractionDigits: 0, minimumFractionDigits: 0 };

function formatFull(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount).toLocaleString("en-US", INTEGER_FORMAT);
}

function formatCompact(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const n = Math.abs(amount);
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return formatFull(amount);
}

function pickAmountText(amount, full) {
  const compact = formatCompact(amount);
  if (!compact || compact === full) return full;
  if (amount >= 1e6) return compact;
  if (full.length >= 10 && compact.length + 2 < full.length) return compact;
  if (full.length >= 12) return compact;
  return full;
}

function displayAmount(amount) {
  const full = formatFull(amount);
  if (!full) return null;
  return pickAmountText(amount, full);
}

export function listingModeBadgeLabel(property, t) {
  return isRentalListing(property)
    ? t("forRent").toUpperCase()
    : t("forSale").toUpperCase();
}

export default function CardListingPrice({ property, onRequestLabel, t, variant = "bar" }) {
  if (!hasPlausiblePrice(property)) {
    if (variant === "bar") {
      return (
        <div className="bg-primary px-3 py-3 text-center text-sm font-medium text-white/90 sm:py-2.5">
          {onRequestLabel}
        </div>
      );
    }
    return (
      <div className="rounded-2xl bg-brand-muted px-3 py-1.5">
        <span className="text-sm font-medium text-muted">{onRequestLabel}</span>
      </div>
    );
  }

  const etb = property?.price_etb != null ? Number(property.price_etb) : Number(property?.price);
  const usd = property?.price_usd != null ? Number(property.price_usd) : null;
  const etbText = displayAmount(etb);
  const usdText = displayAmount(usd);

  if (variant === "bar") {
    return (
      <div
        className={cn(
          "bg-primary px-3 py-3 font-semibold tabular-nums text-white sm:py-2.5",
          "text-base leading-tight sm:text-sm"
        )}
      >
        <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5">
          {etbText ? (
            <span>
              <span className="font-medium text-white/85">ETB </span>
              <span className="text-white">{etbText}</span>
            </span>
          ) : null}
          {usdText ? (
            <>
              {etbText ? <span className="font-normal text-white/40">|</span> : null}
              <span className="text-sm text-white/90 sm:text-inherit">${usdText}</span>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-brand-muted px-3 py-1.5">
      {etbText ? (
        <div className="flex items-baseline gap-1 font-semibold text-brand-deep">
          <span className="text-xs font-medium uppercase">ETB</span>
          <span>{etbText}</span>
        </div>
      ) : null}
      {usdText ? <div className="font-medium text-muted">${usdText}</div> : null}
    </div>
  );
}
