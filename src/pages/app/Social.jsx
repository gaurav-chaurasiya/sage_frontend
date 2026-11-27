import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { asArray, apiError } from "../../api/client";
import { subscribeRealtime } from "../../api/realtime";
import ProfileCard from "../../components/ProfileCard";
import MatchRow from "../../components/MatchRow";
import OnlineRail from "../../components/OnlineRail";
import Pagination, { PAGE_SIZE, slicePage } from "../../components/Pagination";

export function Interests() {
  const nav = useNavigate();
  const [box, setBox] = useState("received");
  const [facet, setFacet] = useState("all");
  const [sort, setSort] = useState("newest");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [requests, setRequests] = useState([]);

  const load = () => {
    if (box === "requests") {
      api.get("/contact-requests/", { params: { box: "received" } }).then((r) => setRequests(asArray(r.data))).catch(() => setRequests([]));
      return;
    }
    const boxes = box === "accepted" || box === "deleted" ? ["received", "sent"] : [box === "sent" ? "sent" : "received"];
    Promise.all(boxes.map((b) => api.get("/interests/", { params: { box: b } }).then((r) => asArray(r.data)).catch(() => [])))
      .then((chunks) => {
        const seen = new Set();
        const merged = [];
        chunks.flat().forEach((p) => {
          if (!p?.public_id || seen.has(p.public_id)) return;
          seen.add(p.public_id);
          merged.push(p);
        });
        setRows(merged);
      });
  };

  useEffect(() => {
    setPage(1);
    load();
    const tick = () => {
      if (!document.hidden) load();
    };
    const id = setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    const unsubscribe = subscribeRealtime((type) => {
      if (type === "notification") load();
    });
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box]);

  useEffect(() => {
    setPage(1);
  }, [facet, sort]);

  const act = async (public_id, action) => {
    const { data } = await api.patch("/interests/", { public_id, action });
    if (action === "accept" && data.conversation_id) nav(`/app/messages?c=${data.conversation_id}`);
    else load();
  };

  let visible = rows;
  if (box === "received") visible = rows.filter((p) => p.interest_status === "sent" || !p.interest_status);
  if (box === "accepted") visible = rows.filter((p) => p.interest_status === "accepted");
  if (box === "deleted") visible = rows.filter((p) => p.interest_status === "declined" || p.interest_status === "withdrawn");
  if (facet === "verified") visible = visible.filter((p) => p.blue_tick);
  if (facet === "premium") visible = visible.filter((p) => p.membership && p.membership !== "free");
  if (facet === "online") visible = visible.filter((p) => p.presence === "online");
  if (facet === "photos") visible = visible.filter((p) => p.photo);
  if (sort === "oldest") visible = [...visible].reverse();
  const paged = slicePage(visible, page, PAGE_SIZE);
  const requestPaged = slicePage(requests, page, PAGE_SIZE);
  const list = box === "requests" ? requestPaged.items : paged.items;
  const pager = box === "requests" ? requestPaged : paged;

  return (
    <div className="discover">
      <aside className="refine-pane glass">
        <h3>Inbox</h3>
        <section className="refine-group">
          <p className="refine-head">Sort</p>
          <div className="refine-body">
            <label className="refine-opt"><input type="radio" name="isort" checked={sort === "newest"} onChange={() => setSort("newest")} /><span>Newest first</span></label>
            <label className="refine-opt"><input type="radio" name="isort" checked={sort === "oldest"} onChange={() => setSort("oldest")} /><span>Oldest first</span></label>
          </div>
        </section>
        <section className="refine-group">
          <p className="refine-head">Filter</p>
          <div className="refine-body">
            {[
              ["all", "All Requests"],
              ["verified", "Blue Tick Members"],
              ["premium", "Premium Members"],
              ["online", "Members online now"],
              ["photos", "Members with Photos"],
            ].map(([value, label]) => (
              <label className="refine-opt" key={value}>
                <input type="radio" name="iface" checked={facet === value} onChange={() => setFacet(value)} />
                <span>{label}{value === "verified" ? <em className="badge-new">NEW</em> : null}</span>
              </label>
            ))}
          </div>
        </section>
      </aside>
      <div className="discover-main">
        <div className="match-subnav">
          {[
            ["received", "Received"],
            ["accepted", "Accepted"],
            ["requests", "Requests"],
            ["sent", "Sent"],
            ["deleted", "Deleted"],
          ].map(([value, label]) => (
            <button key={value} type="button" className={box === value ? "on" : ""} onClick={() => setBox(value)}>
              {label}
            </button>
          ))}
        </div>
        <div className="discover-scroll">
          {box !== "requests" &&
            paged.items.map((p) => (
              <div key={p.public_id}>
                <MatchRow profile={p} />
                <div className="inbox-actions">
                  {box === "received" && p.interest_status === "sent" && (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => act(p.public_id, "accept")}>Accept & chat</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => act(p.public_id, "decline")}>Decline</button>
                    </>
                  )}
                  {box === "sent" && p.interest_status === "sent" && (
                    <button className="btn btn-ghost btn-sm" onClick={() => act(p.public_id, "withdraw")}>Cancel interest</button>
                  )}
                  {p.interest_status === "accepted" && (
                    <button className="btn btn-ghost btn-sm" onClick={() => api.post("/conversations/", { public_id: p.public_id }).then((r) => nav(`/app/messages?c=${r.data.id}`))}>
                      Open chat
                    </button>
                  )}
                </div>
              </div>
            ))}
          {box === "requests" &&
            list.map((p) => (
              <div key={p.public_id}>
                <MatchRow profile={p} />
                {p.request_status === "pending" && (
                  <div className="inbox-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => api.patch("/contact-requests/", { public_id: p.public_id, action: "accept" }).then(load)}>Accept</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => api.patch("/contact-requests/", { public_id: p.public_id, action: "decline" }).then(load)}>Decline</button>
                  </div>
                )}
              </div>
            ))}
          <Pagination
            page={pager.page}
            pages={pager.pages}
            count={pager.count}
            onPage={setPage}
            label={box === "requests" ? "requests" : "profiles"}
          />
          {!pager.count && (
            <div className="inbox-empty glass">
              <p><b>No pending {box === "requests" ? "requests" : "connects"}.</b></p>
              <p className="muted">Want to increase your chances of finding a match? Verify your profile to increase trust and get more Connects.</p>
              <Link className="btn btn-primary" to="/app/verification">Verify Now</Link>
              <Link className="text-link" to="/app/matches">View My Matches</Link>
            </div>
          )}
        </div>
      </div>
      <OnlineRail />
    </div>
  );
}

export function Shortlist() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  useEffect(() => {
    api.get("/shortlists/").then((r) => setRows(asArray(r.data))).catch(() => setRows([]));
  }, []);
  const paged = slicePage(rows, page, PAGE_SIZE);
  return (
    <div className="list-page">
      <div className="list-page-head">
      <p className="eyebrow">Shortlist</p>
      <h2>Kept close.</h2>
      </div>
      <div className="results-pane">
      <div className="card-grid" style={{ marginTop: 8 }}>
        {paged.items.map((p) => (
          <div key={p.public_id}>
            <ProfileCard profile={p} />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 8 }}
              onClick={() => api.delete("/shortlists/", { params: { public_id: p.public_id } }).then(() => setRows((list) => list.filter((x) => x.public_id !== p.public_id)))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <Pagination page={paged.page} pages={paged.pages} count={paged.count} onPage={setPage} />
      {!rows.length && <p className="muted">Your shortlist is empty.</p>}
      </div>
    </div>
  );
}

function RequestBox({ endpoint, title, empty, acceptAction = "accept" }) {
  const [box, setBox] = useState("received");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const load = () =>
    api
      .get(endpoint, { params: { box } })
      .then((r) => setRows(asArray(r.data)))
      .catch(() => setRows([]));

  useEffect(() => {
    setPage(1);
    load();
  }, [box, endpoint]);

  const paged = slicePage(rows, page, PAGE_SIZE);

  return (
    <section style={{ marginBottom: 28 }}>
      <h3 className="serif" style={{ fontSize: 28, marginBottom: 8 }}>
        {title}
      </h3>
      <div className="tabs">
        {[
          ["received", "Received"],
          ["sent", "Sent"],
        ].map(([value, label]) => (
          <button key={value} className={`tab ${box === value ? "on" : ""}`} onClick={() => setBox(value)}>
            {label}
          </button>
        ))}
      </div>
      <div className="card-grid">
        {paged.items.map((p) => (
          <div key={p.public_id}>
            <ProfileCard profile={p} />
            <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              {p.request_status}
            </p>
            {box === "received" && p.request_status === "pending" && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => api.patch(endpoint, { public_id: p.public_id, action: acceptAction }).then(load)}>
                  Accept
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => api.patch(endpoint, { public_id: p.public_id, action: "decline" }).then(load)}>
                  Decline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <Pagination page={paged.page} pages={paged.pages} count={paged.count} onPage={setPage} label="requests" />
      {!rows.length && <p className="muted">{empty}</p>}
    </section>
  );
}

export function Requests() {
  const [viewers, setViewers] = useState([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [count, setCount] = useState(0);

  useEffect(() => {
    api
      .get("/activity/views/", { params: { page, page_size: PAGE_SIZE } })
      .then((r) => {
        setViewers(asArray(r.data));
        setPage(r.data?.page || page);
        setPages(r.data?.pages || 1);
        setCount(r.data?.count ?? asArray(r.data).length);
      })
      .catch((e) => setError(apiError(e, "Could not load visitors.")));
  }, [page]);

  return (
    <>
      <p className="eyebrow">Inbox of asks</p>
      <h2>Contact, photos, visitors.</h2>
      {error && <p className="notice">{error}</p>}
      <RequestBox endpoint="/contact-requests/" title="Contact requests" empty="No contact requests yet." />
      <RequestBox endpoint="/photo-requests/" title="Photo requests" empty="No photo requests yet." acceptAction="fulfilled" />
      <h3 className="serif" style={{ fontSize: 28, margin: "8px 0 14px" }}>
        Who viewed you
      </h3>
      <div className="card-grid">
        {viewers.map((p) => (
          <div key={p.public_id}>
            <ProfileCard profile={p} />
            {p.viewed_at && (
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Viewed {new Date(p.viewed_at).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
      <Pagination page={page} pages={pages} count={count} onPage={setPage} />
      {!count && (
        <p className="muted">
          No visitors yet. When someone opens your profile, they appear here.{" "}
          <Link to="/app/profile">Keep your profile complete</Link>.
        </p>
      )}
    </>
  );
}
