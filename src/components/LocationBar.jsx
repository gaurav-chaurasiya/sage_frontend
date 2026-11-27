import { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import api, { apiError } from "../api/client";
import { useAuth } from "../store/auth";

const RADII = [10, 25, 50, 100, 200];

export function readRadius() {
  const n = Number(localStorage.getItem("matrimony_radius") || 50);
  return RADII.includes(n) ? n : 50;
}

function geoErrorCode(err) {
  return err?.code ?? err?.PERMISSION_DENIED;
}

async function geoPermissionState() {
  try {
    if (!navigator.permissions?.query) return "prompt";
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "prompt";
  }
}

export async function requestBrowserLocation() {
  if (!navigator.geolocation) {
    throw new Error("This browser cannot share location.");
  }
  const pos = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 120_000,
    });
  });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

export default function LocationBar({ radius, onRadius, onChange }) {
  const { user, setUser } = useAuth();
  const [status, setStatus] = useState(user?.location?.enabled ? "on" : "off");
  const [label, setLabel] = useState(user?.location?.label || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get("/profiles/me/location/")
      .then((r) => {
        setStatus(r.data.location_enabled ? "on" : "off");
        setLabel(r.data.label || r.data.city || "");
      })
      .catch(() => {});
  }, []);

  const apply = (data, extra = {}) => {
    setStatus("on");
    setLabel(data.label || "");
    if (setUser && user) {
      const next = { ...user, location: { enabled: true, label: data.label } };
      setUser(next);
    }
    onChange?.({ enabled: true, ...data, ...extra });
  };

  const enableWithCity = async () => {
    const { data } = await api.patch("/profiles/me/location/", { source: "city" });
    apply(data);
    setError("");
  };

  const enable = async () => {
    setBusy(true);
    setError("");
    const cityNotice = (blocked) =>
      blocked
        ? "Using your profile city. Allow location in the address bar, then Refresh."
        : "GPS unavailable — showing people near your city.";
    try {
      const perm = await geoPermissionState();
      if (perm === "denied") {
        await enableWithCity();
        setError(cityNotice(true));
        return;
      }
      const coords = await requestBrowserLocation();
      const { data } = await api.patch("/profiles/me/location/", coords);
      apply(data, coords);
    } catch (e) {
      try {
        await enableWithCity();
        setError(cityNotice(geoErrorCode(e) === 1));
      } catch (fallback) {
        setError(apiError(fallback, e.message || "Could not turn location on."));
      }
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await api.patch("/profiles/me/location/", { location_enabled: false });
      setStatus("off");
      setError("");
      if (setUser && user) {
        setUser({ ...user, location: { enabled: false, label: user.location?.label || "" } });
      }
      onChange?.({ enabled: false });
    } catch (e) {
      setError(apiError(e, "Could not turn location off."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="location-bar glass">
      <div className="location-bar-copy">
        <MapPin size={18} color="#326350" />
        <div>
          {status === "on" ? (
            <>
              <strong>Location on</strong>
              <p className="muted">Showing people near {label || "you"}</p>
            </>
          ) : (
            <>
              <strong>See who’s nearby</strong>
              <p className="muted">We’ll use GPS if you allow it, or your profile city if the browser blocks it.</p>
            </>
          )}
        </div>
      </div>
      <div className="location-bar-actions">
        {status === "on" && onRadius && (
          <div className="radius-pills">
            {RADII.map((km) => (
              <button
                key={km}
                type="button"
                className={`tab ${radius === km ? "on" : ""}`}
                onClick={() => {
                  localStorage.setItem("matrimony_radius", String(km));
                  onRadius(km);
                }}
              >
                {km} km
              </button>
            ))}
          </div>
        )}
        {status === "on" ? (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={enable} disabled={busy}>
              <Navigation size={14} /> Refresh
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={disable} disabled={busy}>
              Turn off
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={enable} disabled={busy}>
            <Navigation size={14} /> {busy ? "Finding you…" : "Enable location"}
          </button>
        )}
      </div>
      {error && <p className="notice" style={{ margin: 0, gridColumn: "1 / -1" }}>{error}</p>}
    </div>
  );
}
