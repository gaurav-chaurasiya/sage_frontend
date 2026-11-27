import { useState } from "react";

function Radio({ name, value, current, label, onChange, count, tag }) {
  const id = `${name}-${value || "all"}`;
  return (
    <label className="refine-opt" htmlFor={id}>
      <input id={id} type="radio" name={name} checked={(current || "") === (value || "")} onChange={() => onChange(value)} />
      <span>
        {label}
        {tag ? <em className="badge-new">{tag}</em> : null}
        {count ? ` (${count})` : ""}
      </span>
    </label>
  );
}

function Group({ title, children, startOpen = true }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <section className="refine-group">
      <button type="button" className="refine-head" onClick={() => setOpen((v) => !v)}>
        {title}
        <i>{open ? "–" : "+"}</i>
      </button>
      {open && <div className="refine-body">{children}</div>}
    </section>
  );
}

export default function RefineSearch({ filters, setFilter, facets = {}, tax = {}, kind, radius, onRadius, className = "" }) {
  const facet = (key) => facets[key] || [];
  const orTax = (key, list) => {
    const labelOf = (value) => {
      const hit = (list || []).find((item) => (typeof item === "object" ? String(item.value) : String(item)) === String(value));
      if (typeof hit === "object") return hit.label;
      if (hit) return String(hit);
      return String(value || "").replaceAll("_", " ");
    };
    const rows = facet(key);
    if (rows.length) return rows.map((r) => ({ value: r.value, label: labelOf(r.value), count: r.count }));
    return (list || []).slice(0, 10).map((item) =>
      typeof item === "object" ? { value: item.value, label: item.label, count: 0 } : { value: item, label: item, count: 0 }
    );
  };

  return (
    <aside className={`refine-pane glass ${className}`}>
      <h3>Refine Search</h3>
      <Group title="Matches">
        <Radio name="two_way" value="" current={filters.two_way} label="Open to All" onChange={(v) => setFilter("two_way", v)} />
        <Radio name="two_way" value="true" current={filters.two_way} label="2-way Matches" onChange={(v) => setFilter("two_way", v)} />
      </Group>
      <Group title="Verification Status">
        <Radio name="verified" value="" current={filters.verified} label="Open to All" onChange={(v) => setFilter("verified", v)} />
        <Radio name="verified" value="true" current={filters.verified} label="Blue Tick Profiles" tag="NEW" onChange={(v) => setFilter("verified", v)} />
      </Group>
      {kind === "near_me" && (
        <Group title="Near Me">
          {[50, 100, 250].map((km) => (
            <Radio key={km} name="radius" value={String(km)} current={String(radius)} label={`Within ${km} kms`} onChange={() => onRadius?.(km)} />
          ))}
        </Group>
      )}
      <Group title="Photo Settings">
        <Radio name="photo_setting" value="" current={filters.photo_setting} label="Open to All" onChange={(v) => setFilter("photo_setting", v)} />
        <Radio name="photo_setting" value="everyone" current={filters.photo_setting} label="Visible to all" onChange={(v) => setFilter("photo_setting", v)} />
        <Radio name="photo_setting" value="protected" current={filters.photo_setting} label="Protected Photo" onChange={(v) => setFilter("photo_setting", v)} />
      </Group>
      <Group title="Recently Joined">
        <Radio name="recently_joined" value="" current={filters.recently_joined} label="Open to All" onChange={(v) => setFilter("recently_joined", v)} />
        <Radio name="recently_joined" value="day" current={filters.recently_joined} label="Within a day" onChange={(v) => setFilter("recently_joined", v)} />
        <Radio name="recently_joined" value="week" current={filters.recently_joined} label="Within a week" onChange={(v) => setFilter("recently_joined", v)} />
        <Radio name="recently_joined" value="month" current={filters.recently_joined} label="Within a month" onChange={(v) => setFilter("recently_joined", v)} />
      </Group>
      <Group title="Active Members">
        <Radio name="last_active" value="" current={filters.last_active} label="Open to All" onChange={(v) => setFilter("last_active", v)} />
        <Radio name="last_active" value="day" current={filters.last_active} label="Within a day" onChange={(v) => setFilter("last_active", v)} />
        <Radio name="last_active" value="week" current={filters.last_active} label="Within a week" onChange={(v) => setFilter("last_active", v)} />
        <Radio name="last_active" value="month" current={filters.last_active} label="Within a month" onChange={(v) => setFilter("last_active", v)} />
      </Group>
      <Group title="Annual Income">
        <Radio name="annual_income" value="" current={filters.annual_income} label="Open to All" onChange={(v) => setFilter("annual_income", v)} />
        {orTax("annual_income", tax.incomes).slice(0, 8).map((r) => (
          <Radio key={r.value} name="annual_income" value={r.value} current={filters.annual_income} label={r.label} count={r.count} onChange={(v) => setFilter("annual_income", v)} />
        ))}
      </Group>
      <Group title="Marital Status">
        <Radio name="marital_status" value="" current={filters.marital_status} label="Open to All" onChange={(v) => setFilter("marital_status", v)} />
        {orTax("marital_status", tax.marital_statuses).map((r) => (
          <Radio key={r.value} name="marital_status" value={r.value} current={filters.marital_status} label={String(r.label).replaceAll("_", " ")} count={r.count} onChange={(v) => setFilter("marital_status", v)} />
        ))}
      </Group>
      <Group title="Religion">
        <Radio name="religion" value="" current={filters.religion} label="Open to All" onChange={(v) => setFilter("religion", v)} />
        {orTax("religion", tax.religions).map((r) => (
          <Radio key={r.value} name="religion" value={r.value} current={filters.religion} label={r.label} count={r.count} onChange={(v) => setFilter("religion", v)} />
        ))}
      </Group>
      <Group title="Community">
        <Radio name="community" value="" current={filters.community} label="Open to All" onChange={(v) => setFilter("community", v)} />
        {orTax("community", tax.communities).slice(0, 10).map((r) => (
          <Radio key={r.value} name="community" value={r.value} current={filters.community} label={r.label} count={r.count} onChange={(v) => setFilter("community", v)} />
        ))}
      </Group>
      <Group title="Mother Tongue">
        <Radio name="mother_tongue" value="" current={filters.mother_tongue} label="Open to All" onChange={(v) => setFilter("mother_tongue", v)} />
        {orTax("mother_tongue", tax.mother_tongues).slice(0, 8).map((r) => (
          <Radio key={r.value} name="mother_tongue" value={r.value} current={filters.mother_tongue} label={r.label} count={r.count} onChange={(v) => setFilter("mother_tongue", v)} />
        ))}
      </Group>
      <Group title="Country Living in">
        <Radio name="country" value="" current={filters.country} label="Open to All" onChange={(v) => setFilter("country", v)} />
        {orTax("country", tax.countries).map((r) => (
          <Radio key={r.value} name="country" value={r.value} current={filters.country} label={r.label} count={r.count} onChange={(v) => setFilter("country", v)} />
        ))}
      </Group>
      <Group title="State Living in">
        <Radio name="state" value="" current={filters.state} label="Open to All" onChange={(v) => setFilter("state", v)} />
        {orTax("state", tax.states).slice(0, 8).map((r) => (
          <Radio key={r.value} name="state" value={r.value} current={filters.state} label={r.label} count={r.count} onChange={(v) => setFilter("state", v)} />
        ))}
      </Group>
      <Group title="Country Grew up in">
        <Radio name="grew_up_in" value="" current={filters.grew_up_in} label="Open to All" onChange={(v) => setFilter("grew_up_in", v)} />
        {orTax("grew_up_in", tax.countries).slice(0, 6).map((r) => (
          <Radio key={r.value} name="grew_up_in" value={r.value} current={filters.grew_up_in} label={r.label} count={r.count} onChange={(v) => setFilter("grew_up_in", v)} />
        ))}
      </Group>
      <Group title="Working With">
        <Radio name="working_with" value="" current={filters.working_with} label="Open to All" onChange={(v) => setFilter("working_with", v)} />
        {orTax("working_with", tax.working_with).map((r) => (
          <Radio key={r.value} name="working_with" value={r.value} current={filters.working_with} label={r.label} count={r.count} onChange={(v) => setFilter("working_with", v)} />
        ))}
      </Group>
      <Group title="Profession Area">
        <Radio name="profession_area" value="" current={filters.profession_area} label="Open to All" onChange={(v) => setFilter("profession_area", v)} />
        {orTax("profession_area", tax.profession_areas).map((r) => (
          <Radio key={r.value} name="profession_area" value={r.value} current={filters.profession_area} label={r.label} count={r.count} onChange={(v) => setFilter("profession_area", v)} />
        ))}
      </Group>
      <Group title="Profile Managed by">
        <Radio name="created_by" value="" current={filters.created_by} label="Open to All" onChange={(v) => setFilter("created_by", v)} />
        {orTax("created_by", tax.created_by).map((r) => (
          <Radio key={r.value} name="created_by" value={r.value} current={filters.created_by} label={r.label} count={r.count} onChange={(v) => setFilter("created_by", v)} />
        ))}
      </Group>
      <Group title="Eating habits">
        <Radio name="diet" value="" current={filters.diet} label="Open to All" onChange={(v) => setFilter("diet", v)} />
        {orTax("diet", tax.diets).map((r) => (
          <Radio key={r.value} name="diet" value={r.value} current={filters.diet} label={r.label} count={r.count} onChange={(v) => setFilter("diet", v)} />
        ))}
      </Group>
      <Group title="Education Level">
        <Radio name="education_level" value="" current={filters.education_level} label="Open to All" onChange={(v) => setFilter("education_level", v)} />
        {[
          ["bachelor", "Bachelor"],
          ["master", "Master"],
          ["high school", "High school"],
          ["diploma", "Diploma"],
          ["honours", "Honours"],
        ].map(([value, label]) => (
          <Radio key={value} name="education_level" value={value} current={filters.education_level} label={label} onChange={(v) => setFilter("education_level", v)} />
        ))}
      </Group>
      <Group title="Education Area">
        <Radio name="education_area" value="" current={filters.education_area} label="Open to All" onChange={(v) => setFilter("education_area", v)} />
        {orTax("education_area", tax.education_areas).map((r) => (
          <Radio key={r.value} name="education_area" value={r.value} current={filters.education_area} label={r.label} count={r.count} onChange={(v) => setFilter("education_area", v)} />
        ))}
      </Group>
      <button type="button" className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 8 }} onClick={() => setFilter("__clear")}>
        Clear
      </button>
    </aside>
  );
}
