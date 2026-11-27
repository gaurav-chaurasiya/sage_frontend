import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { apiError, asArray } from "../api/client";
import { useAuth } from "../store/auth";

export default function PlanPicker() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const current = user?.membership?.plan || "free";

  useEffect(() => {
    api.get("/membership/plans/").then((r) => setPlans(asArray(r.data))).catch(() => setPlans([]));
  }, []);

  const choose = async (slug) => {
    if (!user) {
      nav(`/register?plan=${slug}`);
      return;
    }
    setBusy(slug);
    setError("");
    setNote("");
    try {
      const { data } = await api.post("/membership/checkout/", { plan: slug });
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("rivaah_user", JSON.stringify(data.user));
      } else {
        const me = await api.get("/auth/me/");
        setUser(me.data);
        localStorage.setItem("rivaah_user", JSON.stringify(me.data));
      }
      setNote(`${data.label || slug} is on — complimentary for now. Chat and contacts are unlocked.`);
    } catch (e) {
      setError(apiError(e, "Could not switch plan."));
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      {user && (
        <p className="notice" style={{ marginBottom: 16 }}>
          Current plan: <strong>{user.membership?.label || "Free"}</strong>
          {user.membership?.expires_at ? ` · till ${new Date(user.membership.expires_at).toLocaleDateString("en-IN")}` : ""}
          . Every plan is free to try right now.
        </p>
      )}
      {error && <p className="notice">{error}</p>}
      {note && <p className="notice" style={{ color: "#15803d", background: "rgba(22,163,74,.1)" }}>{note}</p>}
      <div className="grid-3" style={{ marginTop: 8 }}>
        {plans.map((p) => {
          const on = current === p.slug;
          return (
            <article className={`plan glass ${p.highlight || on ? "featured" : ""}`} key={p.slug}>
              {p.highlight && <span className="pill">{p.highlight}</span>}
              {on && <span className="pill green">Your plan</span>}
              <h3 className="serif" style={{ fontSize: 36, margin: "10px 0" }}>
                {p.name}
              </h3>
              <div className="price">
                Free
                <small> / {p.duration_days} days</small>
              </div>
              <p className="muted" style={{ marginTop: -6, fontSize: 13 }}>
                Complimentary for now
              </p>
              <ul style={{ margin: "16px 0", color: "var(--ink-soft)" }}>
                {(p.features || []).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {user ? (
                <button
                  type="button"
                  className={on ? "btn btn-ghost" : "btn btn-primary"}
                  disabled={!!busy || on}
                  onClick={() => choose(p.slug)}
                >
                  {on ? "Selected" : busy === p.slug ? "Activating…" : `Use ${p.name}`}
                </button>
              ) : (
                <Link className="btn btn-primary" to={`/register?plan=${p.slug}`}>
                  Join with {p.name}
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
