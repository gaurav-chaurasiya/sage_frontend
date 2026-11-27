import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, Download, Search, Users } from "lucide-react";
import api, { apiError } from "../../api/client";
import { Avatar, Badge, Card, Empty, ErrorNote, PageHead, Pager, Skeleton, Tabs, cap, timeAgo, useAdmin, useFetch } from "../ui";

const STATUSES = [
  { key: "", label: "All members" },
  { key: "new", label: "New · 7 days" },
  { key: "online", label: "Online" },
  { key: "verified", label: "Phone verified" },
  { key: "unverified", label: "Unverified" },
  { key: "reported", label: "Reported" },
  { key: "hidden", label: "Hidden" },
  { key: "banned", label: "Banned" },
  { key: "deleted", label: "Deleted" },
];

export function StatusBadges({ m }) {
  return (
    <span className="adm-badges">
      {m.is_banned && <Badge tone="danger">Banned</Badge>}
      {!m.is_active && !m.is_banned && <Badge tone="neutral">Deleted</Badge>}
      {m.is_hidden && m.is_active && <Badge tone="warn">Hidden</Badge>}
      {m.blue_tick && <Badge tone="info">Blue tick</Badge>}
      {m.mobile_verified ? <Badge tone="good">Phone verified</Badge> : m.is_active && <Badge tone="neutral">Unverified</Badge>}
    </span>
  );
}

export default function Members() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const { toast } = useAdmin();
  const status = sp.get("status") || "";
  const q = sp.get("q") || "";
  const gender = sp.get("gender") || "";
  const sort = sp.get("sort") || "newest";
  const page = Number(sp.get("page") || 1);
  const size = Number(sp.get("size") || 25);
  const [term, setTerm] = useState(q);
  const [exporting, setExporting] = useState(false);
  useEffect(() => setTerm(q), [q]);

  const { data, loading, error, reload } = useFetch("/admin/users/", { status, q, gender, sort, page, page_size: size });

  const set = (patch) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in patch)) next.delete("page");
    setSp(next);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await api.get("/admin/users/export/", { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sage-members-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Member list downloaded");
    } catch (e) {
      toast(apiError(e, "Export failed"), "danger");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHead title="Members" sub="Search, filter and manage every member account.">
        <button className="adm-btn" onClick={exportCsv} disabled={exporting}>
          <Download size={15} /> {exporting ? "Preparing…" : "Export CSV"}
        </button>
      </PageHead>

      <Tabs items={STATUSES} value={status} onChange={(k) => set({ status: k })} />

      <Card pad={false}>
        <div className="adm-toolbar">
          <form
            className="adm-search"
            onSubmit={(e) => {
              e.preventDefault();
              set({ q: term.trim() });
            }}
          >
            <Search size={15} />
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Name, email, phone or profile ID" aria-label="Search members" />
            {q && (
              <button type="button" className="adm-link" onClick={() => set({ q: "" })}>
                Clear
              </button>
            )}
          </form>
          <select value={gender} onChange={(e) => set({ gender: e.target.value })} aria-label="Gender">
            <option value="">All genders</option>
            <option value="female">Women</option>
            <option value="male">Men</option>
          </select>
          <select value={sort} onChange={(e) => set({ sort: e.target.value === "newest" ? "" : e.target.value })} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="active">Recently active</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
        <ErrorNote text={error} onRetry={reload} />
        {loading && !data ? (
          <div className="adm-card-body">
            <Skeleton rows={8} />
          </div>
        ) : data?.results?.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Profile ID</th>
                  <th>Location</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th className="adm-right">Reports</th>
                  <th>Joined</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody className={loading ? "adm-dim" : ""}>
                {data.results.map((m) => (
                  <tr key={m.id} className="clickable" onClick={() => nav(`/admin/members/${m.id}`)}>
                    <td>
                      <div className="adm-who">
                        <Avatar name={m.full_name} />
                        <div>
                          <strong>
                            {m.full_name} {m.blue_tick && <BadgeCheck size={14} className="adm-tick" />}
                          </strong>
                          <span>{m.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="adm-mono">{m.public_id || "—"}</td>
                    <td>{[m.city, m.country].filter(Boolean).join(", ") || "—"}</td>
                    <td>{m.plan && m.plan !== "free" ? <Badge tone="gold">{cap(m.plan)}</Badge> : <span className="adm-muted">Free</span>}</td>
                    <td>
                      <StatusBadges m={m} />
                    </td>
                    <td className="adm-right">{m.reports_against ? <Badge tone="danger">{m.reports_against}</Badge> : <span className="adm-muted">0</span>}</td>
                    <td className="adm-nowrap">{timeAgo(m.date_joined)}</td>
                    <td className="adm-nowrap">{m.presence === "online" ? <Badge tone="good">Online</Badge> : timeAgo(m.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={Users} title="No members match" text="Try a different filter or search." />
        )}
        <Pager page={data?.page || 1} pages={data?.pages || 1} count={data?.count || 0} size={size} label="members" onPage={(p) => set({ page: String(p) })} onSize={(n) => set({ size: String(n) })} />
      </Card>
    </>
  );
}
