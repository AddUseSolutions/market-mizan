import { useState } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { Input, Button } from "./ui";

const fieldLabel = "flex flex-col gap-1.5 text-sm";

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
    <div className="mt-6">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-brand-deep bg-surface px-4 py-2.5 text-sm font-semibold text-brand-deep transition-colors hover:bg-brand-deep/5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
            <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("confirmListingButton")}
        </button>
      ) : (
        <form onSubmit={submit} className="max-w-md space-y-4 rounded-lg border border-line bg-surface p-4">
          <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="absolute -left-[9999px]" tabIndex={-1} autoComplete="off" aria-hidden />
          <label className={fieldLabel}>
            <span className="font-medium">{t("confirmListingEmail")}</span>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {msg ? <p className="text-sm text-success">{msg}</p> : null}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>{t("confirmListingClose")}</Button>
            <Button type="submit">{t("confirmListingSubmit")}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
