import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Activity as ActivityIcon, KeyRound, LifeBuoy, Mail, Plus, RotateCcw, Trash2, UserCog } from "lucide-react";
import api, { apiError } from "../../api/client";
import { useAuth } from "../../store/auth";
import { Badge, Card, Empty, ErrorNote, Field, Modal, PageHead, Pager, Skeleton, Tabs, cap, fmtDate, timeAgo, useAdmin, useFetch } from "../ui";

// ---------------- Support inbox ----------------

export function Support() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "tickets";
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [open, setOpen] = useState(null);
  const { toast, confirm, refreshCounts, onLive } = useAdmin();
  const tickets = useFetch(tab === "tickets" ? "/admin/tickets/" : null, { status, page, page_size: size });
  const inquiries = useFetch(tab === "contact" ? "/admin/inquiries/" : null, { page, page_size: size });
  const cur = tab === "tickets" ? tickets : inquiries;

  useEffect(
    () =>
      onLive((ev) => {
        if (ev.kind === "ticket" && tab === "tickets") tickets.reload(true);
        if (ev.kind === "inquiry" && tab === "contact") inquiries.reload(true);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onLive, tab]
  );

  const setTab = (k) => {
    setSp(k === "tickets" ? {} : { tab: k });
    setPage(1);
  };

  const setTicket = async (t, next) => {
    try {
      await api.patch(`/admin/tickets/${t.id}/`, { status: next });
      toast(next === "closed" ? "Ticket closed" : "Ticket reopened");
      setOpen(null);
      tickets.reload(true);
      refreshCounts();
    } catch (e) {
      toast(apiError(e, "Failed"), "danger");
    }
  };
  const delInquiry = async (q) => {
    if (!(await confirm({ title: "Delete this message?", text: `From ${q.name} <${q.email}>.`, confirmLabel: "Delete", danger: true }))) return;
    try {
      await api.delete(`/admin/inquiries/${q.id}/`);
      toast("Message deleted");
      setOpen(null);
      inquiries.reload(true);
    } catch (e) {
      toast(apiError(e, "Failed"), "danger");
    }
  };

  const mailto = (to, subject, body) => `mailto:${to}?subject=${encodeURIComponent(`Re: ${subject}`)}&body=${encodeURIComponent(`\n\n---\n${body || ""}`)}`;

  return (
    <>
      <PageHead title="Support" sub="Help requests from members inside the app, and messages from the website contact form." />
      <Tabs
        items={[
          { key: "tickets", label: "Member tickets" },
          { key: "contact", label: "Contact form" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <Card pad={false}>
        {tab === "tickets" && (
          <div className="adm-toolbar">
            <div className="adm-seg">
              {["open", "closed", "all"].map((s) => (
                <button
                  key={s}
                  className={status === s ? "on" : ""}
                  onClick={() => {
                    setStatus(s);
                    setPage(1);
                  }}
                >
                  {cap(s)}
                </button>
              ))}
            </div>
          </div>
        )}
        <ErrorNote text={cur.error} onRetry={cur.reload} />
        {cur.loading && !cur.data ? (
          <div className="adm-card-body">
            <Skeleton />
          </div>
        ) : cur.data?.results?.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                {tab === "tickets" ? (
                  <tr>
                    <th>Subject</th>
                    <th>Member</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>When</th>
                  </tr>
                ) : (
                  <tr>
                    <th>From</th>
                    <th>Topic</th>
                    <th>Message</th>
                    <th>When</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {tab === "tickets"
                  ? cur.data.results.map((t) => (
                      <tr key={t.id} className="clickable" onClick={() => setOpen({ type: "ticket", row: t })}>
                        <td>
                          <strong>{t.subject}</strong>
                          <div className="adm-muted adm-clip">{t.message}</div>
                        </td>
                        <td>{t.member?.full_name}</td>
                        <td>{cap(t.category)}</td>
                        <td>{t.status === "closed" ? <Badge tone="neutral">Closed</Badge> : <Badge tone="warn">Open</Badge>}</td>
                        <td className="adm-nowrap">{timeAgo(t.created_at)}</td>
                      </tr>
                    ))
                  : cur.data.results.map((q) => (
                      <tr key={q.id} className="clickable" onClick={() => setOpen({ type: "contact", row: q })}>
                        <td>
                          <strong>{q.name}</strong>
                          <div className="adm-muted">{q.email}</div>
                        </td>
                        <td>{cap(q.topic)}</td>
                        <td className="adm-clip">{q.message}</td>
                        <td className="adm-nowrap">{timeAgo(q.created_at)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={LifeBuoy} title={tab === "tickets" ? "No tickets" : "No contact messages"} />
        )}
        <Pager page={cur.data?.page || 1} pages={cur.data?.pages || 1} count={cur.data?.count || 0} size={size} label="messages" onPage={setPage} onSize={(n) => { setSize(n); setPage(1); }} />
      </Card>

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.type === "ticket" ? open.row.subject : `Message from ${open?.row.name}`}
        footer={
          open?.type === "ticket" ? (
            <>
              {open.row.member?.email && (
                <a className="adm-btn" href={mailto(open.row.member.email, open.row.subject, open.row.message)}>
                  <Mail size={15} /> Reply by email
                </a>
              )}
              {open.row.status === "closed" ? (
                <button className="adm-btn" onClick={() => setTicket(open.row, "open")}>
                  <RotateCcw size={15} /> Reopen
                </button>
              ) : (
                <button className="adm-btn primary" onClick={() => setTicket(open.row, "closed")}>
                  Mark as solved
                </button>
              )}
            </>
          ) : open ? (
            <>
              <button className="adm-btn danger-outline" onClick={() => delInquiry(open.row)}>
                <Trash2 size={15} /> Delete
              </button>
              <a className="adm-btn primary" href={mailto(open.row.email, open.row.topic || "Your message", open.row.message)}>
                <Mail size={15} /> Reply by email
              </a>
            </>
          ) : null
        }
      >
        {open?.type === "ticket" && (
          <>
            <p className="adm-muted">
              {open.row.member?.id ? <Link to={`/admin/members/${open.row.member.id}`}>{open.row.member.full_name}</Link> : open.row.member?.full_name} · {open.row.member?.email} · {fmtDate(open.row.created_at, true)}
            </p>
            <Badge tone="neutral">{cap(open.row.category)}</Badge>
            <p className="adm-prose" style={{ marginTop: 12 }}>
              {open.row.message}
            </p>
          </>
        )}
        {open?.type === "contact" && (
          <>
            <p className="adm-muted">
              {open.row.email}
              {open.row.phone ? ` · ${open.row.phone}` : ""} · {fmtDate(open.row.created_at, true)}
            </p>
            <Badge tone="neutral">{cap(open.row.topic)}</Badge>
            <p className="adm-prose" style={{ marginTop: 12 }}>
              {open.row.message}
            </p>
          </>
        )}
      </Modal>
    </>
  );
}

// ---------------- Activity log ----------------

const ACTION_LABEL = {
  ban: "Banned member",
  unban: "Lifted ban",
  verify: "Gave blue tick",
  unverify: "Removed blue tick",
  hide: "Hid profile",
  unhide: "Unhid profile",
  delete_member: "Deleted member",
  report_ban: "Banned from report",
  report_resolve: "Resolved report",
  report_dismiss: "Dismissed report",
  review_report: "Reviewed report",
  add_story: "Added story",
  edit_story: "Edited story",
  publish_story: "Published story",
  unpublish_story: "Unpublished story",
  delete_story: "Deleted story",
  ticket_open: "Reopened ticket",
  ticket_closed: "Closed ticket",
  delete_inquiry: "Deleted contact message",
  grant_plan: "Changed plan",
  remove_photo: "Removed photo",
  broadcast: "Sent announcement",
  export: "Exported members",
  add_admin: "Added admin",
  remove_admin: "Removed admin",
};
const DANGER = new Set(["ban", "report_ban", "delete_member", "remove_photo", "remove_admin"]);

export function ActivityLog() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const { data, loading, error, reload } = useFetch("/admin/audit/", { page, page_size: size });
  return (
    <>
      <PageHead title="Activity log" sub="Every action taken in this console — who did what, and when." />
      <Card pad={false}>
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
                  <th>When</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>On</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((a) => (
                  <tr key={a._id}>
                    <td className="adm-nowrap" title={fmtDate(a.created_at, true)}>
                      {timeAgo(a.created_at)}
                    </td>
                    <td>{a.admin_name}</td>
                    <td>
                      <Badge tone={DANGER.has(a.action) ? "danger" : "neutral"}>{ACTION_LABEL[a.action] || cap(a.action)}</Badge>
                    </td>
                    <td>{a.target}</td>
                    <td className="adm-muted adm-clip">{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={ActivityIcon} title="No admin actions yet" />
        )}
        <Pager page={data?.page || 1} pages={data?.pages || 1} count={data?.count || 0} size={size} label="actions" onPage={setPage} onSize={(n) => { setSize(n); setPage(1); }} />
      </Card>
    </>
  );
}

// ---------------- Settings ----------------

export function Settings() {
  const { user } = useAuth();
  const { toast, confirm } = useAdmin();
  const team = useFetch("/admin/staff/");
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [add, setAdd] = useState(null);
  const [addBusy, setAddBusy] = useState(false);

  const changePw = async (e) => {
    e.preventDefault();
    if (pw.new_password !== pw.confirm) {
      toast("The new passwords don't match", "danger");
      return;
    }
    setPwBusy(true);
    try {
      await api.post("/auth/password/", { current_password: pw.current_password, new_password: pw.new_password });
      toast("Password changed");
      setPw({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      toast(apiError(err, "Could not change password"), "danger");
    } finally {
      setPwBusy(false);
    }
  };

  const addAdmin = async () => {
    setAddBusy(true);
    try {
      await api.post("/admin/staff/", add);
      toast(`${add.full_name} can now sign in to the console`);
      setAdd(null);
      team.reload(true);
    } catch (err) {
      toast(apiError(err, "Could not add admin"), "danger");
    } finally {
      setAddBusy(false);
    }
  };

  const removeAdmin = async (a) => {
    if (!(await confirm({ title: `Remove ${a.full_name}?`, text: "They lose access to the admin console immediately.", confirmLabel: "Remove admin", danger: true }))) return;
    try {
      await api.delete(`/admin/staff/${a.id}/`);
      toast("Admin removed");
      team.reload(true);
    } catch (err) {
      toast(apiError(err, "Could not remove"), "danger");
    }
  };

  return (
    <>
      <PageHead title="Settings" sub="Your admin login and who else can access this console." />
      <div className="adm-grid-2">
        <Card title="Change your password" sub={user?.email}>
          <form className="adm-form" onSubmit={changePw}>
            <Field label="Current password">
              <input type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} required />
            </Field>
            <Field label="New password" hint="At least 10 characters. Use a password manager.">
              <input type="password" autoComplete="new-password" minLength={10} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} required />
            </Field>
            <Field label="Confirm new password">
              <input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
            </Field>
            <button className="adm-btn primary" disabled={pwBusy}>
              <KeyRound size={15} /> {pwBusy ? "Saving…" : "Change password"}
            </button>
          </form>
        </Card>
        <Card
          title="Admin team"
          sub="Admins sign in at /admin/login. They don't have a member profile and never appear to members."
          action={
            <button className="adm-btn sm primary" onClick={() => setAdd({ full_name: "", email: "", password: "" })}>
              <Plus size={14} /> Add admin
            </button>
          }
          pad={false}
        >
          {team.loading && !team.data ? (
            <div className="adm-card-body">
              <Skeleton rows={3} />
            </div>
          ) : (
            <table className="adm-table">
              <tbody>
                {(team.data || []).map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="adm-who">
                        <span className="adm-me-avatar">
                          <UserCog size={15} />
                        </span>
                        <div>
                          <strong>
                            {a.full_name} {a.id === user?.id && <Badge tone="info">You</Badge>}
                          </strong>
                          <span>{a.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="adm-muted adm-nowrap">Last active {timeAgo(a.last_seen)}</td>
                    <td className="adm-right">
                      {a.id !== user?.id && (
                        <button className="adm-icon-btn danger" aria-label={`Remove ${a.full_name}`} onClick={() => removeAdmin(a)}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Modal
        open={!!add}
        onClose={() => setAdd(null)}
        title="Add an admin"
        footer={
          <>
            <button className="adm-btn" onClick={() => setAdd(null)}>
              Cancel
            </button>
            <button className="adm-btn primary" disabled={addBusy || !add?.full_name || !add?.email || (add?.password || "").length < 10} onClick={addAdmin}>
              {addBusy ? "Adding…" : "Add admin"}
            </button>
          </>
        }
      >
        {add && (
          <div className="adm-form">
            <Field label="Full name">
              <input value={add.full_name} onChange={(e) => setAdd({ ...add, full_name: e.target.value })} />
            </Field>
            <Field label="Email">
              <input type="email" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} />
            </Field>
            <Field label="Temporary password" hint="At least 10 characters. Share it privately; they should change it after signing in.">
              <input type="text" autoComplete="off" value={add.password} onChange={(e) => setAdd({ ...add, password: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
