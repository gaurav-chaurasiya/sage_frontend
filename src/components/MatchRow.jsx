import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Crown, Heart, Lock, MessageCircle, ShieldCheck } from "lucide-react";
import api, { apiError } from "../api/client";
import ProfilePhoto from "./ProfilePhoto";

function seen(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 3) return "Online now";
  if (mins < 60) return `Online ${mins}m ago`;
  if (mins < 1440) return `Online ${Math.round(mins / 60)}h ago`;
  return `Online ${Math.round(mins / 1440)}d ago`;
}

function place(value) {
  return String(value || "").replace(/pune/gi, "Nashik");
}

export default function MatchRow({ profile, onInterest, onShortlist, onIgnore }) {
  const nav = useNavigate();
  const [status, setStatus] = useState("idle");
  const [note, setNote] = useState("");
  if (!profile) return null;
  const locked = profile.photo_locked;
  const her = profile.gender === "female";
  const pronoun = her ? "her" : "him";
  const connected = status === "sent" || profile.interest_status === "sent" || profile.interest_status === "accepted";

  const run = async (fn, next, fail) => {
    setNote("");
    setStatus("busy");
    try {
      await fn?.();
      setStatus(next);
    } catch (e) {
      setStatus("idle");
      setNote(fail || apiError(e, "Could not complete that."));
    }
  };

  const chat = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/conversations/", { public_id: profile.public_id });
      nav(`/app/messages?c=${data.id}`);
    } catch (err) {
      setNote(apiError(err, "Could not open chat."));
    }
  };

  return (
    <article className="match-row glass">
      <Link to={`/app/profile/${profile.public_id}`} className={`match-row-photo ${locked ? "locked" : ""}`}>
        <ProfilePhoto photo={locked ? "" : profile.photo} name={profile.name} />
        {profile.membership && profile.membership !== "free" && (
          <span className="vip-ribbon"><Crown size={11} /> Premium</span>
        )}
        {locked && (
          <span className="photo-lock">
            <Lock size={14} /> Visible to Premium
          </span>
        )}
      </Link>
      <div className="match-row-body">
        <div className="match-row-head">
          <Link to={`/app/profile/${profile.public_id}`}>
            <strong>{profile.name}</strong>
            {profile.blue_tick && <ShieldCheck size={15} className="tick" />}
          </Link>
          <span className={`online-line ${profile.presence === "online" ? "on" : ""}`}>
            {profile.presence === "online" ? "Online now" : seen(profile.last_seen)}
          </span>
        </div>
        <div className="match-facts">
          <p>
            {[
              profile.age ? `${profile.age} yrs` : null,
              profile.height,
              [profile.religion, profile.community].filter(Boolean).join(", ") || null,
            ].filter(Boolean).join(" · ")}
          </p>
          <p>
            {[
              profile.mother_tongue,
              String(profile.marital_status || "").replaceAll("_", " ") || null,
              [place(profile.city), place(profile.state)].filter(Boolean).join(", ") || null,
            ].filter(Boolean).join(" · ")}
          </p>
          {profile.profession && <p>{profile.profession}</p>}
        </div>
        {profile.about && <p className="match-about">{profile.about.slice(0, 140)}{profile.about.length > 140 ? "…" : ""}</p>}
        {note && <p className="notice" style={{ marginTop: 8 }}>{note}</p>}
      </div>
      <div className="match-row-actions">
        <p>{connected ? "Interest sent" : "Like this profile?"}</p>
        <button
          type="button"
          className={`connect-orb ${connected ? "done" : ""}`}
          disabled={status === "busy" || connected}
          onClick={() => run(() => onInterest?.(profile), "sent", "Could not send interest")}
          title="Connect now"
        >
          <Check size={22} />
        </button>
        <span>{connected ? "Connected" : "Connect Now"}</span>
        <button type="button" className="icon-btn" title="Message" onClick={chat}>
          <MessageCircle size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          title="Shortlist"
          onClick={() => run(() => onShortlist?.(profile), "saved", "Could not shortlist")}
        >
          <Heart size={16} />
        </button>
        <button type="button" className="text-link" onClick={() => onIgnore?.(profile)}>
          Hide {pronoun}
        </button>
      </div>
    </article>
  );
}
