import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { isAdminUser } from "../utils/roles";
import PropertyCard from "./PropertyCard";
import { Container, Section, SectionHeader } from "./ui";

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
    <Section className="py-8" aria-labelledby="reco-heading">
      <Container>
        <SectionHeader
          id="reco-heading"
          title={t("recommendations")}
          subtitle={t("recommendationsSub")}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.slice(0, 4).map((p) => (
            <PropertyCard key={p.property_id} property={p} variant="home" />
          ))}
        </div>
      </Container>
    </Section>
  );
}
