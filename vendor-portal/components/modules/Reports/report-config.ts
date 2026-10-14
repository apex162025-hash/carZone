import type { ComponentType } from "react";
import { Banknote, ClipboardList, PieChart, Sparkles, Users } from "lucide-react";

import { formatMoney, formatNumber, formatPercent } from "@carzen/ui/lib/format";
import type { VendorReport, VendorReportType } from "@carzen/contracts/vendor/insights";

// ── Report types (spec D14 / OW-18) ─────────────────────────

export type ReportTypeConfig = {
  value: VendorReportType;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  chartTitle: string;
  /** Name of the single series, used by the tooltip and the chart's aria-label. */
  seriesLabel: string;
  /** Long category labels read better as horizontal bars. */
  horizontal?: boolean;
  emptyTitle: string;
};

export const REPORT_TYPES: ReportTypeConfig[] = [
  {
    value: "orders",
    label: "الطلبات",
    icon: ClipboardList,
    description: "كل الطلبات حسب موعدها — المكتملة والملغاة وعدم الحضور يومًا بيوم.",
    chartTitle: "الطلبات اليومية",
    seriesLabel: "الطلبات",
    emptyTitle: "لا توجد طلبات في هذا المدى",
  },
  {
    value: "revenue",
    label: "الإيرادات",
    icon: Banknote,
    description: "الطلبات المدفوعة فقط — الإيراد وعمولة كارزن وصافي المغسلة يوميًا.",
    chartTitle: "الإيراد اليومي",
    seriesLabel: "الإيراد",
    emptyTitle: "لا توجد مدفوعات في هذا المدى",
  },
  {
    value: "services",
    label: "الخدمات",
    icon: Sparkles,
    description: "الخدمات والإضافات الأكثر طلبًا وإيراد كل منها (بدون الطلبات الملغاة).",
    chartTitle: "الخدمات الأكثر طلبًا (أعلى 8)",
    seriesLabel: "مرات الطلب",
    horizontal: true,
    emptyTitle: "لم تُطلب خدمات في هذا المدى",
  },
  {
    value: "source",
    label: "المصادر",
    icon: PieChart,
    description: "من أين تأتي طلباتك: التطبيق أو الحضور المباشر أو الهاتف.",
    chartTitle: "الطلبات حسب المصدر",
    seriesLabel: "الطلبات",
    emptyTitle: "لا توجد طلبات في هذا المدى",
  },
  {
    value: "employees",
    label: "الموظفون",
    icon: Users,
    description: "إنتاجية كل موظف: الطلبات المكتملة المُسندة له وقيمتها ومتوسط تقييمه.",
    chartTitle: "الطلبات المكتملة لكل موظف",
    seriesLabel: "طلبات مكتملة",
    horizontal: true,
    emptyTitle: "لا يوجد موظفون في هذا النطاق",
  },
];

export function reportTypeConfig(type: string): ReportTypeConfig {
  return REPORT_TYPES.find((t) => t.value === type) ?? REPORT_TYPES[0];
}

// ── Formatting ──────────────────────────────────────────────

export type ValueFormat = "number" | "money" | "percent" | "text";

export function formatValue(value: string | number | null | undefined, format: ValueFormat = "text"): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || format === "text") return String(value);
  if (format === "money") return formatMoney(value, { decimals: !Number.isInteger(value) });
  if (format === "percent") return formatPercent(value);
  return formatNumber(value, !Number.isInteger(value));
}

// ── Summary tile definitions (every metric carries a short definition) ──

const SUMMARY_HINTS: Record<string, string> = {
  "إجمالي الطلبات": "كل الطلبات في المدى بكل حالاتها",
  مكتملة: "طلبات وصلت لمرحلة الاكتمال",
  "معدل الإكمال": "المكتملة ÷ إجمالي الطلبات",
  "ملغاة + لم يحضر": "طلبات لم تُنفّذ",
  الإيراد: "مجموع الطلبات المدفوعة فقط",
  "عمولة كارزن": "نسبة كارزن من الطلبات المدفوعة",
  "صافي المغسلة": "الإيراد ناقص عمولة كارزن",
  "متوسط التذكرة": "الإيراد ÷ عدد الطلبات المدفوعة",
  "عدد الخدمات المطلوبة": "خدمات وإضافات مختلفة طُلبت",
  "إيراد الخدمات": "من الطلبات المدفوعة فقط",
  "عدد الموظفين": "موظفو النطاق (بدون المالك)",
  "إجمالي المكتمل": "طلبات مكتملة مُسندة لموظف",
};

export function summaryHint(report: VendorReport, label: string): string | undefined {
  if (report.type === "services" && label === "الأكثر طلبًا") {
    const top = report.rows[0];
    return top ? `مرة — ${String(top.name)}` : "لا توجد خدمات";
  }
  if (report.type === "source") {
    const row = report.rows.find((r) => r.source === label);
    return row ? `${formatNumber(Number(row.orders))} طلب — نسبة من إجمالي الطلبات` : "نسبة من إجمالي الطلبات";
  }
  return SUMMARY_HINTS[label];
}

// ── Totals row ──────────────────────────────────────────────

/** Averages can't be summed; they show "—" in the totals row. */
const NON_ADDITIVE = new Set(["rating"]);

type Row = VendorReport["rows"][number];

function sum(rows: Row[], key: string) {
  return rows.reduce((s, r) => s + (typeof r[key] === "number" ? (r[key] as number) : 0), 0);
}

/**
 * Totals for one column, or null when a total would be meaningless.
 * Shares add up to 100%; the completion rate is recomputed from the sums.
 */
export function columnTotal(column: VendorReport["columns"][number], rows: Row[]): number | null {
  const format = column.format ?? "text";
  if (format === "text" || NON_ADDITIVE.has(column.key)) return null;
  if (format === "percent") {
    if (column.key === "share") return sum(rows, "count") || sum(rows, "orders") ? 100 : 0;
    if (column.key === "rate") {
      const total = sum(rows, "total");
      return total ? Math.round((sum(rows, "completed") / total) * 1000) / 10 : 0;
    }
    return null;
  }
  return sum(rows, column.key);
}

// ── Date range ──────────────────────────────────────────────

export const MAX_RANGE_DAYS = 92;

export type RangePreset = "7d" | "14d" | "30d" | "month" | "custom";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "آخر 7 أيام" },
  { value: "14d", label: "آخر 14 يوم" },
  { value: "30d", label: "آخر 30 يوم" },
  { value: "month", label: "هذا الشهر" },
  { value: "custom", label: "مدى مخصص" },
];

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar day as `YYYY-MM-DD` (the API reads dates in the branch's local time). */
export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fromDayKey(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

export function addDays(key: string, n: number): string {
  const d = fromDayKey(key);
  d.setDate(d.getDate() + n);
  return toDayKey(d);
}

/** Inclusive number of calendar days between two keys. */
export function spanDays(from: string, to: string): number {
  return Math.round((fromDayKey(to).getTime() - fromDayKey(from).getTime()) / 86400000) + 1;
}

function isValidKey(key: string) {
  return KEY_RE.test(key) && !Number.isNaN(fromDayKey(key).getTime());
}

/** Resolves the URL state to a concrete `{from, to}` (falls back to the default preset when invalid). */
export function resolveRange(range: string, from: string, to: string, today: Date): { from: string; to: string; preset: RangePreset } {
  const todayKey = toDayKey(today);
  switch (range) {
    case "7d":
      return { from: addDays(todayKey, -6), to: todayKey, preset: "7d" };
    case "30d":
      return { from: addDays(todayKey, -29), to: todayKey, preset: "30d" };
    case "month":
      return { from: `${todayKey.slice(0, 8)}01`, to: todayKey, preset: "month" };
    case "custom":
      if (isValidKey(from) && isValidKey(to) && from <= to && spanDays(from, to) <= MAX_RANGE_DAYS) {
        return { from, to, preset: "custom" };
      }
      break;
  }
  return { from: addDays(todayKey, -13), to: todayKey, preset: "14d" };
}

/**
 * Keeps a custom range valid while the user edits one end: never in the
 * future, `from <= to`, and at most {@link MAX_RANGE_DAYS} days — the other end
 * moves instead of showing an error.
 */
export function adjustRange(edited: "from" | "to", value: string, current: { from: string; to: string }, todayKey: string) {
  let from = current.from;
  let to = current.to;
  const v = value > todayKey ? todayKey : value;
  if (edited === "from") {
    from = v;
    if (from > to) to = from;
    if (spanDays(from, to) > MAX_RANGE_DAYS) to = addDays(from, MAX_RANGE_DAYS - 1);
  } else {
    to = v;
    if (to < from) from = to;
    if (spanDays(from, to) > MAX_RANGE_DAYS) from = addDays(to, -(MAX_RANGE_DAYS - 1));
  }
  return { from, to };
}
