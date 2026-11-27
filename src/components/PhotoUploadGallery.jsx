import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Crown, ImagePlus, Lock, Star, Trash2 } from "lucide-react";
import api, { apiError, mediaUrl } from "../api/client";
import ProfilePhoto from "./ProfilePhoto";

const MAX_PHOTOS = 20;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;
const SKIP_RESIZE_UNDER_BYTES = 350 * 1024;

/** Downscale large uploads client-side so profile photos aren't stored (and later
 * re-downloaded as thumbnails everywhere) at full camera resolution. */
function resizeImageFile(file) {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size <= SKIP_RESIZE_UNDER_BYTES) {
    return Promise.resolve(file);
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      if (scale >= 1) {
        resolve(file);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

function UploadProgress({ label, progress }) {
  return (
    <div className="photo-upload-progress">
      <p>{label}</p>
      <div className="photo-upload-bar">
        <i style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <strong>{Math.min(progress, 100)}%</strong>
    </div>
  );
}

export function PhotoGalleryGrid({
  photos = [],
  uploads = [],
  onAddClick,
  onPickFiles,
  fileRef,
  acceptMultiple = true,
  showAddTile = true,
  compact = false,
}) {
  return (
    <div className={`photo-gallery-grid ${compact ? "compact" : ""}`}>
      {photos.map((ph) => (
        <article key={ph.id} className={`photo-gallery-item glass ${ph.is_primary ? "primary" : ""}`}>
          <ProfilePhoto photo={ph.url} name="" alt="" />
          {ph.is_primary && (
            <span className="photo-primary-badge">
              <Star size={12} fill="currentColor" /> Primary
            </span>
          )}
        </article>
      ))}
      {uploads.map((item) => (
        <article key={item.id} className={`photo-gallery-item glass uploading ${item.status}`}>
          {item.preview ? (
            <img src={item.preview} alt="" />
          ) : (
            <div className="photo-upload-placeholder" />
          )}
          <div className="photo-upload-overlay">
            {item.status === "error" ? (
              <p className="photo-upload-error">{item.error || "Upload failed"}</p>
            ) : (
              <UploadProgress label={item.name} progress={item.progress} />
            )}
          </div>
        </article>
      ))}
      {showAddTile && photos.length + uploads.length < MAX_PHOTOS && (
        <button type="button" className="photo-add-tile glass" onClick={onAddClick} aria-label="Add photos">
          <ImagePlus size={28} />
          <span>Add photos</span>
          <small>{photos.length}/{MAX_PHOTOS}</small>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple={acceptMultiple}
        hidden
        onChange={onPickFiles}
      />
    </div>
  );
}

export function usePhotoUploader({ photos = [], onRefresh, makePrimaryFirst = false }) {
  const fileRef = useRef(null);
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState("");

  const updateUpload = (id, patch) => {
    setUploads((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeUpload = (id, preview) => {
    if (preview) URL.revokeObjectURL(preview);
    setUploads((list) => list.filter((item) => item.id !== id));
  };

  const uploadOne = async (file, index) => {
    const id = `${Date.now()}-${index}-${file.name}`;
    const preview = URL.createObjectURL(file);
    setUploads((list) => [
      ...list,
      { id, name: file.name, preview, progress: 8, status: "uploading", error: "" },
    ]);
    const uploadFile = await resizeImageFile(file);
    const body = new FormData();
    body.append("file", uploadFile);
    if (makePrimaryFirst && photos.length === 0 && index === 0) {
      body.append("is_primary", "true");
    }
    try {
      await api.post("/profiles/me/photos/", body, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          const pct = event.total ? Math.round((event.loaded * 100) / event.total) : 0;
          updateUpload(id, { progress: Math.max(pct, 8) });
        },
      });
      updateUpload(id, { progress: 100, status: "done" });
      setTimeout(() => removeUpload(id, preview), 700);
      await onRefresh?.();
    } catch (err) {
      updateUpload(id, { status: "error", error: apiError(err, "Upload failed"), progress: 0 });
      setError(apiError(err, "Could not upload that photo."));
    }
  };

  const pickFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setError("");
    const slots = MAX_PHOTOS - photos.length - uploads.filter((u) => u.status === "uploading").length;
    const batch = files.slice(0, Math.max(slots, 0));
    if (!batch.length) {
      setError(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    for (let i = 0; i < batch.length; i += 1) {
      await uploadOne(batch[i], i);
    }
  };

  const openPicker = () => fileRef.current?.click();

  const busy = uploads.some((item) => item.status === "uploading");

  return {
    fileRef,
    uploads,
    error,
    setError,
    pickFiles,
    openPicker,
    busy,
    count: photos.length,
    max: MAX_PHOTOS,
  };
}

export function PhotoManager({
  photos = [],
  onRefresh,
  makePrimaryFirst = false,
  showActions = true,
  compact = false,
  liveLink = "/onboard/photo",
}) {
  const uploader = usePhotoUploader({ photos, onRefresh, makePrimaryFirst });

  const setPrimary = async (id) => {
    await api.patch("/profiles/me/photos/", { id, is_primary: true });
    await onRefresh?.();
  };

  const removePhoto = async (id) => {
    await api.delete("/profiles/me/photos/", { params: { id } });
    await onRefresh?.();
  };

  return (
    <div className="photo-manager">
      {uploader.error && <p className="notice notice-error">{uploader.error}</p>}
      <div className={`photo-gallery-grid ${compact ? "compact" : ""}`}>
        {photos.map((ph) => (
          <article key={ph.id} className={`photo-gallery-item glass ${ph.is_primary ? "primary" : ""}`}>
            <ProfilePhoto photo={ph.url} name="" alt="" />
            {ph.is_primary && (
              <span className="photo-primary-badge">
                <Star size={12} fill="currentColor" /> Primary
              </span>
            )}
            {showActions && (
              <div className="photo-gallery-actions">
                {!ph.is_primary && (
                  <button type="button" className="icon-btn" onClick={() => setPrimary(ph.id)} aria-label="Make primary">
                    <Star size={14} />
                  </button>
                )}
                <button type="button" className="icon-btn danger" onClick={() => removePhoto(ph.id)} aria-label="Remove photo">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </article>
        ))}
        {uploader.uploads.map((item) => (
          <article key={item.id} className={`photo-gallery-item glass uploading ${item.status}`}>
            {item.preview ? <img src={item.preview} alt="" /> : <div className="photo-upload-placeholder" />}
            <div className="photo-upload-overlay">
              {item.status === "error" ? (
                <p className="photo-upload-error">{item.error || "Upload failed"}</p>
              ) : (
                <UploadProgress label={item.name} progress={item.progress} />
              )}
            </div>
          </article>
        ))}
        {photos.length + uploader.uploads.length < MAX_PHOTOS && (
          <button
            type="button"
            className="photo-add-tile glass"
            onClick={uploader.openPicker}
            disabled={uploader.busy}
            aria-label="Add photos"
          >
            <ImagePlus size={28} />
            <span>Add photos</span>
            <small>{photos.length}/{MAX_PHOTOS}</small>
          </button>
        )}
        <input
          ref={uploader.fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={uploader.pickFiles}
        />
      </div>
      <div className="photo-manager-tools">
        <button type="button" className="btn btn-primary btn-sm" onClick={uploader.openPicker} disabled={uploader.busy}>
          <Camera size={16} /> Upload photos
        </button>
        {liveLink && (
          <Link className="btn btn-ghost btn-sm" to={liveLink}>
            Take live photo
          </Link>
        )}
        {uploader.busy && (
          <p className="muted photo-upload-note">Uploading… keep this page open until all photos finish.</p>
        )}
      </div>
    </div>
  );
}

export function ProfilePhotoGallery({ photos = [], name = "", locked = false, premium = false }) {
  if (locked) {
    return (
      <div className="profile-photo-gallery">
        <div className="profile-gallery-main glass match-row-photo locked">
          <ProfilePhoto photo="" name={name} loading="eager" />
          {premium && (
            <span className="vip-ribbon">
              <Crown size={11} /> Premium
            </span>
          )}
          <span className="photo-lock">
            <Lock size={14} /> Visible to Premium
          </span>
        </div>
      </div>
    );
  }
  const sorted = [...photos].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  const [active, setActive] = useState(0);
  if (!sorted.length) {
    return (
      <div className="profile-gallery-empty">
        <ProfilePhoto photo="" name={name} />
      </div>
    );
  }
  const current = sorted[active] || sorted[0];
  return (
    <div className="profile-photo-gallery">
      <div className="profile-gallery-main glass">
        <ProfilePhoto photo={current.url} name={name} loading="eager" />
        {current.is_primary && (
          <span className="photo-primary-badge">
            <Star size={12} fill="currentColor" /> Primary
          </span>
        )}
        {sorted.length > 1 && (
          <span className="photo-count-badge">{active + 1}/{sorted.length}</span>
        )}
      </div>
      {sorted.length > 1 && (
        <div className="profile-gallery-thumbs">
          {sorted.map((ph, index) => (
            <button
              key={ph.id}
              type="button"
              className={`profile-gallery-thumb ${index === active ? "on" : ""}`}
              onClick={() => setActive(index)}
              aria-label={`Photo ${index + 1}`}
            >
              <ProfilePhoto photo={ph.url} name="" alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
