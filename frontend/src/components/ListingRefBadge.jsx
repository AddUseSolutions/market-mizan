import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { getListingRef } from "../utils/listingRef";
import { cn } from "../utils/cn";

export default function ListingRefBadge({ property, copyable = false, className }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const ref = getListingRef(property);
  if (!ref) return null;

  const label = (
    <>
      <span className="font-normal text-muted">{t("listingReference")}</span>{" "}
      <span className="font-mono font-semibold tracking-wide text-brand-deep">{ref}</span>
    </>
  );

  if (!copyable) {
    return <span className={cn("inline-flex items-center gap-1 text-xs", className)}>{label}</span>;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ref is still visible */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={t("listingReferenceCopy")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm transition-colors hover:border-primary",
        className
      )}
    >
      {label}
      <span className="text-xs text-primary">{copied ? t("listingReferenceCopied") : "⧉"}</span>
    </button>
  );
}
