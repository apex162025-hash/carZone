import { TONES } from "@/lib/constants/labels";
import type { ApplicationService } from "@/types/applications";
import type { WorkingDay } from "@/types/washes";

/** AD-15 review checklist — the approve endpoint requires all 6 keys. */
export const REVIEW_CHECKLIST = [
  { key: "owner_verified", label: "بيانات المالك مطابقة", hint: "الاسم والهاتف والبريد صحيحة ومتسقة" },
  { key: "location_verified", label: "الموقع صحيح على الخريطة", hint: "الإحداثيات تطابق العنوان والمنطقة" },
  { key: "prices_reasonable", label: "الأسعار منطقية", hint: "ضمن النطاق المعتاد للمنطقة ونوع الخدمة" },
  { key: "hours_clear", label: "ساعات العمل واضحة", hint: "مواعيد كل يوم محددة بدون تعارض" },
  { key: "capacity_ok", label: "السعة مناسبة", hint: "عدد الأماكن يتناسب مع الخدمات والمساحة" },
  { key: "documents_complete", label: "المستندات مكتملة", hint: "السجل التجاري والبطاقة الضريبية سارية" },
] as const;

export type ChecklistKey = (typeof REVIEW_CHECKLIST)[number]["key"];

type CountForms = { one: string; two: string; few: string; many: string };

/** Arabic count agreement: "خدمة واحدة" / "خدمتان" / "3 خدمات" / "12 خدمة". */
export function arCount(n: number, forms: CountForms): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  return `${n} ${n >= 3 && n <= 10 ? forms.few : forms.many}`;
}

export const SERVICES_FORMS: CountForms = { one: "خدمة واحدة", two: "خدمتان", few: "خدمات", many: "خدمة" };
export const SPOTS_FORMS: CountForms = { one: "مكان واحد", two: "مكانان", few: "أماكن", many: "مكانًا" };
export const FILES_FORMS: CountForms = { one: "ملف واحد", two: "ملفان", few: "ملفات", many: "ملفًا" };
export const DAYS_FORMS: CountForms = { one: "يوم واحد", two: "يومين", few: "أيام", many: "يومًا" };

/** "ينتظر منذ يومين" style label for the review queue (AD-14). */
export function waitingLabel(days: number): string {
  if (days <= 0) return "قُدّم اليوم";
  if (days === 1) return "ينتظر منذ يوم";
  if (days === 2) return "ينتظر منذ يومين";
  return `ينتظر منذ ${days} ${days <= 10 ? "أيام" : "يومًا"}`;
}

/** Older submissions get louder: neutral → warning (2+ days) → danger (5+ days). */
export function waitingTone(days: number): string {
  if (days >= 5) return TONES.danger;
  if (days >= 2) return TONES.warning;
  return TONES.neutral;
}

function toMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
}

/** "09:00" → "9:00 ص" (spec: 12-hour times). */
export function formatClock(time: string): string {
  const total = toMinutes(time);
  const h = Math.floor(total / 60) % 24;
  const m = String(total % 60).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "م" : "ص"}`;
}

/** Open minutes for one day; a close time at/before the open time runs past midnight. */
export function openMinutes(day: WorkingDay): number {
  if (day.closed) return 0;
  const open = toMinutes(day.open);
  let close = toMinutes(day.close);
  if (close <= open) close += 24 * 60;
  return close - open;
}

export type HoursSummary = { openDays: number; weeklyMinutes: number; avgDailyMinutes: number };

export function summarizeHours(days: WorkingDay[]): HoursSummary {
  const open = days.filter((d) => !d.closed);
  const weeklyMinutes = days.reduce((sum, d) => sum + openMinutes(d), 0);
  return { openDays: open.length, weeklyMinutes, avgDailyMinutes: open.length ? weeklyMinutes / open.length : 0 };
}

/** Rough daily throughput to sanity-check the declared capacity. */
export function estimateDailyCars(capacity: number, services: ApplicationService[], avgDailyMinutes: number): number {
  if (!capacity || !avgDailyMinutes) return 0;
  const avgDuration = services.length ? services.reduce((s, x) => s + x.durationMin, 0) / services.length : 30;
  return Math.floor((capacity * avgDailyMinutes) / Math.max(avgDuration, 10));
}
