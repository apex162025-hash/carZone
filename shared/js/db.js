import { buildSeed } from "./seed.js";
import { isLiveClock } from "./net.js";

export const DB_KEY = "carzen_demo_db_v1";
const listeners = new Set();
let memory = null;

function clockOffset() {
  return Number(localStorage.getItem("carzen_clock_offset_min") || 0);
}

export function now() {
  const base = new Date();
  if (!isLiveClock()) base.setHours(15, 30, 0, 0);
  return new Date(base.getTime() + clockOffset() * 60000);
}

export function advanceClock(mins = 30) {
  localStorage.setItem("carzen_clock_offset_min", String(clockOffset() + mins));
  window.dispatchEvent(new CustomEvent("carzen-clock"));
  emit();
}

export function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    memory = raw ? JSON.parse(raw) : null;
  } catch {
    memory = null;
  }
  if (!memory || !memory.orders) {
    memory = buildSeed(now());
    persist();
  }
  return memory;
}

export function get() {
  if (!memory) load();
  return memory;
}

function persist() {
  localStorage.setItem(DB_KEY, JSON.stringify(memory));
}

function emit() {
  listeners.forEach((fn) => fn(memory));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function mutate(fn) {
  if (!memory) load();
  const draft = structuredClone(memory);
  const result = fn(draft);
  memory = draft;
  persist();
  emit();
  return result;
}

export function resetDb() {
  const keys = [
    "carzen_clock_offset_min", "carzen_offline", "carzen_flaky", "carzen_customer_id",
    "carzen_booking_draft", "carzen_onboarded", "carzen_recent_searches", "carzen_location",
    "carzen_notif_prefs", "carzen_filters", "carzen_otp",
  ];
  keys.forEach((k) => localStorage.removeItem(k));
  try { sessionStorage.clear(); } catch { /* ignore */ }
  memory = buildSeed(now());
  persist();
  emit();
  window.dispatchEvent(new CustomEvent("carzen-reset"));
  return memory;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === DB_KEY && e.newValue) {
      try { memory = JSON.parse(e.newValue); } catch { return; }
      emit();
    }
  });
}

export function nid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}
