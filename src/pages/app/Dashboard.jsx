import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { asArray } from "../../api/client";
import { useAuth } from "../../store/auth";
import { useLive } from "../../store/live";
import ProfileCard from "../../components/ProfileCard";
import { ProfileCardSkeleton } from "../../components/Loading";
import { readRadius } from "../../components/LocationBar";

const FEEDS = [
  ["nearby", "Near you", "/app/feed/nearby", "No one nearby yet. Add your city to see people around you."],
  ["recommended", "Recommended for you", "/app/feed/recommended", "No recommendations yet. Complete your profile and preferences."],
  ["viewed", "Who viewed you", "/app/feed/viewed", "No one has opened your profile yet."],
  ["recent", "Recently viewed", "/app/feed/recent", "Open a profile to see it here. Everyone you open is kept for life."],
];

export default function Dashboard() {
  const { user } = useAuth();
  const live = useLive();
  const [feed, setFeed] = useState("recommended");
  const [matches, setMatches] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [viewers, setViewers] = useState([]);
  const [recent, setRecent] = useState([]);
  const [counts, setCounts] = useState({ nearby: 0, recommended: 0, viewed: 0, recent: 0 });
  const [loadingFeed, setLoadingFeed] = useState(true);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const completion = 100;
  const lists = { nearby, recommended: matches, viewed: viewers, recent };
  const active = FEEDS.find(([id]) => id === feed) || FEEDS[1];
  const rows = (lists[feed] || []).slice(0, 8);

  useEffect(() => {
    let lastFetch = 0;
    const loadRecommended = (background = false) => {
      const now = Date.now();
      if (background && now - lastFetch < 20000) return;
      lastFetch = now;
      if (!background) setLoadingFeed(true);
      api.get("/matches/", { params: { kind: "recommended", page_size: 8, page: 1 } }).then((r) => {
        setMatches(asArray(r.data?.results ?? r.data).slice(0, 8));
        setCounts((c) => ({ ...c, recommended: r.data?.count || asArray(r.data?.results).length }));
      }).catch(() => setMatches([])).finally(() => setLoadingFeed(false));
    };
    loadRecommended();
    const onFocus = () => loadRecommended(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    if (feed === "nearby") {
      if (nearby.length) { setLoadingFeed(false); return undefined; }
      setLoadingFeed(true);
      api.get("/matches/", { params: { kind: "near_me", radius_km: readRadius(), page_size: 8, page: 1 } }).then((r) => {
        setNearby(asArray(r.data?.results ?? r.data).slice(0, 8));
        setCounts((c) => ({ ...c, nearby: r.data?.count || asArray(r.data?.results).length }));
      }).catch(() => setNearby([])).finally(() => setLoadingFeed(false));
      return undefined;
    }
    if (feed === "viewed") {
      if (viewers.length) { setLoadingFeed(false); return undefined; }
      setLoadingFeed(true);
      api.get("/activity/views/", { params: { page: 1, page_size: 8 } }).then((r) => {
        setViewers(asArray(r.data).slice(0, 8));
        setCounts((c) => ({ ...c, viewed: r.data?.count ?? asArray(r.data).length }));
      }).catch(() => setViewers([])).finally(() => setLoadingFeed(false));
      return undefined;
    }
    if (feed === "recent") {
      if (recent.length) { setLoadingFeed(false); return undefined; }
      setLoadingFeed(true);
      api.get("/activity/views/", { params: { mine: "true", page: 1, page_size: 8 } }).then((r) => {
        setRecent(asArray(r.data).slice(0, 8));
        setCounts((c) => ({ ...c, recent: r.data?.count ?? asArray(r.data).length }));
      }).catch(() => setRecent([])).finally(() => setLoadingFeed(false));
      return undefined;
    }
    setLoadingFeed(false);
    return undefined;
  }, [feed, nearby.length, viewers.length, recent.length]);

  const act = async (kind, profile) => {
    const map = { interest: "/interests/", shortlist: "/shortlists/", ignore: "/ignore/" };
    await api.post(map[kind], { public_id: profile.public_id });
    if (kind === "ignore") {
      setMatches((list) => list.filter((p) => p.public_id !== profile.public_id));
      setNearby((list) => list.filter((p) => p.public_id !== profile.public_id));
      setViewers((list) => list.filter((p) => p.public_id !== profile.public_id));
      setRecent((list) => list.filter((p) => p.public_id !== profile.public_id));
    }
  };

  return (
    <div className="dash-page">
      <div className="topbar">
        <div>
          <p className="eyebrow">Matrimony home</p>
          <h2>
            {hello}, {user?.full_name?.split(" ")[0]}.
          </h2>
        </div>
        <Link className="btn btn-primary" to="/app/matches">
          See all matches
        </Link>
      </div>
      <div className="grid-4 dash-stats" style={{ marginBottom: 22 }}>
        <Link className="stat glass" to="/app/profile">
          <b>{completion}%</b>
          Profile complete
          <span className="progress done dash-stat-bar">
            <i style={{ width: `${completion}%` }} />
          </span>
        </Link>
        <Link className="stat glass" to="/app/membership">
          <b>{user?.membership?.label || "Free"}</b>
          Membership plan
        </Link>
        <div className="stat glass">
          <b className="dash-stat-id">{user?.profile_id || "—"}</b>
          Your profile ID
        </div>
        <div className="stat glass">
          <b>
            <i className={`dash-dot ${live.presence === "online" ? "on" : ""}`} />
            {live.presence === "online" ? "Online" : "Away"}
          </b>
          Your status
        </div>
      </div>
      {!user?.selfie_verified && (
        <article className="bluetick-card glass">
          <div>
            <p className="eyebrow">Blue Tick verification</p>
            <h3>Verify your profile with a live selfie</h3>
            <p className="muted">No ads. The selfie is not shown to others.</p>
          </div>
          <Link className="btn btn-primary" to="/onboard/verify">
            Get Blue Tick
          </Link>
        </article>
      )}

      <section className="feed-section">
        <div className="match-subnav">
          {FEEDS.map(([id, label]) => (
            <button key={id} type="button" className={feed === id ? "on" : ""} onClick={() => setFeed(id)}>
              {label}
              {counts[id] ? <b>{counts[id]}</b> : null}
            </button>
          ))}
        </div>
        <div className="card-grid">
          {loadingFeed && !rows.length
            ? Array.from({ length: 4 }).map((_, i) => <ProfileCardSkeleton key={i} />)
            : rows.map((p) => (
            <div key={p.public_id}>
              <ProfileCard
                profile={p}
                onInterest={(x) => act("interest", x)}
                onShortlist={(x) => act("shortlist", x)}
                onIgnore={(x) => act("ignore", x)}
              />
              {p.viewed_at && (feed === "recent" || feed === "viewed") && (
                <p className="muted" style={{ fontSize: 12, margin: "6px 4px 0" }}>
                  {feed === "recent" ? "You viewed" : "Viewed you"} {new Date(p.viewed_at).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          ))}
        </div>
        {!loadingFeed && !rows.length && <p className="muted">{active[3]}</p>}
        <div className="feed-see-all">
          <Link className="btn btn-ghost" to={active[2]}>
            See all
          </Link>
        </div>
      </section>
    </div>
  );
}
