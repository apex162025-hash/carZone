const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const EN_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const AR_DAYS = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const EN_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function getLang() {
  try { return localStorage.getItem("carzen_lang") || "ar"; }
  catch { return "ar"; }
}

export function money(amount, lang = getLang()) {
  const n = Math.round(Number(amount) || 0).toLocaleString("en-US");
  return lang === "ar" ? `${n} ج.م` : `${n} EGP`;
}

export function formatTime(input, lang = getLang()) {
  const d = input instanceof Date ? input : new Date(input);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const pm = h >= 12;
  h = h % 12 || 12;
  if (lang === "ar") return `${h}:${m} ${pm ? "م" : "ص"}`;
  return `${h}:${m} ${pm ? "PM" : "AM"}`;
}

export function formatDate(input, lang = getLang()) {
  const d = input instanceof Date ? input : new Date(input);
  const day = lang === "ar" ? AR_DAYS[d.getDay()] : EN_DAYS[d.getDay()];
  const month = lang === "ar" ? AR_MONTHS[d.getMonth()] : EN_MONTHS[d.getMonth()];
  return `${day} ${d.getDate()} ${month}`;
}

export function formatDateTime(input, lang = getLang()) {
  return `${formatDate(input, lang)} · ${formatTime(input, lang)}`;
}

export function distanceLabel(km, lang = getLang()) {
  const n = km < 10 ? (Math.round(km * 10) / 10).toFixed(1) : String(Math.round(km));
  return lang === "ar" ? `${n} كم` : `${n} km`;
}

export function relativeDay(input, now, lang = getLang()) {
  const d = new Date(input);
  const a = new Date(now); a.setHours(0, 0, 0, 0);
  const b = new Date(d); b.setHours(0, 0, 0, 0);
  const days = Math.round((a - b) / 86400000);
  if (days === 0) return lang === "ar" ? "اليوم" : "Today";
  if (days === 1) return lang === "ar" ? "أمس" : "Yesterday";
  if (days === -1) return lang === "ar" ? "غدًا" : "Tomorrow";
  if (days > 1) return lang === "ar" ? `منذ ${days} يوم` : `${days} days ago`;
  return lang === "ar" ? `بعد ${Math.abs(days)} يوم` : `in ${Math.abs(days)} days`;
}

export function minutesLabel(mins, lang = getLang()) {
  const n = Math.max(0, Math.round(mins));
  if (lang === "ar") return n === 1 ? "دقيقة" : `${n} د`;
  return n === 1 ? "1 min" : `${n} min`;
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function sameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export function startOfDay(input) {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function minutesOfDay(input) {
  const d = input instanceof Date ? input : new Date(input);
  return d.getHours() * 60 + d.getMinutes();
}

export function withMinutes(day, mins) {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(mins);
  return d;
}

export function parseClock(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
}

export function normalizePlate(plate) {
  return String(plate || "").toUpperCase().replace(/[\s-]/g, "");
}

export function formatPlate(plate) {
  return normalizePlate(plate);
}

export function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] || "").join("").toUpperCase() || "؟";
}

export function endOfInterval(startIso, durationMin) {
  return new Date(new Date(startIso).getTime() + durationMin * 60000);
}
