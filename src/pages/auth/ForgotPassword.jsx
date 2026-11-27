import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";
import api, { apiError } from "../../api/client";
import { useAuth } from "../../store/auth";

export default function ForgotPassword() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/auth/password/forgot/", { email: email.trim() });
      setNote(data.detail || "If that email has an account, a reset code is on its way.");
      setStep("reset");
    } catch (err) {
      setError(apiError(err, "Could not send the reset code."));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/auth/password/reset/", { email: email.trim(), code, new_password: password });
      login(data);
      nav("/app");
    } catch (err) {
      setError(apiError(err, "Could not reset your password."));
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
            Account help
          </p>
          <h1 className="auth-title">Let’s get you back in.</h1>
        </div>
        <p>Verified. Private. Family-first.</p>
      </div>
      <div className="auth-panel">
        {step === "email" ? (
          <form className="auth-card glass" onSubmit={sendCode}>
            <h2>Forgot password</h2>
            <p className="muted">Enter the email on your account and we’ll send a 6-digit reset code.</p>
            {error && <div className="notice">{String(error)}</div>}
            <label className="field" style={{ marginTop: 12 }}>
              <span>Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={busy}>
              {busy ? "Sending…" : "Send reset code"}
            </button>
            <p className="muted" style={{ marginTop: 14 }}>
              Remembered it? <Link to="/login">Sign in</Link>
            </p>
          </form>
        ) : (
          <form className="auth-card glass" onSubmit={reset}>
            <h2>Set a new password</h2>
            {note && <p className="notice">{note}</p>}
            {error && <div className="notice">{String(error)}</div>}
            <label className="field" style={{ marginTop: 12 }}>
              <span>6-digit code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
              />
            </label>
            <label className="field" style={{ marginTop: 12 }}>
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{ marginTop: 18 }}
              disabled={busy || code.length < 6 || password.length < 8}
            >
              {busy ? "Saving…" : "Reset password"}
            </button>
            <p className="muted" style={{ marginTop: 14 }}>
              Didn’t get it?{" "}
              <button type="button" className="text-link" onClick={sendCode} disabled={busy}>
                Send again
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
