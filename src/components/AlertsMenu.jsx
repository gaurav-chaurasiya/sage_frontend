import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import api, { asArray } from "../api/client";
import { subscribeRealtime } from "../api/realtime";
import { useLive } from "../store/live";

export default function AlertsMenu() {
  const live = useLive();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const unread = Number(live.unread_notifications) || 0;

  const load = () =>
    api
      .get("/notifications/", { params: { page: 1, page_size: 8 } })
      .then((r) => setRows(asArray(r.data).slice(0, 6)))
      .catch(() => setRows([]));

  useEffect(() => {
    load();
    const unsubscribe = subscribeRealtime((type) => {
      if (type === "notification") load();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    load();
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  const openAlert = async (n) => {
    await api.patch("/notifications/", { id: n.id });
    close();
    if (n.payload?.conversation_id) nav(`/app/messages?c=${n.payload.conversation_id}`);
    else if (n.payload?.public_id) nav(`/app/profile/${n.payload.public_id}`);
    else nav("/app/notifications");
  };

  return (
    <div className="alerts-menu">
      <button
        type="button"
        className="alerts-bell"
        onClick={() => setOpen((v) => !v)}
        aria-label="Alerts"
        aria-expanded={open}
      >
        <Bell size={18} />
        {unread > 0 && <span className="nav-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open &&
        createPortal(
          <>
            <button className="account-scrim" type="button" aria-label="Close alerts" onClick={close} />
            <div className="alerts-drop" role="menu">
              <div className="alerts-drop-head">
                <strong>Alerts</strong>
                <Link to="/app/notifications" onClick={close}>
                  See all
                </Link>
              </div>
              {rows.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  className={`alert-row ${n.is_read ? "" : "fresh"}`}
                  onClick={() => openAlert(n)}
                >
                  <strong>{n.title}</strong>
                  {n.body && <p className="muted">{n.body}</p>}
                </button>
              ))}
              {!rows.length && <p className="muted" style={{ padding: 14 }}>No alerts yet.</p>}
              <Link className="btn btn-ghost btn-sm alerts-drop-all" to="/app/notifications" onClick={close}>
                See all alerts
              </Link>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
