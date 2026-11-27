import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, HeartHandshake, MapPin, Sparkles, ShieldCheck, Star } from "lucide-react";
import api from "../../api/client";
import Select from "../../components/Select";
import ProfilePhoto from "../../components/ProfilePhoto";

const communities = ["Hindu", "Muslim", "Sikh", "Christian", "Jain", "Maratha", "Brahmin", "Patel", "Mumbai", "Nashik", "Delhi", "NRI"];

export default function Home() {
  const nav = useNavigate();
  const [stories, setStories] = useState([]);
  const [form, setForm] = useState({ looking_for: "bride", age_min: 21, age_max: 30, religion: "Hindu", mother_tongue: "Marathi" });

  useEffect(() => {
    api.get("/success-stories/").then((r) => setStories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  return (
    <>
      <section className="container hero">
        <div>
          <p className="eyebrow">India’s private matchmaking atelier</p>
          <h1>
            Choose your
            <br />
            <em>forever</em>
          </h1>
          <p className="lead">
            Verified profiles, glass-quiet privacy and a compatibility engine that understands family,
            faith, city and the life you actually want to build.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/register">
              Create your profile
            </Link>
            <Link className="btn btn-ghost" to="/membership">
              Explore membership
            </Link>
          </div>
        </div>
        <div className="hero-art">
          <ProfilePhoto
            photo="https://images.pexels.com/photos/38147801/pexels-photo-38147801.jpeg"
            name="Matrimony"
            alt="Matrimony portrait"
            loading="eager"
          />
          <div className="hero-float glass">
            <p className="eyebrow">Blue Tick</p>
            <strong style={{ fontFamily: "var(--serif)", fontSize: 22 }}>Photo, phone & ID verified</strong>
            <p className="muted" style={{ marginTop: 6 }}>
              Trust, before the first conversation.
            </p>
          </div>
        </div>
      </section>

      <div className="container">
        <form
          className="search-card glass"
          onSubmit={(e) => {
            e.preventDefault();
            nav(
              `/register?looking_for=${encodeURIComponent(form.looking_for)}&age_min=${form.age_min}&age_max=${form.age_max}&religion=${encodeURIComponent(form.religion)}&mother_tongue=${encodeURIComponent(form.mother_tongue)}`
            );
          }}
        >
          <h3>Begin with who you’re looking for</h3>
          <div className="grid-4">
            <div className="field">
              <span>Looking for</span>
              <Select
                value={form.looking_for}
                onChange={(v) => setForm({ ...form, looking_for: v })}
                options={[
                  { value: "bride", label: "Bride" },
                  { value: "groom", label: "Groom" },
                ]}
              />
            </div>
            <div className="field">
              <span>Age</span>
              <Select
                value={form.age_min}
                onChange={(v) => setForm({ ...form, age_min: v })}
                options={[21, 24, 27, 30]}
              />
            </div>
            <div className="field">
              <span>Religion</span>
              <Select
                value={form.religion}
                onChange={(v) => setForm({ ...form, religion: v })}
                options={["Hindu", "Muslim", "Sikh", "Christian", "Jain"]}
              />
            </div>
            <div className="field">
              <span>Mother tongue</span>
              <Select
                value={form.mother_tongue}
                onChange={(v) => setForm({ ...form, mother_tongue: v })}
                options={["Marathi", "Hindi", "Gujarati", "Tamil", "Telugu"]}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 16 }}>
            Let’s find a match
          </button>
        </form>
      </div>

      <section className="container trust">
        {[
          ["30-day", "thoughtful introductions"],
          ["Blue Tick", "verification suite"],
          ["AI", "compatibility ranking"],
          ["VIP", "concierge matchmaking"],
        ].map(([k, v]) => (
          <div className="trust-item glass" key={k}>
            <b>{k}</b>
            {v}
          </div>
        ))}
      </section>

      <section className="container section">
        <p className="eyebrow">Why families stay</p>
        <h2>Quiet luxury. Serious intent.</h2>
        <div className="grid-3">
          {[
            [ShieldCheck, "Verification first", "Phone, email, photo liveness and optional government ID — then a Blue Tick."],
            [Sparkles, "Weighted matching", "Age, faith, community, city, lifestyle, horoscope and behaviour — not a blunt filter."],
            [HeartHandshake, "Privacy as a product", "Field-level visibility. Protected photos. Contact only after consent."],
            [BadgeCheck, "Premium communication", "Chat after mutual interest, contact and photo requests, and a private inbox."],
            [Star, "Kundali compatibility", "Gun milan, nakshatra and dosha insights woven into every match score — optional, never forced."],
            [MapPin, "Near you discovery", "See profiles in your city and radius — Mumbai, Nashik, Delhi and communities across India."],
          ].map(([Icon, t, d]) => (
            <article className="trust-item glass" key={t}>
              <Icon color="#326350" />
              <h3 className="serif" style={{ fontSize: 28, margin: "8px 0" }}>
                {t}
              </h3>
              <p className="muted">{d}</p>
            </article>
          ))}
        </div>
      </section>

      {stories.length > 0 && (
      <section className="container section">
        <p className="eyebrow">Happily ever after</p>
        <h2>Stories written in sage and gold.</h2>
        <div className="grid-3">
          {stories.slice(0, 3).map((s) => (
            <article className="profile-card glass" key={s.names}>
              <ProfilePhoto photo={s.photo} name={s.names} style={{ height: 200 }} loading="lazy" />
              <div className="meta">
                <h3>{s.names}</h3>
                <p className="muted">{s.city}</p>
                <p style={{ marginTop: 8 }}>{s.quote}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      )}

      <section className="container section seo-browse">
        <p className="eyebrow">Browse by community</p>
        <h2>Find your people.</h2>
        <div className="seo-grid" role="list">
          {communities.map((c) => (
            <Link key={c} className="seo-chip glass" to={`/matrimony/${c.toLowerCase()}`} role="listitem">
              {c} matrimony
            </Link>
          ))}
        </div>
      </section>

      <section className="container section faq">
        <p className="eyebrow">FAQ</p>
        <h2>Asked by every family.</h2>
        <div className="faq-list">
          {[
            ["Can parents create a profile?", "Yes. Choose Parent, Brother / Sister or Relative at registration. The person on the profile must be 18+ (21+ for men in India) and aware of the listing."],
            ["Can I use it for free?", "Yes. Profile creation, daily matches, shortlists and expressing interest are on Free. Right now every plan is free, including chat and contact requests."],
            ["How does verification work?", "A code by SMS for your phone, a code by email, selfie liveness for photos, and optional government ID. A Blue Tick appears after review."],
          ].map(([q, a]) => (
            <details key={q} className="faq-item glass">
              <summary>{q}</summary>
              <p className="muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
