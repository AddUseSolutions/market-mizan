import { useEffect, useState } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { Input, Select, Textarea, Button } from "./ui";

const fieldLabel = "flex flex-col gap-1.5 text-sm";

export default function ReviewsSection({ propertyId }) {
  const { t } = useLanguage();
  const [data, setData] = useState({ reviews: [], summary: {} });
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    api.get(`/community/reviews/${propertyId}`).then((r) => setData(r.data)).catch(() => {});
  }, [propertyId]);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    setMsgType("");
    try {
      await api.post("/community/reviews", { propertyId, email, rating, comment, website });
      setMsg(t("reviewThanks"));
      setMsgType("ok");
      setComment("");
      const r = await api.get(`/community/reviews/${propertyId}`);
      setData(r.data);
    } catch (err) {
      setMsg(err.response?.data?.message || t("reviewError"));
      setMsgType("err");
    }
  }

  return (
    <section className="mt-10" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-xl font-semibold text-heading">{t("reviewsTitle")}</h2>
      <p className="mt-2 text-sm text-muted">{t("reviewsLead")}</p>

      {data.summary?.count > 0 ? (
        <p className="mt-3 font-medium text-warning">★ {data.summary.avg_rating} · {data.summary.count} {t("reviewsCount")}</p>
      ) : (
        <p className="mt-3 text-sm text-muted">{t("reviewsEmpty")}</p>
      )}

      {data.reviews.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {data.reviews.map((r, i) => (
            <li key={i} className="rounded-lg border border-line bg-surface p-4">
              <div className="text-warning" aria-label={`${r.rating} stars`}>
                {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
              </div>
              {r.comment ? <p className="mt-2 text-sm text-text">{r.comment}</p> : null}
              <span className="mt-1 block text-xs text-muted">{r.reviewer}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <form className="mt-6 flex max-w-md flex-col gap-4" onSubmit={submit}>
        <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="absolute -left-[9999px]" tabIndex={-1} autoComplete="off" aria-hidden />
        <label className={fieldLabel}>
          <span className="font-medium">{t("reviewEmail")}</span>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className={fieldLabel}>
          <span className="font-medium">{t("reviewRating")}</span>
          <Select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{t("reviewStars", { n })}</option>
            ))}
          </Select>
        </label>
        <label className={fieldLabel}>
          <span className="font-medium">{t("reviewComment")}</span>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} maxLength={2000} />
        </label>
        {msg ? <p className={`text-sm ${msgType === "ok" ? "text-success" : "text-destructive"}`}>{msg}</p> : null}
        <Button type="submit">{t("reviewSubmit")}</Button>
      </form>
    </section>
  );
}
