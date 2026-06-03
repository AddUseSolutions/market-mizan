import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import PropertyCard from "./PropertyCard";

export default function RecommendationsSection() {
  const [params] = useSearchParams();
  const [items, setItems] = useState([]);
  const { t } = useLanguage();

  useEffect(() => {
    const q = {
      bedrooms: params.get("bedrooms") || undefined,
      area: params.get("area") || params.get("district") || undefined,
      listing_mode: params.get("listing_mode") || undefined
    };
    api.get("/community/recommendations", { params: q }).then((r) => setItems(r.data.recommendations || [])).catch(() => {});
  }, [params]);

  if (!items.length) return null;

  return (
    <section className="recommendations-section container section-space">
      <h2 className="home-listings-title">{t("recommendations")}</h2>
      <p className="muted-inline">{t("recommendationsSub")}</p>
      <div className="home-listing-grid">
        {items.slice(0, 3).map((p) => (
          <PropertyCard key={p.property_id} property={p} variant="home" />
        ))}
      </div>
    </section>
  );
}
