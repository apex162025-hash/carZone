"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  AlertTriangle,
  BellRing,
  Car,
  CheckCircle2,
  ChevronLeft,
  CircleDot,
  Clock,
  ListChecks,
  PieChart,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { FilterTabs } from "@carzen/ui/components/shared/filter-tabs";
import { KpiCard } from "@carzen/ui/components/shared/kpi-card";
import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { SectionCard } from "@carzen/ui/components/shared/section-card";
import { EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import { Button } from "@carzen/ui/components/ui/button";
import { Progress } from "@carzen/ui/components/ui/progress";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { useUrlState } from "@carzen/ui/hooks/use-url-state";
import { ORDER_SOURCE, ORDER_STATUS, TONES } from "@carzen/ui/lib/constants/labels";
import { formatMoney, formatNumber, formatRelative, formatTime } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { KPI_CONFIG, KPI_ORDER } from "@/components/modules/Dashboard/kpi-config";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useDashboard } from "@/hooks/use-operations";
import type { VendorAlert, VendorPeriod } from "@carzen/contracts/vendor/dashboard";

const DashboardCharts = {
  RevenueBars: dynamic(() => import("@/components/modules/Dashboard/DashboardCharts").then((m) => m.RevenueBars), {
    ssr: false,
    loading: () => <Skeleton className="h-[240px] w-full rounded-xl" />,
  }),
  SourceDonut: dynamic(() => import("@/components/modules/Dashboard/DashboardCharts").then((m) => m.SourceDonut), {
    ssr: false,
    loading: () => <Skeleton className="mx-auto size-[168px] rounded-full" />,
  }),
};

const PERIODS: { value: VendorPeriod; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "7d", label: "7 أيام" },
  { value: "30d", label: "30 يوم" },
];

const SOURCE_COLOR = { app: "var(--chart-1)", walk_in: "var(--chart-2)", phone: "var(--chart-3)" } as const;
const SEVERITY_TONE = { danger: TONES.danger, warning: TONES.warning, info: TONES.info } as const;

function greeting() {
  return new Date().getHours() < 12 ? "صباح الخير" : "مساء الخير";
}

function AlertRow({ alert }: { alert: VendorAlert }) {
  return (
    <li style={{ "--tone": SEVERITY_TONE[alert.severity] } as CSSProperties} className="group relative flex items-start gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-muted/40">
      <span className="tone-soft flex size-9 shrink-0 items-center justify-center rounded-lg">
        <AlertTriangle className="size-4" />
      </span>
      <Link href={alert.href} className="min-w-0 flex-1 after:absolute after:inset-0 focus-visible:outline-none">
        <p className="text-[13px] leading-snug font-semibold">{alert.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{alert.description}</p>
      </Link>
      <ChevronLeft className="mt-2 size-4 shrink-0 text-muted-foreground" />
    </li>
  );
}

export default function DashboardPageContent() {
  const { account, branchId, isAll, branchName } = useBranchScope();
  const [state, setState] = useUrlState({ period: "today" });
  const period = state.period as VendorPeriod;
  const { data, isLoading, error, refetch, isFetching } = useDashboard(branchId, period);

  if (error && !data) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  const kpi = (key: (typeof KPI_ORDER)[number]) => data?.kpis.find((k) => k.key === key);
  const periodLabel = PERIODS.find((p) => p.value === period)?.label;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${greeting()}، ${account?.name.split(" ")[0] ?? ""} 👋`}
        title={isAll ? account?.businessName.ar ?? "الرئيسية" : branchName(branchId)}
        description={isAll ? `نظرة على كل الفروع (${account?.branches.length ?? 0}) — ما يحدث الآن وما يحتاج تدخلك.` : "نظرة على الفرع — ما يحدث الآن وما يحتاج تدخلك."}
        actions={
          <>
            <FilterTabs items={PERIODS} value={period} onChange={(p) => setState({ period: p })} aria-label="الفترة" />
            <Button variant="outline" size="icon-lg" onClick={() => refetch()} disabled={isFetching} aria-label="تحديث">
              <RefreshCw className={cn(isFetching && "animate-spin")} />
            </Button>
          </>
        }
      />

      {data?.setup ? (
        <SectionCard icon={<ListChecks />} title="ابدأ استقبال الحجوزات" description={`أكملت ${data.setup.done} من ${data.setup.total} خطوات الإعداد`}>
          <Progress value={(data.setup.done / data.setup.total) * 100} className="mb-4" />
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {data.setup.steps.map((s, i) => (
              <li key={s.key}>
                <Link
                  href={s.href}
                  className={cn(
                    "flex h-full items-start gap-2.5 rounded-xl border p-3 text-sm transition-colors hover:bg-muted/50",
                    s.done ? "border-success/30 bg-success/5" : "border-border",
                  )}
                >
                  {s.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <span className="num mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px]">{i + 1}</span>}
                  <span className={cn(s.done && "text-muted-foreground line-through")}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_ORDER.map((key, i) => {
          const cfg = KPI_CONFIG[key];
          const item = kpi(key);
          if (!item) return <Skeleton key={key} className={cn("rounded-2xl", i < 4 ? "h-[124px]" : "h-[112px]")} />;
          const Icon = cfg.icon;
          return (
            <KpiCard
              key={key}
              emphasis={i < 4}
              label={cfg.label}
              icon={<Icon />}
              value={cfg.format(item.value)}
              delta={item.delta}
              invertDelta={cfg.invert}
              spark={item.spark}
              sparkColor={cfg.color}
              href={cfg.href}
              hint={period === "today" ? "مقارنة بنفس الوقت أمس" : `مقارنة بالـ ${periodLabel} السابقة`}
            />
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          icon={<Radio />}
          title="الفروع الآن"
          description="مفتوح/مغلق، الأماكن المشغولة والموظفون في الوردية"
          action={
            <Button variant="ghost" size="sm" render={<Link href="/live" />}>
              التشغيل المباشر <ChevronLeft />
            </Button>
          }
        >
          {data ? (
            <div className={cn("grid gap-3", data.liveBranches.length > 1 && "md:grid-cols-2")}>
              {data.liveBranches.map((b) => {
                const pct = b.capacity ? (b.baysBusy / b.capacity) * 100 : 0;
                return (
                  <Link key={b.id} href="/live" className="group rounded-2xl border border-border/80 p-4 transition-colors hover:border-primary/30 hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{b.name.ar}</p>
                        <p className="num mt-0.5 text-[11px] text-muted-foreground">{b.opensAt ? `${b.opensAt} – ${b.closesAt === "00:00" ? "12:00 ص" : b.closesAt}` : "مغلق اليوم"}</p>
                      </div>
                      <StatusBadge label={b.isOpen ? "مفتوح الآن" : "مغلق"} tone={b.isOpen ? TONES.success : TONES.neutral} live={b.isOpen} size="sm" />
                    </div>
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-muted-foreground">الأماكن المشغولة</span>
                        <span className="num font-semibold">
                          {b.baysBusy} / {b.capacity}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full transition-[width]", pct >= 100 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-aqua")} style={{ width: `${Math.max(pct, 3)}%` }} />
                      </div>
                    </div>
                    <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
                      {[
                        ["في الانتظار", b.waiting],
                        ["جارٍ التنفيذ", b.inService],
                        ["بانتظار الدفع", b.paymentPending],
                        ["إيراد اليوم", formatMoney(b.revenueToday)],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="rounded-lg bg-muted/50 px-1 py-2">
                          <dt className="text-[10px] text-muted-foreground">{label}</dt>
                          <dd className="num mt-0.5 text-sm font-bold">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-3 flex items-center gap-2">
                      <Users className="size-3.5 text-muted-foreground" />
                      {b.staffOnShift.length ? (
                        <div className="flex -space-x-1.5 rtl:space-x-reverse">
                          {b.staffOnShift.slice(0, 5).map((s) => (
                            <UserAvatar key={s.id} name={s.name} size="xs" className="ring-2 ring-card" />
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-destructive">لا يوجد موظف في الوردية</span>
                      )}
                      {b.staffOnShift.length ? <span className="text-[11px] text-muted-foreground">{b.staffOnShift.length} في الوردية</span> : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Skeleton className="h-52 rounded-2xl" />
          )}
        </SectionCard>

        <SectionCard
          icon={<BellRing />}
          title="يحتاج انتباهك"
          action={data?.alerts.length ? <span className="num rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">{data.alerts.length}</span> : null}
        >
          {data ? (
            data.alerts.length ? (
              <ul className="space-y-2">
                {data.alerts.map((a) => (
                  <AlertRow key={a.id} alert={a} />
                ))}
              </ul>
            ) : (
              <EmptyState icon={<ShieldCheck />} title="كل شيء تمام" description="لا توجد فروق نقدية أو مدفوعات متأخرة أو مشاكل تشغيل الآن." className="py-8" />
            )
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        icon={<Car />}
        title="السيارات داخل الفرع الآن"
        description="تتحدث تلقائيًا مع كل إجراء من الموظفين"
        flush
        action={data ? <span className="num text-xs text-muted-foreground">{data.carsInside.length} سيارة</span> : null}
      >
        {data ? (
          data.carsInside.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-y border-border bg-muted/50 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-start font-medium">اللوحة</th>
                    <th className="px-4 py-2.5 text-start font-medium">الطلب</th>
                    <th className="px-4 py-2.5 text-start font-medium">الخدمة</th>
                    {isAll ? <th className="px-4 py-2.5 text-start font-medium">الفرع</th> : null}
                    <th className="px-4 py-2.5 text-start font-medium">الحالة</th>
                    <th className="px-4 py-2.5 text-start font-medium">الموظف</th>
                    <th className="px-5 py-2.5 text-end font-medium">منذ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.carsInside.map((c) => (
                    <tr key={c.orderId} className={cn("transition-colors hover:bg-muted/40", c.overdueMin > 0 && "bg-destructive/[0.03]")}>
                      <td className="px-5 py-3">
                        <Link href={`/orders/${c.orderId}`} className="num rounded-md border border-border bg-card px-2 py-0.5 font-bold tracking-wider hover:border-primary/40">
                          {c.plate}
                        </Link>
                      </td>
                      <td className="num px-4 py-3 text-muted-foreground">{c.number}</td>
                      <td className="px-4 py-3">{c.serviceName.ar}</td>
                      {isAll ? <td className="px-4 py-3 text-xs text-muted-foreground">{c.branchName.ar}</td> : null}
                      <td className="px-4 py-3">
                        {c.paymentPending ? <StatusBadge label="بانتظار الدفع" tone={TONES.warning} size="sm" /> : <StatusBadge meta={ORDER_STATUS[c.status]} size="sm" live={c.status === "in_service"} />}
                      </td>
                      <td className="px-4 py-3 text-xs">{c.staffName ?? <span className="text-muted-foreground">لم يُعيّن</span>}</td>
                      <td className="px-5 py-3 text-end text-xs">
                        <span className="text-muted-foreground">{formatRelative(c.since)}</span>
                        {c.overdueMin > 0 ? <span className="num ms-2 rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] font-semibold text-destructive">متأخر {c.overdueMin} د</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<Car />} title="لا توجد سيارات داخل الفرع الآن" description="عند تسجيل وصول أو حضور مباشر ستظهر السيارة هنا." className="py-8" />
          )
        ) : (
          <div className="px-5 pb-5">
            <Skeleton className="h-40 rounded-xl" />
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2" icon={<TrendingUp />} title={period === "today" ? "الإيراد بالساعة" : "الإيراد اليومي"} description="من الطلبات المدفوعة فقط">
          {data ? <DashboardCharts.RevenueBars data={data.charts.revenueByHour} /> : <Skeleton className="h-[240px] rounded-xl" />}
        </SectionCard>

        <SectionCard icon={<PieChart />} title="الطلبات حسب المصدر" description={periodLabel}>
          {data ? (
            <div className="space-y-4">
              <DashboardCharts.SourceDonut
                data={data.charts.bySource.map((s) => ({ key: s.source, label: ORDER_SOURCE[s.source].label, value: s.value, color: SOURCE_COLOR[s.source] }))}
              />
              <ul className="space-y-2">
                {data.charts.bySource.map((s) => {
                  const total = data.charts.bySource.reduce((sum, x) => sum + x.value, 0) || 1;
                  return (
                    <li key={s.source} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLOR[s.source] }} />
                        {ORDER_SOURCE[s.source].label}
                      </span>
                      <span className="num">
                        <span className="font-semibold">{formatNumber(s.value)}</span>
                        <span className="ms-2 text-xs text-muted-foreground">{Math.round((s.value / total) * 100)}٪</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <Skeleton className="h-64 rounded-xl" />
          )}
        </SectionCard>

        <SectionCard icon={<Sparkles />} title="الخدمات الأكثر طلبًا" description={periodLabel}>
          {data ? (
            <ol className="space-y-3">
              {data.charts.topServices.map((s) => {
                const max = data.charts.topServices[0]?.count || 1;
                return (
                  <li key={s.name.ar} className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{s.name.ar}</span>
                      <span className="num text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{s.count}</span> · {formatMoney(s.revenue)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(s.count / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
              {!data.charts.topServices.length ? <p className="py-6 text-center text-xs text-muted-foreground">لا توجد طلبات في هذه الفترة</p> : null}
            </ol>
          ) : (
            <Skeleton className="h-48 rounded-xl" />
          )}
        </SectionCard>

        <SectionCard icon={<CircleDot />} title="الطلبات حسب الحالة" description={periodLabel}>
          {data ? (
            <ul className="space-y-2.5">
              {data.charts.byStatus.map((s) => (
                <li key={s.status} className="flex items-center justify-between">
                  <StatusBadge meta={ORDER_STATUS[s.status]} size="sm" />
                  <span className="num text-sm font-semibold">{formatNumber(s.value)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Skeleton className="h-48 rounded-xl" />
          )}
        </SectionCard>

        <SectionCard icon={<Clock />} title="ملخص اليوم">
          {data ? (
            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: "طلبات اليوم", value: formatNumber(data.dailySummary.orders) },
                { label: "إيراد اليوم", value: formatMoney(data.dailySummary.revenue) },
                { label: "أكثر خدمة", value: data.dailySummary.topService?.ar ?? "—" },
                { label: "تنبيهات مفتوحة", value: formatNumber(data.dailySummary.issues) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-muted/60 px-3 py-2.5">
                  <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
                  <dd className="num mt-0.5 truncate text-sm font-bold">{s.value}</dd>
                </div>
              ))}
              <p className="col-span-2 text-[11px] text-muted-foreground">آخر تحديث {formatTime(data.generatedAt)}</p>
            </dl>
          ) : (
            <Skeleton className="h-32 rounded-xl" />
          )}
        </SectionCard>
      </div>

      {isLoading ? <span className="sr-only">جاري تحميل الرئيسية</span> : null}
    </div>
  );
}
