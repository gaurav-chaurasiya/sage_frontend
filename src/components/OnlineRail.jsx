import { Link } from "react-router-dom";
import { useLive } from "../store/live";
import ProfilePhoto from "./ProfilePhoto";

export default function OnlineRail() {
  const live = useLive();
  const rows = live.online_matches || [];
  return (
    <aside className="online-rail glass">
      <div className="online-rail-head">
        <span className="presence-dot on" />
        <strong>I am Online</strong>
      </div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        My Matches ({rows.length})
      </p>
      <div className="online-rail-list">
        {rows.map((p) => (
          <Link to={`/app/profile/${p.public_id}`} key={p.public_id} className="online-rail-row">
            <span className="chat-avatar">
              <ProfilePhoto photo={p.photo} name={p.name} />
              <i className={p.presence === "online" ? "on" : ""} />
            </span>
            <span>{p.name}</span>
          </Link>
        ))}
        {!rows.length && (
          <p className="muted" style={{ fontSize: 12 }}>
            No matches yet. Shortlist or send interest to see profiles here.
          </p>
        )}
      </div>
      <div className="online-rail-tabs">
        <Link to="/app/notifications">Alerts{live.unread_notifications ? ` (${live.unread_notifications})` : ""}</Link>
        <Link to="/app/messages">Chats{live.unread_messages ? ` (${live.unread_messages})` : ""}</Link>
        <span>Active ({rows.length})</span>
      </div>
    </aside>
  );
}
