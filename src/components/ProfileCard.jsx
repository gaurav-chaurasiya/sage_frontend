import { Heart, MapPin, MessageCircle, ShieldCheck, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { apiError } from "../api/client";
import ProfilePhoto from "./ProfilePhoto";

function distanceLabel(km) {
  if (km == null || km === "") return "";
  const n = Number(km);
  if (!Number.isFinite(n)) return "";
  if (n < 1) return "Less than 1 km away";
  if (n < 10) return `${n} km away`;
  return `${Math.round(n)} km away`;
}

export default function ProfileCard({ profile, onShortlist, onIgnore, onInterest }) {
  const nav = useNavigate();
  const [note, setNote] = useState("");
  if (!profile) return null;
  const score = Number.isFinite(Number(profile.match_score)) ? Math.round(profile.match_score) : 0;
  const away = distanceLabel(profile.distance_km);

  const chat = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { data } = await api.post("/conversations/", { public_id: profile.public_id });
      nav(`/app/messages?c=${data.id}`);
    } catch (err) {
      setNote(apiError(err, "Could not open chat."));
    }
  };

  return (
    <article className="profile-card glass">
      {score > 0 && <div className="score">{score}%</div>}
      <Link to={`/app/profile/${profile.public_id}`}>
        <ProfilePhoto photo={profile.photo} name={profile.name} />
      </Link>
      <div className="meta">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {profile.blue_tick && (
            <span className="pill">
              <ShieldCheck size={12} /> Verified
            </span>
          )}
          {profile.membership && profile.membership !== "free" && <span className="pill gold">Premium</span>}
          {profile.presence === "online" && <span className="pill green">Online</span>}
          {away && (
            <span className="pill">
              <MapPin size={12} /> {away}
            </span>
          )}
        </div>
        <h3>
          {profile.name}, {profile.age}
        </h3>
        <p className="muted">
          {[profile.height, profile.city].filter(Boolean).join(" · ")}
        </p>
        <p className="muted">
          {[profile.religion, profile.community].filter(Boolean).join(" · ")}
        </p>
        <p style={{ marginTop: 6, fontWeight: 600, fontSize: 13 }}>
          {profile.profession || "Not working"}
          {profile.annual_income ? <span className="muted"> · {profile.annual_income}</span> : null}
        </p>
        <div className="actions-row">
          <button type="button" className="icon-btn" title="Ignore" onClick={() => onIgnore?.(profile)}>
            <X size={16} />
          </button>
          <button type="button" className="icon-btn" title="Shortlist" onClick={() => onShortlist?.(profile)}>
            <Heart size={16} />
          </button>
          <button type="button" className="icon-btn" title="Chat" onClick={chat}>
            <MessageCircle size={16} />
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onInterest?.(profile)}>
            <Sparkles size={14} /> Interest
          </button>
        </div>
      </div>
      {note && <p className="notice" style={{ margin: "0 12px 12px" }}>{note}</p>}
    </article>
  );
}
