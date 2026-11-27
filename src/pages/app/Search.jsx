import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { asArray, apiError } from "../../api/client";
import MatchRow from "../../components/MatchRow";
import OnlineRail from "../../components/OnlineRail";
import LocationBar, { readRadius } from "../../components/LocationBar";
import Pagination, { PAGE_SIZE } from "../../components/Pagination";
import Select, { MultiSelect } from "../../components/Select";
import ProfilePhoto from "../../components/ProfilePhoto";
import { MatchListSkeleton } from "../../components/Loading";

const empty = {
  looking_for: "",
  age_min: "",
  age_max: "",
  height_min: "",
  height_max: "",
  marital_status: "",
  children: "",
  religion: "",
  mother_tongue: "",
  community: "",
  sub_community: "",
  caste_no_bar: false,
  manglik: "",
  manglik_unknown: false,
  country: "",
  state: "",
  cities: [],
  residency_status: "",
  grew_up_in: "",
  education: "",
  education_area: "",
  working_with: "",
  profession_area: "",
  profession: "",
  annual_income: "",
  income_max: "",
  income_currency: "",
  include_unknown_income: true,
  smart_income: true,
  diet: "",
  keyword: "",
  chat: false,
  photo: true,
  photo_setting: "",
  include_protected_photos: false,
  created_by: "",
  special_case: "",
  membership: "",
  working: "",
  verified: false,
  profile_id: "",
  sort: "relevance",
};

const any = (items) => [{ value: "", label: "Doesn't matter" }, ...items];

function asOptions(list = []) {
  return list.map((item) =>
    typeof item === "object" ? { value: String(item.value), label: item.label } : { value: String(item), label: String(item) }
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }) {
  return (
    <section className="search-section">
      <h4>{title}</h4>
      <div className="grid-4">{children}</div>
    </section>
  );
}

function Chips({ values, onRemove }) {
  if (!values?.length) return null;
  return (
    <div className="chip-row" style={{ gridColumn: "1 / -1" }}>
      {values.map((value) => (
        <span className="chip" key={value}>
          {value}
          <button type="button" onClick={() => onRemove(value)}>
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

export default function Search() {
  const [filters, setFilters] = useState(empty);
  const [tax, setTax] = useState({});
  const [mode, setMode] = useState("basic");
  const [data, setData] = useState({ results: [], spotlight: [], count: 0 });
  const [saved, setSaved] = useState([]);
  const [radius, setRadius] = useState(readRadius);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [notice, setNotice] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const advanced = mode === "advanced" || mode === "special";

  const run = async (extra = {}) => {
    const params = {
      looking_for: filters.looking_for,
      age_min: filters.age_min,
      age_max: filters.age_max,
      height_min: filters.height_min,
      height_max: filters.height_max,
      marital_status: filters.marital_status,
      children: filters.children,
      religion: filters.religion,
      mother_tongue: filters.mother_tongue,
      community: filters.community,
      sub_community: filters.sub_community,
      caste_no_bar: filters.caste_no_bar ? "true" : undefined,
      manglik: filters.manglik,
      manglik_unknown: filters.manglik_unknown ? "true" : undefined,
      country: filters.country,
      state: filters.state,
      cities: filters.cities.join(","),
      residency_status: filters.residency_status,
      grew_up_in: filters.grew_up_in,
      education: filters.education,
      education_area: filters.education_area,
      working_with: filters.working_with,
      profession_area: filters.profession_area,
      profession: filters.profession,
      annual_income: filters.annual_income,
      income_max: filters.income_max,
      income_currency: filters.income_currency,
      include_unknown_income: filters.include_unknown_income ? "true" : undefined,
      smart_income: filters.smart_income ? "true" : "false",
      diet: filters.diet,
      keyword: filters.keyword,
      chat: filters.chat || mode === "online" ? "true" : undefined,
      photo: filters.photo ? "true" : undefined,
      photo_setting: filters.photo_setting,
      include_protected_photos: filters.include_protected_photos ? "true" : undefined,
      created_by: filters.created_by,
      special_case: mode === "special" ? filters.special_case || "any" : filters.special_case,
      membership: filters.membership,
      working: filters.working,
      verified: filters.verified ? "true" : undefined,
      profile_id: filters.profile_id,
      sort: filters.sort,
      page: extra.page || page,
      page_size: PAGE_SIZE,
      ...extra,
    };
    if (mode === "nearby") {
      params.nearby = "true";
      params.radius_km = radius;
    }
    if (mode === "online") params.online = "true";
    if (mode === "special") params.special = "true";
    Object.keys(params).forEach((k) => {
      if (params[k] === "" || params[k] == null) delete params[k];
    });
    setLoading(true);
    try {
      const { data: res } = await api.get("/search/", { params });
      setData({
        results: asArray(res?.results),
        spotlight: asArray(res?.spotlight),
        count: res?.count || 0,
      });
      setPage(res?.page || extra.page || page);
      setPages(res?.pages || 1);
    } catch {
      setData({ results: [], spotlight: [], count: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get("/taxonomy/").then((r) => setTax(r.data || {})).catch(() => {});
    run().catch(() => {});
    api.get("/saved-searches/").then((r) => setSaved(asArray(r.data))).catch(() => {});
  }, []);

  useEffect(() => {
    if (mode === "nearby") run({ nearby: "true", radius_km: radius, page: 1 });
    if (mode === "online") run({ online: "true", page: 1 });
    if (mode === "special") run({ special: "true", page: 1 });
  }, [mode, radius]);

  const saveSearch = async () => {
    if (saved.length >= 5) {
      setNotice("You can keep 5 saved searches. Delete one to add another.");
      return;
    }
    const name = prompt("Name this search", filters.cities.join(", ") || filters.religion || "My search");
    if (!name) return;
    try {
      await api.post("/saved-searches/", { name, filters });
      const { data: rows } = await api.get("/saved-searches/");
      setSaved(asArray(rows));
      setNotice("");
    } catch (e) {
      setNotice(apiError(e, "Could not save this search."));
    }
  };

  return (
    <div className="discover search-page">
      <aside className={`search-filters glass ${showFilters ? "open" : ""}`}>
        {mode === "nearby" && (
          <LocationBar
            radius={radius}
            onRadius={setRadius}
            onChange={() => run({ nearby: "true", radius_km: radius })}
          />
        )}
        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            run({ page: 1 });
            setPage(1);
            setShowFilters(false);
          }}
        >
          {mode === "id" ? (
            <>
              <div className="id-search-row">
                <label className="field">
                  <span>Enter Profile ID</span>
                  <input placeholder="MTM..." value={filters.profile_id} onChange={(e) => set("profile_id", e.target.value)} />
                </label>
                <button className="btn btn-primary" type="submit">Go</button>
              </div>
              <p className="muted" style={{ fontSize: 13, margin: "10px 0 0" }}>Enter a Matrimony ID (for example MTM1234) and tap Go.</p>
            </>
          ) : (
            <>
              {!!saved.length && (
                <div className="chip-row" style={{ margin: "0 0 12px" }}>
                  <span className="muted" style={{ fontSize: 12 }}>Recent searches</span>
                  {saved.map((s) => (
                    <span className="chip" key={s.id || s.name}>
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...empty, ...(s.filters || {}) };
                          if (!Array.isArray(next.cities)) next.cities = next.city ? [next.city] : [];
                          setFilters(next);
                          setTimeout(() => run({ page: 1 }), 0);
                        }}
                      >
                        {s.name}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.delete(`/saved-searches/${s.id}/`);
                          setSaved((rows) => rows.filter((row) => row.id !== s.id));
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <Section title="Basic details">
                <Field label="Looking for">
                  <Select value={filters.looking_for} onChange={(v) => set("looking_for", v)} options={any(asOptions(tax.looking_for))} />
                </Field>
                <Field label="Age from">
                  <Select value={filters.age_min} onChange={(v) => set("age_min", v)} options={any(asOptions(tax.ages))} />
                </Field>
                <Field label="Age to">
                  <Select value={filters.age_max} onChange={(v) => set("age_max", v)} options={any(asOptions(tax.ages))} />
                </Field>
                <Field label="Height from">
                  <Select value={filters.height_min} onChange={(v) => set("height_min", v)} options={any(asOptions(tax.heights))} />
                </Field>
                <Field label="Height to">
                  <Select value={filters.height_max} onChange={(v) => set("height_max", v)} options={any(asOptions(tax.heights))} />
                </Field>
                <Field label="Marital status">
                  <Select value={filters.marital_status} onChange={(v) => set("marital_status", v)} options={any(asOptions(tax.marital_statuses))} />
                </Field>
                <Field label="Have children">
                  <Select value={filters.children} onChange={(v) => set("children", v)} options={any(asOptions(tax.children))} />
                </Field>
              </Section>

              <Section title="Religion & community">
                <Field label="Religion">
                  <Select value={filters.religion} onChange={(v) => set("religion", v)} options={any(asOptions(tax.religions))} />
                </Field>
                <Field label="Mother tongue">
                  <Select value={filters.mother_tongue} onChange={(v) => set("mother_tongue", v)} options={any(asOptions(tax.mother_tongues))} />
                </Field>
                <Field label="Community">
                  <Select value={filters.community} onChange={(v) => set("community", v)} options={any(asOptions(tax.communities))} />
                </Field>
                {advanced && (
                  <>
                    <Field label="Caste / sub-community">
                      <Select value={filters.sub_community} onChange={(v) => set("sub_community", v)} options={any(asOptions(tax.sub_communities))} />
                    </Field>
                    <label className="check-row" style={{ margin: "18px 0 0", gridColumn: "1 / -1" }}>
                      <input type="checkbox" checked={filters.caste_no_bar} onChange={(e) => set("caste_no_bar", e.target.checked)} />
                      Caste no bar — open to marrying across community
                    </label>
                  </>
                )}
              </Section>

              <Section title="Horoscope">
                <Field label="Manglik">
                  <Select value={filters.manglik} onChange={(v) => set("manglik", v)} options={asOptions(tax.manglik)} />
                </Field>
                <label className="check-row" style={{ margin: "18px 0 0" }}>
                  <input type="checkbox" checked={filters.manglik_unknown} onChange={(e) => set("manglik_unknown", e.target.checked)} />
                  Include unknown Manglik status
                </label>
              </Section>

              <Section title="Location">
                <Field label="Country living in">
                  <Select value={filters.country} onChange={(v) => set("country", v)} options={any(asOptions(tax.countries))} />
                </Field>
                <Field label="State living in">
                  <Select value={filters.state} onChange={(v) => set("state", v)} options={any(asOptions(tax.states))} />
                </Field>
                <Field label="City / district">
                  <MultiSelect value={filters.cities} onChange={(v) => set("cities", v)} options={asOptions(tax.cities)} placeholder="Any city" />
                </Field>
                <Chips values={filters.cities} onRemove={(city) => set("cities", filters.cities.filter((c) => c !== city))} />
                {advanced && (
                  <>
                    <Field label="Residency status">
                      <Select value={filters.residency_status} onChange={(v) => set("residency_status", v)} options={any(asOptions(tax.residency_statuses))} />
                    </Field>
                    <Field label="Country grew up in">
                      <Select value={filters.grew_up_in} onChange={(v) => set("grew_up_in", v)} options={any(asOptions(tax.countries))} />
                    </Field>
                  </>
                )}
              </Section>

              {(advanced || mode === "basic") && (
                <Section title="Education, career & income">
                  <Field label="Membership">
                    <Select value={filters.membership} onChange={(v) => set("membership", v)} options={any(asOptions(tax.memberships))} />
                  </Field>
                  <Field label="Working">
                    <Select value={filters.working} onChange={(v) => set("working", v)} options={any(asOptions(tax.working))} />
                  </Field>
                  <Field label="Annual income from">
                    <Select value={filters.annual_income} onChange={(v) => set("annual_income", v)} options={any(asOptions(tax.incomes))} />
                  </Field>
                  <Field label="Annual income to">
                    <Select value={filters.income_max} onChange={(v) => set("income_max", v)} options={any(asOptions(tax.incomes))} />
                  </Field>
                  {advanced && (
                    <>
                      <Field label="Qualification">
                        <Select value={filters.education} onChange={(v) => set("education", v)} options={any(asOptions(tax.educations))} />
                      </Field>
                      <Field label="Education area">
                        <Select value={filters.education_area} onChange={(v) => set("education_area", v)} options={any(asOptions(tax.education_areas))} />
                      </Field>
                      <Field label="Working with">
                        <Select value={filters.working_with} onChange={(v) => set("working_with", v)} options={any(asOptions(tax.working_with))} />
                      </Field>
                      <Field label="Profession area">
                        <Select value={filters.profession_area} onChange={(v) => set("profession_area", v)} options={any(asOptions(tax.profession_areas))} />
                      </Field>
                      <Field label="Working as">
                        <Select value={filters.profession} onChange={(v) => set("profession", v)} options={any(asOptions(tax.professions))} />
                      </Field>
                      <Field label="Income currency">
                        <Select value={filters.income_currency} onChange={(v) => set("income_currency", v)} options={asOptions(tax.income_currencies)} />
                      </Field>
                      <label className="check-row" style={{ margin: "18px 0 0" }}>
                        <input type="checkbox" checked={filters.include_unknown_income} onChange={(e) => set("include_unknown_income", e.target.checked)} />
                        Include profiles that haven't specified income
                      </label>
                      <label className="check-row" style={{ margin: "18px 0 0" }}>
                        <input type="checkbox" checked={filters.smart_income} onChange={(e) => set("smart_income", e.target.checked)} />
                        Smart income — this band or higher
                      </label>
                    </>
                  )}
                </Section>
              )}

              {advanced && (
                <>
                  <Section title="Lifestyle">
                    <Field label="Diet">
                      <Select value={filters.diet} onChange={(v) => set("diet", v)} options={any(asOptions(tax.diets))} />
                    </Field>
                    <Field label="Keywords">
                      <input value={filters.keyword} onChange={(e) => set("keyword", e.target.value)} placeholder="Profession, city, about…" />
                    </Field>
                    <Field label="Profile created by">
                      <Select value={filters.created_by} onChange={(v) => set("created_by", v)} options={any(asOptions(tax.created_by))} />
                    </Field>
                  </Section>
                  <Section title="Photo & activity">
                    <Field label="Photo settings">
                      <Select value={filters.photo_setting} onChange={(v) => set("photo_setting", v)} options={asOptions(tax.photo_settings)} />
                    </Field>
                    <label className="check-row" style={{ margin: "18px 0 0" }}>
                      <input type="checkbox" checked={filters.photo} onChange={(e) => set("photo", e.target.checked)} />
                      With photo
                    </label>
                    <label className="check-row" style={{ margin: "18px 0 0" }}>
                      <input type="checkbox" checked={filters.include_protected_photos} onChange={(e) => set("include_protected_photos", e.target.checked)} />
                      Include protected photos
                    </label>
                    <label className="check-row" style={{ margin: "18px 0 0" }}>
                      <input type="checkbox" checked={filters.chat} onChange={(e) => set("chat", e.target.checked)} />
                      Available for chat / online now
                    </label>
                    <label className="check-row" style={{ margin: "18px 0 0" }}>
                      <input type="checkbox" checked={filters.verified} onChange={(e) => set("verified", e.target.checked)} />
                      Blue Tick only
                    </label>
                  </Section>
                </>
              )}

              {mode === "special" && (
                <Section title="Special circumstances">
                  <Field label="Special cases">
                    <Select value={filters.special_case} onChange={(v) => set("special_case", v)} options={asOptions(tax.special_cases)} />
                  </Field>
                </Section>
              )}
            </>
          )}

          {mode !== "id" && (
            <>
          {mode !== "advanced" && mode !== "special" && (
            <div className="chip-row" style={{ marginTop: 12 }}>
              <label className="check-row" style={{ margin: 0 }}>
                <input type="checkbox" checked={filters.photo} onChange={(e) => set("photo", e.target.checked)} />
                With photo
              </label>
              <label className="check-row" style={{ margin: 0 }}>
                <input type="checkbox" checked={filters.verified} onChange={(e) => set("verified", e.target.checked)} />
                Blue Tick only
              </label>
            </div>
          )}

          <div className="search-form-actions">
            <button type="submit" className="btn btn-primary">Search</button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                setFilters(empty);
                setNotice("");
                setLoading(true);
                try {
                  const { data: res } = await api.get("/search/", { params: { photo: "true" } });
                  setData({
                    results: asArray(res?.results),
                    spotlight: asArray(res?.spotlight),
                    count: res?.count || 0,
                  });
                } catch {
                  setData({ results: [], spotlight: [], count: 0 });
                } finally {
                  setLoading(false);
                }
              }}
            >
              Clear
            </button>
            <button type="button" className="btn btn-ghost" onClick={saveSearch}>
              Save search
            </button>
          </div>
            </>
          )}
          {notice && <p className="notice" style={{ marginTop: 10 }}>{notice}</p>}
        </form>
      </aside>
      <div className="discover-main">
        <div className="match-subnav">
          {[
            ["basic", "Basic Search"],
            ["advanced", "Advanced Search"],
            ["nearby", "Near Me"],
            ["online", "Online now"],
            ["id", "Profile ID"],
          ].map(([value, label]) => (
            <button key={value} type="button" className={mode === value ? "on" : ""} onClick={() => setMode(value)}>
              {label}
            </button>
          ))}
          <button type="button" className="filter-toggle-btn" onClick={() => setShowFilters((v) => !v)}>
            Filters
          </button>
        </div>
        <div className="discover-scroll">
        <div className="results-toolbar">
          <p className="muted list-page-count">
            {data.count ? `${data.count} profile${data.count === 1 ? "" : "s"} match these filters` : "Refine a filter to search"}
          </p>
          <div style={{ minWidth: 200 }}>
            <Select
              value={filters.sort}
              onChange={(v) => {
                set("sort", v);
                setTimeout(() => run({ sort: v, page: 1 }), 0);
              }}
              options={asOptions(tax.sorts || [
                { value: "relevance", label: "Best match" },
                { value: "newest", label: "Newest first" },
                { value: "last_login", label: "Last logged in first" },
              ])}
            />
          </div>
        </div>
        {loading ? (
          <MatchListSkeleton count={PAGE_SIZE} />
        ) : (
          <>
            {!!data.spotlight?.length && (
              <section className="mini-rail-wrap">
                <h3>Spotlight</h3>
                <div className="mini-rail">
                  {data.spotlight.map((p) => (
                    <Link key={p.public_id} to={`/app/profile/${p.public_id}`} className="mini-match glass">
                      <ProfilePhoto photo={p.photo} name={p.name} className="spotlight-photo" />
                      <strong>{p.name}</strong>
                      <p>{p.age} yrs · {p.height}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {data.results.map((p) => (
              <MatchRow
                key={p.public_id}
                profile={p}
                onInterest={(x) => api.post("/interests/", { public_id: x.public_id })}
                onShortlist={(x) => api.post("/shortlists/", { public_id: x.public_id })}
                onIgnore={(x) =>
                  api.post("/ignore/", { public_id: x.public_id }).then(() =>
                    setData((d) => ({ ...d, results: d.results.filter((r) => r.public_id !== x.public_id) }))
                  )
                }
              />
            ))}
            <Pagination
              page={page}
              pages={pages}
              count={data.count}
              onPage={(n) => {
                setPage(n);
                run({ page: n });
              }}
            />
            {!data.results.length && <p className="muted">No profiles for this combination. Drop a filter or add another city.</p>}
          </>
        )}
        </div>
      </div>
      <OnlineRail />
    </div>
  );
}
