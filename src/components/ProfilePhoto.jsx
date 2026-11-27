import { useEffect, useState } from "react";
import { mediaUrl } from "../api/client";

export const PROFILE_PHOTO_FALLBACK = "/logo-mark.svg";

function LogoMark({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <rect width="120" height="120" rx="28" fill="#FFF1F4" />
      <path
        fill="#326350"
        d="M60 88c-16-10.5-26-19.5-26-32 0-9 7-16 16-16 5.5 0 9.5 2.5 11.5 6 2-3.5 6-6 11.5-6 9 0 16 7 16 16 0 12.5-10 21.5-26 32z"
      />
    </svg>
  );
}

export function resolveProfilePhoto(photo) {
  if (!photo) return "";
  const value = String(photo).trim();
  if (!value || value === "null" || value === "undefined" || value.includes("ui-avatars.com")) return "";
  return mediaUrl(value);
}

export default function ProfilePhoto({
  photo,
  name = "",
  alt = "",
  className = "",
  style,
  loading = "lazy",
  fallbackClassName = "",
}) {
  const src = resolveProfilePhoto(photo);
  const [broken, setBroken] = useState(false);
  const [ready, setReady] = useState(false);
  const label = alt || name || "Profile";
  const initial = (name || "M").trim().charAt(0).toUpperCase();

  useEffect(() => {
    setBroken(false);
    setReady(false);
  }, [photo, src]);

  if (!src || broken) {
    return (
      <div
        className={`profile-photo-fallback ${fallbackClassName} ${className}`.trim()}
        style={style}
        role="img"
        aria-label={label}
      >
        <LogoMark className="profile-photo-logo" />
        <span className="profile-photo-initial">{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={label}
      className={`${className} ${ready ? "photo-ready" : "img-shimmer"}`.trim()}
      style={style}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={() => setReady(true)}
      onError={() => setBroken(true)}
    />
  );
}
