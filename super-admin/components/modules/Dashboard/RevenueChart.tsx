"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCompact, formatMoney } from "@/lib/format";
import type { RevenuePoint } from "@/types/dashboard";

type RevenueChartProps = {
  data: RevenuePoint[];
  metric: "gmv" | "commission";
};

const COLOR = { gmv: "var(--chart-1)", commission: "var(--chart-2)" } as const;
const LABEL = { gmv: "إجمالي المبيعات", commission: "عمولة المنصة" } as const;

/**
 * Single-series area chart (one metric at a time — never a dual axis).
 * Time runs right → left to match the RTL reading direction.
 * Loaded via next/dynamic so Recharts stays off the critical path.
 */
export default function RevenueChart({ data, metric }: RevenueChartProps) {
  const color = COLOR[metric];
  return (
    <div className="h-[260px] w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            reversed
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-numeric)" }}
            minTickGap={16}
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
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "0" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const value = Number(payload[0].value);
              return (
                <div dir="rtl" className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-floating">
                  <p className="num mb-1 text-muted-foreground">{label}</p>
                  <p className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-muted-foreground">{LABEL[metric]}</span>
                    <span className="num font-semibold text-foreground">{formatMoney(value)}</span>
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={2}
            fill={`url(#fill-${metric})`}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2, fill: color }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
