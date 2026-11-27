import { useEffect, useState } from "react";
import api, { apiError } from "../../api/client";
import Select, { MultiSelect } from "../../components/Select";
import { FormSkeleton } from "../../components/Loading";

const any = (items) => [{ value: "", label: "Doesn't matter" }, ...items];
const asOptions = (list = []) =>
  list.map((item) => (typeof item === "object" ? { value: String(item.value), label: item.label } : { value: String(item), label: String(item) }));

const HABITS = [
  { value: "", label: "Doesn't matter" },
  { value: "no", label: "No" },
  { value: "occasionally", label: "Occasionally" },
  { value: "yes", label: "Yes" },
];
const FAMILY_TYPE = [
  { value: "", label: "Doesn't matter" },
  { value: "nuclear", label: "Nuclear" },
  { value: "joint", label: "Joint" },
];
const FAMILY_STATUS = [
  { value: "", label: "Doesn't matter" },
  { value: "middle", label: "Middle class" },
  { value: "upper_middle", label: "Upper middle class" },
  { value: "rich", label: "Rich" },
  { value: "affluent", label: "Affluent" },
];

function listOf(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (!value) return [];
  return [String(value)];
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Section({ title, note, children }) {
  return (
    <section className="search-section">
      <h4>{title}</h4>
      {note && <p className="muted" style={{ margin: "-4px 0 12px", fontSize: 13 }}>{note}</p>}
      <div className="grid-4">{children}</div>
    </section>
  );
}

export default function PartnerProfile() {
  const [prefs, setPrefs] = useState(null);
  const [tax, setTax] = useState({});
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/taxonomy/").then((r) => setTax(r.data || {})).catch(() => {});
    api.get("/profiles/me/preferences/").then((r) => {
      const data = r.data || {};
      setPrefs({
        ...data,
        religions: listOf(data.religions).length ? listOf(data.religions) : listOf(data.religion),
        communities: listOf(data.communities).length ? listOf(data.communities) : listOf(data.community),
        mother_tongues: listOf(data.mother_tongues).length ? listOf(data.mother_tongues) : listOf(data.mother_tongue),
        cities: listOf(data.cities).length ? listOf(data.cities) : listOf(data.city),
        countries: listOf(data.countries).length ? listOf(data.countries) : listOf(data.country),
        marital_status: listOf(data.marital_status),
        income_min: data.income_min || data.annual_income || "",
      });
    });
  }, []);

  if (!prefs) return <FormSkeleton rows={10} />;

  const set = (k, v) => setPrefs((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setError("");
    setNote("");
    try {
      const { data } = await api.patch("/profiles/me/preferences/", prefs);
      setPrefs({
        ...data,
        religions: listOf(data.religions),
        communities: listOf(data.communities),
        mother_tongues: listOf(data.mother_tongues),
        cities: listOf(data.cities),
        countries: listOf(data.countries),
        marital_status: listOf(data.marital_status),
      });
      setNote("Partner profile saved. Matches now use these preferences.");
    } catch (e) {
      setError(apiError(e, "Could not save partner profile."));
    }
  };

  return (
    <div className="list-page" style={{ overflow: "auto" }}>
      <p className="eyebrow">Partner profile</p>
      <h2>Who you want to meet.</h2>
      <p className="muted" style={{ maxWidth: 640, marginBottom: 16 }}>
        This is not Search. Search is for a one-time hunt. Partner profile is what the matching engine uses for Preferred, Broader, Reverse and 2-way matches.
      </p>
      {note && <p className="notice">{note}</p>}
      {error && <p className="notice">{error}</p>}
      <div className="search-card glass rich" style={{ maxHeight: "none" }}>
        <Section title="Basic details">
          <Field label="Age from">
            <Select value={String(prefs.age_min || "")} onChange={(v) => set("age_min", v ? Number(v) : "")} options={any(asOptions(tax.ages))} />
          </Field>
          <Field label="Age to">
            <Select value={String(prefs.age_max || "")} onChange={(v) => set("age_max", v ? Number(v) : "")} options={any(asOptions(tax.ages))} />
          </Field>
          <Field label="Height from">
            <Select value={String(prefs.height_min || "")} onChange={(v) => set("height_min", v ? Number(v) : "")} options={any(asOptions(tax.heights))} />
          </Field>
          <Field label="Height to">
            <Select value={String(prefs.height_max || "")} onChange={(v) => set("height_max", v ? Number(v) : "")} options={any(asOptions(tax.heights))} />
          </Field>
          <Field label="Marital status">
            <MultiSelect value={prefs.marital_status} onChange={(v) => set("marital_status", v)} options={asOptions(tax.marital_statuses)} placeholder="Any" />
          </Field>
          <Field label="Have children">
            <Select value={prefs.children || ""} onChange={(v) => set("children", v)} options={any(asOptions(tax.children))} />
          </Field>
        </Section>
        <Section title="Religion & community">
          <Field label="Religion">
            <MultiSelect value={prefs.religions} onChange={(v) => set("religions", v)} options={asOptions(tax.religions)} placeholder="Any religion" />
          </Field>
          <Field label="Mother tongue">
            <MultiSelect value={prefs.mother_tongues} onChange={(v) => set("mother_tongues", v)} options={asOptions(tax.mother_tongues)} placeholder="Any" />
          </Field>
          <Field label="Community">
            <MultiSelect value={prefs.communities} onChange={(v) => set("communities", v)} options={asOptions(tax.communities)} placeholder="Any" />
          </Field>
          <label className="check-row" style={{ margin: "18px 0 0", gridColumn: "1 / -1" }}>
            <input type="checkbox" checked={!!prefs.caste_no_bar} onChange={(e) => set("caste_no_bar", e.target.checked)} />
            Caste no bar
          </label>
        </Section>
        <Section title="Location">
          <Field label="Country">
            <MultiSelect value={prefs.countries} onChange={(v) => set("countries", v)} options={asOptions(tax.countries)} placeholder="Any country" />
          </Field>
          <Field label="State">
            <Select value={prefs.state || ""} onChange={(v) => set("state", v)} options={any(asOptions(tax.states))} />
          </Field>
          <Field label="Cities">
            <MultiSelect value={prefs.cities} onChange={(v) => set("cities", v)} options={asOptions(tax.cities)} placeholder="Any city" />
          </Field>
          <Field label="Residency">
            <Select value={prefs.residency_status || ""} onChange={(v) => set("residency_status", v)} options={any(asOptions(tax.residency_statuses))} />
          </Field>
          <Field label="Grew up in">
            <Select value={prefs.grew_up_in || ""} onChange={(v) => set("grew_up_in", v)} options={any(asOptions(tax.countries))} />
          </Field>
        </Section>
        <Section title="Education & career">
          <Field label="Qualification">
            <Select value={prefs.education || ""} onChange={(v) => set("education", v)} options={any(asOptions(tax.educations))} />
          </Field>
          <Field label="Education area">
            <Select value={prefs.education_area || ""} onChange={(v) => set("education_area", v)} options={any(asOptions(tax.education_areas))} />
          </Field>
          <Field label="Working with">
            <Select value={prefs.working_with || ""} onChange={(v) => set("working_with", v)} options={any(asOptions(tax.working_with))} />
          </Field>
          <Field label="Profession area">
            <Select value={prefs.profession_area || ""} onChange={(v) => set("profession_area", v)} options={any(asOptions(tax.profession_areas))} />
          </Field>
          <Field label="Working as">
            <Select value={prefs.profession || ""} onChange={(v) => set("profession", v)} options={any(asOptions(tax.professions))} />
          </Field>
        </Section>
        <Section title="Income">
          <Field label="Income from">
            <Select value={prefs.income_min || ""} onChange={(v) => set("income_min", v)} options={any(asOptions(tax.incomes))} />
          </Field>
          <Field label="Income to">
            <Select value={prefs.income_max || ""} onChange={(v) => set("income_max", v)} options={any(asOptions(tax.incomes))} />
          </Field>
          <Field label="Currency">
            <Select value={prefs.income_currency || ""} onChange={(v) => set("income_currency", v)} options={any(asOptions(tax.income_currencies))} />
          </Field>
        </Section>
        <Section title="Lifestyle & horoscope">
          <Field label="Diet">
            <Select value={prefs.diet || ""} onChange={(v) => set("diet", v)} options={any(asOptions(tax.diets))} />
          </Field>
          <Field label="Smoking">
            <Select value={prefs.smoking || ""} onChange={(v) => set("smoking", v)} options={HABITS} />
          </Field>
          <Field label="Drinking">
            <Select value={prefs.drinking || ""} onChange={(v) => set("drinking", v)} options={HABITS} />
          </Field>
          <Field label="Manglik">
            <Select value={prefs.manglik || ""} onChange={(v) => set("manglik", v)} options={asOptions(tax.manglik)} />
          </Field>
          <Field label="Family type">
            <Select value={prefs.family_type || ""} onChange={(v) => set("family_type", v)} options={FAMILY_TYPE} />
          </Field>
          <Field label="Family status">
            <Select value={prefs.family_status || ""} onChange={(v) => set("family_status", v)} options={FAMILY_STATUS} />
          </Field>
        </Section>
        <Section title="What you want in a partner">
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Partner expectations</span>
            <textarea rows={5} value={prefs.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="Family values, lifestyle, what a life together should feel like…" />
          </label>
        </Section>
        <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={save}>
          Save partner profile
        </button>
      </div>
    </div>
  );
}
