"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCompact, formatMoney, formatNumber } from "@carzen/ui/lib/format";

/** Shared RTL tooltip — text in ink tokens, the mark carries the color. */
function TooltipBox({ label, value, color, money }: { label: string; value: number; color: string; money?: boolean }) {
  return (
    <div dir="rtl" className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-floating">
      <p className="mb-1 text-muted-foreground">{label}</p>
      <p className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="num font-semibold text-foreground">{money ? formatMoney(value) : formatNumber(value)}</span>
      </p>
    </div>
  );
}

/** Single-series revenue columns (time runs right → left in RTL). Loaded with next/dynamic. */
export function RevenueBars({ data }: { data: { label: string; value: number }[] }) {
  return (
    <div className="h-[240px] w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" reversed tickLine={false} axisLine={false} minTickGap={8} tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-numeric)" }} />
          <YAxis orientation="right" tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatCompact(v)} tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-numeric)" }} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload, label }) => (active && payload?.length ? <TooltipBox label={String(label)} value={Number(payload[0].value)} color="var(--chart-1)" money /> : null)}
          />
          <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type DonutSlice = { key: string; label: string; value: number; color: string };

/** Orders by source donut — ≤ 3 categories, legend rendered by the caller (identity never color-only). */
export function SourceDonut({ data }: { data: DonutSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative mx-auto size-[168px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as DonutSlice;
              return <TooltipBox label={d.label} value={d.value} color={d.color} />;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-2xl font-bold">{formatNumber(total)}</span>
        <span className="text-[11px] text-muted-foreground">طلب</span>
      </div>
    </div>
  );
}
