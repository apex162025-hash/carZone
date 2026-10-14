import { formatDate, serverNow } from "@carzen/ui/lib/format";

/** Local calendar day key ("YYYY-MM-DD"), the format the schedule API expects. */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Noon avoids DST edges when moving between days. */
export function fromDateKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

export function shiftDay(key: string, delta: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

export function todayKey(): string {
  return toDateKey(serverNow());
}

export function isValidDateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(fromDateKey(key).getTime());
}

/** "اليوم" / "غدًا" / "أمس" / "بعد 3 أيام" relative to the server day. */
export function relativeDayLabel(key: string): string {
  const diff = Math.round((fromDateKey(key).getTime() - fromDateKey(todayKey()).getTime()) / 86_400_000);
  if (diff === 0) return "اليوم";
  if (diff === 1) return "غدًا";
  if (diff === -1) return "أمس";
  if (diff > 0) return diff === 2 ? "بعد يومين" : `بعد ${diff} ${diff <= 10 ? "أيام" : "يوم"}`;
  return diff === -2 ? "منذ يومين" : `منذ ${-diff} ${-diff <= 10 ? "أيام" : "يوم"}`;
}

export function fullDayLabel(key: string): string {
  return formatDate(fromDateKey(key), { withDay: true, withYear: true });
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart);
}
