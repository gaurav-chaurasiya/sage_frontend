import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, GraduationCap, PenLine } from "lucide-react";
import { Country, State } from "country-state-city";
import Logo from "../../components/Logo";
import api, { apiError, asArray, fieldErrorsFromApi } from "../../api/client";
import Select from "../../components/Select";
import DatePicker, { formatYmd } from "../../components/DatePicker";
import { PlanSkeleton } from "../../components/Loading";
import { useAuth } from "../../store/auth";
import {
  PROFILE_FOR,
  MARITAL,
  CURRENCIES,
  OTHER_CITY,
  professionsWithOther,
  aboutDraft,
  applyIdentity,
  heightOptions,
  lookingLocked,
  voiceOf,
} from "../../data/register";

// The city dataset (~7MB of world city names) is only fetched once someone
// actually reaches the profile-basics step, as its own chunk — it never
// weighs down the initial page load.
function useCityService() {
  const [City, setCity] = useState(null);
  useEffect(() => {
    let alive = true;
    import("country-state-city/lib/city").then((m) => {
      if (alive) setCity(() => m.default);
    });
    return () => {
      alive = false;
    };
  }, []);
  return City;
}

const STEPS = [
  { id: "who", title: "Who is this for?" },
  { id: "account", title: "Account" },
  { id: "person", title: "Profile basics" },
  { id: "education", title: "Education" },
  { id: "work", title: "Work & income" },
  { id: "family", title: "Family & lifestyle" },
  { id: "about", title: "About" },
  { id: "prefs", title: "Partner" },
  { id: "plan", title: "Membership" },
];

const MISS = "Oops! You seem to have missed this";

const FIELD_LABELS = {
  created_by: "Profile type",
  looking_for: "Looking for",
  plan: "Membership plan",
  full_name: "Name",
  date_of_birth: "Date of birth",
  email: "Email",
  mobile: "Mobile number",
  password: "Password",
  marital_status: "Marital status",
  height_cm: "Height",
  religion: "Religion",
  mother_tongue: "Mother tongue",
  country: "Country",
  state: "State",
  city: "City",
  city_other: "City",
  education: "Qualification",
  income_amount: "Income",
  working_with: "Work type",
  profession: "Profession",
  profession_other: "Occupation",
  about: "About section",
  age_min: "Minimum age",
  age_max: "Maximum age",
};

const requiredMsg = (key) => `${FIELD_LABELS[key] || "This field"} is required.`;

const TZ_COUNTRY = {
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "America/Toronto": "CA", "America/Vancouver": "CA",
  "America/Edmonton": "CA", "America/Winnipeg": "CA", "America/Halifax": "CA", "America/Regina": "CA",
  "America/St_Johns": "CA", "Europe/London": "GB", "Asia/Dubai": "AE", "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU", "Asia/Singapore": "SG", "Pacific/Auckland": "NZ",
};

// Pre-select the visitor's country for the phone code and location.
function detectCountryIso() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
    for (const lang of navigator.languages || [navigator.language]) {
      const region = String(lang || "").split("-")[1];
      if (region && region.length === 2 && Country.getCountryByCode(region.toUpperCase())) return region.toUpperCase();
    }
  } catch {
    /* fall through */
  }
  return "IN";
}

const DEFAULT_ISO = detectCountryIso();
const dialCode = (iso) => String(Country.getCountryByCode(iso)?.phonecode || "").replace(/^\+/, "").split(/[ ,]/)[0].replace(/-/g, "");

const empty = {
  plan: "",
  looking_for: "",
  created_by: "",
  full_name: "",
  gender: "female",
  date_of_birth: "",
  email: "",
  mobile: "",
  dial_iso: DEFAULT_ISO,
  password: "",
  marital_status: "",
  height_cm: "",
  religion: "",
  mother_tongue: "",
  community: "",
  country: Country.getCountryByCode(DEFAULT_ISO)?.name || "India",
  state: "",
  city: "",
  city_other: "",
  education: "",
  college: "",
  profession: "",
  profession_other: "",
  occupation: "",
  employer: "",
  working_with: "",
  income_hidden: false,
  income_currency: "INR",
  income_amount: "",
  father: "",
  mother: "",
  siblings: "",
  family_type: "nuclear",
  family_values: "moderate",
  diet: "veg",
  smoking: "no",
  drinking: "no",
  birth_time: "",
  birth_place: "",
  manglik: "No",
  about: "",
  age_min: 21,
  age_max: 32,
};

export default function Register() {
  const { login, setUser } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(empty);
  const [plans, setPlans] = useState([]);
  const [tax, setTax] = useState({});
  const [error, setError] = useState("");
  const [missed, setMissed] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [incomePeriod, setIncomePeriod] = useState("yearly");
  const [busy, setBusy] = useState(false);

  const v = voiceOf(form);
  const locked = lookingLocked(form.created_by);
  const minAgeForForm = form.gender === "male" && dialCode(form.dial_iso) === "91" ? 21 : 18;
  const { dobMin, dobMax } = useMemo(() => {
    const today = new Date();
    return {
      dobMax: formatYmd(new Date(today.getFullYear() - minAgeForForm, today.getMonth(), today.getDate())),
      dobMin: formatYmd(new Date(today.getFullYear() - 80, today.getMonth(), today.getDate())),
    };
  }, [minAgeForForm]);

  const set = (k, val) => {
    setForm((f) => {
      const next = applyIdentity(f, k, val);
      if (k === "created_by" || k === "gender" || k === "looking_for") {
        const draft = aboutDraft(voiceOf(next));
        if (!f.about || f.about === aboutDraft(voiceOf(f))) next.about = draft;
      }
      return next;
    });
    setMissed((m) => ({ ...m, [k]: false }));
    setFieldErrors((fe) => ({ ...fe, [k]: "" }));
    setError("");
  };

  const CityService = useCityService();
  const countries = useMemo(() => Country.getAllCountries(), []);
  const selectedCountry = useMemo(() => countries.find((c) => c.name === form.country), [countries, form.country]);
  const states = useMemo(() => (selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : []), [selectedCountry]);
  const selectedState = useMemo(() => states.find((s) => s.name === form.state), [states, form.state]);
  const cityOptions = useMemo(() => {
    if (!CityService || !selectedCountry) return [];
    const list = selectedState
      ? CityService.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode)
      : CityService.getCitiesOfCountry(selectedCountry.isoCode);
    return (list || []).map((c) => c.name);
  }, [CityService, selectedCountry, selectedState]);

  const setCountry = (val) => {
    setForm((f) => ({ ...f, country: val, state: "", city: "", city_other: "" }));
    setMissed((m) => ({ ...m, country: false, state: false, city: false }));
    setFieldErrors((fe) => ({ ...fe, country: "", state: "", city: "" }));
    setError("");
  };
  const setStateVal = (val) => {
    setForm((f) => ({ ...f, state: val, city: "", city_other: "" }));
    setMissed((m) => ({ ...m, state: false, city: false }));
    setFieldErrors((fe) => ({ ...fe, state: "", city: "" }));
    setError("");
  };
  const setCity = (val) => {
    if (val === OTHER_CITY) {
      set("city", OTHER_CITY);
      return;
    }
    setForm((f) => ({ ...f, city: val, city_other: "" }));
    setMissed((m) => ({ ...m, city: false }));
    setFieldErrors((fe) => ({ ...fe, city: "" }));
    setError("");
  };

  useEffect(() => {
    api.get("/membership/plans/").then((r) => {
      const list = asArray(r.data);
      setPlans(list);
      if (list.length) {
        setForm((f) => {
          if (f.plan) return f;
          const free = list.find((p) => p.slug === "free");
          return { ...f, plan: free?.slug || list[0].slug };
        });
      }
    }).catch(() => setPlans([]));
    api.get("/taxonomy/").then((r) => setTax(r.data || {})).catch(() => setTax({}));
    const seeded = {};
    ["plan", "looking_for", "age_min", "age_max", "religion", "mother_tongue"].forEach((k) => {
      const val = params.get(k);
      if (val) seeded[k] = k.startsWith("age") ? Number(val) || val : val;
    });
    if (Object.keys(seeded).length) {
      setForm((f) => {
        let next = { ...f, ...seeded };
        if (seeded.looking_for) next = applyIdentity(next, "looking_for", seeded.looking_for);
        next.about = aboutDraft(voiceOf(next));
        return next;
      });
    }
  }, [params]);

  const heights = useMemo(() => heightOptions(), []);
  const educations = tax.education_groups || [];
  const professions = useMemo(() => professionsWithOther(tax.profession_groups), [tax.profession_groups]);
  const currencies = useMemo(
    () => Array.from(new Set([...(tax.income_currencies || []), ...CURRENCIES])),
    [tax.income_currencies]
  );
  const workingWith = tax.working_with || [];
  const picked = plans.find((p) => p.slug === form.plan);

  const setFieldIssue = (key, message) => {
    setMissed((m) => ({ ...m, [key]: true }));
    setFieldErrors((fe) => ({ ...fe, [key]: message }));
  };

  const requireFields = (keys) => {
    const bad = {};
    const errs = {};
    keys.forEach((k) => {
      if (form[k] === undefined || form[k] === null || String(form[k]).trim() === "") {
        bad[k] = true;
        errs[k] = requiredMsg(k);
      }
    });
    if (Object.keys(bad).length) {
      setMissed(bad);
      setFieldErrors(errs);
      setError("Please fill in all required fields.");
      return false;
    }
    return true;
  };

  const validEmail = /\S+@\S+\.\S+/.test(form.email);
  const dial = dialCode(form.dial_iso);
  const mobileDigits = String(form.mobile).replace(/\D/g, "").replace(/^0+/, "");
  const validMobile = dial === "91" ? /^[6-9]\d{9}$/.test(mobileDigits) : /^\d{6,12}$/.test(mobileDigits);
  const fullMobile = `+${dial}${mobileDigits}`;
  const dialOptions = useMemo(
    () => countries.map((c) => ({ value: c.isoCode, label: `${c.flag} ${c.name} (+${dialCode(c.isoCode)})` })),
    [countries]
  );

  const memberAge = () => {
    if (!form.date_of_birth) return null;
    const dob = new Date(form.date_of_birth);
    if (Number.isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
    return age;
  };

  const goToStep = (id) => {
    const idx = STEPS.findIndex((s) => s.id === id);
    if (idx >= 0) setStep(idx);
  };

  const next = async () => {
    const id = STEPS[step].id;
    setMissed({});
    setFieldErrors({});
    setError("");
    if (id === "who" && !requireFields(locked ? ["created_by"] : ["created_by", "looking_for"])) return;
    if (id === "plan" && !requireFields(["plan"])) return;
    if (id === "account") {
      if (!requireFields(["full_name", "date_of_birth", "email", "mobile", "password"])) return;
      if (!validEmail) {
        setFieldIssue("email", "Enter a valid email address.");
        setError("Please fix the highlighted fields.");
        return;
      }
      if (!validMobile) {
        setFieldIssue("mobile", dial === "91" ? "Enter a valid 10-digit Indian mobile number." : "Enter a valid mobile number.");
        setError("Please fix the highlighted fields.");
        return;
      }
      const age = memberAge();
      if (age == null) {
        setFieldIssue("date_of_birth", "Enter a valid date of birth.");
        setError("Please fix the highlighted fields.");
        return;
      }
      // 18 everywhere; Indian law sets 21 for men (the API enforces the same).
      const minAge = form.gender === "male" && dial === "91" ? 21 : 18;
      if (age < minAge) {
        setFieldIssue("date_of_birth", `Member must be at least ${minAge} years old.`);
        setError("Please fix the highlighted fields.");
        return;
      }
      if (String(form.password).length < 8) {
        setFieldIssue("password", "Password must be at least 8 characters.");
        setError("Please fix the highlighted fields.");
        return;
      }
    }
    if (id === "person") {
      const keys = ["marital_status", "height_cm", "religion", "mother_tongue", "country", "city"];
      if (states.length) keys.push("state");
      if (form.city === OTHER_CITY) keys.push("city_other");
      if (!requireFields(keys)) return;
    }
    if (id === "education" && !requireFields(["education"])) return;
    if (id === "work") {
      const keys = ["working_with"];
      if (!form.income_hidden) keys.push("income_amount");
      if (form.working_with && form.working_with !== "not_working") keys.push("profession");
      if (form.profession === "Other") keys.push("profession_other");
      if (!requireFields(keys)) return;
    }
    if (id === "about" && !String(form.about).trim()) {
      setFieldIssue("about", "Write a short description about yourself.");
      setError("Please fill in all required fields.");
      return;
    }
    if (id === "prefs") {
      const min = Number(form.age_min) || 21;
      const max = Number(form.age_max) || 32;
      if (min > max) {
        setMissed({ age_min: true, age_max: true });
        setFieldErrors({
          age_min: "Minimum age must be less than maximum age.",
          age_max: "Maximum age must be greater than minimum age.",
        });
        setError("Please fix partner age range.");
        return;
      }
    }
    if (step < STEPS.length - 1) {
      setError("");
      return setStep(step + 1);
    }
    setBusy(true);
    setError("");
    try {
      const mobile = fullMobile;
      const { data } = await api.post("/auth/register/", {
        looking_for: form.looking_for || (form.gender === "female" ? "groom" : "bride"),
        full_name: form.full_name,
        gender: form.gender,
        date_of_birth: form.date_of_birth,
        email: form.email,
        mobile,
        password: form.password,
        created_by: form.created_by,
      });
      login(data);
      const cityValue = form.city === OTHER_CITY ? form.city_other : form.city;
      const professionValue = form.profession === "Other" ? form.profession_other : form.profession;
      const annualIncome = form.income_hidden
        ? "Prefer not to say"
        : String(Math.round((Number(form.income_amount) || 0) * (incomePeriod === "monthly" ? 12 : 1)));
      await api.patch("/profiles/me/", {
        marital_status: form.marital_status,
        height_cm: Number(form.height_cm) || 165,
        religion: form.religion,
        mother_tongue: form.mother_tongue,
        community: form.community,
        country: form.country,
        state: form.state,
        city: cityValue,
        education: form.education,
        college: form.college,
        profession: professionValue,
        occupation: professionValue,
        employer: form.employer,
        working_with: form.working_with,
        annual_income: annualIncome,
        income_currency: form.income_hidden ? "" : form.income_currency,
        father: form.father,
        mother: form.mother,
        siblings: form.siblings,
        family_type: form.family_type,
        family_values: form.family_values,
        diet: form.diet,
        smoking: form.smoking,
        drinking: form.drinking,
        birth_time: form.birth_time,
        birth_place: form.birth_place || cityValue,
        about: form.about,
      });
      await api.patch("/profiles/me/preferences/", {
        age_min: Number(form.age_min) || 21,
        age_max: Number(form.age_max) || 32,
        religion: form.religion,
        city: cityValue,
      });
      if (form.plan) {
        const checkout = await api.post("/membership/checkout/", { plan: form.plan });
        if (checkout.data?.user) setUser(checkout.data.user);
      }
      nav("/onboard/otp");
    } catch (err) {
      const fields = fieldErrorsFromApi(err);
      const msg = apiError(err, "Registration failed. Please check your details.");
      if (fields.email || fields.mobile) {
        const bad = {};
        if (fields.email) bad.email = true;
        if (fields.mobile) bad.mobile = true;
        setMissed(bad);
        setFieldErrors(fields);
        goToStep("account");
        setError(fields.email || fields.mobile || msg);
      } else if (Object.keys(fields).length) {
        const bad = {};
        Object.keys(fields).forEach((k) => { bad[k] = true; });
        setMissed(bad);
        setFieldErrors(fields);
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const headline = {
    who: "Let’s start with who this profile is for.",
    plan: "Pick how you want to search.",
    account: v.self ? "Create your Matrimony account." : `Create ${v.your} Matrimony account.`,
      person: v.self ? "A few details about you." : `A few details about ${v.me}.`,
    education: "Great! Few more details",
    work: "You are almost done!",
    family: v.self ? "Family, faith and everyday life." : `${v.Your} family and lifestyle.`,
    about: v.self ? "We have added a short description about you." : `We have added a short description about ${v.me}.`,
    prefs: "Who should we show as a match?",
  }[STEPS[step].id];

  return (
    <div className="auth-wrap page">
      <div className="auth-art">
        <Logo light />
        <div>
          <p className="eyebrow" style={{ color: "#fff" }}>
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="auth-title">{headline}</h1>
        </div>
        <p>{STEPS[step].title}</p>
      </div>
      <div className="auth-panel">
        <div className={`auth-card glass ${STEPS[step].id === "plan" ? "auth-card-wide" : ""}`}>
          <div className="reg-progress">
            <i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          {step > 0 && (
            <button type="button" className="reg-back" onClick={() => { setError(""); setStep(step - 1); }} aria-label="Back">
              ←
            </button>
          )}
          <h2>{STEPS[step].title}</h2>
          {error && (
            <div className={`notice ${/already exists|invalid|incorrect|must be/i.test(error) ? "notice-error" : ""}`}>
              {error}
              {/email.*already|already.*email/i.test(error) && (
                <>
                  {" "}
                  <Link to="/login">Sign in with this email</Link>
                </>
              )}
            </div>
          )}

          {STEPS[step].id === "who" && (
            <div className="reg-stack">
              <Field
                label="This profile is for *"
                missed={missed.created_by}
                errorMsg={fieldErrors.created_by}
                type="select"
                value={form.created_by}
                placeholder="Select"
                onChange={(val) => set("created_by", val)}
                options={PROFILE_FOR}
              />
              {!locked && (
                <Field
                  label="Looking for *"
                  missed={missed.looking_for}
                  errorMsg={fieldErrors.looking_for}
                  type="select"
                  value={form.looking_for}
                  placeholder="Bride or Groom"
                  onChange={(val) => set("looking_for", val)}
                  options={[
                    { value: "bride", label: "Bride" },
                    { value: "groom", label: "Groom" },
                  ]}
                />
              )}
              {locked && form.looking_for && (
                <p className="muted">
                  {form.created_by === "son" || form.created_by === "brother"
                    ? "We will show brides for him."
                    : "We will show grooms for her."}
                </p>
              )}
              {form.created_by && (
                <p className="muted">
                  Questions from here will ask about {v.self ? "you" : v.female ? "her" : "him"}.
                </p>
              )}
            </div>
          )}

          {STEPS[step].id === "plan" && (
            <>
              <p className="muted" style={{ marginBottom: 14 }}>
                Every plan is complimentary for now. Choose one — chat and contact unlock on Gold and above.
              </p>
              <div className="join-plans">
                {plans.map((p) => {
                  const on = form.plan === p.slug;
                  return (
                    <button type="button" key={p.slug} className={`join-plan ${on ? "on" : ""} ${p.highlight ? "featured" : ""}`} onClick={() => set("plan", p.slug)}>
                      {p.highlight && <span className="pill">{p.highlight}</span>}
                      <strong>{p.name}</strong>
                      <span className="price">
                        Free
                      </span>
                      <small className="muted">{p.duration_days} days · complimentary</small>
                      <ul>
                        {(p.features || []).slice(0, 4).map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                      <span className="pill">{on ? "Selected" : "Select"}</span>
                    </button>
                  );
                })}
              </div>
              {!plans.length && <PlanSkeleton />}
            </>
          )}

          {STEPS[step].id === "account" && (
            <div className="reg-stack">
              <Field label={`${v.Your} name *`} missed={missed.full_name} errorMsg={fieldErrors.full_name} value={form.full_name} onChange={(val) => set("full_name", val)} />
              <Field label="Date of birth *" missed={missed.date_of_birth} errorMsg={fieldErrors.date_of_birth} type="date" value={form.date_of_birth} onChange={(val) => set("date_of_birth", val)} min={dobMin} max={dobMax} placeholder="Pick date of birth" />
              <Field label="Email *" missed={missed.email} errorMsg={fieldErrors.email} type="email" autoComplete="email" value={form.email} onChange={(val) => set("email", val)} />
              <div className={`field ${missed.mobile ? "missed" : ""}`}>
                <span>{`${v.Your} mobile *`}</span>
                <div className="phone-row">
                  <Select
                    value={form.dial_iso}
                    onChange={(val) => set("dial_iso", val)}
                    options={dialOptions}
                    searchable
                    searchPlaceholder="Search country"
                  />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    value={form.mobile}
                    placeholder={dial === "91" ? "98765 43210" : "Mobile number"}
                    onChange={(e) => set("mobile", e.target.value)}
                  />
                </div>
                {(missed.mobile || fieldErrors.mobile) && <em className="field-error">{fieldErrors.mobile || MISS}</em>}
              </div>
              <Field label="Password *" missed={missed.password} errorMsg={fieldErrors.password} type="password" autoComplete="new-password" value={form.password} onChange={(val) => set("password", val)} hint="At least 8 characters" />
            </div>
          )}

          {STEPS[step].id === "person" && (
            <div className="reg-stack">
              <Field
                label={`${v.Your} marital status *`}
                missed={missed.marital_status}
                errorMsg={fieldErrors.marital_status}
                type="select"
                value={form.marital_status}
                placeholder="Select marital status"
                onChange={(val) => set("marital_status", val)}
                options={MARITAL}
              />
              <Field
                label={`${v.Your} height *`}
                missed={missed.height_cm}
                errorMsg={fieldErrors.height_cm}
                type="select"
                value={form.height_cm}
                placeholder="Select height"
                onChange={(val) => set("height_cm", val)}
                options={heights}
              />
              <Field
                label="Religion *"
                missed={missed.religion}
                errorMsg={fieldErrors.religion}
                type="select"
                value={form.religion}
                placeholder="Select religion"
                onChange={(val) => set("religion", val)}
                options={tax.religions || ["Hindu", "Muslim", "Sikh", "Christian", "Jain"]}
              />
              <Field
                label="Mother tongue *"
                missed={missed.mother_tongue}
                errorMsg={fieldErrors.mother_tongue}
                type="select"
                value={form.mother_tongue}
                placeholder="Select mother tongue"
                onChange={(val) => set("mother_tongue", val)}
                options={tax.mother_tongues || ["Marathi", "Hindi", "Gujarati"]}
              />
              <Field
                label="Community"
                type="select"
                value={form.community}
                placeholder="Select community"
                onChange={(val) => set("community", val)}
                options={tax.communities || []}
              />
              <Field
                label="Country *"
                missed={missed.country}
                errorMsg={fieldErrors.country}
                type="select"
                searchable
                value={form.country}
                placeholder="Select country"
                onChange={setCountry}
                options={countries.map((c) => c.name)}
              />
              {(!selectedCountry || states.length > 0) && (
                <Field
                  label="State *"
                  missed={missed.state}
                  errorMsg={fieldErrors.state}
                  type="select"
                  searchable
                  value={form.state}
                  placeholder={form.country ? "Select state" : "Select country first"}
                  onChange={setStateVal}
                  options={states.map((s) => s.name)}
                />
              )}
              <Field
                label="City *"
                missed={missed.city}
                errorMsg={fieldErrors.city}
                type="select"
                searchable
                value={form.city}
                placeholder={form.country ? "Select city" : "Select country first"}
                onChange={setCity}
                options={[...cityOptions, { value: OTHER_CITY, label: "Other (type manually)" }]}
              />
              {form.city === OTHER_CITY && (
                <Field
                  label="Enter city name *"
                  missed={missed.city_other}
                  errorMsg={fieldErrors.city_other}
                  value={form.city_other}
                  onChange={(val) => set("city_other", val)}
                  placeholder="Type your city"
                />
              )}
            </div>
          )}

          {STEPS[step].id === "education" && (
            <div className="reg-stack">
              <div className="reg-icon pink-icon">
                <GraduationCap size={22} />
              </div>
              <p className="muted" style={{ textAlign: "center" }}>Great! Few more details</p>
              <h3>{v.Your} highest qualification</h3>
              <Field
                label={`${v.Your} highest qualification *`}
                missed={missed.education}
                errorMsg={fieldErrors.education}
                type="select"
                value={form.education}
                placeholder="Select qualification"
                onChange={(val) => set("education", val)}
                options={educations}
              />
              <h3>College name</h3>
              <Field label="College you attended" value={form.college} onChange={(val) => set("college", val)} placeholder="College you attended" />
            </div>
          )}

          {STEPS[step].id === "work" && (
            <div className="reg-stack">
              <div className="reg-icon pink-icon">
                <Briefcase size={22} />
              </div>
              <p className="muted" style={{ textAlign: "center" }}>You are almost done!</p>
              <div className="income-head">
                <h3>Income</h3>
                <div className="income-toggle">
                  {["yearly", "monthly"].map((p) => (
                    <button key={p} type="button" className={incomePeriod === p ? "on" : ""} onClick={() => setIncomePeriod(p)}>
                      {p === "yearly" ? "Yearly" : "Monthly"}
                    </button>
                  ))}
                </div>
              </div>
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={form.income_hidden}
                  onChange={(e) => set("income_hidden", e.target.checked)}
                />
                <span>Prefer not to say</span>
              </label>
              {!form.income_hidden && (
                <div className="grid-2">
                  <Field
                    label="Currency"
                    type="select"
                    searchable
                    value={form.income_currency}
                    placeholder="Currency"
                    onChange={(val) => set("income_currency", val)}
                    options={currencies}
                  />
                  <Field
                    label={`${v.Your} ${incomePeriod} income *`}
                    missed={missed.income_amount}
                    errorMsg={fieldErrors.income_amount}
                    type="number"
                    inputMode="decimal"
                    value={form.income_amount}
                    placeholder={incomePeriod === "monthly" ? "e.g. 80000" : "e.g. 1200000"}
                    onChange={(val) => set("income_amount", val)}
                  />
                </div>
              )}
              <p className="field-hint">Income details will help us find relevant matches. You may choose not to show this to others.</p>
              <h3>Work details</h3>
              <Field
                label={v.self ? "You work with" : v.female ? "She works with" : "He works with"}
                missed={missed.working_with}
                errorMsg={fieldErrors.working_with}
                type="select"
                value={form.working_with}
                placeholder={v.self ? "You work with" : v.female ? "She works with" : "He works with"}
                onChange={(val) => set("working_with", val)}
                options={workingWith}
              />
              {form.working_with && form.working_with !== "not_working" && (
                <>
                  <Field
                    label={v.self ? "You work as" : v.female ? "She works as" : "He works as"}
                    missed={missed.profession}
                    errorMsg={fieldErrors.profession}
                    type="select"
                    value={form.profession}
                    placeholder={v.self ? "You work as" : v.female ? "She works as" : "He works as"}
                    onChange={(val) => set("profession", val)}
                    options={professions}
                  />
                  {form.profession === "Other" && (
                    <Field
                      label="Please specify your occupation *"
                      missed={missed.profession_other}
                      errorMsg={fieldErrors.profession_other}
                      value={form.profession_other}
                      onChange={(val) => set("profession_other", val)}
                      placeholder="Type your occupation"
                    />
                  )}
                  <Field
                    label={`${v.Your} current company name`}
                    value={form.employer}
                    onChange={(val) => set("employer", val)}
                    placeholder="Your current company name"
                    hint="Specify current organization"
                  />
                </>
              )}
            </div>
          )}

          {STEPS[step].id === "family" && (
            <div className="grid-2">
              <Field label="Father" value={form.father} onChange={(val) => set("father", val)} />
              <Field label="Mother" value={form.mother} onChange={(val) => set("mother", val)} />
              <Field label="Siblings" value={form.siblings} onChange={(val) => set("siblings", val)} />
              <Field label="Family type" type="select" value={form.family_type} onChange={(val) => set("family_type", val)} options={["nuclear", "joint"]} />
              <Field label="Diet" type="select" value={form.diet} onChange={(val) => set("diet", val)} options={tax.diets || ["veg", "nonveg", "eggetarian", "jain"]} />
              <Field label="Smoking" type="select" value={form.smoking} onChange={(val) => set("smoking", val)} options={["no", "occasionally", "yes"]} />
              <Field label="Drinking" type="select" value={form.drinking} onChange={(val) => set("drinking", val)} options={["no", "occasionally", "yes"]} />
              <Field label="Birth time" type="time" value={form.birth_time} onChange={(val) => set("birth_time", val)} />
              <Field label="Birth place" value={form.birth_place} onChange={(val) => set("birth_place", val)} placeholder={form.city || "City of birth"} />
            </div>
          )}

          {STEPS[step].id === "about" && (
            <div className="reg-stack">
              <div className="reg-icon pink-icon">
                <PenLine size={22} />
              </div>
              <label className={`field ${missed.about ? "missed" : ""}`}>
                <span>About {v.yourself} *</span>
                <textarea rows={7} maxLength={4000} value={form.about} onChange={(e) => set("about", e.target.value)} />
              </label>
              {missed.about && <em className="field-error">{fieldErrors.about || MISS}</em>}
              <div className="about-meta">
                <span className="muted">Edit the text above to make it more personal.</span>
                <span className="muted">{(form.about || "").length} / 4000</span>
              </div>
            </div>
          )}

          {STEPS[step].id === "prefs" && (
            <div className="reg-stack">
              <p className="muted">
                {form.looking_for === "bride" ? "Preferred age for the bride." : "Preferred age for the groom."}
              </p>
              <div className="grid-2">
                <Field label="Age from" missed={missed.age_min} errorMsg={fieldErrors.age_min} type="select" value={form.age_min} onChange={(val) => set("age_min", Number(val))} options={tax.ages?.length ? tax.ages : Array.from({ length: 53 }, (_, i) => 18 + i)} />
                <Field label="Age to" missed={missed.age_max} errorMsg={fieldErrors.age_max} type="select" value={form.age_max} onChange={(val) => set("age_max", Number(val))} options={tax.ages?.length ? tax.ages : Array.from({ length: 53 }, (_, i) => 18 + i)} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button type="button" className="btn btn-primary" onClick={next} disabled={busy}>
              {busy
                ? "Creating profile…"
                : STEPS[step].id === "plan"
                  ? picked
                    ? `Continue with ${picked.name}`
                    : "Choose a plan"
                  : "Continue"}
            </button>
          </div>
          <p className="req-note">* Required fields</p>
          {step === 0 && (
            <p className="muted" style={{ marginTop: 14 }}>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", options, placeholder, missed, hint, errorMsg, autoComplete, inputMode, min, max, searchable }) {
  return (
    <div className={`field ${missed ? "missed" : ""}`}>
      <span>{label}</span>
      {type === "select" ? (
        <Select value={value} onChange={onChange} options={options} placeholder={placeholder || "Select"} searchable={searchable} />
      ) : type === "date" ? (
        <DatePicker value={value} onChange={onChange} min={min} max={max} placeholder={placeholder || "Select date"} />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {(missed || errorMsg) && <em className="field-error">{errorMsg || MISS}</em>}
      {hint && !missed && !errorMsg && <small className="field-hint">{hint}</small>}
    </div>
  );
}
