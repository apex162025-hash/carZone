import type { Localized } from "@/types/common";

/**
 * Formatting rules from the Carzen spec: Western digits in both languages,
 * money as `180 ج.م`, 12-hour times, Arabic month names.
 */

const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const AR_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const decFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function formatNumber(value: number | null | undefined, decimals = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return (decimals ? decFmt : intFmt).format(value);
}

export function formatCompact(value: number): string {
  return compactFmt.format(value);
}

export function formatMoney(value: number | null | undefined, { decimals = false } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(decimals ? decFmt : intFmt).format(value)} ج.م`;
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits).replace(/\.0+$/, "")}٪`;
}

export function formatTime(input: string | Date): string {
  const d = new Date(input);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "م" : "ص"}`;
}

export function formatDate(input: string | Date, { withDay = false, withYear = false } = {}): string {
  const d = new Date(input);
  const parts = [`${d.getDate()} ${AR_MONTHS[d.getMonth()]}`];
  if (withYear) parts.push(String(d.getFullYear()));
  const base = parts.join(" ");
  return withDay ? `${AR_DAYS[d.getDay()]} ${base}` : base;
}

export function formatDateTime(input: string | Date): string {
  return `${formatDate(input)} · ${formatTime(input)}`;
}

/** "منذ 3 أيام" / "بعد ساعتين" style relative labels. */
export function formatRelative(input: string | Date, from: Date = new Date()): string {
  const diffMs = new Date(input).getTime() - from.getTime();
  const past = diffMs < 0;
  const mins = Math.round(Math.abs(diffMs) / 60000);
  const wrap = (s: string) => (past ? `منذ ${s}` : `بعد ${s}`);

  if (mins < 1) return "الآن";
  if (mins < 60) return wrap(mins === 1 ? "دقيقة" : mins === 2 ? "دقيقتين" : `${mins} دقيقة`);
  const hours = Math.round(mins / 60);
  if (hours < 24) return wrap(hours === 1 ? "ساعة" : hours === 2 ? "ساعتين" : `${hours} ساعات`);
  const days = Math.round(hours / 24);
  if (days === 1) return past ? "أمس" : "غدًا";
  if (days < 30) return wrap(days === 2 ? "يومين" : `${days} ${days <= 10 ? "أيام" : "يوم"}`);
  const months = Math.round(days / 30);
  return wrap(months === 1 ? "شهر" : months === 2 ? "شهرين" : `${months} شهور`);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} د`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h} س ${m} د` : `${h} س`;
}

export function initials(name: string | null | undefined): string {
  const parts = String(name ?? "").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("").toUpperCase() || "؟";
}

/** Admin UI is Arabic-first; English is shown as secondary text where useful. */
export function ar(text: Localized | null | undefined): string {
  return text?.ar ?? "—";
}

/** Days between two ISO dates, for "waiting N days" style badges. */
export function daysBetween(from: string | Date, to: Date = new Date()): number {
  const a = new Date(from);
  a.setHours(0, 0, 0, 0);
  const b = new Date(to);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
