import { Link } from "react-router-dom";
import Logo from "../../components/Logo";

export default function OnboardLayout({ children, skipTo = "/app", skipLabel = "Skip" }) {
  return (
    <div className="onboard-shell">
      <header className="onboard-bar">
        <Logo />
        <Link className="muted" to={skipTo}>
          {skipLabel}
        </Link>
      </header>
      <main className="onboard-main">{children}</main>
    </div>
  );
}
