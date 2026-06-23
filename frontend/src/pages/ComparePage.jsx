import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import CompareBoard from "../components/CompareBoard";
import { useCompare } from "../context/CompareContext";
import { useLanguage } from "../context/LanguageContext";
import { allModesCompatible } from "../utils/compareProperty";
import { Container, Section, Eyebrow } from "../components/ui";

const MIN_COMPARE = 2;

function parseCompareIds(params, items) {
  const idsParam = params.get("ids");
  if (idsParam) {
    return [...new Set(idsParam.split(",").map((s) => s.trim()).filter(Boolean))];
  }

  const legacy = [params.get("a"), params.get("b")].filter(Boolean);
  if (legacy.length) return [...new Set(legacy)];

  return [...new Set(items.map((item) => item.property_id).filter(Boolean))];
}

function buildCompareUrl(ids) {
  return `/compare?ids=${ids.map((id) => encodeURIComponent(id)).join(",")}`;
}

export default function ComparePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { items, clear, removeProperty } = useCompare();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const ids = useMemo(() => parseCompareIds(params, items), [params, items]);

  useEffect(() => {
    if (ids.length < MIN_COMPARE) {
      setLoading(false);
      setError("missing");
      setProperties([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(ids.map((id) => api.get(`/properties/${encodeURIComponent(id)}`)))
      .then((responses) => {
        if (cancelled) return;
        setProperties(responses.map((response) => response.data));
      })
      .catch(() => {
        if (cancelled) return;
        setError("fetch");
        setProperties([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ids.join(",")]);

  const modeWarning = properties.length >= 2 && !allModesCompatible(properties);

  function handleRemove(propertyId) {
    removeProperty(propertyId);
    const remaining = properties.filter((property) => property.property_id !== propertyId);
    if (remaining.length < MIN_COMPARE) {
      navigate(remaining.length === 1 ? `/property/${remaining[0].property_id}` : "/");
      return;
    }
    navigate(buildCompareUrl(remaining.map((property) => property.property_id)));
  }

  if (ids.length < MIN_COMPARE) {
    return (
      <Section>
        <Container className="py-16 text-center">
          <h1 className="text-2xl font-semibold text-brand-deep">{t("comparePageTitle")}</h1>
          <p className="mt-3 text-muted">{t("compareNeedMin")}</p>
          <Link to="/" className="mt-6 inline-block font-semibold text-primary hover:underline">
            {t("backToListings")}
          </Link>
        </Container>
      </Section>
    );
  }

  return (
    <main className="pb-28">
      <Section className="pt-6 sm:pt-8">
        <Container className="max-w-6xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Eyebrow>{t("comparePageEyebrow")}</Eyebrow>
              <h1 className="mt-1 text-xl font-semibold text-brand-deep sm:text-2xl">
                {t("comparePageTitle")}{" "}
                <span className="text-muted">({properties.length || ids.length})</span>
              </h1>
            </div>
            <button
              type="button"
              className="rounded-full p-2 text-muted hover:bg-brand-muted hover:text-brand-deep"
              aria-label={t("compareExit")}
              onClick={() => navigate("/")}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {modeWarning ? (
            <div
              className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              role="status"
            >
              {t("compareModeWarning")}
            </div>
          ) : null}

          {loading ? <p className="text-muted">{t("loadingProperty")}</p> : null}
          {error && !loading ? <p className="text-muted">{t("compareLoadError")}</p> : null}

          {!loading && !error && properties.length >= MIN_COMPARE ? (
            <>
              <div className="-mx-4 sm:mx-0">
                <CompareBoard properties={properties} t={t} onRemove={handleRemove} />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/"
                  className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-brand-deep hover:bg-brand-muted"
                >
                  {t("comparePickOthers")}
                </Link>
                <button
                  type="button"
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted hover:text-brand-deep"
                  onClick={() => {
                    clear();
                    navigate("/");
                  }}
                >
                  {t("compareClear")}
                </button>
              </div>
            </>
          ) : null}
        </Container>
      </Section>
    </main>
  );
}
