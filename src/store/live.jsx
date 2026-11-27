import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";
import { subscribeRealtime } from "../api/realtime";
import { useAuth } from "./auth";

const empty = {
  unread_messages: 0,
  unread_notifications: 0,
  pending_interests: 0,
  pending_contacts: 0,
  pending_photos: 0,
  presence: "offline",
  presence_mode: "offline",
  online_matches: [],
};

const LiveContext = createContext(empty);

function sameLive(a, b) {
  if (a === b) return true;
  const keys = [
    "unread_messages",
    "unread_notifications",
    "pending_interests",
    "pending_contacts",
    "pending_photos",
    "presence",
    "presence_mode",
  ];
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  const aOnline = a.online_matches || [];
  const bOnline = b.online_matches || [];
  if (aOnline.length !== bOnline.length) return false;
  for (let i = 0; i < aOnline.length; i += 1) {
    if (aOnline[i]?.public_id !== bOnline[i]?.public_id) return false;
  }
  return true;
}

export function LiveProvider({ children }) {
  const { user } = useAuth();
  const [live, setLive] = useState(empty);
  const liveRef = useRef(empty);

  useEffect(() => {
    if (!user) {
      liveRef.current = empty;
      setLive(empty);
      return undefined;
    }
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const { data } = await api.get("/live/");
        if (stop || sameLive(liveRef.current, data)) return;
        liveRef.current = data;
        setLive(data);
      } catch {
        /* keep last snapshot */
      }
    };
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    tick();
    // The 45s poll is now just a safety net - a message or notification
    // push refreshes these counts instantly.
    const id = setInterval(tick, 45000);
    document.addEventListener("visibilitychange", onVisible);
    const unsubscribe = subscribeRealtime((type) => {
      if (type === "message" || type === "notification") tick();
    });
    return () => {
      stop = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      unsubscribe();
    };
  }, [user?.id]);

  const value = useMemo(() => live, [live]);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);
