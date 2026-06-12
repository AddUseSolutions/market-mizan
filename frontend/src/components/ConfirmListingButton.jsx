import { useState } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";

export default function ConfirmListingButton({ propertyId }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [website, setWebsite] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    try {
      const r = await api.post("/community/confirm-listing", { propertyId, email, website });
      setMsg(t("confirmListingThanks", { count: r.data.confirmations }));
    } catch (err) {
      setMsg(err.response?.data?.message || t("confirmListingError"));
    }
  }

  return (
    <div className="confirm-listing-wrap">
      {!open ? (
        <button type="button" className="button upload-secondary" onClick={() => setOpen(true)}>
          {t("confirmListingButton")}
        </button>
      ) : (
        <form onSubmit={submit} className="confirm-listing-form">
          <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden />
          <label className="contact-field">
            <span>{t("confirmListingEmail")}</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {msg ? <p className="upload-success">{msg}</p> : null}
          <div className="upload-actions">
            <button type="button" className="button upload-secondary" onClick={() => setOpen(false)}>{t("confirmListingClose")}</button>
            <button type="submit">{t("confirmListingSubmit")}</button>
          </div>
        </form>
      )}
    </div>
  );
}
