import { WEEK_DAYS } from "@carzen/ui/lib/constants/labels";
import type { WorkingDay } from "@carzen/contracts/washes";

/** "HH:MM" → minutes from midnight; a close time of 00:00 means midnight (1440) — same rule as the API. */
export function clockToMin(hhmm: string, isClose = false): number {
  const [h, m] = hhmm.split(":").map(Number);
  const v = (h || 0) * 60 + (m || 0);
  return isClose && v === 0 ? 1440 : v;
}

/** "14:30" → "2:30 م"; a closing "00:00" reads as midnight. */
export function clockLabel(hhmm: string, isClose = false): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (isClose && !h && !m) return "12:00 ص (منتصف الليل)";
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "م" : "ص"}`;
}

export function hoursLabel(day: WorkingDay): string {
  return day.closed ? "مغلق" : `${clockLabel(day.open)} – ${clockLabel(day.close, true)}`;
}

export type HoursGroup = { days: string; hours: string; closed: boolean };

/** Collapses consecutive weekdays with identical hours: "الأحد – الخميس · 9:00 ص – 11:00 م". */
export function weeklySummary(hours: WorkingDay[]): HoursGroup[] {
  const key = (d: WorkingDay) => (d.closed ? "closed" : `${d.open}-${d.close}`);
  const groups: { from: number; to: number; day: WorkingDay }[] = [];
  hours.forEach((day, i) => {
    const last = groups[groups.length - 1];
    if (last && key(last.day) === key(day)) last.to = i;
    else groups.push({ from: i, to: i, day });
  });
  return groups.map((g) => ({
    days:
      g.from === 0 && g.to === hours.length - 1
        ? "كل أيام الأسبوع"
        : g.from === g.to
          ? WEEK_DAYS[g.from]
          : `${WEEK_DAYS[g.from]} – ${WEEK_DAYS[g.to]}`,
    hours: hoursLabel(g.day),
    closed: g.day.closed,
  }));
}
