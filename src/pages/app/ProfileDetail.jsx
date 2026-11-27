import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Heart, Lock, MessageCircle, Phone, ShieldCheck, Sparkles } from "lucide-react";
import api, { apiError } from "../../api/client";
import OnlineRail from "../../components/OnlineRail";
import { ProfilePhotoGallery } from "../../components/PhotoUploadGallery";
import { LoadState, ProfileDetailSkeleton } from "../../components/Loading";
import { voiceOf } from "../../data/register";

function place(value) {
  return String(value || "").replace(/pune/gi, "Nashik");
}

function pretty(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(pretty).join(", ");
  return String(value || "—").replaceAll("_", " ");
}

function cmLabel(cm) {
  if (!cm) return "—";
  const inches = Math.round(Number(cm) / 2.54);
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}' ${inch}"`;
}

function inRange(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return false;
  if (min && n < Number(min)) return false;
  if (max && n > Number(max)) return false;
  return true;
}

function inList(pref, value) {
  const list = Array.isArray(pref) ? pref.filter(Boolean) : pref ? [pref] : [];
  if (!list.length) return null;
  const needle = String(value || "").toLowerCase();
  return list.some((item) => String(item).toLowerCase() === needle);
}

export default function ProfileDetail() {
  const { publicId } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("detail");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [actionState, setActionState] = useState({
    shortlisted: false,
    has_conversation: false,
    contact_request_status: null,
    interest_status: null,
  });

  useEffect(() => {
    setError("");
    setTab("detail");
    setNote("");
    api.get(`/profiles/${publicId}/`).then((r) => {
      setP(r.data);
      const vs = r.data.viewer_state || {};
      setActionState({
        shortlisted: !!vs.shortlisted,
        has_conversation: !!vs.has_conversation,
        contact_request_status: vs.contact_request_status || null,
        interest_status: vs.interest_status || null,
      });
    }).catch((e) => setError(apiError(e, "Profile not found.")));
    api.get("/profiles/me/").then((r) => setMe(r.data)).catch(() => {});
  }, [publicId]);

  if (error) {
    return (
      <LoadState
        label="Profile not found"
        hint={error}
        action={<Link className="btn btn-primary" to="/app/matches">Back to matches</Link>}
      />
    );
  }
  if (!p) return <ProfileDetailSkeleton />;

  const galleryPhotos = (p.photos || []).filter((ph) => ph.url && !ph.locked);
  const photoLocked = !!p.photo_locked;
  const score = Number.isFinite(Number(p.match_score)) ? Math.round(p.match_score) : 0;
  const female = p.user?.gender === "female";
  const v = voiceOf({ gender: p.user?.gender || "female", created_by: "self" });
  const name = p.display_name;
  const prefs = p.preferences || {};
  const hobbies = Array.isArray(p.hobbies) ? p.hobbies : [];

  const interest = async () => {
    try {
      await api.post("/interests/", { public_id: p.public_id });
      setActionState((s) => ({ ...s, interest_status: "sent" }));
      setNote("Interest sent");
    } catch (e) {
      setNote(apiError(e, "Could not send interest"));
    }
  };
  const chat = async () => {
    try {
      const { data } = await api.post("/conversations/", { public_id: p.public_id });
      setActionState((s) => ({ ...s, has_conversation: true }));
      nav(`/app/messages?c=${data.id}`);
    } catch (e) {
      setNote(apiError(e, "Could not open chat."));
    }
  };
  const toggleShortlist = async () => {
    try {
      if (actionState.shortlisted) {
        await api.delete("/shortlists/", { data: { public_id: p.public_id } });
        setActionState((s) => ({ ...s, shortlisted: false }));
        setNote("Removed from shortlist");
      } else {
        await api.post("/shortlists/", { public_id: p.public_id });
        setActionState((s) => ({ ...s, shortlisted: true }));
        setNote("Shortlisted");
      }
    } catch (e) {
      setNote(apiError(e, "Could not update shortlist."));
    }
  };
  const requestContact = async () => {
    if (actionState.contact_request_status) return;
    try {
      const { data } = await api.post("/contact-requests/", { public_id: p.public_id });
      setActionState((s) => ({ ...s, contact_request_status: data.status || "pending" }));
      setNote("Contact requested");
    } catch (e) {
      setNote(apiError(e, "Could not request contact."));
    }
  };

  const messaged = actionState.has_conversation || ["sent", "accepted"].includes(actionState.interest_status);
  const contactActive = ["pending", "accepted"].includes(actionState.contact_request_status);

  const compare = [
    ["Age", `${prefs.age_min || 21} to ${prefs.age_max || 32}`, me?.user?.age, inRange(me?.user?.age, prefs.age_min, prefs.age_max)],
    ["Height", `${cmLabel(prefs.height_min)} to ${cmLabel(prefs.height_max)}`, me?.height, inRange(me?.height_cm, prefs.height_min, prefs.height_max)],
    ["Marital Status", pretty(prefs.marital_status), pretty(me?.marital_status), inList(prefs.marital_status, me?.marital_status)],
    ["Religion / Community", [pretty(prefs.religions || prefs.religion), pretty(prefs.communities || prefs.community)].filter((x) => x !== "—").join(": "), `${pretty(me?.religion)}${me?.community ? `, ${me.community}` : ""}`, inList(prefs.religions?.length ? prefs.religions : prefs.religion, me?.religion)],
    ["Mother Tongue", pretty(prefs.mother_tongues || prefs.mother_tongue), pretty(me?.mother_tongue), inList(prefs.mother_tongues?.length ? prefs.mother_tongues : prefs.mother_tongue, me?.mother_tongue)],
    ["Country Living in", pretty(prefs.countries || prefs.country), pretty(me?.country), inList(prefs.countries?.length ? prefs.countries : prefs.country, me?.country)],
    ["State Living in", pretty(prefs.state), pretty(place(me?.state)), !prefs.state ? null : String(prefs.state).toLowerCase() === String(me?.state || "").toLowerCase()],
    ["City Living in", pretty((prefs.cities || []).map(place).length ? prefs.cities.map(place) : place(prefs.city)), pretty(place(me?.city)), inList((prefs.cities || []).length ? prefs.cities : prefs.city, me?.city)],
    ["Diet", pretty(prefs.diet), pretty(me?.diet), inList(prefs.diet, me?.diet)],
    ["Annual Income", pretty(prefs.income_min || prefs.annual_income), pretty(me?.annual_income), null],
    ["Working With", pretty(prefs.working_with), pretty(me?.working_with || me?.profession), !prefs.working_with ? null : true],
  ];

  return (
    <div className="discover search-wide">
      <div className="discover-main">
        <div className="discover-scroll">
          <p className="muted" style={{ marginBottom: 10 }}>
            Connect with {female ? "her" : "him"} now.
          </p>
          <article className="profile-head glass">
            <div className="profile-head-photo">
              <ProfilePhotoGallery photos={galleryPhotos} name={name} locked={photoLocked} premium={photoLocked} />
            </div>
            <div className="profile-head-copy">
              <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                {p.blue_tick && (
                  <span className="pill">
                    <ShieldCheck size={12} /> Verified
                  </span>
                )}
                {score > 0 && <span className="pill gold">{score}% match</span>}
                {p.user?.presence === "online" && <span className="pill green">Online now</span>}
              </div>
              <h2>
                {name}, {p.user?.age}
              </h2>
              <div className="match-facts profile-facts">
                <span>{p.user?.age} Years, {p.height}</span>
                <span>{pretty(p.marital_status)}</span>
                <span>{p.religion}{p.community ? `, ${p.community}` : ""}</span>
                <span>{[place(p.city), place(p.state)].filter(Boolean).join(", ")}</span>
                <span>{p.profession || "Not working"}{p.working_with ? ` · ${p.working_with}` : ""}</span>
                <span>{p.annual_income || "Income on request"}</span>
              </div>
              {note && <p className="notice" style={{ marginTop: 12 }}>{note}</p>}
              <div className="profile-head-actions">
                <button type="button" className="connect-orb" onClick={interest} title="Connect now">
                  <Check size={22} />
                </button>
                <button type="button" className="btn btn-primary" onClick={interest}>Connect Now</button>
                <button
                  type="button"
                  className={`btn btn-ghost profile-action-btn ${actionState.shortlisted ? "action-on" : ""}`}
                  onClick={toggleShortlist}
                >
                  <Heart size={16} fill={actionState.shortlisted ? "currentColor" : "none"} />
                  {actionState.shortlisted ? "Shortlisted" : "Shortlist"}
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost profile-action-btn ${messaged ? "action-on" : ""}`}
                  onClick={chat}
                >
                  <MessageCircle size={16} fill={messaged ? "currentColor" : "none"} />
                  {messaged ? "Messaged" : "Message"}
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost profile-action-btn ${contactActive ? "action-on" : ""}`}
                  onClick={requestContact}
                  disabled={contactActive}
                >
                  <Phone size={16} fill={contactActive ? "currentColor" : "none"} />
                  {actionState.contact_request_status === "accepted"
                    ? "Contact shared"
                    : actionState.contact_request_status === "pending"
                      ? "Contact requested"
                      : "Request contact"}
                </button>
              </div>
            </div>
          </article>

          <div className="match-subnav" style={{ marginTop: 12 }}>
            <button type="button" className={tab === "detail" ? "on" : ""} onClick={() => setTab("detail")}>Detailed Profile</button>
            <button type="button" className={tab === "prefs" ? "on" : ""} onClick={() => setTab("prefs")}>Partner Preferences</button>
          </div>

          {tab === "detail" ? (
            <div className="profile-sections">
              <section className="glass profile-block">
                <h3>About {name}</h3>
                <p>{p.about || "This member has not added an introduction yet."}</p>
                <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                  Profile managed by {pretty(p.user?.created_by || "self")}
                </p>
              </section>
              {!!hobbies.length && (
                <section className="glass profile-block">
                  <h3>Hobbies & Interests</h3>
                  <div className="chip-row">
                    {hobbies.map((h) => (
                      <span className="chip" key={typeof h === "string" ? h : h.label || h.value}>{typeof h === "string" ? h : h.label || h.value}</span>
                    ))}
                  </div>
                </section>
              )}
              <section className="glass profile-block">
                <h3>Lifestyle</h3>
                <p>{pretty(p.diet)} · smoking {pretty(p.smoking)} · drinking {pretty(p.drinking)}</p>
              </section>
              <section className="glass profile-block">
                <h3>Background</h3>
                <p>{p.religion} · {p.community} · Mother tongue {p.mother_tongue}</p>
                <p className="muted">Grew up in {place(p.grew_up_in || p.state)}, {p.country || "India"}</p>
              </section>
              <section className="glass profile-block">
                <h3>Education & Career</h3>
                <p>{p.education}{p.education_area ? ` · ${p.education_area}` : ""}</p>
                <p>{p.profession}{p.working_with ? ` at ${p.working_with}` : ""}</p>
                <p>{p.annual_income}</p>
              </section>
              <section className="glass profile-block">
                <h3>Family</h3>
                {p.family_type || p.family_values ? (
                  <p>{pretty(p.family_type)} · {pretty(p.family_values)} · {pretty(p.family_status)}</p>
                ) : (
                  <p className="muted"><Lock size={14} /> Add your family details to see more in common.</p>
                )}
              </section>
              <section className="glass profile-block">
                <h3>Horoscope</h3>
                {p.manglik || p.nakshatra || p.rashi ? (
                  <p>Manglik {p.manglik || "—"} · {p.nakshatra || p.rashi || "—"} · born {place(p.birth_place) || "—"} {p.birth_time ? `at ${p.birth_time}` : ""}</p>
                ) : (
                  <p className="muted"><Lock size={14} /> Add horoscope details to see common matches.</p>
                )}
                <Link className="btn btn-ghost btn-sm" to={`/kundali-matching?with=${p.public_id}`} style={{ marginTop: 10 }}>
                  <Sparkles size={14} /> Match kundali
                </Link>
              </section>
              {p.match_reasons?.length > 0 && (
                <section className="glass profile-block">
                  <h3>Why this match</h3>
                  {p.match_reasons.map((r) => <p key={r}>{r}</p>)}
                </section>
              )}
              {p.contact_shared && (p.user?.mobile || p.user?.email) && (
                <section className="glass profile-block">
                  <h3>Contact shared</h3>
                  {p.user?.mobile && <p>{p.user.mobile}</p>}
                  {p.user?.email && <p>{p.user.email}</p>}
                </section>
              )}
              <div className="profile-more-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => api.post("/photo-requests/", { public_id: p.public_id }).then(() => setNote("Photo requested"))}>Request photos</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => api.post("/ignore/", { public_id: p.public_id }).then(() => setNote("Hidden from search and matches"))}>Ignore</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => api.post("/blocks/", { public_id: p.public_id }).then(() => { setNote("Blocked"); nav("/app/search"); })}>Block</button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    const reason = prompt("Why are you reporting this profile?", "fake");
                    if (!reason) return;
                    api.post("/reports/", { public_id: p.public_id, reason, details: reason }).then(() => {
                      api.post("/blocks/", { public_id: p.public_id });
                      setNote("Reported. A safety ticket was opened and this member is blocked.");
                    });
                  }}
                >
                  Report
                </button>
              </div>
            </div>
          ) : (
            <section className="glass profile-block">
              <h3>What {female ? "she" : "he"} is looking for</h3>
              <p className="muted" style={{ marginBottom: 12 }}>Compared with you.</p>
              <div className="pref-table">
                <div className="pref-row head">
                  <span>Criteria</span>
                  <span>{v.Your.replace("Your", female ? "Her" : "His")} preferences</span>
                  <span>You match</span>
                </div>
                {compare.map(([label, want, yours, ok]) => (
                  <div className="pref-row" key={label}>
                    <span>{label}</span>
                    <span>{want || "Open to all"}</span>
                    <span>
                      {yours || "—"}
                      {ok === true && <Check size={14} className="tick" />}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      <OnlineRail />
    </div>
  );
}
