import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiError } from "../../api/client";
import Select from "../../components/Select";
import PartnerProfile from "./PartnerProfile";
import { FormSkeleton } from "../../components/Loading";
import { PhotoManager } from "../../components/PhotoUploadGallery";

export default function MyProfile() {
  const [p, setP] = useState(null);
  const [tab, setTab] = useState("profile");

  useEffect(() => {
    api.get("/profiles/me/").then((r) => setP(r.data)).catch(() => setP({ display_name: "", photos: [] }));
  }, []);

  if (!p) return <FormSkeleton rows={8} />;
  const save = async () => {
    await api.patch("/profiles/me/", p);
    alert("Saved");
  };

  return (
    <>
      <p className="eyebrow">{p.public_id}</p>
      <h2>Your profile, {p.display_name}.</h2>
      <div className="tabs">
        {[
          ["profile", "Profile"],
          ["photos", "Photos"],
          ["preferences", "Preferences"],
          ["privacy", "Privacy"],
        ].map(([value, label]) => (
          <button key={value} className={`tab ${tab === value ? "on" : ""}`} onClick={() => setTab(value)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "profile" && (
        <div className="search-card glass grid-2">
          {["display_name", "city", "religion", "community", "mother_tongue", "education", "profession", "annual_income", "birth_time", "birth_place", "about"].map((k) => (
            <label className="field" key={k} style={{ gridColumn: k === "about" ? "1 / -1" : undefined }}>
              <span>{k.replaceAll("_", " ")}</span>
              {k === "about" ? (
                <textarea rows={5} value={p[k] || ""} onChange={(e) => setP({ ...p, [k]: e.target.value })} />
              ) : k === "birth_time" ? (
                <input type="time" value={(p[k] || "").slice(0, 5)} onChange={(e) => setP({ ...p, [k]: e.target.value })} />
              ) : (
                <input value={p[k] || ""} onChange={(e) => setP({ ...p, [k]: e.target.value })} />
              )}
            </label>
          ))}
          {(p.rashi || p.nakshatra || p.manglik) && (
            <p className="muted" style={{ gridColumn: "1 / -1" }}>
              Calculated chart: {p.rashi} · {p.nakshatra} · Manglik {p.manglik}. Saved again after you update birth time or place.
            </p>
          )}
          <button className="btn btn-primary" onClick={save}>
            Save profile
          </button>
        </div>
      )}
      {tab === "photos" && <Photos profile={p} onChange={setP} />}
      {tab === "preferences" && (
        <>
          <p className="muted" style={{ marginBottom: 12 }}>
            Full partner profile also lives at <Link to="/app/partner-profile">Partner profile</Link>. Matches use this, not Search.
          </p>
          <PartnerProfile />
        </>
      )}
      {tab === "privacy" && <Privacy />}
    </>
  );
}

function Privacy() {
  const [pr, setPr] = useState(null);
  useEffect(() => {
    api.get("/profiles/me/privacy/").then((r) => setPr(r.data));
  }, []);
  if (!pr) return null;
  const levels = ["public", "members", "matches", "accepted", "premium", "private"];
  return (
    <div className="search-card glass grid-2">
      {Object.keys(pr).map((k) => (
        <div className="field" key={k}>
          <span>{k}</span>
          <Select value={pr[k]} onChange={(v) => setPr({ ...pr, [k]: v })} options={levels} />
        </div>
      ))}
      <button className="btn btn-primary" onClick={() => api.patch("/profiles/me/privacy/", pr)}>
        Save privacy
      </button>
    </div>
  );
}

function Photos({ profile, onChange }) {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const photos = profile.photos || [];

  const refresh = async () => {
    const { data } = await api.get("/profiles/me/");
    onChange(data);
  };

  const addUrl = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError("");
    try {
      await api.post("/profiles/me/photos/", { url });
      setUrl("");
      setNote("Photo added.");
      await refresh();
    } catch (err) {
      setError(apiError(err, "That URL could not be saved."));
    }
  };

  return (
    <>
      {note && <p className="notice">{note}</p>}
      {error && <p className="notice notice-error">{error}</p>}
      <div className="search-card glass" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600 }}>Your photos</p>
        <p className="muted">Upload multiple photos from your device. First photo becomes primary unless you change it.</p>
        <PhotoManager photos={photos} onRefresh={refresh} liveLink="/onboard/photo" />
      </div>
      <form className="search-card glass" onSubmit={addUrl}>
        <label className="field">
          <span>Or paste a public image URL</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </label>
        <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!url.trim()}>
          Add URL
        </button>
      </form>
      {!photos.length && <p className="muted">No photos yet. Add one to earn photo verification.</p>}
    </>
  );
}
