import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Ban, BadgeCheck, CreditCard, Eye, EyeOff, Trash2, Undo2 } from "lucide-react";
import api, { apiError, mediaUrl } from "../../api/client";
import { Avatar, Badge, Card, Empty, ErrorNote, Field, Modal, Skeleton, cap, fmtDate, num, timeAgo, useAdmin, useFetch } from "../ui";
import { StatusBadges } from "./Members";

export default function MemberDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast, confirm, refreshCounts } = useAdmin();
  const { data: m, loading, error, reload } = useFetch(`/admin/users/${id}/`);
  const plans = useFetch("/admin/plans/");
  const [busy, setBusy] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [grant, setGrant] = useState({ plan: "", days: "" });

  const act = async (action, msg, opts) => {
    if (opts && !(await confirm(opts))) return;
    setBusy(action);
    try {
      await api.patch(`/admin/users/${id}/`, { action });
      toast(msg);
      reload(true);
      refreshCounts();
    } catch (e) {
      toast(apiError(e, "Action failed"), "danger");
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${m.full_name}?`,
      text: "This permanently erases the profile, photos, chats and interests. It can't be undone.",
      confirmLabel: "Delete member",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/users/${id}/`);
      toast("Member deleted");
      refreshCounts();
      nav("/admin/members");
    } catch (e) {
      toast(apiError(e, "Could not delete"), "danger");
    }
  };

  const savePlan = async () => {
    if (!grant.plan) return;
    setBusy("plan");
    try {
      await api.post(`/admin/users/${id}/plan/`, { plan: grant.plan, days: Number(grant.days) || 0 });
      toast(grant.plan === "free" ? "Moved to the Free plan" : "Plan activated");
      setPlanOpen(false);
      reload(true);
    } catch (e) {
      toast(apiError(e, "Could not change the plan"), "danger");
    } finally {
      setBusy("");
    }
  };

  if (loading && !m) return <Skeleton rows={10} />;
  if (error) return <ErrorNote text={error} onRetry={reload} />;
  if (!m) return null;

  const info = [
    ["Email", m.email],
    ["Mobile", m.mobile],
    ["Gender", cap(m.gender)],
    ["Date of birth", fmtDate(m.date_of_birth)],
    ["Profile created by", cap(m.created_by) || "—"],
    ["Location", [m.city, m.state, m.country].filter(Boolean).join(", ") || "—"],
    ["Religion", m.religion || "—"],
    ["Community", m.community || "—"],
    ["Mother tongue", m.mother_tongue || "—"],
    ["Marital status", cap(m.marital_status) || "—"],
    ["Education", m.education || "—"],
    ["Profession", m.profession || "—"],
    ["Joined", fmtDate(m.date_joined, true)],
    ["Last seen", m.presence === "online" ? "Online now" : timeAgo(m.last_seen)],
  ];
  const isStaff = m.is_staff;

  return (
    <>
      <Link to="/admin/members" className="adm-back">
        <ArrowLeft size={15} /> Members
      </Link>

      <section className="adm-card adm-profile-head">
        <Avatar name={m.full_name} photo={m.photos?.[0]} size={72} />
        <div className="adm-profile-id">
          <h1>
            {m.full_name} {m.blue_tick && <BadgeCheck size={18} className="adm-tick" />}
          </h1>
          <p className="adm-muted">
            <span className="adm-mono">{m.public_id || "No profile"}</span> · {m.email}
          </p>
          <div style={{ marginTop: 8 }}>
            <StatusBadges m={m} /> {m.plan && m.plan !== "free" && <Badge tone="gold">{cap(m.plan)} plan</Badge>}
          </div>
        </div>
        {!isStaff && m.is_active && (
          <div className="adm-profile-actions">
            {m.is_banned ? (
              <button className="adm-btn" disabled={!!busy} onClick={() => act("unban", "Ban lifted")}>
                <Undo2 size={15} /> Unban
              </button>
            ) : (
              <button
                className="adm-btn danger-outline"
                disabled={!!busy}
                onClick={() => act("ban", "Member banned", { title: `Ban ${m.full_name}?`, text: "They'll be signed out and can't log in, message or appear anywhere.", confirmLabel: "Ban member", danger: true })}
              >
                <Ban size={15} /> Ban
              </button>
            )}
            <button className="adm-btn" disabled={!!busy} onClick={() => act(m.blue_tick ? "unverify" : "verify", m.blue_tick ? "Blue tick removed" : "Blue tick granted")}>
              <BadgeCheck size={15} /> {m.blue_tick ? "Remove blue tick" : "Give blue tick"}
            </button>
            <button className="adm-btn" disabled={!!busy} onClick={() => act(m.is_hidden ? "unhide" : "hide", m.is_hidden ? "Profile visible again" : "Profile hidden")}>
              {m.is_hidden ? <Eye size={15} /> : <EyeOff size={15} />} {m.is_hidden ? "Unhide" : "Hide"}
            </button>
            <button
              className="adm-btn"
              disabled={!!busy}
              onClick={() => {
                setGrant({ plan: m.plan && m.plan !== "free" ? m.plan : "", days: "" });
                setPlanOpen(true);
              }}
            >
              <CreditCard size={15} /> Change plan
            </button>
            <button className="adm-btn danger" disabled={!!busy} onClick={remove}>
              <Trash2 size={15} /> Delete
            </button>
          </div>
        )}
      </section>

      <div className="adm-stats compact">
        {[
          ["Conversations", m.conversations],
          ["Messages sent", m.messages_sent],
          ["Interests sent", m.interests_sent],
          ["Interests received", m.interests_received],
          ["Reports against", m.reports_against],
          ["Reports made", m.reports_made],
        ].map(([l, v]) => (
          <div key={l} className="adm-stat">
            <span className="adm-stat-label">{l}</span>
            <div className="adm-stat-value">{num(v)}</div>
          </div>
        ))}
      </div>

      <div className="adm-grid-2 wide-left">
        <Card title="Profile details">
          <dl className="adm-dl">
            {info.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v || "—"}</dd>
              </div>
            ))}
          </dl>
          {m.about && (
            <>
              <h3 className="adm-subhead">About</h3>
              <p className="adm-prose">{m.about}</p>
            </>
          )}
        </Card>
        <Card title="Photos" sub={m.selfie ? "Live selfie shown first" : undefined}>
          {m.photos?.length || m.selfie ? (
            <div className="adm-photo-grid small">
              {m.selfie && (
                <figure>
                  <img src={mediaUrl(m.selfie)} alt="Live selfie" referrerPolicy="no-referrer" />
                  <figcaption>Live selfie</figcaption>
                </figure>
              )}
              {m.photos?.map((u, i) => (
                <figure key={u}>
                  <a href={mediaUrl(u)} target="_blank" rel="noreferrer">
                    <img src={mediaUrl(u)} alt="" referrerPolicy="no-referrer" />
                  </a>
                  {i === 0 && <figcaption>Main photo</figcaption>}
                </figure>
              ))}
            </div>
          ) : (
            <Empty title="No photos" />
          )}
        </Card>
      </div>

      <Card title="Reports against this member" pad={false}>
        {m.reports?.length ? (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Reason</th>
                <th>Details</th>
                <th>Reported by</th>
                <th>Status</th>
                <th className="adm-right">When</th>
              </tr>
            </thead>
            <tbody>
              {m.reports.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => nav(`/admin/reports?open=${r.id}&status=all`)}>
                  <td>
                    <Badge tone="danger">{cap(r.reason)}</Badge>
                  </td>
                  <td className="adm-clip">{r.details || "—"}</td>
                  <td>{r.reporter?.full_name}</td>
                  <td>
                    <Badge tone={r.status === "open" ? "warn" : "neutral"}>{cap(r.status)}</Badge>
                  </td>
                  <td className="adm-right adm-muted">{timeAgo(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty title="No reports" text="Nobody has reported this member." />
        )}
      </Card>

      <Modal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        title={`Change plan · ${m.full_name}`}
        footer={
          <>
            <button className="adm-btn" onClick={() => setPlanOpen(false)}>
              Cancel
            </button>
            <button className="adm-btn primary" disabled={!grant.plan || busy === "plan"} onClick={savePlan}>
              Save plan
            </button>
          </>
        }
      >
        <Field label="Plan">
          <select value={grant.plan} onChange={(e) => setGrant({ ...grant, plan: e.target.value })}>
            <option value="">Choose a plan</option>
            {(plans.data || []).map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name} {p.price ? `· ₹${p.price}` : ""}
              </option>
            ))}
          </select>
        </Field>
        {grant.plan && grant.plan !== "free" && (
          <Field label="Duration (days)" hint="Leave empty to use the plan's default length.">
            <input type="number" min="1" max="3650" value={grant.days} onChange={(e) => setGrant({ ...grant, days: e.target.value })} />
          </Field>
        )}
        <p className="adm-muted" style={{ fontSize: 13 }}>
          The member gets an in-app notification when a paid plan is activated.
        </p>
      </Modal>
    </>
  );
}
