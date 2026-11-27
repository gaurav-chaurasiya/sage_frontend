export function LogoMark({ size = 56, pulse = true, className = "" }) {
  return (
    <div
      className={`loader-logo ${pulse ? "pulse" : ""} ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 120" fill="none">
        <rect width="120" height="120" rx="28" fill="#FFF1F4" />
        <path
          fill="#326350"
          d="M60 88c-16-10.5-26-19.5-26-32 0-9 7-16 16-16 5.5 0 9.5 2.5 11.5 6 2-3.5 6-6 11.5-6 9 0 16 7 16 16 0 12.5-10 21.5-26 32z"
        />
      </svg>
    </div>
  );
}

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <LogoMark size={72} />
      <span className="loader-ring" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function InlineLoader({ label = "Loading…" }) {
  return (
    <div className="inline-loader" role="status" aria-live="polite">
      <LogoMark size={44} />
      <span className="loader-ring sm" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function LoadState({ label = "Could not load", hint = "Please try again.", action = null }) {
  return (
    <div className="load-state" role="status">
      <LogoMark size={64} pulse={false} />
      <strong>{label}</strong>
      <p className="muted">{hint}</p>
      {action}
    </div>
  );
}

export function Shimmer({ className = "", style }) {
  return <div className={`shimmer ${className}`.trim()} style={style} aria-hidden="true" />;
}

export function ProfileCardSkeleton() {
  return (
    <article className="profile-card sk-card glass">
      <Shimmer className="sk-photo" />
      <div className="sk-body">
        <div className="sk-pills">
          <Shimmer className="sk-pill" />
          <Shimmer className="sk-pill sm" />
        </div>
        <Shimmer className="sk-line sk-title" />
        <Shimmer className="sk-line sk-w70" />
        <Shimmer className="sk-line sk-w55" />
        <div className="sk-actions">
          <Shimmer className="sk-icon" />
          <Shimmer className="sk-icon" />
          <Shimmer className="sk-icon" />
          <Shimmer className="sk-btn" />
        </div>
      </div>
    </article>
  );
}

export function CardGridSkeleton({ count = 4, wrap = true }) {
  const cards = Array.from({ length: count }).map((_, i) => <ProfileCardSkeleton key={i} />);
  if (!wrap) return cards;
  return <div className="card-grid skeleton-grid">{cards}</div>;
}

export function ProfileDetailSkeleton() {
  return (
    <div className="discover search-wide">
      <div className="discover-main">
        <div className="profile-detail-skeleton">
          <Shimmer className="sk-hero" />
          <div className="sk-detail-grid">
            <Shimmer className="sk-block" />
            <Shimmer className="sk-block tall" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MatchRowSkeleton() {
  return (
    <article className="match-row sk-match glass">
      <Shimmer className="sk-match-photo" />
      <div className="sk-body">
        <Shimmer className="sk-line sk-w45" style={{ height: 16 }} />
        <Shimmer className="sk-line sk-w80" />
        <Shimmer className="sk-line sk-w65" />
        <Shimmer className="sk-line sk-w90" />
      </div>
      <div className="sk-match-actions">
        <Shimmer className="sk-orb" />
        <Shimmer className="sk-line sk-w70" />
      </div>
    </article>
  );
}

export function MatchListSkeleton({ count = 4 }) {
  return (
    <div className="match-list-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <MatchRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="chat-skeleton">
      <div className="sk-chat-list glass">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="sk-chat-row">
            <Shimmer className="sk-avatar" />
            <div className="sk-body">
              <Shimmer className="sk-line sk-w40" />
              <Shimmer className="sk-line sk-w70" />
            </div>
          </div>
        ))}
      </div>
      <div className="sk-chat-room glass">
        <InlineLoader label="Opening chat…" />
      </div>
    </div>
  );
}

export function FormSkeleton({ rows = 8 }) {
  return (
    <div className="form-skeleton glass" style={{ padding: 18, borderRadius: 22 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="sk-field">
          <Shimmer className="sk-line sk-w30" />
          <Shimmer className="sk-input" />
        </div>
      ))}
    </div>
  );
}

export function PlanSkeleton() {
  return (
    <div className="join-plans">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="sk-plan glass">
          <Shimmer className="sk-line sk-w45" />
          <Shimmer className="sk-line sk-w60" />
          <Shimmer className="sk-block" style={{ height: 88 }} />
        </div>
      ))}
    </div>
  );
}
