import { useState } from "react";
import api from "../api";

export default function ConfirmListingButton({ propertyId }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [website, setWebsite] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    try {
      const r = await api.post("/community/confirm-listing", { propertyId, email, website });
      setMsg(`Thank you! ${r.data.confirmations} confirmation(s) recorded.`);
    } catch (err) {
      setMsg(err.response?.data?.message || "Could not confirm.");
    }
  }

  return (
    <div className="confirm-listing-wrap">
      {!open ? (
        <button type="button" className="button upload-secondary" onClick={() => setOpen(true)}>
          ✔ Confirm this listing is still active
        </button>
      ) : (
        <form onSubmit={submit} className="confirm-listing-form">
          <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden />
          <label className="contact-field">
            <span>Your email *</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {msg ? <p className="upload-success">{msg}</p> : null}
          <div className="upload-actions">
            <button type="button" className="button upload-secondary" onClick={() => setOpen(false)}>Close</button>
            <button type="submit">Confirm</button>
          </div>
        </form>
      )}
    </div>
  );
}
