import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Lock, ShieldCheck } from "lucide-react";
import api, { apiError } from "../api/client";
import { useAuth } from "../store/auth";
import { isAdmin } from "./access";
import "./admin.css";

export default function AdminLogin() {
  const { user, login, logout } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAdmin(user)) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login/", form);
      if (!isAdmin(data.user)) {
        // A member account: don't keep it signed in on the admin screen.
        setError("This login doesn't have admin access.");
        return;
      }
      if (user) logout();
      login(data);
      nav("/admin", { replace: true });
    } catch (err) {
      setError(apiError(err, "Could not sign in."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-login">
      <form className="adm-login-card" onSubmit={submit}>
        <div className="adm-login-brand">
          <span className="adm-brand-mark">S</span>
          <div>
            <strong>Sage Matrimony</strong>
            <small>Admin console</small>
          </div>
        </div>
        <h1>Sign in</h1>
        <p className="adm-muted">For the Sage Matrimony team only.</p>
        {error && <div className="adm-alert tone-danger">{error}</div>}
        <label className="adm-field">
          <span>Email</span>
          <input type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus />
        </label>
        <label className="adm-field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </label>
        <button className="adm-btn primary block" disabled={busy}>
          <Lock size={15} /> {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="adm-login-foot">
          <ShieldCheck size={14} /> Every admin action is recorded in the activity log.
        </p>
      </form>
    </div>
  );
}
