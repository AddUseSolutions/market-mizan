import { useEffect, useState } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";

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
    <section className="reviews-section" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="detail-section-title">{t("reviewsTitle")}</h2>
      <p className="reviews-section-lead">{t("reviewsLead")}</p>

      {data.summary?.count > 0 ? (
        <p className="reviews-summary">
          ★ {data.summary.avg_rating} · {data.summary.count} {t("reviewsCount")}
        </p>
      ) : (
        <p className="reviews-empty">{t("reviewsEmpty")}</p>
      )}

      {data.reviews.length > 0 ? (
        <ul className="reviews-list">
          {data.reviews.map((r, i) => (
            <li key={i} className="reviews-list-item">
              <div className="reviews-list-stars" aria-label={`${r.rating} stars`}>
                {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
              </div>
              {r.comment ? <p className="reviews-list-comment">{r.comment}</p> : null}
              <span className="reviews-list-author">{r.reviewer}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <form className="reviews-form" onSubmit={submit}>
        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="hp-field"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
        />
        <label className="contact-field">
          <span>{t("reviewEmail")}</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="contact-field">
          <span>{t("reviewRating")}</span>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{t("reviewStars", { n })}</option>
            ))}
          </select>
        </label>
        <label className="contact-field">
          <span>{t("reviewComment")}</span>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} maxLength={2000} />
        </label>
        {msg ? <p className={`reviews-msg reviews-msg--${msgType}`}>{msg}</p> : null}
        <button type="submit">{t("reviewSubmit")}</button>
      </form>
    </section>
  );
}
