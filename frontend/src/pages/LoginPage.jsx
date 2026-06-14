import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Container, Section, Card, CardContent, Input, Select, Button } from "../components/ui";
import { cn } from "../utils/cn";

const LOGIN_INIT = { email: "", password: "" };
const REGISTER_INIT = { email: "", role: "STANDARD_USER", password: "" };
const fieldLabel = "flex flex-col gap-1.5 text-sm";

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
      setError(err.response?.data?.message || "Login failed.");
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
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  const tabClass = (active) =>
    cn(
      "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
      active ? "bg-primary text-white" : "text-muted hover:text-primary"
    );

  return (
    <Section>
      <Container className="max-w-lg">
        <h1 className="text-3xl font-bold text-heading">Sign in</h1>
        <p className="mt-2 text-muted">Use your email and password to access your Market Mizan account.</p>
        <Card className="mt-8">
          <CardContent>
            <div className="mb-6 flex rounded-lg border border-line p-1">
              <button type="button" onClick={() => setMode("login")} className={tabClass(mode === "login")}>Sign in</button>
              <button type="button" onClick={() => setMode("register")} className={tabClass(mode === "register")}>Create account</button>
            </div>

            {mode === "login" ? (
              <form className="flex flex-col gap-4" onSubmit={submitLogin}>
                <label className={fieldLabel}>
                  <span className="font-medium">Email</span>
                  <Input required type="email" value={loginData.email} onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))} />
                </label>
                <label className={fieldLabel}>
                  <span className="font-medium">Password</span>
                  <Input required type="password" value={loginData.password} onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))} />
                </label>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" disabled={loading}>{loading ? "Please wait..." : "Sign in"}</Button>
              </form>
            ) : (
              <form className="flex flex-col gap-4" onSubmit={submitRegister}>
                <label className={fieldLabel}>
                  <span className="font-medium">Email</span>
                  <Input required type="email" value={registerData.email} onChange={(e) => setRegisterData((p) => ({ ...p, email: e.target.value }))} />
                </label>
                <label className={fieldLabel}>
                  <span className="font-medium">Account type</span>
                  <Select value={registerData.role} onChange={(e) => setRegisterData((p) => ({ ...p, role: e.target.value }))}>
                    <option value="STANDARD_USER">Buyer / tenant (standard)</option>
                    <option value="PRIVATE_LANDLORD">Private landlord</option>
                    <option value="AGENCY_BROKER">Agency / broker</option>
                  </Select>
                </label>
                <label className={fieldLabel}>
                  <span className="font-medium">Password</span>
                  <Input required minLength={6} type="password" value={registerData.password} onChange={(e) => setRegisterData((p) => ({ ...p, password: e.target.value }))} />
                </label>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" disabled={loading}>{loading ? "Please wait..." : "Create account"}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </Container>
    </Section>
  );
}
