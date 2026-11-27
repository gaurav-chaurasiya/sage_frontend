import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { asArray } from "../../api/client";
import ProfileCard from "../../components/ProfileCard";
import { CardGridSkeleton } from "../../components/Loading";
import Pagination, { PAGE_SIZE } from "../../components/Pagination";
import { readRadius } from "../../components/LocationBar";

const FEEDS = {
  nearby: {
    title: "Near you",
    eyebrow: "People around you",
    empty: "No one nearby yet. Add your city to see people around you.",
    matchKind: "near_me",
  },
  recommended: {
    title: "Recommended for you",
    eyebrow: "Matches for you",
    empty: "No recommendations yet. Complete your profile and preferences.",
    matchKind: "recommended",
  },
  viewed: {
    title: "Who viewed you",
    eyebrow: "Lifetime visitors",
    empty: "No one has opened your profile yet.",
    mine: false,
  },
  recent: {
    title: "Recently viewed",
    eyebrow: "Profiles you opened",
    empty: "You have not opened any profile yet. Open someone to build this history.",
    mine: true,
  },
};

export default function FeedList() {
  const { kind } = useParams();
  const meta = FEEDS[kind] || FEEDS.recommended;
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = (nextPage = 1) => {
    setLoading(true);
    if (meta.matchKind) {
      const params = { kind: meta.matchKind, page: nextPage, page_size: PAGE_SIZE };
      if (meta.matchKind === "near_me") params.radius_km = readRadius();
      api
        .get("/matches/", { params })
        .then((r) => {
          setRows(asArray(r.data?.results ?? r.data));
          setPage(r.data?.page || nextPage);
          setPages(r.data?.pages || 1);
          setCount(r.data?.count || asArray(r.data?.results ?? r.data).length);
        })
        .catch(() => {
          setRows([]);
          setCount(0);
        })
        .finally(() => setLoading(false));
      return;
    }
    api
      .get("/activity/views/", { params: { mine: meta.mine ? "true" : undefined, page: nextPage, page_size: PAGE_SIZE } })
      .then((r) => {
        setRows(asArray(r.data));
        setPage(r.data?.page || nextPage);
        setPages(r.data?.pages || 1);
        setCount(r.data?.count ?? asArray(r.data).length);
      })
      .catch(() => {
        setRows([]);
        setCount(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
    load(1);
  }, [kind]);

  const act = async (type, profile) => {
    const map = { interest: "/interests/", shortlist: "/shortlists/", ignore: "/ignore/" };
    await api.post(map[type], { public_id: profile.public_id });
    if (type === "ignore") setRows((list) => list.filter((p) => p.public_id !== profile.public_id));
  };

  return (
    <div className="dash-page">
      <div className="topbar">
        <div>
          <p className="eyebrow">{meta.eyebrow}</p>
          <h2>{meta.title}</h2>
          <p className="muted">{count ? `${count} profile${count === 1 ? "" : "s"} · kept for life` : meta.empty}</p>
        </div>
        <Link className="btn btn-ghost" to="/app">
          Back to home
        </Link>
      </div>
      {loading && !rows.length ? (
        <CardGridSkeleton count={6} />
      ) : (
      <div className="card-grid">
        {rows.map((p) => (
          <div key={p.public_id}>
            <ProfileCard
              profile={p}
              onInterest={(x) => act("interest", x)}
              onShortlist={(x) => act("shortlist", x)}
              onIgnore={(x) => act("ignore", x)}
            />
            {p.viewed_at && (
              <p className="muted" style={{ fontSize: 12, margin: "6px 4px 0" }}>
                {meta.mine ? "You viewed" : "Viewed you"} {new Date(p.viewed_at).toLocaleString("en-IN")}
              </p>
            )}
          </div>
        ))}
      </div>
      )}
      {!loading && !rows.length && <p className="muted">{meta.empty}</p>}
      <Pagination page={page} pages={pages} count={count} onPage={(n) => load(n)} />
    </div>
  );
}
