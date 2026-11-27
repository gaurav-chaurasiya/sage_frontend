import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCcw, X } from "lucide-react";

function luma(data) {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 16) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    n += 1;
  }
  return n ? sum / n : 0;
}

function frameDiff(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let d = 0;
  let n = 0;
  for (let i = 0; i < a.length; i += 16) {
    d += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    n += 1;
  }
  return n ? d / n : 0;
}

export default function LiveCapture({ mode = "verify", onCapture, onCancel, busy = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const samplesRef = useRef([]);
  const prevRef = useRef(null);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState("boot");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [motion, setMotion] = useState(0);
  const [hint, setHint] = useState("Allow camera access to continue.");

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    let alive = true;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setPhase(mode === "verify" ? "face" : "ready");
        setHint(mode === "verify" ? "Center your face in the oval." : "Look at the camera, then capture.");
      } catch {
        setError("Camera access was blocked. Allow the camera, or continue on your phone.");
        setPhase("error");
      }
    };
    start();
    return () => {
      alive = false;
      stop();
    };
  }, [mode, round]);

  useEffect(() => {
    if (phase !== "face" && phase !== "pose" && phase !== "ready") return undefined;
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      canvas.width = 80;
      canvas.height = 60;
      ctx.drawImage(video, 0, 0, 80, 60);
      const data = ctx.getImageData(16, 10, 48, 40).data;
      const prev = prevRef.current;
      const diff = frameDiff(prev, data);
      prevRef.current = data;
      samplesRef.current.push(diff);
      if (samplesRef.current.length > 40) samplesRef.current.shift();
      const avg = samplesRef.current.reduce((s, n) => s + n, 0) / samplesRef.current.length;
      setMotion(Math.round(avg));
      const brightness = luma(data);
      if (brightness < 40) setHint("Too dark — face a window or turn on a light.");
    };
    const id = setInterval(tick, 180);
    const t = setTimeout(() => {
      if (mode === "verify" && phase === "face") {
        setPhase("pose");
        setHint("Give a thumbs up, hold still, then capture.");
      }
    }, 2200);
    return () => {
      clearInterval(id);
      clearTimeout(t);
    };
  }, [phase, mode]);

  const snap = () => {
    const video = videoRef.current;
    if (!video) return;
    const shot = document.createElement("canvas");
    const size = Math.min(video.videoWidth || 720, video.videoHeight || 720, 720);
    shot.width = size;
    shot.height = size;
    const ctx = shot.getContext("2d");
    const sx = Math.max(0, ((video.videoWidth || size) - size) / 2);
    const sy = Math.max(0, ((video.videoHeight || size) - size) / 2);
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    const url = shot.toDataURL("image/jpeg", 0.86);
    stop();
    setPreview(url);
    setPhase("review");
  };

  const usePhoto = async () => {
    const score = Math.max(motion, Math.round(samplesRef.current.reduce((s, n) => s + n, 0) / Math.max(1, samplesRef.current.length)));
    await onCapture?.({ image: preview, motion_score: score, challenge: mode === "verify" ? "thumbs_up" : "portrait" });
  };

  return (
    <div className="live-overlay">
      <div className="live-card">
        <div className="live-card-top">
          <p className="eyebrow">Live photo</p>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {error && (
          <p className="verify-banner">
            {error}
          </p>
        )}
        {phase === "review" ? (
          <>
            <div className="live-frame review">
              <img src={preview} alt="Captured selfie" />
            </div>
            <p className="muted" style={{ textAlign: "center", margin: "10px 0 16px" }}>
              Use this photo, or retake if the face is unclear.
            </p>
            <div className="live-actions">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  samplesRef.current = [];
                  prevRef.current = null;
                  setPreview("");
                  setPhase("boot");
                  setRound((n) => n + 1);
                }}
              >
                <RefreshCcw size={16} /> Retake
              </button>
              <button className="btn btn-primary" type="button" onClick={usePhoto} disabled={busy}>
                {busy ? "Saving…" : "Use this photo"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`live-frame ${mode}`}>
              <video ref={videoRef} playsInline muted autoPlay />
              <div className="live-oval" />
              <div className="live-hint">{hint}</div>
            </div>
            <canvas ref={canvasRef} hidden />
            <button className="btn btn-primary live-shutter" type="button" onClick={snap} disabled={phase === "boot" || phase === "error"}>
              <Camera size={18} /> Capture
            </button>
          </>
        )}
      </div>
    </div>
  );
}
