"use client";

import dynamic from "next/dynamic";
import { BarChart3, CalendarRange, Hash, Percent, RefreshCw, Table2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { ExportCsvButton } from "@carzen/ui/components/shared/export-csv-button";
import { FilterTabs } from "@carzen/ui/components/shared/filter-tabs";
import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { SectionCard } from "@carzen/ui/components/shared/section-card";
import { EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { StatTile } from "@carzen/ui/components/shared/stat-tile";
import { Button } from "@carzen/ui/components/ui/button";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@carzen/ui/components/ui/tabs";
import { useUrlState } from "@carzen/ui/hooks/use-url-state";
import type { CsvColumn } from "@carzen/ui/lib/export-csv";
import { formatDate, formatNumber, formatPercent, serverNow } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import {
  MAX_RANGE_DAYS,
  RANGE_PRESETS,
  REPORT_TYPES,
  adjustRange,
  columnTotal,
  formatValue,
  fromDayKey,
  reportTypeConfig,
  resolveRange,
  spanDays,
  summaryHint,
  toDayKey,
  type RangePreset,
  type ReportTypeConfig,
} from "@/components/modules/Reports/report-config";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useReport } from "@/hooks/use-insights";
import type { VendorReport } from "@carzen/contracts/vendor/insights";

const chartLoading = () => <Skeleton className="h-[260px] w-full rounded-xl" />;

const ReportCharts = {
  Columns: dynamic(() => import("@/components/modules/Reports/ReportCharts").then((m) => m.ReportColumns), { ssr: false, loading: chartLoading }),
  Bars: dynamic(() => import("@/components/modules/Reports/ReportCharts").then((m) => m.ReportBars), { ssr: false, loading: chartLoading }),
  Line: dynamic(() => import("@/components/modules/Reports/ReportCharts").then((m) => m.ReportLine), { ssr: false, loading: chartLoading }),
  Donut: dynamic(() => import("@/components/modules/Reports/ReportCharts").then((m) => m.ReportDonut), {
    ssr: false,
    loading: () => <Skeleton className="mx-auto size-[188px] rounded-full" />,
  }),
};

/** Categorical colors in fixed order (spec: never reorder per chart). */
const CATEGORY_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

const SUMMARY_ICON = { number: Hash, money: Wallet, percent: Percent } as const;

type Row = VendorReport["rows"][number];
type Column = VendorReport["columns"][number];

const DATE_INPUT =
  "num h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

// ── Body of one report tab ──────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="جاري تحميل التقرير">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[340px] rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

function SummaryTiles({ report }: { report: VendorReport }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", report.summary.length >= 3 ? "lg:grid-cols-3 xl:grid-cols-4" : "lg:grid-cols-2")}>
      {report.summary.map((s, i) => {
        const Icon = SUMMARY_ICON[s.format];
        return (
          <StatTile
            key={s.label}
            label={s.label}
            value={formatValue(s.value, s.format)}
            hint={summaryHint(report, s.label)}
            icon={<Icon />}
            tone={report.type === "source" ? CATEGORY_COLORS[i % CATEGORY_COLORS.length] : undefined}
          />
        );
      })}
    </div>
  );
}

function ReportChart({ report, cfg }: { report: VendorReport; cfg: ReportTypeConfig }) {
  const props = { data: report.chart, valueFormat: report.valueFormat, seriesLabel: cfg.seriesLabel };

  if (report.chartKind === "donut") {
    const total = report.chart.reduce((s, d) => s + d.value, 0) || 1;
    const slices = report.chart.map((d, i) => ({ ...d, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
    return (
      <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <ReportCharts.Donut {...props} data={slices} />
        <ul className="space-y-2.5" aria-label="مفتاح المخطط">
          {slices.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
              <span className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                {s.label}
              </span>
              <span className="num">
                <span className="font-semibold">{formatValue(s.value, report.valueFormat)}</span>
                <span className="ms-2 text-xs text-muted-foreground">{formatPercent((s.value / total) * 100)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (report.chartKind === "line") return <ReportCharts.Line {...props} />;
  if (cfg.horizontal) return <ReportCharts.Bars {...props} />;
  return <ReportCharts.Columns {...props} />;
}

function ReportTable({ report, columns }: { report: VendorReport; columns: Column[] }) {
  const showTotals = report.rows.length > 1;
  const align = (c: Column) => (c.align === "end" ? "text-end" : "text-start");

  const cell = (c: Column, row: Row) => {
    const value = row[c.key];
    // An average of 0 means "no reviews yet", not a zero rating.
    if (c.key === "rating" && value === 0) return "—";
    return formatValue(value, c.format);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn("h-10 border-y border-border bg-muted/60 px-4 text-xs font-medium whitespace-nowrap text-muted-foreground first:ps-5 last:pe-5", align(c))}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row, i) => (
            <tr key={i} className="transition-colors hover:bg-muted/40">
              {columns.map((c, ci) => (
                <td
                  key={c.key}
                  className={cn(
                    "h-12 border-b border-border/60 px-4 align-middle first:ps-5 last:pe-5",
                    align(c),
                    c.format !== "text" && "num",
                    ci === 0 ? "font-medium" : c.format === "text" && "text-xs text-muted-foreground",
                  )}
                >
                  {cell(c, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {showTotals ? (
          <tfoot>
            <tr className="bg-muted/40 font-semibold">
              {columns.map((c, ci) => {
                const total = ci === 0 ? null : columnTotal(c, report.rows);
                return (
                  <td key={c.key} className={cn("h-12 px-4 first:ps-5 last:pe-5", align(c), ci > 0 && "num")}>
                    {ci === 0 ? "الإجمالي" : c.format === "text" ? null : total === null ? <span className="text-muted-foreground">—</span> : formatValue(total, c.format)}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

function ReportBody({
  report,
  cfg,
  columns,
  rangeLabel,
  error,
  onRetry,
  isFetching,
}: {
  report: VendorReport | undefined;
  cfg: ReportTypeConfig;
  columns: Column[];
  rangeLabel: string;
  error: Error | null;
  onRetry: () => void;
  isFetching: boolean;
}) {
  if (error && !report) {
    return (
      <SectionCard>
        <ErrorState message={error.message} onRetry={onRetry} isRetrying={isFetching} />
      </SectionCard>
    );
  }
  if (!report) return <ReportSkeleton />;

  const chartTotal = report.chart.reduce((s, d) => s + d.value, 0);
  const isEmpty = report.rows.length === 0 || (report.type !== "employees" && report.type !== "services" && chartTotal === 0);

  return (
    <div className={cn("space-y-6 transition-opacity", isFetching && "opacity-60")}>
      <SummaryTiles report={report} />

      {isEmpty ? (
        <SectionCard>
          <EmptyState icon={<cfg.icon />} title={cfg.emptyTitle} description="جرّب مدى زمنيًا أطول أو فرعًا آخر." />
        </SectionCard>
      ) : (
        <>
          <SectionCard icon={<BarChart3 />} title={cfg.chartTitle} description={rangeLabel}>
            <ReportChart report={report} cfg={cfg} />
          </SectionCard>

          <SectionCard
            flush
            icon={<Table2 />}
            title="تفاصيل التقرير"
            description="نفس بيانات المخطط في جدول — قابلة للتصدير CSV"
            action={<span className="num text-xs text-muted-foreground">{formatNumber(report.rows.length)} صف</span>}
          >
            <ReportTable report={report} columns={columns} />
          </SectionCard>
        </>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────

export default function ReportsPageContent() {
  const { branchId, isAll, branchName } = useBranchScope();
  const [state, setState] = useUrlState({ type: "orders", range: "14d", from: "", to: "" });

  const today = serverNow();
  const todayKey = toDayKey(today);
  const range = resolveRange(state.range, state.from, state.to, today);
  const cfg = reportTypeConfig(state.type);

  const { data, error, refetch, isFetching } = useReport({ branchId, type: cfg.value, from: range.from, to: range.to });
  // keepPreviousData keeps the last report while a new type loads — never render it under the wrong tab.
  const report = data && data.type === cfg.value ? data : undefined;

  // The branch column is noise when a single branch is in scope.
  const columns = (report?.columns ?? []).filter((c) => isAll || c.key !== "branch");
  const csvColumns: CsvColumn<Row>[] = columns.map((c) => ({ header: c.label, value: (r) => r[c.key] }));

  const days = spanDays(range.from, range.to);
  const rangeLabel = `${formatDate(fromDayKey(range.from))} – ${formatDate(fromDayKey(range.to), { withYear: true })} · ${formatNumber(days)} يوم`;
  const scopeLabel = isAll ? "كل الفروع" : branchName(branchId);

  const selectPreset = (preset: RangePreset) => {
    if (preset === "custom") setState({ range: "custom", from: range.from, to: range.to });
    else setState({ range: preset, from: "", to: "" });
  };

  const editDate = (edited: "from" | "to", value: string) => {
    if (!value) return;
    const next = adjustRange(edited, value, range, todayKey);
    const otherMoved = edited === "from" ? next.to !== range.to : next.from !== range.from;
    if (otherMoved && spanDays(next.from, next.to) === MAX_RANGE_DAYS) {
      toast.info(`أقصى مدى للتقرير ${MAX_RANGE_DAYS} يومًا — تم ضبط ${edited === "from" ? "تاريخ النهاية" : "تاريخ البداية"} تلقائيًا`);
    }
    setState({ range: "custom", ...next });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="التقارير"
        description={`${scopeLabel} — اختر نوع التقرير والمدى الزمني، وكل تقرير له مخطط وجدول وتصدير CSV.`}
        actions={
          <>
            <ExportCsvButton filename={`carzen-report-${cfg.value}-${range.from}_${range.to}`} columns={csvColumns} rows={report?.rows} />
            <Button variant="outline" size="icon-lg" onClick={() => refetch()} disabled={isFetching} aria-label="تحديث">
              <RefreshCw className={cn(isFetching && "animate-spin")} />
            </Button>
          </>
        }
      />

      <Tabs value={cfg.value} onValueChange={(type) => setState({ type: String(type) })} className="gap-6">
        <section className="rounded-2xl border border-border/80 bg-card shadow-soft">
          <div className="scrollbar-none overflow-x-auto border-b border-border px-5">
            <TabsList variant="line" className="h-12 gap-5" aria-label="نوع التقرير">
              {REPORT_TYPES.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="flex-none px-0.5">
                  <t.icon />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex flex-col gap-3 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
            <FilterTabs aria-label="المدى الزمني" items={RANGE_PRESETS} value={range.preset} onChange={selectPreset} />
            <div className="flex flex-wrap items-center gap-2">
              <CalendarRange className="size-4 text-muted-foreground" aria-hidden />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                من
                <input type="date" aria-label="من تاريخ" value={range.from} max={todayKey} onChange={(e) => editDate("from", e.target.value)} className={DATE_INPUT} />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                إلى
                <input type="date" aria-label="إلى تاريخ" value={range.to} min={range.from} max={todayKey} onChange={(e) => editDate("to", e.target.value)} className={DATE_INPUT} />
              </label>
            </div>
          </div>
          <p className="border-t border-border/60 px-5 py-2 text-[11px] text-muted-foreground">
            <span className="num">{rangeLabel}</span> · أقصى مدى <span className="num">{MAX_RANGE_DAYS}</span> يومًا · {cfg.description}
          </p>
        </section>

        {REPORT_TYPES.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            {t.value === cfg.value ? (
              <ReportBody
                report={report}
                cfg={cfg}
                columns={columns}
                rangeLabel={`${scopeLabel} · ${rangeLabel}`}
                error={error}
                onRetry={() => refetch()}
                isFetching={isFetching}
              />
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
