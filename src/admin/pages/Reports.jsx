import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Ban, Check, Flag, X } from "lucide-react";
import api, { apiError, mediaUrl } from "../../api/client";
import { Badge, Card, Empty, ErrorNote, Modal, PageHead, Pager, Skeleton, Tabs, cap, fmtDate, timeAgo, useAdmin, useFetch } from "../ui";

export default function Reports() {
  const [sp, setSp] = useSearchParams();
  const status = sp.get("status") || "open";
  const page = Number(sp.get("page") || 1);
  const size = Number(sp.get("size") || 25);
  const openId = sp.get("open");
  const { toast, refreshCounts, onLive } = useAdmin();
  const { data, loading, error, reload } = useFetch("/admin/reports/", { status, page, page_size: size });

  useEffect(() => onLive((ev) => ev.kind === "report" && reload(true)), [onLive, reload]);

  const set = (patch) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in patch) && !("open" in patch)) next.delete("page");
    setSp(next);
  };

  const c = data?.counts || {};
  return (
    <>
      <PageHead title="Reports" sub="Profiles members flagged as fake, abusive or fraudulent. Review the chat, then act." />
      <Tabs
        items={[
          { key: "open", label: "Open", count: c.open },
          { key: "resolved", label: "Resolved", count: c.resolved },
          { key: "dismissed", label: "Dismissed", count: c.dismissed },
          { key: "all", label: "All" },
        ]}
        value={status}
        onChange={(k) => set({ status: k })}
      />
      <Card pad={false}>
        <ErrorNote text={error} onRetry={reload} />
        {loading && !data ? (
          <div className="adm-card-body">
            <Skeleton rows={6} />
          </div>
        ) : data?.results?.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Reported member</th>
                  <th>Reason</th>
                  <th>Details</th>
                  <th>Reported by</th>
                  <th className="adm-right">Total reports</th>
                  <th>Status</th>
                  <th>When</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.id} className="clickable" onClick={() => set({ open: r.id })}>
                    <td>
                      <strong>{r.target?.full_name}</strong>
                      <div className="adm-mono adm-muted">{r.target?.public_id}</div>
                    </td>
                    <td>
                      <Badge tone="danger">{cap(r.reason)}</Badge>
                    </td>
                    <td className="adm-clip">{r.details || <span className="adm-muted">—</span>}</td>
                    <td>{r.reporter?.full_name}</td>
                    <td className="adm-right">{r.reports_against_target}</td>
                    <td>
                      <ReportStatus r={r} />
                    </td>
                    <td className="adm-nowrap">{timeAgo(r.created_at)}</td>
                    <td className="adm-right">
                      <button className="adm-btn sm">Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={Flag} title={status === "open" ? "No open reports" : "No reports"} text={status === "open" ? "You're all caught up." : undefined} />
        )}
        <Pager page={data?.page || 1} pages={data?.pages || 1} count={data?.count || 0} size={size} label="reports" onPage={(p) => set({ page: String(p) })} onSize={(n) => set({ size: String(n) })} />
      </Card>
      {openId && (
        <ReportReview
          id={openId}
          onClose={() => set({ open: "" })}
          onDone={(msg) => {
            toast(msg);
            set({ open: "" });
            reload(true);
            refreshCounts();
          }}
          onError={(e) => toast(apiError(e, "Action failed"), "danger")}
        />
      )}
    </>
  );
}

function ReportStatus({ r }) {
  if (r.status === "open") return <Badge tone="warn">Open</Badge>;
  if (r.target?.is_banned) return <Badge tone="danger">Banned</Badge>;
  return <Badge tone="neutral">{cap(r.status)}</Badge>;
}

function ReportReview({ id, onClose, onDone, onError }) {
  const { confirm } = useAdmin();
  const { data: r, loading, error } = useFetch(`/admin/reports/${id}/`);
  const [busy, setBusy] = useState(false);

  const act = async (action) => {
    if (action === "ban") {
      const ok = await confirm({
        title: `Ban ${r.target?.full_name}?`,
        text: "They'll be signed out immediately and every open report against them is resolved.",
        confirmLabel: "Ban member",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await api.patch(`/admin/reports/${id}/`, { action });
      onDone({ ban: "Member banned · reporter notified", resolve: "Report resolved · reporter notified", dismiss: "Report dismissed" }[action]);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title="Review report"
      footer={
        r?.status === "open" ? (
          <>
            <button className="adm-btn" disabled={busy} onClick={() => act("dismiss")}>
              <X size={15} /> Dismiss
            </button>
            <button className="adm-btn" disabled={busy} onClick={() => act("resolve")}>
              <Check size={15} /> Resolve (warned)
            </button>
            {!r.target?.is_banned && (
              <button className="adm-btn danger" disabled={busy} onClick={() => act("ban")}>
                <Ban size={15} /> Ban member
              </button>
            )}
          </>
        ) : (
          <button className="adm-btn" onClick={onClose}>
            Close
          </button>
        )
      }
    >
      {loading && !r ? (
        <Skeleton rows={6} />
      ) : error ? (
        <ErrorNote text={error} />
      ) : (
        <>
          <div className="adm-review-head">
            <div>
              <span className="adm-muted">Reported member</span>
              <Link to={`/admin/members/${r.target?.id}`} onClick={onClose}>
                <strong>{r.target?.full_name}</strong>
              </Link>
              <span className="adm-mono adm-muted">{r.target?.public_id}</span>
            </div>
            <div>
              <span className="adm-muted">Reported by</span>
              <Link to={`/admin/members/${r.reporter?.id}`} onClick={onClose}>
                <strong>{r.reporter?.full_name}</strong>
              </Link>
              <span className="adm-muted">{fmtDate(r.created_at, true)}</span>
            </div>
            <div>
              <span className="adm-muted">Reason</span>
              <Badge tone="danger">{cap(r.reason)}</Badge>
              <span className="adm-muted">{r.reports_against_target} report(s) in total</span>
            </div>
          </div>
          {r.details && <blockquote className="adm-quote">“{r.details}”</blockquote>}
          <h3 className="adm-subhead">Chat between them</h3>
          {r.messages?.length ? (
            <div className="adm-transcript">
              {r.messages.map((m) => (
                <div key={m.id} className={`adm-msg ${m.from_reporter ? "left" : "right"}`}>
                  <span className="adm-msg-who">{m.from_reporter ? r.reporter?.full_name : r.target?.full_name}</span>
                  {m.body && <p>{m.body}</p>}
                  {m.attachment && (
                    <a href={mediaUrl(m.attachment)} target="_blank" rel="noreferrer">
                      Attachment
                    </a>
                  )}
                  <small>{fmtDate(m.created_at, true)}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="adm-muted">They never chatted — the report is about the profile itself.</p>
          )}
        </>
      )}
    </Modal>
  );
}
