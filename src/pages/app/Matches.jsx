import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { asArray } from "../../api/client";
import MatchRow from "../../components/MatchRow";
import OnlineRail from "../../components/OnlineRail";
import Pagination, { PAGE_SIZE } from "../../components/Pagination";
import RefineSearch from "../../components/RefineSearch";
import { readRadius } from "../../components/LocationBar";
import { useAuth } from "../../store/auth";
import ProfilePhoto from "../../components/ProfilePhoto";
import { MatchListSkeleton } from "../../components/Loading";

const TABS = [
  ["new", "New Matches"],
  ["today", "Today's Matches"],
  ["preferred", "My Matches"],
  ["near_me", "Near Me"],
  ["broader", "More Matches"],
];

const TITLES = {
  new: "New Members who match your Preferences",
  today: "Here are Today's top Matches for you. Connect with them now!",
  preferred: "Members who match your Preferences",
  near_me: "Members that match your Partner Preferences",
  broader: "Members you may like",
};

const blank = {
  two_way: "",
  verified: "",
  photo_setting: "",
  recently_joined: "",
  last_active: "",
  annual_income: "",
  marital_status: "",
  religion: "",
  community: "",
  mother_tongue: "",
  country: "",
  state: "",
  grew_up_in: "",
  working_with: "",
  profession_area: "",
  created_by: "",
  diet: "",
  education_level: "",
  education_area: "",
};

export default function Matches() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const kind = params.get("tab") || "preferred";
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ count: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [radius, setRadius] = useState(readRadius() || 100);
  const [filters, setFilters] = useState(blank);
  const [tax, setTax] = useState({});
  const [tabs, setTabs] = useState({});
  const [facets, setFacets] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  const setFilter = (k, v) => {
    setPage(1);
    if (k === "__clear") {
      setFilters(blank);
      return;
    }
    setFilters((f) => ({ ...f, [k]: v }));
  };

  const load = (nextPage = page) => {
    setLoading(true);
    const query = {
      kind,
      exact: kind === "preferred" ? "true" : "false",
      page: nextPage,
      page_size: PAGE_SIZE,
      smart_income: filters.annual_income ? "false" : undefined,
      ...filters,
    };
    if (kind === "near_me") query.radius_km = radius;
    Object.keys(query).forEach((k) => {
      if (query[k] === "" || query[k] == null) delete query[k];
    });
    api
      .get("/matches/", { params: query })
      .then((r) => {
        setRows(asArray(r.data?.results ?? r.data));
        setMeta({
          count: r.data?.count ?? asArray(r.data?.results).length,
          page: r.data?.page || nextPage,
          pages: r.data?.pages || 1,
        });
        setTabs(r.data?.tabs || {});
        setFacets(r.data?.facets || {});
      })
      .catch(() => {
        setRows([]);
        setMeta({ count: 0, page: 1, pages: 1 });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get("/taxonomy/").then((r) => setTax(r.data || {})).catch(() => {});
  }, []);

  useEffect(() => {
    load(page);
  }, [kind, radius, page, filters]);

  const act = async (type, profile) => {
    const map = { interest: "/interests/", shortlist: "/shortlists/", ignore: "/ignore/" };
    await api.post(map[type], { public_id: profile.public_id });
    if (type === "ignore") setRows((list) => list.filter((p) => p.public_id !== profile.public_id));
  };

  const featured = useMemo(
    () => rows.filter((p) => p.membership && p.membership !== "free").slice(0, 8),
    [rows]
  );

  return (
    <div className="discover">
      <RefineSearch
        filters={filters}
        setFilter={setFilter}
        facets={facets}
        tax={tax}
        kind={kind}
        radius={radius}
        onRadius={(km) => {
          setPage(1);
          setRadius(km);
        }}
        className={showFilters ? "open" : ""}
      />
      <div className="discover-main">
        <div className="match-subnav">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={kind === k ? "on" : ""}
              onClick={() => {
                setPage(1);
                setParams({ tab: k });
              }}
            >
              {label}
              {tabs[k] ? <b>{tabs[k]}</b> : null}
            </button>
          ))}
          <button type="button" className="filter-toggle-btn" onClick={() => setShowFilters((v) => !v)}>
            Filters
          </button>
        </div>
        <div className="discover-scroll">
          <div className="discover-intro">
            <h2>{TITLES[kind] || "Matches"}</h2>
            <p className="muted">
              {meta.count ? `${meta.count} profile${meta.count === 1 ? "" : "s"}` : "No one in this list yet"}
              {" · "}
              <Link to="/app/partner-profile">Edit partner preferences</Link>
            </p>
          </div>
          {!!featured.length && kind !== "near_me" && (
            <section className="mini-rail-wrap">
              <h3>Premium Matches</h3>
              <div className="mini-rail">
                {featured.map((p) => (
                  <Link key={p.public_id} to={`/app/profile/${p.public_id}`} className="mini-match glass">
                    <ProfilePhoto photo={p.photo} name={p.name} className="spotlight-photo" />
                    <strong>{p.name}</strong>
                    <p>
                      {p.age} yrs · {p.height}
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        act("interest", p);
                      }}
                    >
                      Connect Now
                    </button>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {loading && !rows.length ? (
            <MatchListSkeleton count={5} />
          ) : (
          rows.map((p) => (
            <MatchRow
              key={p.public_id}
              profile={p}
              onInterest={(x) => act("interest", x)}
              onShortlist={(x) => act("shortlist", x)}
              onIgnore={(x) => act("ignore", x)}
            />
          ))
          )}
          <Pagination page={meta.page} pages={meta.pages} count={meta.count} onPage={setPage} />
          {!loading && !rows.length && (
            <p className="muted" style={{ padding: "18px 4px" }}>
              {kind === "near_me"
                ? "No one inside this radius yet. Enable location or widen the distance."
                : kind === "preferred"
                  ? `No exact matches yet for ${user?.full_name?.split(" ")[0] || "you"}. Fill partner preferences or open More Matches.`
                  : "No profiles in this list yet. Clear a filter to see more people."}
            </p>
          )}
        </div>
      </div>
      <OnlineRail />
    </div>
  );
}
