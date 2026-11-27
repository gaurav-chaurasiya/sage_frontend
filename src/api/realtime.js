function resolveApiBase() {
  const env = import.meta.env.VITE_API_URL;
  if (env) return env;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "lead.cubicalsoft.in" || host === "www.lead.cubicalsoft.in") {
      return "https://leadapi.cubicalsoft.in/api/v1";
    }
  }
  return "/api/v1";
}

const API_BASE = resolveApiBase();

function wsUrl(token) {
  const base = /^https?:\/\//.test(API_BASE)
    ? API_BASE.replace(/^http/, "ws")
    : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}${API_BASE}`;
  return `${base}/ws/?token=${encodeURIComponent(token)}`;
}

let socket = null;
let connecting = false;
const listeners = new Set();
let reconnectTimer = null;
let reconnectDelay = 1000;
const statusListeners = new Set();
let status = "offline";
function setStatus(next) {
  status = next;
  statusListeners.forEach((fn) => fn(next));
}

/** Live connection state: "online" | "connecting" | "offline". */
export function onRealtimeStatus(fn) {
  statusListeners.add(fn);
  fn(status);
  return () => statusListeners.delete(fn);
}

function connect() {
  if (socket || connecting || listeners.size === 0) return;
  const token = localStorage.getItem("rivaah_access");
  if (!token) return;
  connecting = true;
  setStatus("connecting");

  const ws = new WebSocket(wsUrl(token));
  ws.onopen = () => {
    reconnectDelay = 1000;
    connecting = false;
    setStatus("online");
  };
  ws.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      listeners.forEach((fn) => fn(parsed.type, parsed.data));
    } catch {
      // ignore malformed frames
    }
  };
  ws.onclose = () => {
    socket = null;
    connecting = false;
    setStatus(listeners.size ? "connecting" : "offline");
    scheduleReconnect();
  };
  ws.onerror = () => ws.close();

  socket = ws;
}

function scheduleReconnect() {
  if (reconnectTimer || listeners.size === 0) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    connect();
  }, reconnectDelay);
}

/**
 * Subscribes to live server events ({type:"message", data} for now). The
 * underlying socket is shared across every subscriber on the page and is
 * lazily opened/closed as the listener count goes above/back to zero.
 */
export function subscribeRealtime(fn) {
  listeners.add(fn);
  connect();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.close();
      socket = null;
    }
  };
}

/** Call on logout so a stale token doesn't linger on an open socket. */
export function disconnectRealtime() {
  listeners.clear();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
}
