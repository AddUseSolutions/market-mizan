import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { isAdminUser } from "../utils/roles";
import PropertyCard from "./PropertyCard";

export default function RecommendationsSection() {
  const [params] = useSearchParams();
  const [items, setItems] = useState([]);
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = isAdminUser(user);

  useEffect(() => {
    if (!isAdmin) {
      setItems([]);
      return;
    }
    const q = {
      bedrooms: params.get("bedrooms") || undefined,
      area: params.get("area") || params.get("district") || undefined,
      listing_mode: params.get("listing_mode") || undefined
    };
    api.get("/community/recommendations", { params: q }).then((r) => setItems(r.data.recommendations || [])).catch(() => {});
  }, [params, isAdmin]);

  if (!isAdmin || !items.length) return null;

  return (
    <section className="recommendations-section" aria-labelledby="reco-heading">
      <div className="container container--listings section-space">
        <header className="section-header">
          <h2 id="reco-heading" className="home-listings-title">{t("recommendations")}</h2>
          <p className="section-subtitle muted-inline">{t("recommendationsSub")}</p>
        </header>
        <div className="home-listing-grid home-listing-grid--reco">
          {items.slice(0, 4).map((p) => (
            <PropertyCard key={p.property_id} property={p} variant="home" />
          ))}
        </div>
      </div>
    </section>
  );
}
