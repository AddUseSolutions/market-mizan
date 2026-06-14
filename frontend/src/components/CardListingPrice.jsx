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

function lineLength(prefixChars, text) {
  return prefixChars + String(text || "").length;
}

function sizeClassForLineLength(len) {
  if (len <= 9) return "text-xl";
  if (len <= 11) return "text-lg";
  if (len <= 14) return "text-base";
  return "text-sm";
}

function buildLine(amount, prefixChars) {
  const full = formatFull(amount);
  if (!full) return null;
  const text = pickAmountText(amount, full);
  return { text, lineLen: lineLength(prefixChars, text) };
}

export default function CardListingPrice({ property, onRequestLabel, t }) {
  const rental = isRentalListing(property);

  if (!hasPlausiblePrice(property)) {
    return (
      <div className="inline-flex flex-col gap-1">
        <div className="rounded-lg bg-primary/5 px-3 py-1.5">
          <span className="text-sm font-medium text-muted">{onRequestLabel}</span>
        </div>
      </div>
    );
  }

  const etb = property?.price_etb != null ? Number(property.price_etb) : Number(property?.price);
  const usd = property?.price_usd != null ? Number(property.price_usd) : null;
  const etbLine = buildLine(etb, 4);
  const usdLine = buildLine(usd, 1);
  const maxLineLen = Math.max(etbLine?.lineLen || 0, usdLine?.lineLen || 0);
  const sizeClass = sizeClassForLineLength(maxLineLen);
  const suffix = rental ? t("monthlyRentSuffix") : t("saleSuffix");

  return (
    <div className="flex flex-col gap-1">
      <div className="rounded-lg bg-primary/5 px-3 py-1.5">
        {etbLine ? (
          <div className={cn("flex items-baseline gap-1 font-semibold text-primary", sizeClass)}>
            <span className="text-xs font-medium uppercase">ETB</span>
            <span>{etbLine.text}</span>
          </div>
        ) : null}
        {usdLine ? (
          <div className={cn("font-medium text-muted", sizeClass)}>${usdLine.text}</div>
        ) : null}
      </div>
      <span className="text-xs font-medium uppercase tracking-wide text-accent">{suffix}</span>
    </div>
  );
}
