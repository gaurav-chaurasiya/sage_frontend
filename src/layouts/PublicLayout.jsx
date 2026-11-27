import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "../components/Logo";
import { useAuth } from "../store/auth";

export default function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const links = [
    [user ? "/app/search" : "/login", "Search"],
    ["/membership", "Membership"],
    ["/success-stories", "Stories"],
    ["/horoscope", "Kundali"],
    ["/help", "Help"],
  ];

  return (
    <div className="page">
      <header className="nav glass">
        <Logo />
        <nav className="nav-links">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-cta">
          {user ? (
            <Link className="btn btn-primary btn-sm" to="/app">
              Dashboard
            </Link>
          ) : (
            <>
              <Link className="btn btn-ghost btn-sm" to="/login">
                Login
              </Link>
              <Link className="btn btn-primary btn-sm hide-xs" to="/register">
                Join Matrimony
              </Link>
            </>
          )}
          <button className="nav-toggle" type="button" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {open && (
        <div className="mobile-drawer glass">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} onClick={close}>
              {label}
            </NavLink>
          ))}
          {!user && (
            <Link className="btn btn-primary" to="/register" onClick={close}>
              Join Matrimony
            </Link>
          )}
        </div>
      )}
      {open && <button className="drawer-backdrop" type="button" aria-label="Close menu" onClick={close} />}

      <Outlet />
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <Logo size={76} />
            <p style={{ marginTop: 12 }}>
              Matrimony is a private Indian matchmaking platform — verified profiles, family-first discovery,
              and a compatibility engine built for real introductions.
            </p>
          </div>
          <div>
            <h4>Company</h4>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/success-stories">Success stories</Link>
            <Link to="/membership">Membership</Link>
          </div>
          <div>
            <h4>Safety</h4>
            <Link to="/safety">Safety centre</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/help">Help</Link>
          </div>
          <div>
            <h4>Browse</h4>
            <Link to="/matrimony/hindu">Hindu matrimony</Link>
            <Link to="/matrimony/mumbai">Mumbai matrimony</Link>
            <Link to="/matrimony/maratha">Maratha matrimony</Link>
            <Link to="/dating/india">Dating in India</Link>
          </div>
        </div>
        <p className="footer-copy">
          © {new Date().getFullYear()} Sage Matrimony Inc. All rights reserved.
          <span>15315 66 Ave, Surrey · +1 (778) 288-7050</span>
          <span>Developed by CubicalSoft</span>
        </p>
      </footer>
    </div>
  );
}
