"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCompact, formatMoney, formatNumber } from "@carzen/ui/lib/format";

/**
 * Report charts — loaded only through next/dynamic (Recharts never ships in
 * the page's initial bundle). Every chart is ONE series; time runs right → left
 * for RTL; text stays in ink tokens while the mark carries the color.
 */

export type ReportPoint = { label: string; value: number };
type ValueFormat = "number" | "money";

type ChartProps = {
  data: ReportPoint[];
  valueFormat: ValueFormat;
  /** Series name, shown in the tooltip and announced by screen readers. */
  seriesLabel: string;
};

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-numeric)" };
const SERIES_COLOR = "var(--chart-1)";

function fmt(value: number, format: ValueFormat) {
  return format === "money" ? formatMoney(value) : formatNumber(value);
}

function TooltipBox({ label, series, value, color, format }: { label: string; series: string; value: number; color: string; format: ValueFormat }) {
  return (
    <div dir="rtl" className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-floating">
      <p className="num mb-1 text-muted-foreground">{label}</p>
      <p className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-muted-foreground">{series}</span>
        <span className="num font-semibold text-foreground">{fmt(value, format)}</span>
      </p>
    </div>
  );
}

function truncate(label: string, max = 18) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

/** Daily columns (orders per day). */
export function ReportColumns({ data, valueFormat, seriesLabel }: ChartProps) {
  return (
    <div className="h-[260px] w-full" dir="ltr" role="img" aria-label={`مخطط أعمدة: ${seriesLabel}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" reversed tickLine={false} axisLine={false} minTickGap={8} tick={AXIS_TICK} />
          <YAxis orientation="right" tickLine={false} axisLine={false} width={44} allowDecimals={false} tickFormatter={(v: number) => formatCompact(v)} tick={AXIS_TICK} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? <TooltipBox label={String(label)} series={seriesLabel} value={Number(payload[0].value)} color={SERIES_COLOR} format={valueFormat} /> : null
            }
          />
          <Bar dataKey="value" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Ranked horizontal bars for long category labels (services, employees). Bars grow from the right. */
export function ReportBars({ data, valueFormat, seriesLabel }: ChartProps) {
  const height = Math.max(160, data.length * 38 + 16);
  return (
    <div className="w-full" style={{ height }} dir="ltr" role="img" aria-label={`مخطط أشرطة: ${seriesLabel}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 4, bottom: 4, left: 8 }} barCategoryGap="28%">
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" reversed tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => formatCompact(v)} tick={AXIS_TICK} />
          <YAxis
            type="category"
            dataKey="label"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={128}
            tickFormatter={(v: string) => truncate(v)}
            tick={{ fill: "var(--foreground)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? <TooltipBox label={String(label)} series={seriesLabel} value={Number(payload[0].value)} color={SERIES_COLOR} format={valueFormat} /> : null
            }
          />
          <Bar dataKey="value" fill={SERIES_COLOR} radius={[4, 0, 0, 4]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Single-series trend line with a 10% area wash (revenue per day). */
export function ReportLine({ data, valueFormat, seriesLabel }: ChartProps) {
  return (
    <div className="h-[260px] w-full" dir="ltr" role="img" aria-label={`مخطط خطي: ${seriesLabel}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" reversed tickLine={false} axisLine={false} minTickGap={12} tick={AXIS_TICK} />
          <YAxis orientation="right" tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatCompact(v)} tick={AXIS_TICK} />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? <TooltipBox label={String(label)} series={seriesLabel} value={Number(payload[0].value)} color={SERIES_COLOR} format={valueFormat} /> : null
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={SERIES_COLOR}
            strokeWidth={2}
            fill={SERIES_COLOR}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export type DonutSlice = ReportPoint & { color: string };

/** Share donut — the caller renders the legend with values and percentages. */
export function ReportDonut({ data, valueFormat, seriesLabel }: Omit<ChartProps, "data"> & { data: DonutSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative mx-auto size-[188px]" role="img" aria-label={`مخطط دائري: ${seriesLabel}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={62} outerRadius={90} paddingAngle={2} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as DonutSlice;
              return <TooltipBox label={d.label} series={seriesLabel} value={d.value} color={d.color} format={valueFormat} />;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-2xl font-bold">{fmt(total, valueFormat)}</span>
        <span className="text-[11px] text-muted-foreground">{seriesLabel}</span>
      </div>
    </div>
  );
}
