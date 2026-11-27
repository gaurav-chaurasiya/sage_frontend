import axios from "axios";

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

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rivaah_access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || "";
    const isAuthCall = url.includes("/auth/login") || url.includes("/auth/register");
    const path = window.location.pathname;
    const inAdmin = path.startsWith("/admin") && !path.startsWith("/admin/login");
    if (status === 401 && !isAuthCall && (path.startsWith("/app") || inAdmin)) {
      localStorage.removeItem("rivaah_access");
      localStorage.removeItem("rivaah_refresh");
      localStorage.removeItem("rivaah_user");
      window.location.assign(inAdmin ? "/admin/login" : "/login");
    }
    return Promise.reject(err);
  }
);

export function asArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export function fieldErrorsFromApi(err) {
  const data = err.response?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "detail" || key === "non_field_errors") continue;
    if (Array.isArray(value) && value[0]) out[key] = String(value[0]);
    else if (typeof value === "string") out[key] = value;
  }
  return out;
}

export function apiError(err, fallback = "Something went wrong.") {
  const data = err.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") {
    if (data.includes("<html") || data.includes("<!DOCTYPE")) return fallback;
    return data;
  }
  if (data.detail) return Array.isArray(data.detail) ? data.detail[0] : String(data.detail);
  if (data.non_field_errors) return data.non_field_errors[0];
  const first = Object.values(data)[0];
  if (Array.isArray(first)) return String(first[0]);
  if (first) return String(first);
  return fallback;
}

export function mediaUrl(url) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const origin = API_BASE.replace(/\/api\/v1\/?$/, "");
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

export default api;
