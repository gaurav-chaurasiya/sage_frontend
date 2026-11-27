import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Shield } from "lucide-react";
import api, { apiError } from "../../api/client";
import { useAuth } from "../../store/auth";
import { verifyPronoun } from "../../data/interests";
import LiveCapture from "../../components/LiveCapture.jsx";
import OnboardLayout from "./OnboardLayout";

export default function OnboardVerify() {
  const nav = useNavigate();
  const { user, setUser } = useAuth();
  const pronoun = verifyPronoun(user);
  const [live, setLive] = useState(false);
  const [qr, setQr] = useState(null);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const done = user?.selfie_verified;

  useEffect(() => {
    if (!qr?.token) return undefined;
    const tick = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    const poll = setInterval(async () => {
      try {
        const { data } = await api.get(`/liveness/${qr.token}/`);
        setLeft(data.expires_in || 0);
        if (data.status === "completed") {
          const me = await api.get("/auth/me/");
          setUser(me.data);
          setQr(null);
        }
      } catch {
        /* keep waiting */
      }
    }, 2000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [qr, setUser]);

  const submit = async (payload) => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/profiles/me/selfie/", payload);
      if (data.user) setUser(data.user);
      setLive(false);
    } catch (e) {
      setError(apiError(e, "Photo rejected in screening"));
      setLive(false);
    } finally {
      setBusy(false);
    }
  };

  const openMobile = async () => {
    setError("");
    try {
      const { data } = await api.post("/profiles/me/liveness/");
      setLeft(data.expires_in);
      setQr({ ...data, url: `${window.location.origin}/live/${data.token}` });
    } catch (e) {
      setError(apiError(e, "Could not start mobile verification."));
    }
  };

  const mins = Math.floor(left / 60);
  const secs = String(left % 60).padStart(2, "0");

  return (
    <OnboardLayout skipTo="/app" skipLabel="Later">
      <section className="onboard-card verify-card">
        {error && <p className="verify-banner">Photo rejected in screening</p>}
        <h1>Verify {pronoun} Profile</h1>
        <p className="muted">Verified profiles get better matches</p>
        <div className="pose-example">
          <div className="pose-art" />
          <i className="blue-badge">✓</i>
        </div>
        {done ? (
          <>
            <p className="notice">Live selfie saved. It is not shown to others.</p>
            <button className="btn btn-primary" type="button" onClick={() => nav("/app")}>
              Go to Matrimony home
            </button>
          </>
        ) : (
          <div className="onboard-cta verify-actions">
            <button className="btn btn-primary" type="button" onClick={() => setLive(true)}>
              <Camera size={18} /> Take {pronoun} selfie
            </button>
            <button className="btn btn-ghost" type="button" onClick={openMobile}>
              Take {pronoun} selfie on mobile
            </button>
          </div>
        )}
        <p className="privacy-line">
          <Shield size={14} /> Verification selfies are NOT shown to others
        </p>
      </section>
      {live && <LiveCapture mode="verify" busy={busy} onCancel={() => setLive(false)} onCapture={submit} />}
      {qr && (
        <div className="live-overlay qr">
          <div className="qr-card">
            <button className="icon-btn qr-back" type="button" onClick={() => setQr(null)} aria-label="Back">
              <ArrowLeft size={18} />
            </button>
            <h2>Complete your verification</h2>
            <p className="muted">Scan this QR code to complete selfie verification</p>
            <img
              className="qr-img"
              alt="Verification QR"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(qr.url)}`}
            />
            <p>
              <b>QR code valid for 5 minutes</b>
            </p>
            <p className="qr-timer">
              {mins}m : {secs}s left
            </p>
            <p className="muted" style={{ fontSize: 13 }}>
              Or open this link on your phone: {qr.url}
            </p>
            <button className="btn btn-ghost" type="button" onClick={() => setQr(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </OnboardLayout>
  );
}
