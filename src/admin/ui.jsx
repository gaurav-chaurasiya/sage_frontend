import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Inbox, X } from "lucide-react";
import api, { apiError, mediaUrl } from "../api/client";

// ---------- context: toast, confirm, live counts ----------

export const AdminCtx = createContext(null);
export const useAdmin = () => useContext(AdminCtx);

// ---------- helpers ----------

export function fmtDate(v, withTime = false) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
}

export function timeAgo(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return "—";
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(v);
}

export const num = (n) => (typeof n === "number" ? n.toLocaleString() : "—");

export function useFetch(url, params) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const key = url ? url + JSON.stringify(params || {}) : "";
  const seq = useRef(0);
  const load = useCallback(
    (quiet = false) => {
      if (!url) return;
      const my = ++seq.current;
      if (!quiet) setState((s) => ({ ...s, loading: true, error: "" }));
      api
        .get(url, { params })
        .then((r) => my === seq.current && setState({ data: r.data, loading: false, error: "" }))
        .catch((e) => my === seq.current && setState((s) => ({ ...s, loading: false, error: apiError(e, "Could not load.") })));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );
  useEffect(() => load(), [load]);
  return { ...state, reload: load };
}

// ---------- building blocks ----------

export function PageHead({ title, sub, children }) {
  return (
    <div className="adm-pagehead">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="adm-pagehead-actions">{children}</div>}
    </div>
  );
}

export function Card({ title, sub, action, children, className = "", pad = true }) {
  return (
    <section className={`adm-card ${className}`}>
      {(title || action) && (
        <header className="adm-card-head">
          <div>
            {title && <h2>{title}</h2>}
            {sub && <p>{sub}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={pad ? "adm-card-body" : ""}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, icon: Icon, tone = "brand", to, live }) {
  const body = (
    <>
      <div className="adm-stat-top">
        <span className="adm-stat-label">{label}</span>
        {Icon && (
          <span className={`adm-stat-icon tone-${tone}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="adm-stat-value">
        {live && <i className="adm-live-dot" aria-hidden />}
        {value}
      </div>
      {sub && <div className="adm-stat-sub">{sub}</div>}
    </>
  );
  return to ? (
    <Link to={to} className="adm-stat adm-stat-link">
      {body}
    </Link>
  ) : (
    <div className="adm-stat">{body}</div>
  );
}

export function Badge({ tone = "neutral", children }) {
  return <span className={`adm-badge tone-${tone}`}>{children}</span>;
}

export function Tabs({ items, value, onChange }) {
  return (
    <div className="adm-tabs" role="tablist">
      {items.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} className={value === t.key ? "on" : ""} onClick={() => onChange(t.key)}>
          {t.label}
          {typeof t.count === "number" && <span className="adm-tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, photo, size = 34 }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="adm-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {photo ? <img src={mediaUrl(photo)} alt="" loading="lazy" referrerPolicy="no-referrer" /> : initials}
    </span>
  );
}

export function Empty({ icon: Icon = Inbox, title = "Nothing here yet", text }) {
  return (
    <div className="adm-empty">
      <Icon size={26} />
      <strong>{title}</strong>
      {text && <p>{text}</p>}
    </div>
  );
}

export function Skeleton({ rows = 5 }) {
  return (
    <div className="adm-skel">
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

export function ErrorNote({ text, onRetry }) {
  if (!text) return null;
  return (
    <div className="adm-alert tone-danger">
      {text}
      {onRetry && (
        <button className="adm-link" onClick={() => onRetry()}>
          Try again
        </button>
      )}
    </div>
  );
}

function pageWindow(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = [...new Set([1, pages, page - 1, page, page + 1])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  keep.forEach((n) => {
    const prev = out[out.length - 1];
    if (typeof prev === "number" && n - prev > 1) out.push("…" + n);
    out.push(n);
  });
  return out;
}

export function Pager({ page = 1, pages = 1, count = 0, size = 25, onPage, onSize, label = "results" }) {
  if (!count) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(count, page * size);
  return (
    <div className="adm-pager">
      <span className="adm-pager-meta">
        {from}–{to} of {num(count)} {label}
      </span>
      <div className="adm-pager-right">
        {onSize && (
          <label className="adm-pager-size">
            Rows
            <select value={size} onChange={(e) => onSize(Number(e.target.value))}>
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="adm-pager-btns">
          <button aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft size={15} />
          </button>
          {pageWindow(page, pages).map((n) =>
            typeof n === "string" ? (
              <span key={n} className="adm-pager-gap">
                …
              </span>
            ) : (
              <button key={n} className={n === page ? "on" : ""} aria-current={n === page ? "page" : undefined} onClick={() => onPage(n)}>
                {n}
              </button>
            )
          )}
          <button aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="adm-modal-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`adm-modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h3>{title}</h3>
          <button className="adm-icon-btn" aria-label="Close" onClick={onClose}>
            <X size={17} />
          </button>
        </header>
        <div className="adm-modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="adm-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

// ---------- charts ----------

/** Single-series column chart with a hover tooltip. */
export function ColumnChart({ labels = [], values = [], height = 180, unit = "", tone = "brand" }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...values);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const n = values.length || 1;
  const W = 100;
  const gap = n > 40 ? 0.25 : 0.6;
  const bw = W / n - gap;
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <div className="adm-chart" onMouseLeave={() => setHover(null)}>
      <div className="adm-chart-y">
        {ticks
          .slice()
          .reverse()
          .map((t) => (
            <span key={t}>{t}</span>
          ))}
      </div>
      <div className="adm-chart-plot" style={{ height }}>
        {ticks.map((t) => (
          <i key={t} className="adm-chart-grid" style={{ bottom: `${(t / top) * 100}%` }} />
        ))}
        <svg viewBox={`0 0 ${W} 100`} preserveAspectRatio="none" aria-label={`Total ${total}${unit}`} role="img">
          {values.map((v, i) => {
            const h = (v / top) * 100;
            const x = i * (W / n) + gap / 2;
            return (
              <g key={i} onMouseEnter={() => setHover(i)}>
                <rect x={i * (W / n)} y="0" width={W / n} height="100" fill="transparent" />
                {v > 0 && <rect className={`adm-col tone-${tone} ${hover === i ? "hot" : ""}`} x={x} y={100 - h} width={Math.max(bw, 0.4)} height={h} rx="0.6" />}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div className="adm-tip" style={{ left: `${((hover + 0.5) / n) * 100}%` }}>
            <strong>
              {values[hover]}
              {unit}
            </strong>
            <span>{fmtDay(labels[hover])}</span>
          </div>
        )}
      </div>
      <div className="adm-chart-x">
        <span>{fmtDay(labels[0])}</span>
        <span>{fmtDay(labels[Math.floor(labels.length / 2)])}</span>
        <span>{fmtDay(labels[labels.length - 1])}</span>
      </div>
    </div>
  );
}

function fmtDay(s) {
  if (!s) return "";
  const d = new Date(`${s}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
}

function niceTicks(max) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag;
  const out = [];
  for (let t = 0; t <= max + step - 1 && out.length < 6; t += step) out.push(t);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

/** Horizontal bar list: label · bar · value. */
export function BarList({ rows = [], total, tone = "brand" }) {
  if (!rows.length) return <Empty title="No data yet" />;
  const max = Math.max(1, ...rows.map((r) => r.count));
  const sum = total || rows.reduce((a, r) => a + r.count, 0) || 1;
  return (
    <ul className="adm-barlist">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${r.count} (${Math.round((r.count / sum) * 100)}%)`}>
          <span className="adm-barlist-label">{cap(r.label)}</span>
          <span className="adm-barlist-track">
            <span className={`adm-barlist-bar tone-${tone}`} style={{ width: `${Math.max(2, (r.count / max) * 100)}%` }} />
          </span>
          <span className="adm-barlist-val">
            {num(r.count)} <em>{Math.round((r.count / sum) * 100)}%</em>
          </span>
        </li>
      ))}
    </ul>
  );
}

export const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).replace(/_/g, " ") : s);
