import { useState } from "react";
import { useParams } from "react-router-dom";
import api, { apiError } from "../../api/client";
import LiveCapture from "../../components/LiveCapture.jsx";
import Logo from "../../components/Logo";

export default function LiveMobile() {
  const { token } = useParams();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (payload) => {
    setBusy(true);
    setError("");
    try {
      await api.post(`/liveness/${token}/`, payload);
      setDone(true);
    } catch (e) {
      setError(apiError(e, "Photo rejected in screening"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboard-shell live-mobile">
      <header className="onboard-bar">
        <Logo />
      </header>
      {done ? (
        <section className="onboard-card">
          <h1>Selfie captured</h1>
          <p className="muted">You can return to the computer. This selfie is not shown to others.</p>
        </section>
      ) : (
        <>
          {error && <p className="verify-banner">{error}</p>}
          <LiveCapture mode="verify" busy={busy} onCancel={() => setError("Cancelled.")} onCapture={submit} />
        </>
      )}
    </div>
  );
}
