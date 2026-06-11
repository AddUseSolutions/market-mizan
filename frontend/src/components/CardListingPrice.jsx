import { getPriceLines, hasPlausiblePrice, isRentalListing } from "../utils/pricing";

const INTEGER_FORMAT = { maximumFractionDigits: 0, minimumFractionDigits: 0 };

function formatLine(amount, prefix, symbol) {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const rounded = Math.round(amount).toLocaleString("en-US", INTEGER_FORMAT);
  return symbol ? `${symbol}${rounded}` : `${prefix} ${rounded}`;
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

  return (
    <div className="card-price-box">
      {etbLine ? <div className="card-price-box-etb">{etbLine}</div> : null}
      {usdLine ? <div className="card-price-box-usd">{usdLine}</div> : null}
      <div className="card-price-box-suffix">{suffix}</div>
    </div>
  );
}
