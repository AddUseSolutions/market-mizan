import { hasPlausiblePrice, isRentalListing } from "../utils/pricing";
import CardPriceFitLine from "./CardPriceFitLine";

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

function compactFallback(amount, symbol = "") {
  const full = formatFull(amount);
  if (!full) return null;
  if (full.length < 14) return null;
  const compact = formatCompact(amount);
  return symbol ? `${symbol}${compact}` : compact;
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
  const etbFull = formatFull(etb);
  const usdFull = formatFull(usd);
  const suffix = rental ? t("monthlyRentSuffix") : t("saleSuffix");

  return (
    <div className="card-price-box">
      <div className="card-price-etb-stack">
        <span className="card-price-currency-label">ETB</span>
        {etbFull ? (
          <CardPriceFitLine
            text={etbFull}
            compactText={compactFallback(etb)}
            className="card-price-box-etb"
            minPx={10}
            maxPx={22}
            bold
          />
        ) : null}
      </div>
      {usdFull ? (
        <CardPriceFitLine
          text={`$${usdFull}`}
          compactText={compactFallback(usd, "$")}
          className="card-price-box-usd"
          minPx={9}
          maxPx={18}
          bold={false}
        />
      ) : null}
      <div className="card-price-box-suffix">{suffix}</div>
    </div>
  );
}
