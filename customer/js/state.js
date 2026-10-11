import { get } from "../../shared/js/db.js";
import { haversineKm } from "../../shared/js/format.js";

const DRAFT = "carzen_booking_draft";
const LOC = "carzen_location";

export const NASR = { mode: "area", areaId: "nasr", lat: 30.0566, lng: 31.3301 };

export function sessionId() {
  return localStorage.getItem("carzen_customer_id") || "";
}
export function setSession(id) {
  if (id) localStorage.setItem("carzen_customer_id", id);
  else localStorage.removeItem("carzen_customer_id");
  window.dispatchEvent(new CustomEvent("carzen-session"));
}
export function currentUser() {
  const id = sessionId();
  if (!id) return null;
  return get().customers.find((c) => c.id === id) || null;
}

export function getLoc() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOC) || "null");
    if (raw?.lat) return raw;
  } catch { /* ignore */ }
  return { ...NASR };
}
export function setLoc(loc) {
  localStorage.setItem(LOC, JSON.stringify(loc));
}

export function getDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT) || "null"); }
  catch { return null; }
}
export function saveDraft(draft) {
  localStorage.setItem(DRAFT, JSON.stringify(draft));
}
export function clearDraft() {
  localStorage.removeItem(DRAFT);
}

export function getFilters() {
  try {
    return {
      distance: null, rating: null, priceMin: 0, priceMax: 500, openNow: false, availableToday: false, sort: "",
      ...JSON.parse(sessionStorage.getItem("carzen_filters") || "{}"),
    };
  } catch {
    return { distance: null, rating: null, priceMin: 0, priceMax: 500, openNow: false, availableToday: false, sort: "" };
  }
}
export function saveFilters(f) {
  sessionStorage.setItem("carzen_filters", JSON.stringify(f));
}

export { theme, setTheme } from "../../shared/js/theme.js";

export function notifPrefs() {
  try { return { reminders: true, offers: true, ...JSON.parse(localStorage.getItem("carzen_notif_prefs") || "{}") }; }
  catch { return { reminders: true, offers: true }; }
}
export function saveNotifPrefs(p) {
  localStorage.setItem("carzen_notif_prefs", JSON.stringify(p));
}

export function recentSearches() {
  try { return JSON.parse(localStorage.getItem("carzen_recent_searches") || "[]"); }
  catch { return []; }
}
export function pushSearch(q) {
  const query = q.trim();
  if (!query) return;
  const next = [query, ...recentSearches().filter((x) => x !== query)].slice(0, 5);
  localStorage.setItem("carzen_recent_searches", JSON.stringify(next));
}
export function clearSearches() {
  localStorage.removeItem("carzen_recent_searches");
}

export function kmTo(branch) {
  const loc = getLoc();
  return haversineKm(loc.lat, loc.lng, branch.lat, branch.lng);
}

export function rememberReturn(hash = location.hash) {
  sessionStorage.setItem("carzen_return", hash);
}
export function takeReturn(fallback = "#/home") {
  const value = sessionStorage.getItem("carzen_return") || fallback;
  sessionStorage.removeItem("carzen_return");
  return value;
}

export function setPending(action) {
  sessionStorage.setItem("carzen_pending", JSON.stringify(action));
}
export function takePending() {
  const raw = sessionStorage.getItem("carzen_pending");
  sessionStorage.removeItem("carzen_pending");
  try { return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
