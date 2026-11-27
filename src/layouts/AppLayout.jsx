import { useState } from "react";
import {
  Bell,
  Compass,
  Heart,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import Logo from "../components/Logo";
import AccountMenu from "../components/AccountMenu";
import AlertsMenu from "../components/AlertsMenu";
import UpgradePopup from "../components/UpgradePopup";
import { useAuth } from "../store/auth";
import { useLive } from "../store/live";

const links = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/app/matches", icon: Sparkles, label: "Matches" },
  { to: "/app/search", icon: Search, label: "Search" },
  { to: "/app/partner-profile", icon: Users, label: "Partner profile" },
  { to: "/app/interests", icon: Heart, label: "Inbox", badge: "pending_interests" },
  { to: "/app/shortlist", icon: Compass, label: "Shortlisted" },
  { to: "/app/requests", icon: Inbox, label: "Requests", badge: "pending_contacts" },
  { to: "/app/messages", icon: MessageCircle, label: "Messages", badge: "unread_messages" },
  { to: "/app/notifications", icon: Bell, label: "Alerts", badge: "unread_notifications" },
  { to: "/app/profile", icon: UserRound, label: "My profile" },
  { to: "/app/verification", icon: ShieldCheck, label: "Verification" },
  { to: "/app/membership", icon: WalletCards, label: "Membership" },
  { to: "/app/settings", icon: Settings, label: "Settings" },
  { to: "/help", icon: HelpCircle, label: "Help" },
];

const top = [
  { to: "/app", label: "My Matrimony", end: true },
  { to: "/app/matches", label: "Matches" },
  { to: "/app/search", label: "Search" },
  { to: "/app/interests", label: "Inbox", badge: "pending_interests" },
];

const bottom = [
  { to: "/app", icon: LayoutDashboard, label: "Home", end: true },
  { to: "/app/matches", icon: Sparkles, label: "Matches" },
  { to: "/app/search", icon: Search, label: "Search" },
  { to: "/app/interests", icon: Heart, label: "Inbox", badge: "pending_interests" },
  { to: "/app/profile", icon: UserRound, label: "Profile" },
];

function Badge({ count }) {
  const n = Number(count) || 0;
  if (n <= 0) return null;
  return <span className="nav-badge">{n > 99 ? "99+" : n}</span>;
}

export default function AppLayout() {
  const { user } = useAuth();
  const live = useLive();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="app-shell page">
      <header className="app-topbar">
        <Logo size={44} />
        <nav className="app-topnav">
          {top.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "on" : "")}>
              {l.label}
              <Badge count={l.badge ? live[l.badge] : 0} />
            </NavLink>
          ))}
        </nav>
        <div className="app-topbar-right">
          <Link className="btn-upgrade" to="/app/membership">
            {user?.membership?.is_premium ? `${user.membership.label} member` : "Upgrade Now"}
          </Link>
          <Link className="app-help" to="/help">
            Help
          </Link>
          <AlertsMenu />
          <AccountMenu />
        </div>
      </header>

      <header className="mobile-appbar glass">
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AlertsMenu />
          <AccountMenu />
          <span className={`presence-dot ${live.presence === "online" ? "on" : ""}`} title={live.presence} />
          <button className="nav-toggle" type="button" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {open && <button className="drawer-backdrop" type="button" aria-label="Close menu" onClick={close} />}

      <aside className={`sidebar glass ${open ? "open" : ""}`}>
        <Logo />
        <p className="muted" style={{ margin: "14px 8px 18px", fontSize: 13 }}>
          {user?.full_name}
          <br />
          <span className="pill" style={{ marginTop: 8 }}>
            {user?.membership?.label || "Free"}
          </span>
          <span className={`pill ${live.presence === "online" ? "green" : ""}`} style={{ marginTop: 8, marginLeft: 6 }}>
            {live.presence === "online" ? "Online" : "Away"}
          </span>
        </p>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={close} className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}>
              <l.icon size={16} /> {l.label}
              <Badge count={l.badge ? live[l.badge] : 0} />
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="app-main">
        <Outlet />
      </div>
      <nav className="bottom-nav glass">
        {bottom.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "on" : "")}>
            <span className="nav-icon">
              <l.icon size={18} />
              <Badge count={l.badge ? live[l.badge] : 0} />
            </span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
      <UpgradePopup />
    </div>
  );
}
