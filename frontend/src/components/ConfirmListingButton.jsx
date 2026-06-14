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
        <Button variant="secondary" onClick={() => setOpen(true)}>{t("confirmListingButton")}</Button>
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
