import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

function pretty(value) {
  const text = String(value).replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function flattenOptions(options = []) {
  const rows = [];
  for (const opt of options) {
    if (opt && typeof opt === "object" && opt.group) {
      rows.push({ type: "group", label: opt.group, value: `__g_${opt.group}` });
      for (const item of opt.items || []) {
        if (typeof item === "object" && item !== null) {
          rows.push({ type: "item", value: String(item.value), label: item.label ?? String(item.value) });
        } else {
          rows.push({ type: "item", value: String(item), label: pretty(item) });
        }
      }
    } else if (opt && typeof opt === "object") {
      rows.push({ type: "item", value: String(opt.value), label: opt.label ?? String(opt.value) });
    } else {
      rows.push({ type: "item", value: String(opt), label: pretty(opt) });
    }
  }
  return rows;
}

export default function Select({ value, onChange, options = [], placeholder = "Select", searchable = false, searchPlaceholder = "Search…" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState({});
  const wrap = useRef(null);
  const menu = useRef(null);
  const search = useRef(null);
  const listId = useId();
  const items = flattenOptions(options);
  const selectable = items.filter((o) => o.type !== "group");
  const raw = value === undefined || value === null ? "" : String(value);
  const current = selectable.find((o) => o.value === raw);

  const visible = useMemo(() => {
    if (!searchable || !query.trim()) return items;
    const q = query.trim().toLowerCase();
    const rows = [];
    let pendingGroup = null;
    let pendingShown = false;
    for (const it of items) {
      if (it.type === "group") {
        pendingGroup = it;
        pendingShown = false;
      } else if (it.label.toLowerCase().includes(q)) {
        if (pendingGroup && !pendingShown) {
          rows.push(pendingGroup);
          pendingShown = true;
        }
        rows.push(it);
      }
    }
    return rows;
  }, [items, query, searchable]);

  const place = () => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8;
    const needed = visible.length * 42 + (searchable ? 48 : 0) + 24;
    const spaceBelow = window.innerHeight - r.bottom - 16;
    const spaceAbove = r.top - 16;
    const openUp = spaceBelow < Math.min(needed, 200) && spaceAbove > spaceBelow;
    const available = Math.max(120, openUp ? spaceAbove : spaceBelow);
    const maxHeight = Math.min(360, available);
    setMenuStyle({
      position: "fixed",
      left: Math.max(12, r.left),
      width: r.width,
      top: openUp ? undefined : r.bottom + gap,
      bottom: openUp ? window.innerHeight - r.top + gap : undefined,
      maxHeight,
      zIndex: 4000,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, visible.length]);

  useEffect(() => {
    if (open && searchable) search.current?.focus();
    if (!open) setQuery("");
  }, [open, searchable]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrap.current?.contains(e.target) || menu.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className={`pretty-select ${open ? "open" : ""}`} ref={wrap}>
      <button
        type="button"
        className={`pretty-select-trigger ${current ? "" : "placeholder"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{current ? current.label : placeholder}</span>
        <ChevronDown size={16} strokeWidth={2.2} />
      </button>
      {open &&
        createPortal(
          <ul className="pretty-select-menu" role="listbox" id={listId} ref={menu} style={menuStyle}>
            {searchable && (
              <li className="pretty-select-search">
                <input
                  ref={search}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </li>
            )}
            {searchable && !visible.length && <li className="pretty-select-empty">No matches</li>}
            {visible.map((opt) => {
              if (opt.type === "group") {
                return (
                  <li key={opt.value} className="pretty-select-group">
                    {opt.label}
                  </li>
                );
              }
              const active = opt.value === raw;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={active ? "on" : ""}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <span>{opt.label}</span>
                    {active && <Check size={15} strokeWidth={2.6} />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}

export function MultiSelect({ value = [], onChange, options = [], placeholder = "Select" }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const wrap = useRef(null);
  const menu = useRef(null);
  const listId = useId();
  const items = flattenOptions(options).filter((o) => o.type !== "group");
  const selected = value.map(String);

  const place = () => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8;
    const spaceBelow = window.innerHeight - r.bottom - 16;
    const spaceAbove = r.top - 16;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    const available = Math.max(120, openUp ? spaceAbove : spaceBelow);
    setMenuStyle({
      position: "fixed",
      left: Math.max(12, r.left),
      width: r.width,
      top: openUp ? undefined : r.bottom + gap,
      bottom: openUp ? window.innerHeight - r.top + gap : undefined,
      maxHeight: Math.min(320, available),
      overflowY: "auto",
      zIndex: 4000,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrap.current?.contains(e.target) || menu.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggle = (next) => {
    const has = selected.includes(next);
    onChange(has ? selected.filter((v) => v !== next) : [...selected, next]);
  };

  const label = selected.length ? `${selected.length} selected` : placeholder;

  return (
    <div className={`pretty-select ${open ? "open" : ""}`} ref={wrap}>
      <button
        type="button"
        className="pretty-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <ChevronDown size={16} strokeWidth={2.2} />
      </button>
      {open &&
        createPortal(
          <ul className="pretty-select-menu" role="listbox" id={listId} ref={menu} style={menuStyle}>
            {items.map((opt) => {
              const active = selected.includes(opt.value);
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={active ? "on" : ""}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      toggle(opt.value);
                    }}
                  >
                    <span>{opt.label}</span>
                    {active && <Check size={15} strokeWidth={2.6} />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}
