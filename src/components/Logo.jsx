import { Link } from "react-router-dom";
import logoSrc from "../assets/logo.png";

export default function Logo({ light = false, size = 68 }) {
  return (
    <Link to="/" className={`brand-logo ${light ? "on-color" : ""}`.trim()}>
      <img src={logoSrc} alt="Sage Matrimony" style={{ height: size }} />
    </Link>
  );
}
