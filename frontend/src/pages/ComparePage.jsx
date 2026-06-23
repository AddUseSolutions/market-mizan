import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import CardImageCarousel from "../components/CardImageCarousel";
import CompareImagePanel from "../components/CompareImagePanel";
import { useCompare } from "../context/CompareContext";
import { useLanguage } from "../context/LanguageContext";
import {
  buildCompareRows,
  displayCompareTitle,
  modesCompatible,
  pickBetterValue
} from "../utils/compareProperty";
import { Container, Section, Eyebrow } from "../components/ui";
import { cn } from "../utils/cn";
import { parsePropertyImages } from "../utils/propertyImages";

function CompareColumn({ property, label, rows, betterByRow, side, t }) {
  const images = parsePropertyImages(property);
  const title = displayCompareTitle(property);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
      <div className="border-b border-line bg-brand-muted/30 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{label}</p>
        <h2 className="mt-1 line-clamp-2 text-lg font-semibold text-brand-deep">{title}</h2>
        <Link
          to={`/property/${property.property_id}`}
          className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
        >
          {t("viewDetails")} →
        </Link>
      </div>

      <div className="relative aspect-[16/10] min-h-[180px] bg-line/30">
        <CardImageCarousel images={images} emptyLabel={t("noPhoto")} />
      </div>

      <dl className="divide-y divide-line">
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[minmax(0,38%)_1fr] sm:gap-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">{row.label}</dt>
            <dd
              className={cn(
                "text-sm font-semibold text-brand-deep",
                betterByRow[row.key] === side && "bg-primary/5 text-primary"
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CompareTable({ left, right, rowsLeft, rowsRight, betterByRow, t }) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface shadow-soft lg:block">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-brand-muted/40">
            <th className="w-[28%] px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted">
              {t("compareAttribute")}
            </th>
            <th className="w-[36%] px-4 py-3 text-sm font-semibold text-brand-deep">
              {displayCompareTitle(left)}
            </th>
            <th className="w-[36%] px-4 py-3 text-sm font-semibold text-brand-deep">
              {displayCompareTitle(right)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rowsLeft.map((row, idx) => {
            const rightRow = rowsRight[idx];
            const better = betterByRow[row.key];
            return (
              <tr key={row.key} className="border-b border-line last:border-0">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted">
                  {row.label}
                </th>
                <td
                  className={cn(
                    "px-4 py-3 font-semibold text-brand-deep",
                    better === "left" && "bg-primary/5 text-primary"
                  )}
                >
                  {row.value}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 font-semibold text-brand-deep",
                    better === "right" && "bg-primary/5 text-primary"
                  )}
                >
                  {rightRow?.value ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ComparePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { items, clear, exitCompareMode } = useCompare();
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

  const rowsLeft = left ? buildCompareRows(left, t) : [];
  const rowsRight = right ? buildCompareRows(right, t) : [];
  const betterByRow = {};
  if (left && right) {
    for (const row of rowsLeft) {
      betterByRow[row.key] = pickBetterValue(row.key, left, right);
    }
  }

  function handleBack() {
    navigate("/");
  }

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
      <Section className="pt-8 sm:pt-10">
        <Container>
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 text-sm font-medium text-primary hover:underline"
          >
            {t("backToListings")}
          </button>

          <Eyebrow>{t("comparePageEyebrow")}</Eyebrow>
          <h1 className="mt-1 text-2xl font-semibold text-brand-deep sm:text-3xl">{t("comparePageTitle")}</h1>
          <p className="mt-2 max-w-2xl text-muted">{t("comparePageLead")}</p>

          {modeWarning ? (
            <div
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              role="status"
            >
              {t("compareModeWarning")}
            </div>
          ) : null}

          {loading ? <p className="mt-8 text-muted">{t("loadingProperty")}</p> : null}

          {error && !loading ? (
            <p className="mt-8 text-muted">{t("compareLoadError")}</p>
          ) : null}

          {!loading && !error && left && right ? (
            <>
              <div className="mb-8 hidden gap-6 lg:grid lg:grid-cols-2">
                <CompareImagePanel property={left} label={t("compareColumnA")} t={t} />
                <CompareImagePanel property={right} label={t("compareColumnB")} t={t} />
              </div>

              <CompareTable
                left={left}
                right={right}
                rowsLeft={rowsLeft}
                rowsRight={rowsRight}
                betterByRow={betterByRow}
                t={t}
              />

              <div className="mt-6 grid gap-5 lg:hidden">
                <CompareColumn
                  property={left}
                  label={t("compareColumnA")}
                  rows={rowsLeft}
                  betterByRow={betterByRow}
                  side="left"
                  t={t}
                />
                <CompareColumn
                  property={right}
                  label={t("compareColumnB")}
                  rows={rowsRight}
                  betterByRow={betterByRow}
                  side="right"
                  t={t}
                />
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-brand-deep hover:bg-brand-muted"
                  onClick={() => {
                    clear();
                    exitCompareMode();
                    navigate("/");
                  }}
                >
                  {t("comparePickOthers")}
                </button>
              </div>
            </>
          ) : null}
        </Container>
      </Section>
    </main>
  );
}
