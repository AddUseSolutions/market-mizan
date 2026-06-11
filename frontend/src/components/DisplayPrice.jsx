import { getPriceLines } from "../utils/pricing";

export default function DisplayPrice({ property, onRequestLabel = "Price on request", className = "" }) {
  const lines = getPriceLines(property, { onRequestLabel });

  if (lines.onRequest) {
    return <span className={`display-price display-price--on-request ${className}`.trim()}>{onRequestLabel}</span>;
  }

  return (
    <span className={`display-price ${className}`.trim()}>
      {lines.etb ? <span className="display-price-etb">{lines.etb}</span> : null}
      {lines.usd ? <span className="display-price-usd">{lines.usd}</span> : null}
    </span>
  );
}
