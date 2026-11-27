import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, HelpCircle, Lock, X } from "lucide-react";
import api from "../../api/client";
import { useAuth } from "../../store/auth";
import LiveCapture from "../../components/LiveCapture.jsx";
import { PhotoManager } from "../../components/PhotoUploadGallery";
import { voiceOf } from "../../data/register";
import OnboardLayout from "./OnboardLayout";

const GUIDES = [
  { ok: true, label: "Close up", src: "/guides/guide-close.jpg" },
  { ok: true, label: "Half view", src: "/guides/guide-half.jpg" },
  { ok: true, label: "Full view", src: "/guides/guide-full.jpg" },
  { ok: false, label: "Side face", src: "/guides/guide-side.jpg" },
  { ok: false, label: "Group", src: "/guides/guide-group.jpg" },
  { ok: false, label: "Unclear", src: "/guides/guide-blur.jpg" },
];

export default function OnboardPhoto() {
  const nav = useNavigate();
  const { user, setUser } = useAuth();
  const v = voiceOf(user || {});
  const [photos, setPhotos] = useState([]);
  const [live, setLive] = useState(false);
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveProgress, setLiveProgress] = useState(0);

  const refresh = async () => {
    const [{ data: me }, { data: list }] = await Promise.all([
      api.get("/auth/me/"),
      api.get("/profiles/me/photos/"),
    ]);
    setUser(me);
    setPhotos(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  return (
    <OnboardLayout skipTo="/onboard/interests">
      <section className="onboard-card">
        <h1>Congrats! {v.Your} Profile has been created.</h1>
        <p className="muted">Add multiple photos to get better matches</p>
        <PhotoManager
          photos={photos}
          onRefresh={refresh}
          makePrimaryFirst
          compact
          liveLink={null}
        />
        <p className="privacy-line">
          <Lock size={14} /> 100% Privacy controls available <HelpCircle size={14} />
        </p>
        <div className="onboard-cta" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" type="button" onClick={() => setLive(true)}>
            Take live photo
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => nav("/onboard/interests")} disabled={!photos.length}>
            Continue
          </button>
        </div>
        {!photos.length && <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>Add at least one photo to continue.</p>}
      </section>
      <section className="onboard-card guidelines">
        <h3>Photo guidelines</h3>
        <div className="guide-row">
          {GUIDES.map((g) => (
            <figure key={g.label}>
              <span className={g.ok ? "ok" : "bad"}>{g.ok ? <Check size={12} /> : <X size={12} />}</span>
              <img className="guide-pic" src={g.src} alt={g.label} />
              <figcaption>{g.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      {live && (
        <LiveCapture
          mode="photo"
          busy={liveBusy}
          onCancel={() => setLive(false)}
          onCapture={async ({ image }) => {
            setLiveBusy(true);
            setLiveProgress(24);
            try {
              await api.post("/profiles/me/photos/", { image, is_primary: photos.length === 0 });
              setLiveProgress(100);
              await refresh();
              setLive(false);
            } finally {
              setLiveBusy(false);
              setLiveProgress(0);
            }
          }}
        />
      )}
      {liveBusy && (
        <div className="photo-live-progress glass">
          <p>Saving live photo…</p>
          <div className="photo-upload-bar">
            <i style={{ width: `${liveProgress || 40}%` }} />
          </div>
        </div>
      )}
    </OnboardLayout>
  );
}
