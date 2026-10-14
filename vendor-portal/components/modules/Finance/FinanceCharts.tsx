"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCompact, formatDate, formatMoney } from "@carzen/ui/lib/format";
import type { VendorFinance } from "@carzen/contracts/vendor/insights";

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-numeric)" };
const COLOR = "var(--chart-1)";

/**
 * Daily revenue (paid orders) as single-series columns — time runs right → left
 * for RTL. Loaded with next/dynamic so Recharts stays out of the initial bundle.
 */
export function DailyRevenueBars({ data }: { data: VendorFinance["byDay"] }) {
  return (
    <div className="h-[260px] w-full" dir="ltr" role="img" aria-label={`الإيراد اليومي لآخر ${data.length} يوم`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" reversed tickLine={false} axisLine={false} minTickGap={8} tick={AXIS_TICK} />
          <YAxis orientation="right" tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatCompact(v)} tick={AXIS_TICK} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as VendorFinance["byDay"][number];
              return (
                <div dir="rtl" className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-floating">
                  <p className="num mb-1 text-muted-foreground">{formatDate(`${point.date}T00:00:00`, { withDay: true })}</p>
                  <p className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: COLOR }} />
                    <span className="text-muted-foreground">الإيراد</span>
                    <span className="num font-semibold text-foreground">{formatMoney(point.revenue)}</span>
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="revenue" fill={COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
