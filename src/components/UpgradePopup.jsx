import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Phone, Sparkles, Star, UserRound, X } from "lucide-react";
import { useAuth } from "../store/auth";

const INTERVAL_MS = 2 * 60 * 60 * 1000;

const OFFERS = [
  {
    id: "chat",
    icon: MessageCircle,
    title: "Chat the same day you match",
    body: "Gold unlocks unlimited chat — no waiting to say hello.",
    cta: "See Gold",
    to: "/app/membership",
  },
  {
    id: "contact",
    icon: Phone,
    title: "View contact when it feels right",
    body: "Gold and above let you call or WhatsApp after a genuine match.",
    cta: "Unlock contact",
    to: "/app/membership",
  },
  {
    id: "viewed",
    icon: UserRound,
    title: "See who already viewed you",
    body: "Diamond shows visitors so you never miss someone interested.",
    cta: "See Diamond",
    to: "/app/membership",
  },
  {
    id: "boost",
    icon: Sparkles,
    title: "Stand out in today’s matches",
    body: "A profile boost puts you at the top for members looking right now.",
    cta: "Boost my profile",
    to: "/app/membership",
  },
  {
    id: "advisor",
    icon: Star,
    title: "An advisor in your corner",
    body: "Select includes a personal advisor who sends curated introductions.",
    cta: "See Select",
    to: "/app/membership",
  },
  {
    id: "vip",
    icon: Sparkles,
    title: "Private, handpicked matches",
    body: "VIP is a concierge search — confidential, invitation-style matching.",
    cta: "See VIP",
    to: "/app/membership",
  },
];

function storageKey(userId) {
  return `matrimony_upgrade_${userId || "anon"}`;
}

export function readUpgradePrefs(userId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) || "{}");
  } catch {
    return {};
  }
}

export function writeUpgradePrefs(userId, patch) {
  const next = { ...readUpgradePrefs(userId), ...patch };
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
  return next;
}

function isFree(user) {
  const plan = user?.membership?.plan || "free";
  return !user?.membership?.is_premium && (plan === "free" || !plan);
}

export default function UpgradePopup() {
  const { user } = useAuth();
  const loc = useLocation();
  const [offer, setOffer] = useState(null);

  useEffect(() => {
    if (!user || !isFree(user)) {
      setOffer(null);
      return;
    }
    if (loc.pathname.startsWith("/app/membership")) {
      setOffer(null);
      return;
    }

    const tick = () => {
      const prefs = readUpgradePrefs(user.id);
      if (prefs.muted) {
        setOffer(null);
        return;
      }
      const last = Number(prefs.lastShown) || 0;
      if (!last) {
        writeUpgradePrefs(user.id, { lastShown: Date.now(), index: 0 });
        setOffer(null);
        return;
      }
      if (Date.now() - last < INTERVAL_MS) {
        setOffer(null);
        return;
      }
      const index = Number(prefs.index) || 0;
      setOffer(OFFERS[index % OFFERS.length]);
    };

    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, [user, loc.pathname]);

  if (!offer || !user) return null;
  const Icon = offer.icon;

  const close = (muted = false) => {
    const prefs = readUpgradePrefs(user.id);
    writeUpgradePrefs(user.id, {
      lastShown: Date.now(),
      index: (Number(prefs.index) || 0) + 1,
      muted: muted ? true : !!prefs.muted,
    });
    setOffer(null);
  };

  return createPortal(
    <div className="upgrade-overlay" role="dialog" aria-labelledby="upgrade-title">
      <div className="upgrade-card glass">
        <button type="button" className="upgrade-close" onClick={() => close(false)} aria-label="Close">
          <X size={18} />
        </button>
        <span className="upgrade-icon">
          <Icon size={22} />
        </span>
        <p className="eyebrow">A Gold perk for you</p>
        <h3 id="upgrade-title">{offer.title}</h3>
        <p className="muted">{offer.body}</p>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Free members see one tip every 2 hours. Paid plans never see this.
        </p>
        <div className="upgrade-actions">
          <Link className="btn btn-primary" to={offer.to} onClick={() => close(false)}>
            {offer.cta}
          </Link>
          <button type="button" className="btn btn-ghost" onClick={() => close(false)}>
            Later
          </button>
        </div>
        <button type="button" className="text-link" onClick={() => close(true)}>
          Don’t show upgrade offers
        </button>
      </div>
    </div>,
    document.body
  );
}
