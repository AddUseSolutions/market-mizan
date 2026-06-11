import { hasPlausiblePrice, isRentalListing } from "../utils/pricing";

const INTEGER_FORMAT = { maximumFractionDigits: 0, minimumFractionDigits: 0 };

function formatLine(amount, prefix, symbol) {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const rounded = Math.round(amount).toLocaleString("en-US", INTEGER_FORMAT);
  return symbol ? `${symbol}${rounded}` : `${prefix} ${rounded}`;
}

function getPriceSizeClass(etb, usd) {
  const etbLine = formatLine(etb, "ETB", null) || "";
  const usdLine = formatLine(usd, "USD", "$") || "";
  const maxLen = Math.max(etbLine.length, usdLine.length);

  if (maxLen > 14) return "card-price-box--xs";
  if (maxLen > 11) return "card-price-box--sm";
  if (maxLen > 9) return "card-price-box--md";
  return "card-price-box--lg";
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
  const etbLine = formatLine(etb, "ETB", null);
  const usdLine = formatLine(usd, "USD", "$");
  const suffix = rental ? t("monthlyRentSuffix") : t("saleSuffix");
  const sizeClass = getPriceSizeClass(etb, usd);

  return (
    <div className={`card-price-box ${sizeClass}`}>
      {etbLine ? <div className="card-price-box-etb">{etbLine}</div> : null}
      {usdLine ? <div className="card-price-box-usd">{usdLine}</div> : null}
      <div className="card-price-box-suffix">{suffix}</div>
    </div>
  );
}
