import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BadgeCheck,
  Bell,
  BookHeart,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Flag,
  Image,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import api from "../api/client";
import { onRealtimeStatus, subscribeRealtime } from "../api/realtime";
import { useAuth } from "../store/auth";
import { AdminCtx, Modal, timeAgo } from "./ui";

const NAV = [
  { section: "Overview", items: [{ to: "/admin", end: true, icon: LayoutDashboard, label: "Dashboard" }] },
  {
    section: "Members",
    items: [
      { to: "/admin/members", icon: Users, label: "Members" },
      { to: "/admin/verification", icon: BadgeCheck, label: "Verification" },
      { to: "/admin/photos", icon: Image, label: "Photos" },
    ],
  },
  {
    section: "Moderation",
    items: [
      { to: "/admin/reports", icon: Flag, label: "Reports", badge: "open_reports" },
      { to: "/admin/support", icon: LifeBuoy, label: "Support", badge: "open_tickets" },
    ],
  },
  {
    section: "Business",
    items: [
      { to: "/admin/plans", icon: CreditCard, label: "Plans & subscriptions" },
      { to: "/admin/stories", icon: BookHeart, label: "Success stories" },
      { to: "/admin/broadcast", icon: Megaphone, label: "Broadcast" },
    ],
  },
  {
    section: "System",
    items: [
      { to: "/admin/activity", icon: Activity, label: "Activity log" },
      { to: "/admin/settings", icon: Settings, label: "Settings" },
    ],
  },
];

const TITLES = {
  "": "Dashboard",
  members: "Members",
  verification: "Verification",
  photos: "Photos",
  reports: "Reports",
  support: "Support",
  plans: "Plans & subscriptions",
  stories: "Success stories",
  broadcast: "Broadcast",
  activity: "Activity log",
  settings: "Settings",
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState({});
  const [feed, setFeed] = useState([]);
  const [unseen, setUnseen] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [conn, setConn] = useState("connecting");
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [q, setQ] = useState("");
  const liveListeners = useRef(new Set());

  const refreshCounts = useCallback(() => {
    api.get("/admin/overview/").then((r) => setCounts(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    refreshCounts();
    const t = setInterval(refreshCounts, 60000);
    return () => clearInterval(t);
  }, [refreshCounts]);

  useEffect(() => onRealtimeStatus(setConn), []);
  useEffect(
    () =>
      subscribeRealtime((type, data) => {
        if (type !== "admin") return;
        const item = { ...data, key: `${Date.now()}-${Math.random()}` };
        setFeed((f) => [item, ...f].slice(0, 40));
        setUnseen((n) => n + 1);
        liveListeners.current.forEach((fn) => fn(item));
        if (["signup", "report", "ticket", "inquiry"].includes(data.kind)) refreshCounts();
      }),
    [refreshCounts]
  );

  useEffect(() => {
    setOpen(false);
    setMenuOpen(false);
    setBellOpen(false);
  }, [loc.pathname]);

  const toast = useCallback((text, tone = "good") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setConfirmState({ ...opts, resolve });
      }),
    []
  );

  const onLive = useCallback((fn) => {
    liveListeners.current.add(fn);
    return () => liveListeners.current.delete(fn);
  }, []);

  const ctx = useMemo(() => ({ toast, confirm, counts, refreshCounts, feed, onLive, conn }), [toast, confirm, counts, refreshCounts, feed, onLive, conn]);

  const seg = loc.pathname.replace(/^\/admin\/?/, "").split("/")[0];
  const title = TITLES[seg] || "Admin";

  const signOut = () => {
    logout();
    nav("/admin/login", { replace: true });
  };

  const search = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    nav(`/admin/members?q=${encodeURIComponent(term)}`);
    setQ("");
  };

  const closeConfirm = (ok) => {
    confirmState?.resolve(ok);
    setConfirmState(null);
  };

  return (
    <AdminCtx.Provider value={ctx}>
      <div className="adm">
        {open && <button className="adm-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
        <aside className={`adm-side ${open ? "open" : ""}`}>
          <div className="adm-brand">
            <span className="adm-brand-mark">S</span>
            <div>
              <strong>Sage Matrimony</strong>
              <small>Admin console</small>
            </div>
            <button className="adm-icon-btn adm-side-close" aria-label="Close menu" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <nav className="adm-nav">
            {NAV.map((g) => (
              <div key={g.section} className="adm-nav-group">
                <p>{g.section}</p>
                {g.items.map((it) => (
                  <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => (isActive ? "on" : "")}>
                    <it.icon size={17} />
                    <span>{it.label}</span>
                    {it.badge && counts[it.badge] > 0 && <em>{counts[it.badge]}</em>}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          <a className="adm-side-foot" href="/" target="_blank" rel="noreferrer">
            <ExternalLink size={15} /> View website
          </a>
        </aside>

        <div className="adm-main">
          <header className="adm-top">
            <button className="adm-icon-btn adm-burger" aria-label="Open menu" onClick={() => setOpen(true)}>
              <Menu size={19} />
            </button>
            <div className="adm-top-title">{title}</div>
            <form className="adm-top-search" onSubmit={search} role="search">
              <Search size={15} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members by name, email, phone or ID" aria-label="Search members" />
            </form>
            <span className={`adm-conn ${conn}`} title={conn === "online" ? "Live updates connected" : "Reconnecting to live updates"}>
              <i /> {conn === "online" ? "Live" : "Reconnecting"}
            </span>
            <div className="adm-pop-wrap">
              <button
                className="adm-icon-btn"
                aria-label="Live activity"
                onClick={() => {
                  setBellOpen((v) => !v);
                  setUnseen(0);
                }}
              >
                <Bell size={18} />
                {unseen > 0 && <em className="adm-dot-count">{unseen > 9 ? "9+" : unseen}</em>}
              </button>
              {bellOpen && (
                <div className="adm-pop adm-feed-pop">
                  <h4>Live activity</h4>
                  <LiveFeed items={feed} compact />
                </div>
              )}
            </div>
            <div className="adm-pop-wrap">
              <button className="adm-me" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu">
                <span className="adm-me-avatar">{(user?.full_name || "A").charAt(0)}</span>
                <span className="adm-me-name">{user?.full_name || "Admin"}</span>
                <ChevronDown size={15} />
              </button>
              {menuOpen && (
                <div className="adm-pop adm-menu" role="menu">
                  <div className="adm-menu-who">
                    <strong>{user?.full_name}</strong>
                    <span>{user?.email}</span>
                  </div>
                  <Link to="/admin/settings" role="menuitem">
                    <Settings size={15} /> Settings
                  </Link>
                  <button onClick={signOut} role="menuitem">
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </header>
          <main className="adm-content">
            <Outlet />
          </main>
        </div>

        <div className="adm-toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`adm-toast tone-${t.tone}`}>
              {t.text}
            </div>
          ))}
        </div>

        <Modal
          open={!!confirmState}
          onClose={() => closeConfirm(false)}
          title={confirmState?.title || "Are you sure?"}
          footer={
            <>
              <button className="adm-btn" onClick={() => closeConfirm(false)}>
                Cancel
              </button>
              <button className={`adm-btn ${confirmState?.danger ? "danger" : "primary"}`} onClick={() => closeConfirm(true)} autoFocus>
                {confirmState?.confirmLabel || "Confirm"}
              </button>
            </>
          }
        >
          <p className="adm-muted">{confirmState?.text}</p>
        </Modal>
      </div>
    </AdminCtx.Provider>
  );
}

const FEED_TONE = { signup: "good", report: "danger", ticket: "warn", inquiry: "info", message: "neutral", interest: "brand", accepted: "brand" };
const FEED_LABEL = { signup: "New member", report: "Report", ticket: "Support", inquiry: "Contact", message: "Message", interest: "Interest", accepted: "Match" };

export function LiveFeed({ items, compact }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);
  if (!items.length) {
    return <p className="adm-feed-empty">Waiting for activity… new sign-ups, reports, interests and messages appear here instantly.</p>;
  }
  return (
    <ul className={`adm-feed ${compact ? "compact" : ""}`}>
      {items.map((it) => (
        <li key={it.key}>
          <span className={`adm-feed-dot tone-${FEED_TONE[it.kind] || "neutral"}`} />
          <div>
            <p>{it.text}</p>
            <small>
              {FEED_LABEL[it.kind] || "Activity"} · {timeAgo(it.at)}
            </small>
          </div>
        </li>
      ))}
    </ul>
  );
}
