import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiError } from "../../api/client";
import { INTEREST_GROUPS } from "../../data/interests";
import { voiceOf } from "../../data/register";
import OnboardLayout from "./OnboardLayout";
import { useAuth } from "../../store/auth";

export default function OnboardInterests() {
  const nav = useNavigate();
  const { user } = useAuth();
  const v = voiceOf(user || {});
  const [picked, setPicked] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const toggle = (item) =>
    setPicked((rows) => (rows.includes(item) ? rows.filter((x) => x !== item) : [...rows, item]));

  const save = async () => {
    if (picked.length < 4) return;
    setBusy(true);
    setError("");
    try {
      await api.patch("/profiles/me/", { hobbies: picked, interests: picked });
      nav("/onboard/verify");
    } catch (e) {
      setError(apiError(e, "Could not save interests."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardLayout skipTo="/onboard/verify">
      <h1 className="onboard-title">Now let’s add {v.your} hobbies & interests</h1>
      <p className="muted" style={{ textAlign: "center", marginBottom: 18 }}>
        This will help find better matches
      </p>
      {error && <p className="verify-banner">{error}</p>}
      {INTEREST_GROUPS.map((group) => (
        <section className="onboard-card chip-card" key={group.id}>
          <h3>{group.title}</h3>
          <div className="chip-wrap">
            {group.items.map((item) => (
              <button
                key={item}
                type="button"
                className={`interest-chip ${picked.includes(item) ? "on" : ""}`}
                onClick={() => toggle(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </section>
      ))}
      <div className="onboard-sticky">
        <button className="btn btn-primary" type="button" disabled={picked.length < 4 || busy} onClick={save}>
          Save & continue ({Math.min(picked.length, 4)}/4)
        </button>
      </div>
    </OnboardLayout>
  );
}
