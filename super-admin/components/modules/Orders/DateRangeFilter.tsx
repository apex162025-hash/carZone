"use client";

import { CalendarDays, X } from "lucide-react";

const INPUT =
  "num h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 sm:w-36";

type DateRangeFilterProps = {
  from: string;
  to: string;
  onChange: (range: { dateFrom: string; dateTo: string }) => void;
};

/** Native date range (yyyy-mm-dd) styled like the toolbar inputs, with a clear button. */
export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const active = Boolean(from || to);

  return (
    <div role="group" aria-label="نطاق تاريخ الموعد" className="flex w-full items-center gap-1.5 sm:w-auto">
      <CalendarDays className="hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
      <label className="sr-only" htmlFor="orders-date-from">
        من تاريخ
      </label>
      <input
        id="orders-date-from"
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => onChange({ dateFrom: e.target.value, dateTo: to })}
        className={INPUT}
      />
      <span className="text-xs text-muted-foreground">إلى</span>
      <label className="sr-only" htmlFor="orders-date-to">
        إلى تاريخ
      </label>
      <input
        id="orders-date-to"
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => onChange({ dateFrom: from, dateTo: e.target.value })}
        className={INPUT}
      />
      {active ? (
        <button
          type="button"
          onClick={() => onChange({ dateFrom: "", dateTo: "" })}
          aria-label="مسح نطاق التاريخ"
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
