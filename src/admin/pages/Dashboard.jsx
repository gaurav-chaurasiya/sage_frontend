import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flag, Heart, LifeBuoy, MessageCircle, UserPlus, Users, Wifi } from "lucide-react";
import { LiveFeed } from "../AdminLayout";
import { Avatar, Badge, BarList, Card, ColumnChart, Empty, ErrorNote, PageHead, Skeleton, Stat, cap, num, timeAgo, useAdmin, useFetch } from "../ui";

const RANGES = [
  { v: 7, l: "7 days" },
  { v: 30, l: "30 days" },
  { v: 90, l: "90 days" },
];

export default function Dashboard() {
  const { counts: o, feed, onLive } = useAdmin();
  const [days, setDays] = useState(30);
  const ins = useFetch("/admin/insights/", { days });
  const recent = useFetch("/admin/recent/");
  const nav = useNavigate();

  // Live: refresh the lists when something relevant happens.
  useEffect(
    () =>
      onLive((ev) => {
        if (ev.kind === "signup" || ev.kind === "report") recent.reload(true);
        if (["signup", "message", "interest", "report"].includes(ev.kind)) ins.reload(true);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onLive]
  );

  const d = ins.data;
  const sum = (a) => (a || []).reduce((x, y) => x + y, 0);

  return (
    <>
      <PageHead title="Dashboard" sub="Everything happening on Sage Matrimony, updated live.">
        <div className="adm-seg" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r.v} className={days === r.v ? "on" : ""} onClick={() => setDays(r.v)}>
              {r.l}
            </button>
          ))}
        </div>
      </PageHead>

      <div className="adm-stats">
        <Stat label="Total members" value={num(o.members)} sub={`+${num(o.joined_30d)} in 30 days`} icon={Users} to="/admin/members" />
        <Stat label="New today" value={num(o.joined_today)} sub={`${num(o.joined_7d)} this week`} icon={UserPlus} tone="good" to="/admin/members?status=new" />
        <Stat label="Online now" value={num(o.online_now)} sub={`${num(o.active_7d)} active this week`} icon={Wifi} tone="good" live to="/admin/members?status=online" />
        <Stat label="Open reports" value={num(o.open_reports)} sub={o.open_reports ? "Needs review" : "All clear"} icon={Flag} tone={o.open_reports ? "danger" : "neutral"} to="/admin/reports" />
        <Stat label="Messages · 7 days" value={num(o.messages_7d)} sub={`${num(o.conversations)} conversations`} icon={MessageCircle} tone="info" />
        <Stat label="Interests · 7 days" value={num(o.interests_7d)} sub={`${num(o.accepted_7d)} accepted`} icon={Heart} tone="gold" />
      </div>

      <ErrorNote text={ins.error} onRetry={ins.reload} />

      <div className="adm-grid-2">
        <Card title="New members" sub={d ? `${num(sum(d.signups))} joined in the last ${days} days` : " "}>
          {d ? <ColumnChart labels={d.days} values={d.signups} /> : <Skeleton rows={4} />}
        </Card>
        <Card title="Messages sent" sub={d ? `${num(sum(d.messages))} in the last ${days} days` : " "}>
          {d ? <ColumnChart labels={d.days} values={d.messages} tone="info" /> : <Skeleton rows={4} />}
        </Card>
      </div>

      <div className="adm-grid-3">
        <Card title="Interests sent" sub={d ? `${num(sum(d.interests))} in ${days} days` : " "}>
          {d ? <ColumnChart labels={d.days} values={d.interests} height={130} tone="gold" /> : <Skeleton rows={3} />}
        </Card>
        <Card title="Members by plan">{d ? <BarList rows={d.plans} /> : <Skeleton rows={3} />}</Card>
        <Card title="Gender">{d ? <BarList rows={d.gender} /> : <Skeleton rows={3} />}</Card>
      </div>

      <div className="adm-grid-3">
        <Card title="Top cities">{d ? <BarList rows={d.cities} /> : <Skeleton rows={4} />}</Card>
        <Card title="Religion">{d ? <BarList rows={d.religions} /> : <Skeleton rows={4} />}</Card>
        <Card title="Needs attention">
          <ul className="adm-todo">
            <li>
              <Link to="/admin/reports">
                <Flag size={15} /> Open reports <Badge tone={o.open_reports ? "danger" : "neutral"}>{num(o.open_reports)}</Badge>
              </Link>
            </li>
            <li>
              <Link to="/admin/support">
                <LifeBuoy size={15} /> Open support tickets <Badge tone={o.open_tickets ? "warn" : "neutral"}>{num(o.open_tickets)}</Badge>
              </Link>
            </li>
            <li>
              <Link to="/admin/support?tab=contact">
                <MessageCircle size={15} /> Contact messages · 7 days <Badge tone="info">{num(o.inquiries_7d)}</Badge>
              </Link>
            </li>
            <li>
              <Link to="/admin/stories">
                <Heart size={15} /> Stories waiting to publish <Badge tone="neutral">{num(o.stories_pending)}</Badge>
              </Link>
            </li>
            <li>
              <Link to="/admin/members?status=banned">
                <Users size={15} /> Banned members <Badge tone="neutral">{num(o.banned)}</Badge>
              </Link>
            </li>
          </ul>
        </Card>
      </div>

      <div className="adm-grid-2">
        <Card title="Newest members" action={<Link className="adm-link" to="/admin/members">View all</Link>} pad={false}>
          {recent.loading && !recent.data ? (
            <div className="adm-card-body">
              <Skeleton />
            </div>
          ) : recent.data?.members?.length ? (
            <table className="adm-table">
              <tbody>
                {recent.data.members.map((m) => (
                  <tr key={m.id} className="clickable" onClick={() => nav(`/admin/members/${m.id}`)}>
                    <td>
                      <div className="adm-who">
                        <Avatar name={m.full_name} />
                        <div>
                          <strong>{m.full_name}</strong>
                          <span>{[m.city, m.country].filter(Boolean).join(", ") || m.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{cap(m.gender)}</td>
                    <td className="adm-right adm-muted">{timeAgo(m.date_joined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty title="No members yet" />
          )}
        </Card>
        <Card title="Live activity" sub="Sign-ups, reports, interests and messages as they happen">
          <LiveFeed items={feed} />
        </Card>
      </div>

      <Card title="Latest open reports" action={<Link className="adm-link" to="/admin/reports">Open queue</Link>} pad={false}>
        {recent.loading && !recent.data ? (
          <div className="adm-card-body">
            <Skeleton rows={3} />
          </div>
        ) : recent.data?.reports?.length ? (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Reported member</th>
                <th>Reason</th>
                <th>Reported by</th>
                <th className="adm-right">When</th>
              </tr>
            </thead>
            <tbody>
              {recent.data.reports.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => nav(`/admin/reports?open=${r.id}`)}>
                  <td>
                    <strong>{r.target?.full_name}</strong>
                  </td>
                  <td>
                    <Badge tone="danger">{cap(r.reason)}</Badge>
                  </td>
                  <td>{r.reporter?.full_name}</td>
                  <td className="adm-right adm-muted">{timeAgo(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty icon={Flag} title="No open reports" text="Reports from members will show up here." />
        )}
      </Card>
    </>
  );
}
