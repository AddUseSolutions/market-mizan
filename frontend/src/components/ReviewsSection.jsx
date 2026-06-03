import { useEffect, useState } from "react";
import api from "../api";

export default function ReviewsSection({ propertyId }) {
  const [data, setData] = useState({ reviews: [], summary: {} });
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    api.get(`/community/reviews/${propertyId}`).then((r) => setData(r.data)).catch(() => {});
  }, [propertyId]);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    try {
      await api.post("/community/reviews", { propertyId, email, rating, comment, website });
      setMsg("Thank you for your review.");
      setComment("");
      const r = await api.get(`/community/reviews/${propertyId}`);
      setData(r.data);
    } catch (err) {
      setMsg(err.response?.data?.message || "Could not submit review.");
    }
  }

  return (
    <section className="reviews-section">
      <h2 className="detail-section-title">Reviews</h2>
      {data.summary?.count > 0 ? (
        <p className="reviews-summary">★ {data.summary.avg_rating} · {data.summary.count} review(s)</p>
      ) : (
        <p className="muted-inline">No reviews yet.</p>
      )}
      <ul className="reviews-list">
        {data.reviews.map((r, i) => (
          <li key={i}>
            <strong>{"★".repeat(r.rating)}</strong> {r.comment || ""}
            <span className="muted-inline"> — {r.reviewer}</span>
          </li>
        ))}
      </ul>
      <form className="reviews-form" onSubmit={submit}>
        <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden />
        <label className="contact-field">
          <span>Your email *</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="contact-field">
          <span>Rating</span>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} stars</option>
            ))}
          </select>
        </label>
        <label className="contact-field">
          <span>Comment</span>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={2000} />
        </label>
        {msg ? <p className="upload-success">{msg}</p> : null}
        <button type="submit">Submit review</button>
      </form>
    </section>
  );
}
