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

function displayAmount(amount, { symbol = "" } = {}) {
  const full = formatFull(amount);
  if (!full) return { text: null, sizeClass: "card-price-amount--md" };

  const fullText = symbol ? `${symbol}${full}` : full;
  const compact = formatCompact(amount);
  const compactText = symbol ? `${symbol}${compact}` : compact;

  if (fullText.length >= 13 && compactText && compactText.length < fullText.length) {
    return { text: compactText, sizeClass: sizeClassForLength(compactText.length) };
  }

  return { text: fullText, sizeClass: sizeClassForLength(fullText.length) };
}

function sizeClassForLength(len) {
  if (len <= 9) return "card-price-amount--lg";
  if (len <= 11) return "card-price-amount--md";
  if (len <= 14) return "card-price-amount--sm";
  return "card-price-amount--xs";
}

export default function CardListingPrice({ property, onRequestLabel, t }) {
  const rental = isRentalListing(property);

  if (!hasPlausiblePrice(property)) {
    return (
      <div className="card-price-box">
        <span className="card-price-box-on-request">{onRequestLabel}</span>
      </div>
    );
  }

  const etb = property?.price_etb != null ? Number(property.price_etb) : Number(property?.price);
  const usd = property?.price_usd != null ? Number(property.price_usd) : null;
  const etbDisplay = displayAmount(etb);
  const usdDisplay = displayAmount(usd, { symbol: "$" });
  const suffix = rental ? t("monthlyRentSuffix") : t("saleSuffix");

  return (
    <div className="card-price-box">
      <div className="card-price-etb-stack">
        <span className="card-price-currency-label">ETB</span>
        {etbDisplay.text ? (
          <div className={`card-price-amount card-price-box-etb ${etbDisplay.sizeClass}`}>{etbDisplay.text}</div>
        ) : null}
      </div>
      {usdDisplay.text ? (
        <div className={`card-price-amount card-price-box-usd ${usdDisplay.sizeClass}`}>{usdDisplay.text}</div>
      ) : null}
      <div className="card-price-box-suffix">{suffix}</div>
    </div>
  );
}
