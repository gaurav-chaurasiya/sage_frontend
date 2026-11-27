import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";
import api, { apiError } from "../../api/client";
import { useAuth } from "../../store/auth";
import { isAdmin } from "../../admin/access";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/auth/login/", form);
      login(data);
      nav(isAdmin(data.user) ? "/admin" : "/app");
    } catch (err) {
      setError(apiError(err, "Could not sign in. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap page">
      <div className="auth-art">
        <Logo light />
        <div>
          <p className="eyebrow" style={{ color: "#fff" }}>
            Welcome back
          </p>
          <h1 className="auth-title">
            The next conversation could be the one.
          </h1>
        </div>
        <p>Verified. Private. Family-first.</p>
      </div>
      <div className="auth-panel">
        <form className="auth-card glass" onSubmit={submit}>
          <h2>Sign in</h2>
          {error && <div className="notice">{String(error)}</div>}
          <label className="field" style={{ marginTop: 12 }}>
            <span>Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="field" style={{ marginTop: 12 }}>
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={busy}>
            {busy ? "Signing in…" : "Continue"}
          </button>
          <p className="muted" style={{ marginTop: 10, textAlign: "right" }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
          <p className="muted" style={{ marginTop: 14 }}>
            New to Matrimony? <Link to="/register">Choose a plan and join</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
