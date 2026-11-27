import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { asArray, apiError } from "../../api/client";
import { subscribeRealtime } from "../../api/realtime";
import { confirmPhoneCode, phoneAuthError, sendPhoneCode, toE164 } from "../../api/phoneAuth";
import { useAuth } from "../../store/auth";
import LocationBar from "../../components/LocationBar";
import PlanPicker from "../../components/PlanPicker";
import Pagination, { PAGE_SIZE } from "../../components/Pagination";
import { readUpgradePrefs, writeUpgradePrefs } from "../../components/UpgradePopup";
import Select from "../../components/Select";

export function Notifications() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [count, setCount] = useState(0);

  const load = (nextPage = page) =>
    api
      .get("/notifications/", { params: { page: nextPage, page_size: PAGE_SIZE } })
      .then((r) => {
        setRows(asArray(r.data));
        setPage(r.data?.page || nextPage);
        setPages(r.data?.pages || 1);
        setCount(r.data?.count ?? asArray(r.data).length);
      })
      .catch(() => {
        setRows([]);
        setCount(0);
      });

  useEffect(() => {
    load(page);
    // Safety-net poll - a push on the shared WebSocket refreshes this
    // instantly for a new notification.
    const tick = () => {
      if (!document.hidden) load(page);
    };
    const id = setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    const unsubscribe = subscribeRealtime((type) => {
      if (type === "notification") load(page);
    });
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      unsubscribe();
    };
  }, [page]);

  const open = async (n) => {
    await api.patch("/notifications/", { id: n.id });
    if (n.payload?.conversation_id) nav(`/app/messages?c=${n.payload.conversation_id}`);
    else if (n.payload?.public_id) nav(`/app/profile/${n.payload.public_id}`);
    else load(page);
  };

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Alerts</p>
          <h2>What moved while you were away.</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => api.patch("/notifications/", {}).then(() => load(page))}>
          Mark all read
        </button>
      </div>
      <div className="glass" style={{ borderRadius: 28, marginTop: 16, padding: 8 }}>
        {rows.map((n) => (
          <button
            type="button"
            key={n.id}
            onClick={() => open(n)}
            className={`alert-row ${n.is_read ? "" : "fresh"}`}
          >
            <strong>{n.title}</strong>
            <p className="muted">{n.body}</p>
          </button>
        ))}
        {!rows.length && <p className="muted" style={{ padding: 16 }}>Inbox is calm.</p>}
      </div>
      <Pagination page={page} pages={pages} count={count} onPage={setPage} label="alerts" />
    </>
  );
}

export function Verification() {
  const { user, setUser } = useAuth();
  const [otp, setOtp] = useState("");
  const [channel, setChannel] = useState("mobile");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const confirmation = useRef(null);

  const send = async () => {
    setError("");
    setNote("");
    if (channel === "mobile") {
      setBusy(true);
      try {
        confirmation.current = await sendPhoneCode(user?.mobile);
        setNote(`Code sent by SMS to ${toE164(user?.mobile)}.`);
      } catch (e) {
        setError(phoneAuthError(e, "Could not send the code."));
      } finally {
        setBusy(false);
      }
      return;
    }
    try {
      const { data } = await api.post("/auth/otp/send/", { channel });
      setNote(
        data.delivered === "alerts"
          ? `Code sent to Alerts for ${data.destination}. Open Alerts, then enter it here.`
          : `Code sent to ${data.destination}. Enter it here.`
      );
    } catch (e) {
      setError(apiError(e, "Could not send the code."));
    }
  };

  const verify = async () => {
    setError("");
    if (channel === "mobile") {
      if (!confirmation.current) return setError("Send a code first.");
      setBusy(true);
      try {
        const data = await confirmPhoneCode(confirmation.current, otp);
        if (data?.user) setUser(data.user);
        setNote("Mobile verified.");
        setOtp("");
      } catch (e) {
        setError(phoneAuthError(e, "That code is invalid or expired."));
      } finally {
        setBusy(false);
      }
      return;
    }
    try {
      const { data } = await api.post("/auth/otp/verify/", { channel, code: otp });
      if (data.user) setUser(data.user);
      setNote(channel === "mobile" ? "Mobile verified." : "Email verified.");
      setOtp("");
    } catch (e) {
      setError(apiError(e, "That code is invalid or expired."));
    }
  };

  const items = [
    ["Phone", user?.mobile_verified ? "Verified" : user?.mobile || "Add a number"],
    ["Email", user?.email_verified ? "Verified" : user?.email || "Add an email"],
    ["Live selfie", user?.selfie_verified ? "Verified" : "Take a live selfie"],
    ["Blue Tick", user?.blue_tick ? "Earned" : "Selfie + phone + email"],
  ];

  return (
    <>
      <p className="eyebrow">Trust</p>
      <h2>Blue Tick, earned.</h2>
      <div className="grid-3" style={{ marginTop: 18 }}>
        {items.map(([t, s]) => (
          <article className="stat glass" key={t}>
            <b>{s}</b>
            {t}
          </article>
        ))}
      </div>
      <article className="bluetick-card glass" style={{ marginTop: 18 }}>
        <div>
          <h3>{user?.selfie_verified ? "Live selfie is on file" : "Verify with a live selfie"}</h3>
          <p className="muted">Same inner capture flow as a liveness check — no ads, selfie stays private.</p>
        </div>
        <Link className="btn btn-primary" to="/onboard/verify">
          {user?.selfie_verified ? "Retake selfie" : "Take live selfie"}
        </Link>
      </article>
      <div className="search-card glass" style={{ marginTop: 18, maxWidth: 520 }}>
        <p>We send a 6-digit code: by SMS to your mobile, or to your email inbox.</p>
        <div className="tabs" style={{ margin: "12px 0" }}>
          {[
            ["mobile", "Mobile"],
            ["email", "Email"],
          ].map(([value, label]) => (
            <button key={value} className={`tab ${channel === value ? "on" : ""}`} onClick={() => { setChannel(value); setOtp(""); setNote(""); setError(""); }}>
              {label}
            </button>
          ))}
        </div>
        {note && <p className="notice">{note}</p>}
        {error && <p className="notice">{error}</p>}
        <button className="btn btn-ghost" style={{ margin: "10px 0" }} onClick={send} disabled={busy}>
          {busy ? "Please wait…" : "Send code"}
        </button>
        <label className="field">
          <span>Enter the 6-digit code</span>
          <input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" maxLength={6} placeholder="6-digit code" />
        </label>
        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={verify} disabled={otp.length < 6 || busy}>
          Verify
        </button>
        <p className="muted" style={{ marginTop: 12 }}>
          <Link to="/onboard/photo">Add a photo</Link>
        </p>
      </div>
    </>
  );
}

export function MembershipApp() {
  return (
    <>
      <p className="eyebrow">Upgrade</p>
      <h2>Pick a plan — all of them work, free for now.</h2>
      <p className="muted" style={{ maxWidth: 640, marginBottom: 18 }}>
        Gold unlocks chat and contact. Diamond, Platinum, Select and VIP add boosts and an advisor desk.
        Choose any one; we will not charge you yet.
      </p>
      <PlanPicker />
    </>
  );
}

export function Settings() {
  const { user, logout, setUser, applyTokens } = useAuth();
  const [hidden, setHidden] = useState(!!user?.is_hidden);
  const [mode, setMode] = useState(user?.presence_mode || "online");
  const [muteOffers, setMuteOffers] = useState(() => !!readUpgradePrefs(user?.id).muted);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [delPassword, setDelPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setHidden(!!user?.is_hidden);
    setMode(user?.presence_mode || "online");
    setMuteOffers(!!readUpgradePrefs(user?.id).muted);
  }, [user]);

  const saveAccount = async (payload) => {
    setError("");
    try {
      const { data } = await api.patch("/auth/me/", payload);
      setUser(data);
      setNote("Saved.");
    } catch (e) {
      setError(apiError(e, "Could not save."));
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/password/", { current_password: current, new_password: next });
      applyTokens(data.tokens);
      if (data.user) setUser(data.user);
      setCurrent("");
      setNext("");
      setNote("Password updated. You are still signed in.");
    } catch (err) {
      setError(apiError(err, "Could not change password."));
    }
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    setError("");
    if (!window.confirm("Delete your account? Your profile, photos, interests and chats will be permanently deleted. This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.post("/auth/delete-account/", { password: delPassword });
      logout();
    } catch (err) {
      setError(apiError(err, "Could not delete your account."));
      setDeleting(false);
    }
  };

  return (
    <>
      <p className="eyebrow">Settings</p>
      <h2>The quiet controls.</h2>
      <LocationBar />
      {note && <p className="notice" style={{ marginTop: 12 }}>{note}</p>}
      {error && <p className="notice" style={{ marginTop: 12 }}>{error}</p>}
      <div className="search-card glass" style={{ marginTop: 16 }}>
        <p>
          Signed in as <strong>{user?.email}</strong>
        </p>
        <p className="muted">
          Location is used only to rank people near you. Exact GPS is never shown on your public profile — others see a distance, not a pin.
        </p>
        <label className="check-row">
          <input
            type="checkbox"
            checked={hidden}
            onChange={(e) => {
              setHidden(e.target.checked);
              saveAccount({ is_hidden: e.target.checked });
            }}
          />
          Hide my profile from search and matches
        </label>
        <label className="check-row" style={{ marginTop: 10 }}>
          <input
            type="checkbox"
            checked={muteOffers}
            onChange={(e) => {
              setMuteOffers(e.target.checked);
              writeUpgradePrefs(user?.id, { muted: e.target.checked });
              setNote(e.target.checked ? "Upgrade offers are off." : "Upgrade offers will show every 2 hours on Free.");
            }}
          />
          Don’t show upgrade popups (Free members only)
        </label>
        <div className="field" style={{ marginTop: 14 }}>
          <span>Presence</span>
          <Select
            value={mode}
            onChange={(v) => {
              setMode(v);
              saveAccount({ presence_mode: v });
            }}
            options={[
              { value: "online", label: "Online when I am here" },
              { value: "invisible", label: "Invisible" },
            ]}
          />
        </div>
      </div>
      <form className="search-card glass" style={{ marginTop: 16, maxWidth: 480 }} onSubmit={changePassword}>
        <p style={{ fontWeight: 600 }}>Change password</p>
        <label className="field">
          <span>Current password</span>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="field">
          <span>New password</span>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} />
        </label>
        <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }} disabled={!current || next.length < 8}>
          Update password
        </button>
      </form>
      <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={logout}>
        Sign out
      </button>
      <form id="delete-account" className="search-card glass" style={{ marginTop: 24, maxWidth: 480 }} onSubmit={deleteAccount}>
        <p style={{ fontWeight: 600 }}>Delete account</p>
        <p className="muted">
          Permanently deletes your profile, photos, interests and chats. You will be signed out.
        </p>
        <label className="field">
          <span>Password</span>
          <input type="password" value={delPassword} onChange={(e) => setDelPassword(e.target.value)} autoComplete="current-password" />
        </label>
        <button type="submit" className="btn btn-primary" style={{ marginTop: 12, background: "#dc2626" }} disabled={!delPassword || deleting}>
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
      </form>
    </>
  );
}

