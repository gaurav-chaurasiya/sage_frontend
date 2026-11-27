import { useEffect, useState } from "react";
import DatePicker from "../../components/DatePicker";
import { useSearchParams } from "react-router-dom";
import { Clock, MapPin, Moon, Sparkles } from "lucide-react";
import api, { apiError } from "../../api/client";
import { useAuth } from "../../store/auth";

const empty = {
  boy_name: "Arjun",
  boy_dob: "1995-06-18",
  boy_time: "07:12",
  boy_place: "Mumbai",
  girl_name: "Priya",
  girl_dob: "1997-11-04",
  girl_time: "16:45",
  girl_place: "Nashik",
};

function fillFromProfile(form, data, side) {
  if (!data) return form;
  return {
    ...form,
    [`${side}_name`]: data.display_name || data.user?.full_name || form[`${side}_name`],
    [`${side}_dob`]: (data.user?.date_of_birth || "").slice(0, 10) || form[`${side}_dob`],
    [`${side}_time`]: (data.birth_time || "").slice(0, 5) || form[`${side}_time`],
    [`${side}_place`]: data.birth_place || data.city || form[`${side}_place`],
  };
}

export default function Kundali() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [form, setForm] = useState(empty);
  const [places, setPlaces] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/kundali/").then((r) => setPlaces(r.data.places || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const boyId = params.get("boy_id");
    const girlId = params.get("girl_id");
    const withId = params.get("with");
    const load = async (id, side) => {
      try {
        const { data } = await api.get(`/profiles/${id}/`);
        setForm((f) => fillFromProfile(f, data, side));
      } catch {
        /* guest form still works */
      }
    };
    if (boyId) load(boyId, "boy");
    if (girlId) load(girlId, "girl");
    if (withId) {
      api
        .get(`/profiles/${withId}/`)
        .then(({ data }) => {
          const side = data.user?.gender === "male" ? "boy" : "girl";
          setForm((f) => fillFromProfile(f, data, side));
        })
        .catch(() => {});
    }
  }, [params]);

  useEffect(() => {
    if (!user) return;
    api
      .get("/profiles/me/")
      .then(({ data }) => {
        const side = data.user?.gender === "male" ? "boy" : "girl";
        setForm((f) => fillFromProfile(f, data, side));
      })
      .catch(() => {});
  }, [user]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const run = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/kundali/", form);
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(apiError(err, "Could not match these kundalis."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="container section kundali-page">
      <p className="eyebrow">Ashtakoota · 36 Guna</p>
      <h2>Kundali matching, without the noise.</h2>
      <p className="muted kundali-lead">
        Enter both names, date of birth, exact birth time and place. Moon rashi, nakshatra, pada, lagna
        and Manglik are calculated in the Lahiri sidereal frame, then scored on the eight classical koots.
      </p>

      <form className="kundali-form" onSubmit={run}>
        <div className="kundali-pair">
          <JanmaCard
            title="Boy / Groom"
            tone="groom"
            prefix="boy"
            form={form}
            set={set}
            places={places}
          />
          <JanmaCard
            title="Girl / Bride"
            tone="bride"
            prefix="girl"
            form={form}
            set={set}
            places={places}
          />
        </div>
        {error && <p className="notice">{error}</p>}
        <div className="kundali-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            <Sparkles size={16} />
            {busy ? "Matching charts…" : "Match kundali"}
          </button>
          <p className="muted">North Indian Guna Milan · whole-sign houses · IST for Indian cities</p>
        </div>
      </form>

      {result && <KundaliReport result={result} />}
    </section>
  );
}

function JanmaCard({ title, tone, prefix, form, set, places }) {
  return (
    <article className={`janma-card glass ${tone}`}>
      <p className="eyebrow">{title}</p>
      <label className="field">
        <span>Full name</span>
        <input value={form[`${prefix}_name`]} onChange={(e) => set(`${prefix}_name`, e.target.value)} required />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>Date of birth</span>
          <DatePicker value={form[`${prefix}_dob`]} onChange={(val) => set(`${prefix}_dob`, val)} placeholder="Pick date of birth" />
        </label>
        <label className="field">
          <span>Time of birth</span>
          <input type="time" value={form[`${prefix}_time`]} onChange={(e) => set(`${prefix}_time`, e.target.value)} required />
        </label>
      </div>
      <label className="field">
        <span>Place of birth</span>
        <input
          list={`${prefix}-places`}
          value={form[`${prefix}_place`]}
          onChange={(e) => set(`${prefix}_place`, e.target.value)}
          placeholder="City"
          required
        />
        <datalist id={`${prefix}-places`}>
          {places.map((p) => (
            <option key={`${prefix}-${p.name}`} value={p.name}>
              {p.region}
            </option>
          ))}
        </datalist>
      </label>
    </article>
  );
}

function GunaRing({ total, max = 36 }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Number(total) / max);
  return (
    <svg className="guna-ring" viewBox="0 0 160 160" aria-hidden="true">
      <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(50, 99, 80,.12)" strokeWidth="12" />
      <circle
        cx="80"
        cy="80"
        r={r}
        fill="none"
        stroke="url(#gunaGold)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 80 80)"
      />
      <defs>
        <linearGradient id="gunaGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3f7a60" />
          <stop offset="100%" stopColor="#c4a35a" />
        </linearGradient>
      </defs>
      <text x="80" y="74" textAnchor="middle" className="guna-num">
        {total}
      </text>
      <text x="80" y="98" textAnchor="middle" className="guna-den">
        / {max}
      </text>
    </svg>
  );
}

function KundaliReport({ result }) {
  const boy = result.boy || {};
  const girl = result.girl || {};
  const koots = result.koots || [];
  const bandLabels = { uttam: "Uttam", uttam_madhyam: "Uttam Madhyam", madhyam: "Madhyam" };
  const circumferenceNote = bandLabels[result.band] || "Heena";

  return (
    <div className="kundali-report">
      <div className="kundali-verdict glass">
        <GunaRing total={result.guna_milan} />
        <div>
          <p className="eyebrow">{circumferenceNote} · {result.percent}%</p>
          <h3 className="serif">{result.verdict}</h3>
          <p className="muted">{result.summary}</p>
          <div className="kundali-pills">
            <span className={`pill ${result.manglik?.status === "clear" || result.manglik?.status === "cancelled" ? "green" : ""}`}>
              {result.manglik?.note}
            </span>
            {(result.doshas || []).map((d) => (
              <span className="pill" key={d.key}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="kundali-charts">
        <ChartCard person={boy} role="Boy" />
        <ChartCard person={girl} role="Girl" />
      </div>

      <div className="koot-sheet glass">
        <p className="eyebrow">Ashtakoota</p>
        <h3 className="serif">Eight koots, thirty-six gunas.</h3>
        <div className="koot-rows">
          {koots.map((k) => (
            <div className={`koot-row ${k.ok ? "ok" : "weak"}`} key={k.key}>
              <div>
                <b>
                  {k.sanskrit} <span>{k.name}</span>
                </b>
                <p>{k.note}</p>
              </div>
              <div className="koot-score">
                <span className="koot-bar">
                  <i style={{ width: `${k.max ? (k.points / k.max) * 100 : 0}%` }} />
                </span>
                <strong>
                  {k.points}
                  <small>/{k.max}</small>
                </strong>
              </div>
            </div>
          ))}
        </div>
        <p className="muted koot-foot">{result.system}</p>
      </div>
    </div>
  );
}

function ChartCard({ person, role }) {
  return (
    <article className="chart-card glass">
      <p className="eyebrow">{role}</p>
      <h3 className="serif">{person.name}</h3>
      <p className="muted chart-meta">
        <Clock size={14} /> {person.dob} · {person.time}
        {person.time_assumed ? " (noon assumed)" : ""}
        <span>
          <MapPin size={14} /> {person.place}
        </span>
      </p>
      <dl className="chart-grid">
        <div>
          <dt>Rashi</dt>
          <dd>
            {person.rashi} <small>{person.rashi_english}</small>
          </dd>
        </div>
        <div>
          <dt>Nakshatra</dt>
          <dd>
            {person.nakshatra} <small>Pada {person.pada}</small>
          </dd>
        </div>
        <div>
          <dt>Lagna</dt>
          <dd>{person.lagna}</dd>
        </div>
        <div>
          <dt>Gana / Nadi</dt>
          <dd>
            {person.gana} · {person.nadi}
          </dd>
        </div>
        <div>
          <dt>Yoni</dt>
          <dd>{person.yoni}</dd>
        </div>
        <div>
          <dt>
            <Moon size={12} /> Manglik
          </dt>
          <dd>{person.manglik_label}</dd>
        </div>
      </dl>
    </article>
  );
}
