import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LOGIN_INIT = { email: "", password: "" };
const REGISTER_INIT = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: ""
};

function GoogleButton({ onCredential }) {
  const hostRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (!clientId) return undefined;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google || !hostRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredential(response.credential)
      });
      window.google.accounts.id.renderButton(hostRef.current, {
        type: "standard",
        shape: "pill",
        size: "large",
        theme: "outline",
        text: "continue_with"
      });
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [clientId, onCredential]);

  if (!clientId) {
    return <p className="detail-subtitle">Google Login ist noch nicht konfiguriert.</p>;
  }

  return <div ref={hostRef} />;
}

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [loginData, setLoginData] = useState(LOGIN_INIT);
  const [registerData, setRegisterData] = useState(REGISTER_INIT);
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
      setError(err.response?.data?.message || "Login fehlgeschlagen.");
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
      setError(err.response?.data?.message || "Registrierung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleCredential(credential) {
    setError("");
    setLoading(true);
    try {
      await auth.loginWithGoogle(credential);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Google Login fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container section-space">
      <h1>Anmelden</h1>
      <p className="detail-subtitle">
        Mit E-Mail und Passwort registrieren oder direkt mit Google anmelden.
      </p>
      <div className="panel auth-panel">
        <div className="auth-switch">
          <button type="button" onClick={() => setMode("login")} className={mode === "login" ? "auth-tab active" : "auth-tab"}>
            Login
          </button>
          <button type="button" onClick={() => setMode("register")} className={mode === "register" ? "auth-tab active" : "auth-tab"}>
            Registrieren
          </button>
        </div>

        {mode === "login" ? (
          <form className="contact-form" onSubmit={submitLogin}>
            <label className="contact-field">
              <span>E-Mail</span>
              <input
                required
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))}
              />
            </label>
            <label className="contact-field">
              <span>Passwort</span>
              <input
                required
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))}
              />
            </label>
            {error ? <p className="contact-form-error">{error}</p> : null}
            <button type="submit" disabled={loading}>{loading ? "Bitte warten..." : "Einloggen"}</button>
          </form>
        ) : (
          <form className="contact-form" onSubmit={submitRegister}>
            <div className="contact-form-row">
              <label className="contact-field">
                <span>Vorname</span>
                <input
                  required
                  value={registerData.firstName}
                  onChange={(e) => setRegisterData((p) => ({ ...p, firstName: e.target.value }))}
                />
              </label>
              <label className="contact-field">
                <span>Nachname</span>
                <input
                  required
                  value={registerData.lastName}
                  onChange={(e) => setRegisterData((p) => ({ ...p, lastName: e.target.value }))}
                />
              </label>
            </div>
            <label className="contact-field">
              <span>E-Mail</span>
              <input
                required
                type="email"
                value={registerData.email}
                onChange={(e) => setRegisterData((p) => ({ ...p, email: e.target.value }))}
              />
            </label>
            <label className="contact-field">
              <span>Telefon (optional)</span>
              <input
                value={registerData.phone}
                onChange={(e) => setRegisterData((p) => ({ ...p, phone: e.target.value }))}
              />
            </label>
            <label className="contact-field">
              <span>Passwort</span>
              <input
                required
                minLength={6}
                type="password"
                value={registerData.password}
                onChange={(e) => setRegisterData((p) => ({ ...p, password: e.target.value }))}
              />
            </label>
            {error ? <p className="contact-form-error">{error}</p> : null}
            <button type="submit" disabled={loading}>{loading ? "Bitte warten..." : "Konto erstellen"}</button>
          </form>
        )}

        <div className="auth-divider">oder</div>
        <GoogleButton onCredential={handleGoogleCredential} />
      </div>
    </main>
  );
}
