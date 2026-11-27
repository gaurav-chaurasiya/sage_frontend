import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Camera, ChevronDown, Crown, Lock, LogOut, Settings, SlidersHorizontal, UserRound } from "lucide-react";
import { useAuth } from "../store/auth";
import ProfilePhoto from "./ProfilePhoto";

export default function AccountMenu() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const photo = user?.photo;
  const pending = !photo || String(photo).includes("ui-avatars.com");

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="account-menu">
      <button type="button" className="account-avatar" onClick={() => setOpen((v) => !v)} aria-label="Account" aria-expanded={open}>
        <ProfilePhoto photo={photo} name={user?.full_name} className="account-avatar-img" />
        <ChevronDown size={12} />
      </button>
      {open &&
        createPortal(
          <>
            <button className="account-scrim" type="button" aria-label="Close account menu" onClick={close} />
            <div className="account-drop" role="menu">
              {pending && (
                <div className="account-photo-prompt">
                  <p><b>Photo upload pending</b></p>
                  <Link className="btn btn-primary btn-sm" to="/onboard/photo" onClick={close}>
                    <Camera size={14} /> Upload Photo
                  </Link>
                  <p className="muted">You can keep your photos private.</p>
                </div>
              )}
              <div className="account-links">
                <Link to="/app/profile" onClick={close}><UserRound size={14} /> My Profile</Link>
                <Link to="/app/notifications" onClick={close}><Bell size={14} /> Email / SMS Alerts</Link>
                <Link to="/app/settings" onClick={close}><Settings size={14} /> Account Settings</Link>
                <Link to="/app/settings" onClick={close}><Lock size={14} /> Privacy Options</Link>
                <Link to="/app/partner-profile" onClick={close}><SlidersHorizontal size={14} /> Contact Filters</Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    nav("/login");
                  }}
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
              <div className="account-plan">
                <p>Account type: {user?.membership?.label || "Free"}</p>
                <Link className="btn btn-primary btn-sm" to="/app/membership" onClick={close}>
                  <Crown size={14} /> Upgrade Now
                </Link>
                <Link className="text-link" to="/app/membership" onClick={close}>
                  Compare memberships
                </Link>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
