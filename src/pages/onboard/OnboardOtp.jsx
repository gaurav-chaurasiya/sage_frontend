import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { confirmPhoneCode, phoneAuthError, sendPhoneCode, toE164 } from "../../api/phoneAuth";
import { useAuth } from "../../store/auth";
import { voiceOf } from "../../data/register";
import OnboardLayout from "./OnboardLayout";

export default function OnboardOtp() {
  const nav = useNavigate();
  const { user, setUser } = useAuth();
  const v = voiceOf(user || {});
  const [code, setCode] = useState("");
  const [left, setLeft] = useState(30);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const confirmation = useRef(null);
  const sentOnce = useRef(false);
  const mobile = user?.mobile || "";

  const send = async () => {
    setError("");
    setNote("");
    try {
      confirmation.current = await sendPhoneCode(mobile);
      setNote(`Code sent by SMS to ${toE164(mobile)}.`);
      setLeft(30);
    } catch (e) {
      setError(phoneAuthError(e, "Could not send the code."));
      setLeft(0);
    }
  };

  useEffect(() => {
    // Send once on arrival (guards against React re-running the effect).
    if (!mobile || sentOnce.current) return;
    sentOnce.current = true;
    send();
  }, [mobile]);

  useEffect(() => {
    if (left <= 0) return undefined;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const verify = async () => {
    if (!confirmation.current) return setError("Request a code first.");
    setError("");
    setBusy(true);
    try {
      const data = await confirmPhoneCode(confirmation.current, code);
      if (data?.user) setUser(data.user);
      nav("/onboard/photo");
    } catch (e) {
      setError(phoneAuthError(e, "That code is invalid or expired."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardLayout skipTo="/onboard/photo" skipLabel="Verify later">
      <section className="onboard-card">
        <div className="reg-icon pink-icon" style={{ margin: "0 auto 12px" }}>
          <ShieldCheck size={22} />
        </div>
        <h1>Verify mobile number</h1>
        <p className="muted">
          We’re sending a verification code by SMS to <b>{toE164(mobile)}</b>
        </p>
        {note && <p className="notice">{note}</p>}
        {error && <p className="verify-banner" style={{ margin: "12px 0", borderRadius: 12 }}>{error}</p>}
        <label className="field" style={{ textAlign: "left", marginTop: 18 }}>
          <span>Enter the 6-digit code</span>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="6-digit code" />
        </label>
        <p className="muted" style={{ marginTop: 10 }}>
          Didn’t get the code yet?{" "}
          {left > 0 ? (
            <span>Resend in {left}s</span>
          ) : (
            <button type="button" className="text-link" onClick={send}>
              Resend
            </button>
          )}
        </p>
        <button className="btn btn-primary" style={{ marginTop: 18 }} type="button" disabled={code.length < 6 || busy} onClick={verify}>
          {busy ? "Checking…" : "Continue"}
        </button>
        <p className="muted" style={{ marginTop: 12 }}>
          Verifying keeps {v.your} number private until you choose to share it.
        </p>
      </section>
    </OnboardLayout>
  );
}
