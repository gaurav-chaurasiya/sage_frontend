import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseYmd(value) {
  if (!value) return null;
  const [y, m, d] = String(value).split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function formatYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function displayLabel(value) {
  const date = parseYmd(value);
  if (!date) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function clampDate(date, min, max) {
  const minD = parseYmd(min);
  const maxD = parseYmd(max);
  if (minD && date < minD) return minD;
  if (maxD && date > maxD) return maxD;
  return date;
}

function buildMonthCells(year, month) {
  const first = new Date(year, month, 1);
  const start = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = start - 1; i >= 0; i -= 1) {
    const day = daysInPrev - i;
    cells.push({ day, outside: true, date: new Date(year, month - 1, day) });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, outside: false, date: new Date(year, month, day) });
  }
  let next = 1;
  while (cells.length < 42) {
    cells.push({ day: next, outside: true, date: new Date(year, month + 1, next) });
    next += 1;
  }
  return cells;
}

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function disabledDate(date, min, max) {
  const minD = parseYmd(min);
  const maxD = parseYmd(max);
  if (minD && date < minD) return true;
  if (maxD && date > maxD) return true;
  return false;
}

export default function DatePicker({
  value = "",
  onChange,
  min,
  max,
  placeholder = "Select date",
  id,
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const [pickerMode, setPickerMode] = useState("days");
  const selected = parseYmd(value);
  const initial = selected || parseYmd(max) || new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const wrap = useRef(null);
  const menu = useRef(null);
  const autoId = useId();
  const inputId = id || autoId;

  useEffect(() => {
    if (!open) return;
    const base = selected || parseYmd(max) || new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setPickerMode("days");
  }, [open, value, max, selected]);

  const place = () => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8;
    const popH = 360;
    const spaceBelow = window.innerHeight - r.bottom - 16;
    const spaceAbove = r.top - 16;
    const openUp = spaceBelow < popH && spaceAbove > spaceBelow;
    setMenuStyle({
      position: "fixed",
      left: Math.max(12, Math.min(r.left, window.innerWidth - 312)),
      width: 296,
      top: openUp ? undefined : r.bottom + gap,
      bottom: openUp ? window.innerHeight - r.top + gap : undefined,
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
  }, [open, pickerMode]);

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

  const shiftMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const pickDate = (date) => {
    if (disabledDate(date, min, max)) return;
    onChange(formatYmd(date));
    setOpen(false);
  };

  const today = clampDate(new Date(), min, max);
  const cells = buildMonthCells(viewYear, viewMonth);

  return (
    <div className={`date-picker ${open ? "open" : ""}`} ref={wrap}>
      <button
        type="button"
        id={inputId}
        className={`date-picker-trigger ${value ? "" : "placeholder"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{value ? displayLabel(value) : placeholder}</span>
        <Calendar size={16} strokeWidth={2.1} />
      </button>
      {open &&
        createPortal(
          <div className="date-picker-popover" ref={menu} style={menuStyle} role="dialog" aria-label="Choose date">
            <div className="date-picker-head">
              <button
                type="button"
                className="date-picker-title"
                onClick={() => setPickerMode((m) => (m === "days" ? "months" : "days"))}
              >
                {MONTHS[viewMonth]}, {viewYear}
                <ChevronDown size={14} />
              </button>
              <div className="date-picker-nav">
                <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
                  <ChevronUp size={16} />
                </button>
                <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}>
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            {pickerMode === "months" ? (
              <div className="date-picker-months">
                <div className="date-picker-year-row">
                  <button type="button" aria-label="Previous year" onClick={() => setViewYear((y) => y - 1)}>
                    <ChevronUp size={14} />
                  </button>
                  <strong>{viewYear}</strong>
                  <button type="button" aria-label="Next year" onClick={() => setViewYear((y) => y + 1)}>
                    <ChevronDown size={14} />
                  </button>
                </div>
                {MONTHS.map((label, index) => {
                  const probe = new Date(viewYear, index, 15);
                  const off =
                    disabledDate(new Date(viewYear, index, 1), min, max) &&
                    disabledDate(new Date(viewYear, index + 1, 0), min, max);
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`${index === viewMonth ? "on" : ""} ${off ? "off" : ""}`}
                      disabled={off}
                      onClick={() => {
                        setViewMonth(index);
                        setPickerMode("days");
                      }}
                    >
                      {label.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="date-picker-weekdays">
                  {WEEKDAYS.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="date-picker-grid">
                  {cells.map((cell) => {
                    const off = disabledDate(cell.date, min, max);
                    const isToday = sameDay(cell.date, today);
                    const isSelected = sameDay(cell.date, selected);
                    return (
                      <button
                        key={formatYmd(cell.date)}
                        type="button"
                        className={[
                          cell.outside ? "outside" : "",
                          isSelected ? "selected" : "",
                          isToday && !isSelected ? "today" : "",
                          off ? "off" : "",
                        ].filter(Boolean).join(" ")}
                        disabled={off}
                        onClick={() => pickDate(cell.date)}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="date-picker-foot">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  pickDate(today);
                }}
              >
                Today
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
