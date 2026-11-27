import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Mail, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";
import api, { apiError } from "../../api/client";
import Select from "../../components/Select";
import PlanPicker from "../../components/PlanPicker";
import Pagination, { slicePage } from "../../components/Pagination";
import ProfilePhoto from "../../components/ProfilePhoto";

export function About() {
  return (
    <section className="container section">
      <p className="eyebrow">About Matrimony</p>
      <h2>Built for families who still believe an introduction should feel like one.</h2>
      <p className="lead muted prose-lead">
        Matrimony is a private Indian matchmaking platform — not a swipe feed. We studied how families
        already search: deep profiles, partner preferences, reverse matches, protected photos, kundali,
        and a conversation that only opens when both sides agree. Then we rebuilt every one of those
        workflows under our own sage-and-ivory brand.
      </p>

      <div className="grid-3" style={{ marginTop: 8 }}>
        {[
          ["Discretion", "Profiles are treated as family introductions. Photos can stay locked, phone numbers stay hidden, and contact is a consent — never a default."],
          ["Craft", "Matching is weighted: age, faith, community, city, education, lifestyle and Ashtakoota. Daily recommendations are ranked, not dumped."],
          ["Ceremony", "From Blue Tick verification to premium chat and VIP concierge, the product is paced for marriage — not for endless browsing."],
        ].map(([t, d]) => (
          <article className="trust-item glass" key={t}>
            <h3 className="serif" style={{ fontSize: 32 }}>
              {t}
            </h3>
            <p className="muted">{d}</p>
          </article>
        ))}
      </div>

      <div className="about-band glass">
        <div>
          <p className="eyebrow">How a search actually moves</p>
          <h3 className="serif">Four steps, then a conversation.</h3>
        </div>
        <ol className="about-steps">
          {[
            ["Write a real profile", "Name, city, education, family, lifestyle, birth details. The more complete it is, the sharper the matches."],
            ["Set what you will not compromise", "Age band, community, city, education, diet, manglik. Preferences filter — they do not shout."],
            ["Meet people on purpose", "Daily matches, search, shortlist and interest. Reverse matches show who already chose you."],
            ["Talk when both families are ready", "Chat after accepted interest or Premium. Contact details stay private until you request them."],
          ].map(([t, d], i) => (
            <li key={t}>
              <b>
                <i>{String(i + 1).padStart(2, "0")}</i> {t}
              </b>
              <p>{d}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid-4" style={{ marginTop: 22 }}>
        {[
          ["18+", "adults only"],
          ["Blue Tick", "phone, photo, ID"],
          ["36 guna", "kundali on every chart"],
          ["Sage Matrimony", "the studio behind it"],
        ].map(([k, v]) => (
          <div className="stat glass" key={k}>
            <b>{k}</b>
            {v}
          </div>
        ))}
      </div>

      <p className="muted" style={{ maxWidth: 680, marginTop: 28 }}>
        The product is designed and engineered by <strong>Sage Matrimony Inc</strong>. We build
        matchmaking as serious software — privacy, verification and compatibility first.
      </p>
      <div className="hero-actions" style={{ marginTop: 18 }}>
        <Link className="btn btn-primary" to="/register">
          Create your profile
        </Link>
        <Link className="btn btn-ghost" to="/contact">
          Talk to us
        </Link>
      </div>
    </section>
  );
}

export function Membership() {
  return (
    <>
      <section className="container hero membership-hero">
        <div>
          <p className="eyebrow">Membership</p>
          <h2>
            Choose the tempo of your <em>search</em>.
          </h2>
          <p className="lead muted prose-lead">
            Free, Gold, Diamond, Platinum, Select and VIP are all free right now. Pick the plan
            that fits how seriously you are looking — chat, contact and boosts unlock on paid-tier plans.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/register">
              Get started free
            </Link>
            <Link className="btn btn-ghost" to="/help">
              Compare benefits
            </Link>
          </div>
        </div>
        <div className="hero-art">
          <ProfilePhoto
            photo="https://images.pexels.com/photos/16632447/pexels-photo-16632447.jpeg"
            name="Membership"
            alt="Couple celebrating their engagement"
            loading="lazy"
          />
          <div className="hero-float glass">
            <Sparkles color="#326350" size={20} />
            <p className="eyebrow" style={{ marginTop: 8 }}>
              Launch offer
            </p>
            <strong style={{ fontFamily: "var(--serif)", fontSize: 22, display: "block", marginTop: 4 }}>
              All plans free
            </strong>
            <p className="muted" style={{ marginTop: 6 }}>
              Premium chat, contact requests and profile boosts — active the moment you upgrade.
            </p>
          </div>
        </div>
      </section>

      <section className="container section membership-plans">
        <p className="eyebrow">Plans</p>
        <h2>Every tier, one quiet standard of trust.</h2>
        <p className="lead muted prose-lead" style={{ marginBottom: 8 }}>
          Verification and privacy are included on every plan. Pick the pace — browse free, or move faster with Premium.
        </p>
        <PlanPicker />
      </section>
    </>
  );
}

export function Stories() {
  const [stories, setStories] = useState(null);
  const [page, setPage] = useState(1);
  useEffect(() => {
    api
      .get("/success-stories/")
      .then((r) => setStories(Array.isArray(r.data) ? r.data : []))
      .catch(() => setStories([]));
  }, []);
  const paged = slicePage(stories || [], page, 9);
  return (
    <section className="container section">
      <p className="eyebrow">Success stories</p>
      <h2>Weddings that started as a quiet match.</h2>
      <p className="lead muted prose-lead">
        These are members who used verification, preferences and kundali the way families actually do —
        then took the conversation offline when both sides were sure.
      </p>
      {stories && stories.length === 0 && (
        <p className="notice" style={{ marginTop: 18 }}>
          Our first couples are still writing their stories. Found your partner on Matrimony? Share your wedding with us.
        </p>
      )}
      <div className="grid-3">
        {paged.items.map((s) => (
            <article className="profile-card glass" key={s.names}>
              <ProfilePhoto photo={s.photo} name={s.names} style={{ height: 220 }} loading="lazy" />
              <div className="meta">
              <h3>{s.names}</h3>
              <p className="muted">
                {s.city} · {s.married_on}
              </p>
              <p style={{ marginTop: 8 }}>{s.quote}</p>
            </div>
          </article>
        ))}
      </div>
      {paged.count > 0 && (
        <Pagination page={paged.page} pages={paged.pages} count={paged.count} onPage={setPage} label="stories" />
      )}
      <div className="hero-actions" style={{ marginTop: 28 }}>
        <Link className="btn btn-primary" to="/register">
          Start your own
        </Link>
        <Link className="btn btn-ghost" to="/contact">
          Share a wedding
        </Link>
      </div>
    </section>
  );
}

const HELP = [
  {
    title: "Profile & privacy",
    items: [
      ["How do I hide my profile?", "Open Settings → Privacy → Hide profile. You leave search and recommendations immediately. Unhide the same way when you are ready."],
      ["Who can see my photos?", "You control photo visibility: public, members only, or locked until you accept interest. Primary photos should still represent you honestly."],
      ["Can I edit after I register?", "Yes. My Profile saves name, city, career, birth time and place. Rashi, nakshatra and Manglik are recalculated from birth details."],
    ],
  },
  {
    title: "Matches & chat",
    items: [
      ["How does matching work?", "We score age, religion, community, city, education, lifestyle, preferences and Ashtakoota when both charts have birth data. The percentage is a guide, not a verdict."],
      ["Why can’t I chat yet?", "Free members send interest first. Chat opens when interest is accepted, or immediately on a Premium plan."],
      ["What is a reverse match?", "Someone whose preferences already include you. They appear in Matches so you are not only hunting — you are also being found."],
    ],
  },
  {
    title: "Trust & membership",
    items: [
      ["How do I get a Blue Tick?", "Verify phone and email with OTP, then request photo and ID review from Verification. Moderators approve genuine documents only."],
      ["How do I report misuse?", "Open the profile → Report. We review fake profiles, fraud, already-married, underage, harassment and money requests."],
      ["Do I need to pay?", "No. Free includes profile, matches, shortlist and interest. Gold and above add chat, contact and boosts. Select and VIP add an advisor."],
    ],
  },
];

export function Help() {
  return (
    <section className="container section faq">
      <p className="eyebrow">Help centre</p>
      <h2>Answers before you have to wait for us.</h2>
      <p className="lead muted prose-lead">
        Most families ask the same few things. If yours is not here, write to the studio — we read every note.
      </p>
      {HELP.map((group) => (
        <div key={group.title} className="help-group">
          <h3 className="serif">{group.title}</h3>
          {group.items.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p className="muted" style={{ marginTop: 8 }}>
                {a}
              </p>
            </details>
          ))}
        </div>
      ))}
      <div className="about-band glass" style={{ marginTop: 28 }}>
        <div>
          <p className="eyebrow">Still stuck</p>
          <h3 className="serif">Write to Sage Matrimony.</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            Membership billing, verification delays and safety reports are handled on weekdays, 10:00–18:30 IST.
          </p>
          <Link className="btn btn-primary" to="/contact" style={{ marginTop: 16 }}>
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}

const TOPICS = [
  { value: "general", label: "General" },
  { value: "membership", label: "Membership & billing" },
  { value: "profile", label: "Profile help" },
  { value: "verification", label: "Verification" },
  { value: "safety", label: "Safety & report" },
  { value: "wedding", label: "Share a success story" },
];

export function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", topic: "general", message: "" });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    try {
      await api.post("/contact/", form);
      setNote("Received. Sage Matrimony will reply on this email within one working day.");
      setForm({ name: "", email: "", phone: "", topic: "general", message: "" });
    } catch (err) {
      setError(apiError(err, "Could not send your note. Please email Sagematrimony@gmail.com."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="container section">
      <p className="eyebrow">Contact</p>
      <h2>Write to the studio.</h2>
      <p className="lead muted prose-lead">
        Matrimony is run by Sage Matrimony Inc. Use this desk for membership, verification,
        profile help or to tell us a wedding started here.
      </p>
      <div className="contact-grid">
        <form className="search-card glass" onSubmit={send}>
          <h3>Send a note</h3>
          {error && <p className="notice">{error}</p>}
          {note && <p className="notice" style={{ color: "#15803d", background: "rgba(22,163,74,.1)" }}>{note}</p>}
          <div className="grid-2">
            <label className="field">
              <span>Name</span>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </label>
            <label className="field">
              <span>Phone</span>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Optional" />
            </label>
            <label className="field">
              <span>Topic</span>
              <Select value={form.topic} onChange={(v) => set("topic", v)} options={TOPICS} />
            </label>
          </div>
          <label className="field" style={{ marginTop: 10 }}>
            <span>Message</span>
            <textarea rows={6} value={form.message} onChange={(e) => set("message", e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy}>
            {busy ? "Sending…" : "Send"}
          </button>
        </form>
        <aside className="contact-aside">
          {[
            [MapPin, "Studio", "Sage Matrimony Inc"],
            [Mail, "Email", "Sagematrimony@gmail.com"],
            [Phone, "Phone", "+1 (778) 288-7050"],
            [MapPin, "Address", "15315 66 Ave\nSurrey"],
            [Clock, "Hours", "Monday–Saturday\n10:00 – 18:30 IST"],
          ].map(([Icon, label, value]) => (
            <article className="trust-item glass" key={label}>
              <Icon color="#326350" size={18} />
              <h3 className="serif" style={{ fontSize: 26, margin: "8px 0 6px" }}>
                {label}
              </h3>
              <p className="muted" style={{ whiteSpace: "pre-line" }}>
                {value}
              </p>
            </article>
          ))}
        </aside>
      </div>
    </section>
  );
}

export { default as Horoscope } from "./Kundali";

const LEGAL = {
  privacy: {
    title: "Privacy",
    lead: "We store what matchmaking needs — not a social graph to sell.",
    sections: [
      ["What we keep", "Account identity, profile fields you typed, photos you uploaded, preferences, interests, shortlists, chat metadata and membership status. Birth time and place are used only to compute rashi, nakshatra, lagna and Ashtakoota."],
      ["What stays hidden", "Phone and email are never shown on a public card. Contact details unlock only after a contact request is accepted, or on a plan that allows it. Photos can be locked until you accept interest."],
      ["Payments", "Card data is not stored on Matrimony servers. Checkout goes through the payment partner. We keep only order id, plan and amount."],
      ["Your controls", "Hide profile, block, ignore, report, download or delete your account from Settings. Hiding removes you from search the same day."],
    ],
  },
  terms: {
    title: "Terms",
    lead: "Matrimony is a matchmaking service. It is not a promise of marriage.",
    sections: [
      ["Who may join", "Members must be 21 or older, legally free to marry, and truthful on the profile. Parents and siblings may create a profile on someone’s behalf only with their knowledge."],
      ["Your conduct", "No fake photos, no already-married listings, no solicitation, no asking for money, no harassment. We suspend immediately and may report criminal misuse."],
      ["The product", "Matching scores, kundali totals and recommendations are tools for families. They are not astrological or legal advice. A priest or counsellor may still be needed."],
      ["Membership", "Paid plans are time-bound. Unused days do not roll over unless the law requires it. Abuse of chat or contact features can end a plan without refund."],
    ],
  },
  safety: {
    title: "Safety centre",
    lead: "Treat the first weeks like any introduction through a relative — warm, and careful.",
    sections: [
      ["Never share", "OTPs, UPI pins, bank details or copies of ID in chat. Matrimony staff will never ask you to pay a member."],
      ["Meet in public", "Use in-app chat first. When you meet, choose a public place and tell someone at home. A family video call is a good step before travel."],
      ["Report quickly", "Fake profile, fraud, already married, underage, harassment, inappropriate photos, asking for money, impersonation. Open the profile and tap Report."],
      ["We review every report", "Moderators can hide a profile, lock chat and pass a case to authorities when the law requires it. You can also write to Sagematrimony@gmail.com."],
    ],
  },
  report: {
    title: "Report misuse",
    lead: "If something feels off, it is already enough reason to tell us.",
    sections: [
      ["How", "Open the profile → Report. Choose the closest reason and add a short note. Screenshots from chat help."],
      ["Reasons we act on", "Fake profile, fraud, abusive behaviour, inappropriate content, already married, asking for money, harassment, spam, underage, impersonation."],
      ["What happens next", "The profile may be hidden while we look. You will not be shown as the reporter. Repeat offenders are banned."],
    ],
  },
  missing: {
    title: "Page not found",
    lead: "This address does not exist on Matrimony.",
    sections: [
      ["Where to go", "Head home to search, open Help, or write to the studio if a link is broken."],
    ],
  },
};

export function Legal({ slug = "missing" }) {
  const page = LEGAL[slug] || LEGAL.missing;
  return (
    <section className="container section legal-doc">
      <p className="eyebrow">Matrimony</p>
      <h2>{page.title}</h2>
      <p className="lead muted prose-lead">{page.lead}</p>
      {page.sections.map(([h, body]) => (
        <article key={h}>
          <h3 className="serif">{h}</h3>
          <p className="muted">{body}</p>
        </article>
      ))}
      <div className="hero-actions" style={{ marginTop: 24 }}>
        <Link className="btn btn-primary" to="/">
          Home
        </Link>
        <Link className="btn btn-ghost" to="/contact">
          Contact
        </Link>
      </div>
    </section>
  );
}

const LANDINGS = {
  hindu: "Hindu families searching with gotra, community and kundali in the same place.",
  muslim: "Muslim profiles with sect, mother tongue and family values treated as first-class filters.",
  sikh: "Sikh matrimony with Punjabi and NRI households, verification and private chat.",
  christian: "Christian and Syrian Christian introductions with church and city preferences.",
  jain: "Jain families who want diet, community and ceremony taken seriously.",
  mumbai: "Mumbai and Navi Mumbai professionals who still want a family-first search.",
  nashik: "Nashik households — local city matching with Maharashtrian depth.",
  maratha: "Maratha community search with Marathi as a mother-tongue preference, not a slogan.",
  india: "An India-wide desk for people who want marriage, not a dating feed.",
};

export function SeoLanding() {
  const slug = window.location.pathname.split("/").filter(Boolean).slice(-1)[0];
  const label = slug.replace(/-/g, " ");
  const extra = LANDINGS[slug] || `Verified ${label} profiles with preference-aware matching and private chat.`;
  return (
    <section className="container section">
      <p className="eyebrow">Matrimony</p>
      <h2>{label} matrimony</h2>
      <p className="lead muted prose-lead">{extra}</p>
      <div className="grid-3">
        {[
          [ShieldCheck, "Blue Tick", "Phone, photo and optional ID before you take anyone seriously."],
          [Sparkles, "Ashtakoota", "Name, date, time and place of birth — real Guna Milan, not a name hash."],
          [Mail, "Private chat", "Conversation after interest is accepted, or on Premium from day one."],
        ].map(([Icon, t, d]) => (
          <article className="trust-item glass" key={t}>
            <Icon color="#326350" size={18} />
            <h3 className="serif" style={{ fontSize: 28, margin: "8px 0" }}>
              {t}
            </h3>
            <p className="muted">{d}</p>
          </article>
        ))}
      </div>
      <div className="hero-actions" style={{ marginTop: 28 }}>
        <Link className="btn btn-primary" to="/register">
          Create your {label} profile
        </Link>
        <Link className="btn btn-ghost" to="/horoscope">
          Match kundali
        </Link>
      </div>
    </section>
  );
}
