import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import CompareBoard from "../components/CompareBoard";
import { useCompare } from "../context/CompareContext";
import { useLanguage } from "../context/LanguageContext";
import { modesCompatible } from "../utils/compareProperty";
import { Container, Section, Eyebrow } from "../components/ui";

export default function ComparePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { items, clear, exitCompareMode, removeProperty } = useCompare();
  const [left, setLeft] = useState(null);
  const [right, setRight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const idA = params.get("a") || items[0]?.property_id;
  const idB = params.get("b") || items[1]?.property_id;

  useEffect(() => {
    if (!idA || !idB) {
      setLoading(false);
      setError("missing");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.get(`/properties/${encodeURIComponent(idA)}`),
      api.get(`/properties/${encodeURIComponent(idB)}`)
    ])
      .then(([ra, rb]) => {
        if (cancelled) return;
        setLeft(ra.data);
        setRight(rb.data);
      })
      .catch(() => {
        if (cancelled) return;
        setError("fetch");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idA, idB]);

  const modeWarning = left && right && !modesCompatible(left, right);

  if (!idA || !idB) {
    return (
      <Section>
        <Container className="py-16 text-center">
          <h1 className="text-2xl font-semibold text-brand-deep">{t("comparePageTitle")}</h1>
          <p className="mt-3 text-muted">{t("compareNeedTwo")}</p>
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
        <Container className="max-w-4xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Eyebrow>{t("comparePageEyebrow")}</Eyebrow>
              <h1 className="mt-1 text-xl font-semibold text-brand-deep sm:text-2xl">
                {t("comparePageTitle")} <span className="text-muted">(2)</span>
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

          {!loading && !error && left && right ? (
            <>
              <CompareBoard
                left={left}
                right={right}
                t={t}
                onRemoveLeft={() => {
                  removeProperty(left.property_id);
                  navigate(`/property/${right.property_id}`);
                }}
                onRemoveRight={() => {
                  removeProperty(right.property_id);
                  navigate(`/property/${left.property_id}`);
                }}
              />

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
                    exitCompareMode();
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
