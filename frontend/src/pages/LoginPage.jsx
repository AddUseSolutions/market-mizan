import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LOGIN_INIT = { email: "", password: "" };
const REGISTER_INIT = {
  email: "",
  role: "STANDARD_USER",
  password: ""
};

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

  return (
    <main className="container section-space">
      <h1>Sign in</h1>
      <p className="detail-subtitle">
        Use your email and password to access your Market Mizan account.
      </p>
      <div className="panel auth-panel">
        <div className="auth-switch">
          <button type="button" onClick={() => setMode("login")} className={mode === "login" ? "auth-tab active" : "auth-tab"}>
            Sign in
          </button>
          <button type="button" onClick={() => setMode("register")} className={mode === "register" ? "auth-tab active" : "auth-tab"}>
            Create account
          </button>
        </div>

        {mode === "login" ? (
          <form className="contact-form" onSubmit={submitLogin}>
            <label className="contact-field">
              <span>Email</span>
              <input
                required
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))}
              />
            </label>
            <label className="contact-field">
              <span>Password</span>
              <input
                required
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))}
              />
            </label>
            {error ? <p className="contact-form-error">{error}</p> : null}
            <button type="submit" disabled={loading}>{loading ? "Please wait..." : "Sign in"}</button>
          </form>
        ) : (
          <form className="contact-form" onSubmit={submitRegister}>
            <label className="contact-field">
              <span>Email</span>
              <input
                required
                type="email"
                value={registerData.email}
                onChange={(e) => setRegisterData((p) => ({ ...p, email: e.target.value }))}
              />
            </label>
            <label className="contact-field">
              <span>Account type</span>
              <select
                value={registerData.role}
                onChange={(e) => setRegisterData((p) => ({ ...p, role: e.target.value }))}
              >
                <option value="STANDARD_USER">Buyer / tenant (standard)</option>
                <option value="PRIVATE_LANDLORD">Private landlord</option>
                <option value="AGENCY_BROKER">Agency / broker</option>
              </select>
            </label>
            <label className="contact-field">
              <span>Password</span>
              <input
                required
                minLength={6}
                type="password"
                value={registerData.password}
                onChange={(e) => setRegisterData((p) => ({ ...p, password: e.target.value }))}
              />
            </label>
            {error ? <p className="contact-form-error">{error}</p> : null}
            <button type="submit" disabled={loading}>{loading ? "Please wait..." : "Create account"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
