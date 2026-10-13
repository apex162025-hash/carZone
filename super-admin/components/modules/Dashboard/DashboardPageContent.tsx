"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { Activity, AlertOctagon, BellRing, ChevronLeft, Filter, RefreshCw, TrendingUp, Trophy } from "lucide-react";

import { AlertsPanel } from "@/components/modules/Dashboard/AlertsPanel";
import { BookingFunnel } from "@/components/modules/Dashboard/BookingFunnel";
import { HEADLINE_KPIS, KPI_CONFIG, SECONDARY_KPIS } from "@/components/modules/Dashboard/kpi-config";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { SectionCard } from "@/components/shared/section-card";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/use-dashboard";
import { useAuthStore } from "@/lib/store/auth-store";
import { AREAS } from "@/lib/constants/labels";
import { formatMoney, formatNumber, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardPeriod } from "@/types/dashboard";

// Heavy chart lib stays out of the initial bundle (AGENTS.md: charts are lazy).
const RevenueChart = dynamic(() => import("@/components/modules/Dashboard/RevenueChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[260px] w-full rounded-xl" />,
});

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "7d", label: "7 أيام" },
  { value: "30d", label: "30 يوم" },
];

const ISSUE_LABEL = {
  complaints: (v: number) => `${v} شكاوى مفتوحة`,
  rating: (v: number) => `تقييم منخفض ${v.toFixed(1)}`,
  cancellations: (v: number) => `إلغاءات ${Math.round(v)}٪`,
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "صباح الخير" : "مساء الخير";
}

export default function DashboardPageContent() {
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [metric, setMetric] = useState<"gmv" | "commission">("gmv");
  const admin = useAuthStore((s) => s.admin);
  const { data, isLoading, error, refetch, isFetching } = useDashboard(period);

  if (error && !data) {
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }

  const kpi = (key: (typeof HEADLINE_KPIS)[number]) => data?.kpis.find((k) => k.key === key);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${greeting()}، ${admin?.name.split(" ")[0] ?? ""} 👋`}
        title="نظرة عامة على المنصة"
        description="مؤشرات كارزن اللحظية وما يحتاج تدخلك الآن."
        actions={
          <>
            {data ? (
              <span className="num hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
                <span className="size-1.5 animate-pulse-ring rounded-full bg-success [--tone:var(--success)]" />
                آخر تحديث {formatTime(data.generatedAt)}
              </span>
            ) : null}
            <Button variant="outline" size="lg" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn(isFetching && "animate-spin")} />
              تحديث
            </Button>
          </>
        }
      />

      {/* Headline KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {HEADLINE_KPIS.map((key) => {
          const cfg = KPI_CONFIG[key];
          const item = kpi(key);
          if (!item) return <Skeleton key={key} className="h-[124px] rounded-2xl" />;
          const Icon = cfg.icon;
          return (
            <KpiCard
              key={key}
              emphasis
              label={cfg.label}
              icon={<Icon />}
              value={cfg.format(item.value)}
              delta={item.delta}
              invertDelta={cfg.invert}
              spark={item.spark}
              sparkColor={cfg.color}
              href={cfg.href}
              hint="مقارنة بأمس"
            />
          );
        })}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {SECONDARY_KPIS.map((key) => {
          const cfg = KPI_CONFIG[key];
          const item = data?.kpis.find((k) => k.key === key);
          if (!item) return <Skeleton key={key} className="h-[92px] rounded-2xl" />;
          return (
            <Link
              key={key}
              href={cfg.href}
              className={cn(
                "rounded-2xl border border-border/80 bg-card p-3.5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                key === "pendingApplications" && item.value > 0 && "border-warning/40 bg-warning/5",
              )}
            >
              <p className="truncate text-[11px] font-medium text-muted-foreground">{cfg.label}</p>
              <p className="num mt-1.5 text-lg font-bold">{cfg.format(item.value)}</p>
              {item.delta !== null ? (
                <p
                  className={cn(
                    "num mt-0.5 text-[11px] font-medium",
                    (cfg.invert ? item.delta <= 0 : item.delta >= 0) ? "text-success" : "text-destructive",
                  )}
                >
                  {item.delta >= 0 ? "▲" : "▼"} {Math.abs(item.delta).toFixed(1)}٪
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] text-warning">تحتاج مراجعة</p>
              )}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          icon={<TrendingUp />}
          title="اتجاه الإيرادات"
          description={metric === "gmv" ? "إجمالي قيمة الخدمات المكتملة والمدفوعة" : "عمولة المنصة من الخدمات المدفوعة"}
          action={<FilterTabs items={PERIODS} value={period} onChange={setPeriod} aria-label="الفترة" />}
        >
          <div className="mb-4 grid grid-cols-2 gap-2 sm:w-fit">
            {(["gmv", "commission"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                aria-pressed={metric === m}
                className={cn(
                  "cursor-pointer rounded-xl border px-4 py-2.5 text-start transition-colors",
                  metric === m ? "border-primary/40 bg-secondary" : "border-border hover:bg-muted/60",
                )}
              >
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ backgroundColor: m === "gmv" ? "var(--chart-1)" : "var(--chart-2)" }} />
                  {m === "gmv" ? "إجمالي المبيعات" : "عمولة المنصة"}
                </span>
                <span className="num mt-0.5 block text-base font-bold">
                  {data ? formatMoney(m === "gmv" ? data.revenueTotals.gmv : data.revenueTotals.commission) : "—"}
                </span>
              </button>
            ))}
          </div>
          {data ? <RevenueChart data={data.revenue} metric={metric} /> : <Skeleton className="h-[260px] w-full rounded-xl" />}
        </SectionCard>

        <SectionCard
          icon={<BellRing />}
          title="تنبيهات تحتاج إجراء"
          description="مرتبة حسب الأولوية"
          action={data?.alerts.length ? <span className="num rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">{data.alerts.length}</span> : null}
        >
          {data ? (
            <AlertsPanel alerts={data.alerts} />
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <SectionCard
          icon={<Filter />}
          title="قمع الحجوزات"
          description={`من الإنشاء حتى الاكتمال — ${PERIODS.find((p) => p.value === period)?.label}`}
        >
          {data ? <BookingFunnel funnel={data.funnel} /> : <Skeleton className="h-72 rounded-xl" />}
        </SectionCard>

        <SectionCard
          icon={<Trophy />}
          title="الأعلى أداءً"
          description="حسب إجمالي المبيعات"
          action={
            <Button variant="ghost" size="sm" render={<Link href="/washes" />}>
              الكل
              <ChevronLeft />
            </Button>
          }
          flush
        >
          {data ? (
            <ol className="divide-y divide-border/60">
              {data.topWashes.map((w, i) => {
                const max = data.topWashes[0]?.gmv || 1;
                return (
                  <li key={w.id}>
                    <Link href={`/washes/${w.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
                      <span
                        className={cn(
                          "num flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                          i === 0 ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold">{w.name.ar}</span>
                          <span className="num text-[13px] font-semibold">{formatMoney(w.gmv)}</span>
                        </span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${(w.gmv / max) * 100}%` }} />
                        </span>
                        <span className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{AREAS[w.area] ?? w.area} · {formatNumber(w.completed)} مكتمل</span>
                          <RatingStars value={w.rating} showValue />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="space-y-3 px-5 pb-5">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          )}
        </SectionCard>

        <div className="space-y-6 lg:col-span-2 xl:col-span-1">
          <SectionCard icon={<Activity />} title="صحة المنصة">
            {data ? (
              <dl className="grid grid-cols-2 gap-3">
                {[
                  { label: "مستخدمون نشطون", value: data.health.activeUsers },
                  { label: "مغاسل نشطة", value: data.health.activeWashes },
                  { label: "فروع نشطة", value: data.health.activeBranches },
                  { label: "حجوزات اليوم", value: data.health.bookingsToday },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-muted/60 px-3 py-2.5">
                    <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
                    <dd className="num mt-0.5 text-base font-bold">{formatNumber(s.value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <Skeleton className="h-32 rounded-xl" />
            )}
          </SectionCard>

          <SectionCard icon={<AlertOctagon />} title="تحتاج متابعة" flush>
            {data ? (
              data.needsAttention.length ? (
                <ul className="divide-y divide-border/60">
                  {data.needsAttention.map((w) => (
                    <li key={w.id}>
                      <Link href={`/washes/${w.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-[13px] transition-colors hover:bg-muted/40">
                        <span className="font-medium">{w.name.ar}</span>
                        <span className="num rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                          {ISSUE_LABEL[w.issue](w.value)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 pb-5 text-xs text-muted-foreground">لا توجد مغاسل تحتاج متابعة حاليًا.</p>
              )
            ) : (
              <div className="px-5 pb-5">
                <Skeleton className="h-24 rounded-xl" />
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {isLoading ? <span className="sr-only">جاري تحميل لوحة المؤشرات</span> : null}
    </div>
  );
}
