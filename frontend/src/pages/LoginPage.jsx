import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Container, Section, Select, Eyebrow } from "../components/ui";
import { IconArrowRight } from "../components/icons/HeroIcons";
import { cn } from "../utils/cn";

const LOGIN_INIT = { email: "", password: "" };
const REGISTER_INIT = { email: "", role: "STANDARD_USER", password: "" };

const BANNER_IMAGE = "/hero-home.jpg";

function IconUser({ className = "", size = 18 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconUserPlus({ className = "", size = 18 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 20c0-3.5 2.8-6 6.5-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconMail({ className = "", size = 18 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16v12H4V6zm0 0 8 6 8-6" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

function IconLock({ className = "", size = 18 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconEye({ className = "", size = 18 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconEyeOff({ className = "", size = 18 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M10.6 10.6a2.5 2.5 0 0 0 3.5 3.5M6.7 6.7C4.5 8.2 3 10.5 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.2M9.9 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-2.1 3.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function LoginBannerCurve() {
  return (
    <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-[55%] overflow-hidden" aria-hidden>
      <svg className="h-full w-full" viewBox="0 0 240 180" preserveAspectRatio="none" fill="none">
        <path
          d="M240 0 L240 180 Q120 140 80 90 T40 0 Z"
          fill="rgba(37,47,85,0.92)"
          stroke="#f0b429"
          strokeWidth="1.5"
        />
        <path d="M200 40 C160 80 120 100 60 120" stroke="#f0b429" strokeWidth="1" opacity="0.35" />
        <path d="M220 70 C175 95 130 110 80 130" stroke="#f0b429" strokeWidth="1" opacity="0.25" />
      </svg>
    </div>
  );
}

function AuthTab({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "bg-primary text-white shadow-sm"
          : "border border-line bg-surface text-primary hover:bg-brand-muted/50"
      )}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

function IconField({ label, icon: Icon, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-primary">{label}</span>
      <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <Icon className="shrink-0 text-gold" size={18} />
        {children}
      </div>
    </label>
  );
}

const fieldInputClass =
  "min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted/60";

function SubmitButton({ children, loading, waitLabel, ...props }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-between rounded-2xl bg-brand-deep px-5 py-3 text-sm font-semibold text-gold shadow-soft transition-colors hover:bg-brand-deep-hover disabled:pointer-events-none disabled:opacity-50"
      {...props}
    >
      <span>{loading ? waitLabel : children}</span>
      {!loading ? <IconArrowRight className="text-gold" size={18} /> : null}
    </button>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();
  const [mode, setMode] = useState("login");
  const [loginData, setLoginData] = useState(LOGIN_INIT);
  const [registerData, setRegisterData] = useState(REGISTER_INIT);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const nextPath = location.state?.from?.pathname || "/";

  async function submitLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.loginWithPassword(loginData);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || t("loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.register(registerData);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || t("registerFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section className="bg-brand-muted/40 py-10 sm:py-14">
      <Container className="max-w-md">
        <Eyebrow>{t("loginAccount")}</Eyebrow>
        <h1 className="relative mt-2 text-3xl font-bold text-brand-deep sm:text-4xl">
          {t("loginTitle")}
          <span className="absolute -bottom-3 left-0 h-1 w-12 rounded-full bg-gold" aria-hidden />
        </h1>
        <p className="mt-8 text-muted">{t("loginLead")}</p>

        <div className="relative mt-8">
          <div className="relative h-40 overflow-hidden rounded-t-2xl sm:h-44">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${BANNER_IMAGE})` }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-deep/80 via-brand-deep/40 to-transparent" aria-hidden />
            <div className="relative z-10 flex h-full items-end p-5">
              <img
                src="/logo-market-mizan-header.png"
                alt="Market Mizan"
                className="h-9 w-auto brightness-0 invert"
              />
            </div>
            <LoginBannerCurve />
          </div>

          <div className="relative -mt-5 rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7">
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-line p-1" role="tablist" aria-label={t("loginAccountMode")}>
              <AuthTab active={mode === "login"} onClick={() => { setMode("login"); setError(""); }} icon={IconUser}>
                {t("loginTitle")}
              </AuthTab>
              <AuthTab active={mode === "register"} onClick={() => { setMode("register"); setError(""); }} icon={IconUserPlus}>
                {t("loginCreateAccount")}
              </AuthTab>
            </div>

            {mode === "login" ? (
              <form className="flex flex-col gap-5" onSubmit={submitLogin}>
                <IconField label={t("loginEmail")} icon={IconMail}>
                  <input
                    required
                    type="email"
                    className={fieldInputClass}
                    placeholder={t("emailPlaceholder")}
                    value={loginData.email}
                    onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))}
                    autoComplete="email"
                  />
                </IconField>

                <IconField label={t("loginPassword")} icon={IconLock}>
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    className={fieldInputClass}
                    placeholder={t("loginEnterPassword")}
                    value={loginData.password}
                    onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="shrink-0 text-primary transition-colors hover:text-primary-dark"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t("loginHidePassword") : t("loginShowPassword")}
                  >
                    {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </IconField>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-primary">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-line text-primary focus:ring-primary/30"
                    />
                    {t("loginRememberMe")}
                  </label>
                  <Link to="/contact" className="font-medium text-primary hover:underline">
                    {t("loginForgotPassword")}
                  </Link>
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <SubmitButton loading={loading} waitLabel={t("loginPleaseWait")}>{t("loginTitle")}</SubmitButton>
              </form>
            ) : (
              <form className="flex flex-col gap-5" onSubmit={submitRegister}>
                <IconField label={t("loginEmail")} icon={IconMail}>
                  <input
                    required
                    type="email"
                    className={fieldInputClass}
                    placeholder={t("emailPlaceholder")}
                    value={registerData.email}
                    onChange={(e) => setRegisterData((p) => ({ ...p, email: e.target.value }))}
                    autoComplete="email"
                  />
                </IconField>

                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-semibold text-primary">{t("loginRegisterRole")}</span>
                  <Select
                    className="w-full"
                    value={registerData.role}
                    onChange={(e) => setRegisterData((p) => ({ ...p, role: e.target.value }))}
                  >
                    <option value="STANDARD_USER">{t("loginRegisterRoleStandard")}</option>
                    <option value="PRIVATE_LANDLORD">{t("loginRegisterRoleLandlord")}</option>
                    <option value="AGENCY_BROKER">{t("loginRegisterRoleAgency")}</option>
                  </Select>
                </label>

                <IconField label={t("loginPassword")} icon={IconLock}>
                  <input
                    required
                    minLength={6}
                    type={showRegisterPassword ? "text" : "password"}
                    className={fieldInputClass}
                    placeholder={t("loginCreatePassword")}
                    value={registerData.password}
                    onChange={(e) => setRegisterData((p) => ({ ...p, password: e.target.value }))}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="shrink-0 text-primary transition-colors hover:text-primary-dark"
                    onClick={() => setShowRegisterPassword((v) => !v)}
                    aria-label={showRegisterPassword ? t("loginHidePassword") : t("loginShowPassword")}
                  >
                    {showRegisterPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </IconField>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <SubmitButton loading={loading} waitLabel={t("loginPleaseWait")}>{t("loginCreateAccount")}</SubmitButton>
              </form>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
