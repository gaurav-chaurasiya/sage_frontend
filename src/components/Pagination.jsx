export const PAGE_SIZE = 12;

export function slicePage(rows, page, size = PAGE_SIZE) {
  const list = Array.isArray(rows) ? rows : [];
  const count = list.length;
  const pages = Math.max(1, Math.ceil(count / size) || 1);
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * size;
  return { items: list.slice(start, start + size), page: current, pages, count };
}

export function scrollListTop() {
  const scroller =
    document.querySelector(".discover-scroll") ||
    document.querySelector(".dash-page") ||
    document.querySelector(".app-main");
  if (scroller && scroller.scrollHeight > scroller.clientHeight + 24) {
    scroller.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function pageWindow(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const wanted = new Set([1, pages, page - 1, page, page + 1]);
  const nums = [...wanted].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n) => {
    if (out.length) {
      const prev = out[out.length - 1];
      if (typeof prev === "number" && n - prev > 1) out.push("gap");
    }
    out.push(n);
  });
  return out;
}

export default function Pagination({ page = 1, pages = 1, count = 0, onPage, label = "profiles" }) {
  if (!count) return null;
  const go = (n) => {
    const next = Math.min(pages, Math.max(1, n));
    if (next === page) return;
    onPage(next);
    requestAnimationFrame(scrollListTop);
  };

  return (
    <nav className="pager" aria-label="Pagination">
      <p className="muted pager-meta">
        {count} {label}
        {pages > 1 ? ` · ${page} of ${pages}` : ""}
      </p>
      {pages > 1 && (
        <div className="pager-btns">
          <button type="button" className="pager-btn" disabled={page <= 1} onClick={() => go(1)}>
            First
          </button>
          <button type="button" className="pager-btn" disabled={page <= 1} onClick={() => go(page - 1)}>
            Prev
          </button>
          {pageWindow(page, pages).map((n, i) =>
            n === "gap" ? (
              <span key={`gap-${i}`} className="pager-gap">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                className={`pager-btn ${n === page ? "on" : ""}`}
                onClick={() => go(n)}
                aria-current={n === page ? "page" : undefined}
              >
                {n}
              </button>
            )
          )}
          <button type="button" className="pager-btn" disabled={page >= pages} onClick={() => go(page + 1)}>
            Next
          </button>
          <button type="button" className="pager-btn" disabled={page >= pages} onClick={() => go(pages)}>
            Last
          </button>
        </div>
      )}
    </nav>
  );
}
