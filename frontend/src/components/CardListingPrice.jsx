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
  if (amount >= 1e8) return compact;
  if (full.length >= 10 && compact.length + 2 < full.length) return compact;
  if (full.length >= 12) return compact;
  return full;
}

function displayAmount(amount) {
  const full = formatFull(amount);
  if (!full) return null;
  return pickAmountText(amount, full);
}

function sizeClassForBar(etbText, usdText) {
  const len = 4 + (etbText?.length || 0) + (usdText ? usdText.length + 3 : 0);
  if (len <= 14) return "text-sm";
  if (len <= 18) return "text-xs";
  return "text-[11px]";
}

export function listingModeBadgeLabel(property, t) {
  return isRentalListing(property)
    ? t("searchRent").toUpperCase()
    : t("saleSuffix").toUpperCase();
}

export default function CardListingPrice({ property, onRequestLabel, t, variant = "bar" }) {
  if (!hasPlausiblePrice(property)) {
    if (variant === "bar") {
      return (
        <div className="bg-primary px-3 py-2.5 text-center text-sm font-medium text-white/90">
          {onRequestLabel}
        </div>
      );
    }
    return (
      <div className="rounded-lg bg-primary/5 px-3 py-1.5">
        <span className="text-sm font-medium text-muted">{onRequestLabel}</span>
      </div>
    );
  }

  const etb = property?.price_etb != null ? Number(property.price_etb) : Number(property?.price);
  const usd = property?.price_usd != null ? Number(property.price_usd) : null;
  const etbText = displayAmount(etb);
  const usdText = displayAmount(usd);
  const sizeClass = sizeClassForBar(etbText, usdText);

  if (variant === "bar") {
    return (
      <div
        className={cn(
          "bg-primary px-3 py-2.5 font-semibold tabular-nums text-white whitespace-nowrap overflow-hidden",
          sizeClass
        )}
      >
        {etbText ? (
          <>
            <span className="font-medium text-white/85">ETB </span>
            <span className="text-gold">{etbText}</span>
          </>
        ) : null}
        {usdText ? (
          <>
            {etbText ? <span className="mx-2 font-normal text-white/40">|</span> : null}
            <span>${usdText}</span>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-primary/5 px-3 py-1.5">
      {etbText ? (
        <div className="flex items-baseline gap-1 font-semibold text-primary">
          <span className="text-xs font-medium uppercase">ETB</span>
          <span>{etbText}</span>
        </div>
      ) : null}
      {usdText ? <div className="font-medium text-muted">${usdText}</div> : null}
    </div>
  );
}
