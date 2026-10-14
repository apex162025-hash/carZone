import { formatMoney, formatTime } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";

/** Cash difference colors: 0 = matched (green), negative = shortage (red), positive = surplus (amber). */
export function diffTone(diff: number | null | undefined) {
  if (diff === null || diff === undefined) return "text-muted-foreground";
  if (diff === 0) return "text-success";
  return diff < 0 ? "text-destructive" : "text-warning";
}

export function DiffValue({ value, className, showLabel }: { value: number | null | undefined; className?: string; showLabel?: boolean }) {
  if (value === null || value === undefined) return <span className={cn("text-muted-foreground", className)}>—</span>;
  const label = value === 0 ? "مطابق" : value < 0 ? "عجز" : "زيادة";
  return (
    <span className={cn("num font-semibold", diffTone(value), className)}>
      {value > 0 ? "+" : ""}
      {formatMoney(value)}
      {showLabel ? <span className="ms-1 text-[11px] font-medium">({label})</span> : null}
    </span>
  );
}

export function timeRange(start: string | null, end: string | null) {
  if (!start) return "—";
  return `${formatTime(start)} – ${end ? formatTime(end) : "الآن"}`;
}

/** Local `YYYY-MM-DD` (same rule as the server's `dayKey`). */
export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Noon of a date key — safe to format without timezone drift. */
export function fromDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12);
}

export function shiftDateKey(key: string, days: number) {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}
