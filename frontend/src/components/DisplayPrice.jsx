import { getPriceLines } from "../utils/pricing";
import { cn } from "../utils/cn";

export default function DisplayPrice({ property, onRequestLabel = "Price on request", className = "" }) {
  const lines = getPriceLines(property, { onRequestLabel });

  if (lines.onRequest) {
    return <span className={cn("text-muted", className)}>{onRequestLabel}</span>;
  }

  return (
    <span className={cn("inline-flex flex-col", className)}>
      {lines.etb ? <span className="font-semibold text-primary">{lines.etb}</span> : null}
      {lines.usd ? <span className="text-sm text-muted">{lines.usd}</span> : null}
    </span>
  );
}
