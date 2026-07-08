import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { Container, Section } from "../components/ui";
import { IconArrowRight } from "../components/icons/HeroIcons";
import { cn } from "../utils/cn";

const BANNER_IMAGE = "/hero-home.jpg";

function IconLock({ className = "", size = 18 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function SubmitButton({ children, loading }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-dark disabled:pointer-events-none disabled:opacity-50"
    >
      <span>{loading ? "Activating account…" : children}</span>
      {!loading ? <IconArrowRight className="text-white" size={18} /> : null}
    </button>
  );
}

export default function SetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const auth = useAuth();
  const [invite, setInvite] = useState(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("This invite link is invalid.");
      setLoading(false);
      return;
    }
    api
      .get("/auth/invite/validate", { params: { token } })
      .then((r) => setInvite(r.data))
      .catch(() => setError("This invite link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.post("/auth/set-password", { token, password });
      localStorage.setItem("mmizan_auth_token", r.data.token);
      localStorage.setItem("mmizan_auth_user", JSON.stringify(r.data.user));
      auth?.loginWithToken?.(r.data.token, r.data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Could not set password.");
    } finally {
      setSubmitting(false);
    }
  }

  const isBroker = invite?.role === "AGENCY_BROKER";

  return (
    <Section className="bg-brand-muted/40 py-10 sm:py-14">
      <Container className="max-w-4xl">
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
          <div className="grid md:grid-cols-2">
            <div
              className="relative hidden min-h-[420px] bg-brand-deep md:block"
              style={{
                backgroundImage: `linear-gradient(to top, rgba(15,23,42,0.97) 0%, rgba(15,23,42,0.78) 45%, rgba(15,23,42,0.35) 100%), url(${BANNER_IMAGE})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              }}
            >
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Market Mizan</p>
                <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.45)]">
                  {isBroker ? "Trusted broker access" : "Activate your account"}
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/90">
                  {isBroker
                    ? "Publish verified listings instantly and manage your portfolio from a professional investor-grade dashboard."
                    : "Set a secure password to access your Market Mizan dashboard."}
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Secure invite</p>
                <h1 className="mt-2 font-heading text-2xl font-bold text-brand-deep">Set your password</h1>
              </div>

              {loading ? <p className="text-muted">Validating your invite…</p> : null}

              {!loading && invite?.valid ? (
                <>
                  <div className="mb-6 rounded-2xl border border-line bg-brand-muted/20 px-4 py-3 text-sm">
                    <p className="font-medium text-brand-deep">
                      Welcome{invite.firstName ? `, ${invite.firstName}` : ""}
                    </p>
                    <p className="mt-1 text-muted">
                      Account: <strong className="text-brand-deep">{invite.email}</strong>
                    </p>
                    {isBroker ? (
                      <p className="mt-2 text-xs text-primary">
                        Trusted broker — your listings publish as verified immediately.
                      </p>
                    ) : null}
                  </div>

                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-semibold text-brand-deep">New password</span>
                      <div className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                        <IconLock className="shrink-0 text-muted" size={18} />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                          autoComplete="new-password"
                          placeholder="At least 8 characters"
                          required
                        />
                      </div>
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-semibold text-brand-deep">Confirm password</span>
                      <div className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                        <IconLock className="shrink-0 text-muted" size={18} />
                        <input
                          type="password"
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                          autoComplete="new-password"
                          placeholder="Repeat password"
                          required
                        />
                      </div>
                    </label>

                    {error ? (
                      <p className={cn("rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive")}>
                        {error}
                      </p>
                    ) : null}

                    <SubmitButton loading={submitting}>Activate account</SubmitButton>
                  </form>

                  <p className="mt-5 text-xs leading-relaxed text-muted">
                    Link valid for 72 hours. By continuing you agree to use Market Mizan for professional property listings.
                  </p>
                </>
              ) : null}

              {!loading && !invite?.valid ? (
                <div className="space-y-4">
                  <p className="text-sm text-destructive">{error || "Invite invalid."}</p>
                  <Link to="/login" className="text-sm font-semibold text-primary hover:underline">
                    Go to login
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
