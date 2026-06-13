import { hasPlausiblePrice, isRentalListing } from "../utils/pricing";

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

  // Keep small amounts readable; compact large values early to avoid clipping.
  if (amount >= 1e8) return compact;
  if (full.length >= 10 && compact.length + 2 < full.length) return compact;
  if (full.length >= 12) return compact;

  return full;
}

function lineLength(prefixChars, text) {
  return prefixChars + String(text || "").length;
}

function sizeClassForLineLength(len) {
  if (len <= 9) return "card-price-amount--lg";
  if (len <= 11) return "card-price-amount--md";
  if (len <= 14) return "card-price-amount--sm";
  return "card-price-amount--xs";
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
      <div className="card-price-stack">
        <div className="card-price-box">
          <span className="card-price-box-on-request">{onRequestLabel}</span>
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
  const suffixLong = suffix.length > 8;

  return (
    <div className="card-price-stack">
      <div className="card-price-box">
        {etbLine ? (
          <div className={`card-price-etb-line ${sizeClass}`}>
            <span className="card-price-etb-label">ETB</span>
            <span className="card-price-etb-value">{etbLine.text}</span>
          </div>
        ) : null}
        {usdLine ? (
          <div className={`card-price-usd-line ${sizeClass}`}>${usdLine.text}</div>
        ) : null}
      </div>
      <div className={`card-price-type-badge${suffixLong ? " card-price-type-badge--long" : ""}`}>{suffix}</div>
    </div>
  );
}
