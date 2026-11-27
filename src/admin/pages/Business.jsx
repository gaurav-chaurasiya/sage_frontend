import { useState } from "react";
import { Link } from "react-router-dom";
import { BookHeart, CreditCard, Megaphone, Pencil, Plus, Send, Trash2 } from "lucide-react";
import api, { apiError, mediaUrl } from "../../api/client";
import { Badge, Card, Empty, ErrorNote, Field, Modal, PageHead, Pager, Skeleton, Tabs, fmtDate, num, timeAgo, useAdmin, useFetch } from "../ui";

// ---------------- Plans & subscriptions ----------------

export function Plans() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const plans = useFetch("/admin/plans/");
  const subs = useFetch("/admin/subscriptions/", { status, page, page_size: size });

  return (
    <>
      <PageHead title="Plans & subscriptions" sub="Membership plans and every member on a paid plan. To give a member a plan, open their profile → Change plan." />
      <div className="adm-plan-grid">
        {plans.loading && !plans.data ? (
          <Skeleton rows={3} />
        ) : (
          (plans.data || []).map((p) => (
            <article key={p.slug} className="adm-card adm-plan">
              <div className="adm-plan-top">
                <strong>{p.name}</strong>
                {p.highlight && <Badge tone="gold">{p.highlight}</Badge>}
              </div>
              <div className="adm-plan-price">
                {p.price ? `₹${num(p.price)}` : "Free"}
                <span>{p.duration_days ? ` / ${p.duration_days} days` : ""}</span>
              </div>
              <ul>
                {(p.features || []).slice(0, 4).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </article>
          ))
        )}
      </div>
      <p className="adm-note">
        Payments aren't switched on yet — every plan is complimentary at checkout. Prices above are what members will see once billing (Stripe / Apple In-App Purchase) is connected.
      </p>

      <Tabs
        items={[
          { key: "all", label: "All paid" },
          { key: "active", label: "Active" },
          { key: "expired", label: "Expired" },
        ]}
        value={status}
        onChange={(k) => {
          setStatus(k);
          setPage(1);
        }}
      />
      <Card pad={false}>
        <ErrorNote text={subs.error} onRetry={subs.reload} />
        {subs.loading && !subs.data ? (
          <div className="adm-card-body">
            <Skeleton />
          </div>
        ) : subs.data?.results?.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Plan</th>
                  <th>Started</th>
                  <th>Expires</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {subs.data.results.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/admin/members/${s.member?.id}`}>
                        <strong>{s.member?.full_name}</strong>
                      </Link>
                      <div className="adm-muted">{s.member?.email}</div>
                    </td>
                    <td>
                      <Badge tone="gold">{s.plan_name}</Badge>
                    </td>
                    <td>{fmtDate(s.started_at)}</td>
                    <td>{fmtDate(s.expires_at)}</td>
                    <td>{s.active ? <Badge tone="good">Active</Badge> : <Badge tone="neutral">Expired</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={CreditCard} title="No paid subscriptions" />
        )}
        <Pager page={subs.data?.page || 1} pages={subs.data?.pages || 1} count={subs.data?.count || 0} size={size} label="subscriptions" onPage={setPage} onSize={(n) => { setSize(n); setPage(1); }} />
      </Card>
    </>
  );
}

// ---------------- Success stories ----------------

const BLANK = { names: "", city: "", married_on: "", photo: "", quote: "", published: false };

export function Stories() {
  const { toast, confirm, refreshCounts } = useAdmin();
  const { data, loading, error, reload } = useFetch("/admin/stories/");
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const list = data || [];
  const PER = 9;
  const pages = Math.max(1, Math.ceil(list.length / PER));
  const shown = list.slice((page - 1) * PER, page * PER);

  const save = async () => {
    setSaving(true);
    try {
      if (edit.id) await api.patch(`/admin/stories/${edit.id}/`, edit);
      else await api.post("/admin/stories/", edit);
      toast(edit.id ? "Story updated" : "Story added");
      setEdit(null);
      reload(true);
      refreshCounts();
    } catch (e) {
      toast(apiError(e, "Could not save"), "danger");
    } finally {
      setSaving(false);
    }
  };
  const publish = async (s) => {
    try {
      await api.patch(`/admin/stories/${s.id}/`, { published: !s.published });
      toast(s.published ? "Hidden from the website" : "Published on the website");
      reload(true);
      refreshCounts();
    } catch (e) {
      toast(apiError(e, "Failed"), "danger");
    }
  };
  const remove = async (s) => {
    if (!(await confirm({ title: `Delete “${s.names}”?`, text: "The story is removed permanently.", confirmLabel: "Delete", danger: true }))) return;
    try {
      await api.delete(`/admin/stories/${s.id}/`);
      toast("Story deleted");
      reload(true);
      refreshCounts();
    } catch (e) {
      toast(apiError(e, "Failed"), "danger");
    }
  };

  return (
    <>
      <PageHead title="Success stories" sub="Only published stories appear on the website. Publish real couples only, with their permission.">
        <button className="adm-btn primary" onClick={() => setEdit({ ...BLANK })}>
          <Plus size={15} /> Add story
        </button>
      </PageHead>
      <ErrorNote text={error} onRetry={reload} />
      {loading && !data ? (
        <Skeleton rows={5} />
      ) : shown.length ? (
        <div className="adm-story-grid">
          {shown.map((s) => (
            <article key={s.id} className="adm-card adm-story">
              {s.photo ? <img src={mediaUrl(s.photo)} alt="" referrerPolicy="no-referrer" /> : <div className="adm-noimg">No photo</div>}
              <div className="adm-story-body">
                <div className="adm-story-top">
                  <strong>{s.names}</strong>
                  {s.published ? <Badge tone="good">Published</Badge> : <Badge tone="neutral">Draft</Badge>}
                </div>
                <span className="adm-muted">{[s.city, s.married_on].filter(Boolean).join(" · ")}</span>
                <p>{s.quote}</p>
              </div>
              <div className="adm-story-actions">
                <button className={`adm-btn sm ${s.published ? "" : "primary"}`} onClick={() => publish(s)}>
                  {s.published ? "Unpublish" : "Publish"}
                </button>
                <button className="adm-icon-btn" aria-label="Edit" onClick={() => setEdit({ ...BLANK, ...s })}>
                  <Pencil size={15} />
                </button>
                <button className="adm-icon-btn danger" aria-label="Delete" onClick={() => remove(s)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Card>
          <Empty icon={BookHeart} title="No stories yet" text="Add a couple's story and publish it when they're happy with it." />
        </Card>
      )}
      <Pager page={page} pages={pages} count={list.length} size={PER} label="stories" onPage={setPage} />

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "Edit story" : "Add story"}
        footer={
          <>
            <button className="adm-btn" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button className="adm-btn primary" disabled={saving || !edit?.names?.trim() || !edit?.quote?.trim()} onClick={save}>
              {saving ? "Saving…" : "Save story"}
            </button>
          </>
        }
      >
        {edit && (
          <div className="adm-form">
            <Field label="Couple's names *">
              <input value={edit.names} onChange={(e) => setEdit({ ...edit, names: e.target.value })} placeholder="Ananya & Rohan" />
            </Field>
            <div className="adm-form-row">
              <Field label="City">
                <input value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} placeholder="Toronto" />
              </Field>
              <Field label="Married">
                <input value={edit.married_on} onChange={(e) => setEdit({ ...edit, married_on: e.target.value })} placeholder="Oct 2026" />
              </Field>
            </div>
            <Field label="Photo URL" hint="A link to the couple's photo (optional).">
              <input value={edit.photo} onChange={(e) => setEdit({ ...edit, photo: e.target.value })} placeholder="https://…" />
            </Field>
            <Field label="Their story *">
              <textarea rows={5} value={edit.quote} onChange={(e) => setEdit({ ...edit, quote: e.target.value })} placeholder="How they met on Sage Matrimony…" />
            </Field>
            <label className="adm-check">
              <input type="checkbox" checked={!!edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} /> Publish on the website now
            </label>
          </div>
        )}
      </Modal>
    </>
  );
}

// ---------------- Broadcast ----------------

const AUDIENCES = { all: "All members", female: "Women only", male: "Men only", verified: "Phone-verified members" };

export function Broadcast() {
  const { toast, confirm } = useAdmin();
  const [form, setForm] = useState({ title: "", body: "", audience: "all" });
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const hist = useFetch("/admin/broadcasts/", { page, page_size: 10 });

  const send = async (e) => {
    e.preventDefault();
    const ok = await confirm({
      title: "Send this announcement?",
      text: `“${form.title}” goes to ${AUDIENCES[form.audience].toLowerCase()} as an in-app notification right away. It can't be unsent.`,
      confirmLabel: "Send now",
    });
    if (!ok) return;
    setSending(true);
    try {
      const { data } = await api.post("/admin/broadcasts/", form);
      toast(`Sent to ${num(data.recipients)} members`);
      setForm({ title: "", body: "", audience: form.audience });
      hist.reload(true);
    } catch (err) {
      toast(apiError(err, "Could not send"), "danger");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHead title="Broadcast" sub="Send an announcement to members' notification bell — instantly to everyone online." />
      <div className="adm-grid-2">
        <Card title="New announcement">
          <form className="adm-form" onSubmit={send}>
            <Field label="Audience">
              <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                {Object.entries(AUDIENCES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title" hint={`${form.title.length}/80`}>
              <input maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="New: video verification" required />
            </Field>
            <Field label="Message" hint={`${form.body.length}/500`}>
              <textarea maxLength={500} rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write a short, friendly update…" required />
            </Field>
            <button className="adm-btn primary" disabled={sending || !form.title.trim() || !form.body.trim()}>
              <Send size={15} /> {sending ? "Sending…" : "Send announcement"}
            </button>
          </form>
        </Card>
        <Card title="Preview" sub="How it appears in the member's notifications">
          <div className="adm-notif-preview">
            <span className="adm-notif-icon">
              <Megaphone size={16} />
            </span>
            <div>
              <strong>{form.title || "Announcement title"}</strong>
              <p>{form.body || "Your message shows here."}</p>
              <small>Sage Matrimony · just now</small>
            </div>
          </div>
        </Card>
      </div>
      <Card title="Sent announcements" pad={false}>
        {hist.data?.results?.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Announcement</th>
                  <th>Audience</th>
                  <th className="adm-right">Recipients</th>
                  <th>Sent by</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {hist.data.results.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <strong>{b.title}</strong>
                      <div className="adm-muted adm-clip">{b.body}</div>
                    </td>
                    <td>{AUDIENCES[b.audience] || b.audience}</td>
                    <td className="adm-right">{num(b.recipients)}</td>
                    <td>{b.sent_by}</td>
                    <td className="adm-nowrap">{timeAgo(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={Megaphone} title="No announcements sent yet" />
        )}
        <Pager page={hist.data?.page || 1} pages={hist.data?.pages || 1} count={hist.data?.count || 0} size={10} label="announcements" onPage={setPage} />
      </Card>
    </>
  );
}
