"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCompact, formatDate, formatMoney } from "@/lib/format";
import type { FinanceSeriesPoint } from "@/types/finance";

type FinanceChartMetric = "gmv" | "commission";

type FinanceChartProps = {
  data: FinanceSeriesPoint[];
  metric: FinanceChartMetric;
};

const COLOR = { gmv: "var(--chart-1)", commission: "var(--chart-2)" } as const;
const FINANCE_METRIC_LABEL = { gmv: "إجمالي المبيعات", commission: "عمولة المنصة" } as const;

/**
 * Daily totals as single-series bars (one metric at a time — never a dual
 * axis). Bars suit discrete daily sums and still read well for a one-day
 * period. Time runs right → left to match RTL. Loaded via next/dynamic.
 */
export default function FinanceChart({ data, metric }: FinanceChartProps) {
  const color = COLOR[metric];
  const label = FINANCE_METRIC_LABEL[metric];

  return (
    <div className="h-[280px] w-full" dir="ltr" role="img" aria-label={`${label} اليومي لآخر ${data.length} يوم`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            reversed
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-numeric)" }}
            minTickGap={12}
          />
          <YAxis
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => formatCompact(v)}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-numeric)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as FinanceSeriesPoint;
              const value = Number(payload[0].value);
              return (
                <div dir="rtl" className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-floating">
                  <p className="num mb-1 text-muted-foreground">{formatDate(point.date, { withDay: true })}</p>
                  <p className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-muted-foreground">{label}</span>
                    <span className="num font-semibold text-foreground">{formatMoney(value, { decimals: metric === "commission" })}</span>
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey={metric} fill={color} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
