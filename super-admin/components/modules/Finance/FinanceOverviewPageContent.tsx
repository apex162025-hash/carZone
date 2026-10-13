"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  BadgePercent,
  Banknote,
  BarChart3,
  ChevronLeft,
  CircleCheckBig,
  HandCoins,
  Landmark,
  Receipt,
  ReceiptText,
  Trophy,
  Undo2,
  Wallet,
} from "lucide-react";

import { FinanceMetricCard } from "@/components/modules/Finance/FinanceMetricCard";
import { MetricInfo } from "@/components/modules/Finance/MetricInfo";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinanceOverview } from "@/hooks/use-finance";
import { useUrlState } from "@/hooks/use-url-state";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FinanceOverview, FinancePeriod } from "@/types/finance";

// Recharts stays out of the initial bundle.
const FinanceChart = dynamic(() => import("@/components/modules/Finance/FinanceChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full rounded-xl" />,
});

const PERIODS: { value: FinancePeriod; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "7d", label: "7 أيام" },
  { value: "30d", label: "30 يوم" },
];

const PERIOD_PHRASE: Record<FinancePeriod, string> = { today: "اليوم", "7d": "آخر 7 أيام", "30d": "آخر 30 يوم" };

type Metric = "gmv" | "commission";

const METRIC_META: Record<Metric, { label: string; color: string; description: string }> = {
  gmv: { label: "إجمالي المبيعات", color: "var(--chart-1)", description: "قيمة الحجوزات المكتملة والمدفوعة يوميًا" },
  commission: { label: "عمولة المنصة", color: "var(--chart-2)", description: "عمولة المنصة المحتسبة يوميًا" },
};

function MetricGrid({ data, period }: { data: FinanceOverview; period: FinancePeriod }) {
  const takeRate = data.gmv ? (data.commission / data.gmv) * 100 : 0;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceMetricCard
          emphasis
          label="إجمالي المبيعات (GMV)"
          definition="مجموع قيمة الحجوزات المكتملة والمدفوعة خلال الفترة المحددة، قبل خصم عمولة المنصة."
          value={formatMoney(data.gmv)}
          icon={<Banknote />}
          tone="var(--chart-1)"
          hint={`${PERIOD_PHRASE[period]} · ${formatNumber(data.paidOrders)} حجز مدفوع`}
        />
        <FinanceMetricCard
          emphasis
          label="إيراد المنصة (العمولة)"
          definition="عمولة المنصة على الحجوزات المدفوعة، محسوبة بنسبة كل مغسلة (الافتراضية أو الخاصة)."
          value={formatMoney(data.commission, { decimals: true })}
          icon={<Landmark />}
          tone="var(--chart-2)"
          hint={`نسبة فعلية ${formatPercent(takeRate)} من المبيعات`}
          href="/finance/commission"
        />
        <FinanceMetricCard
          emphasis
          label="أرباح المغاسل (الصافي)"
          definition="إجمالي المبيعات ناقص عمولة المنصة — ما تستحقه المغاسل عن الفترة."
          value={formatMoney(data.netToWashes, { decimals: true })}
          icon={<HandCoins />}
          tone="var(--success)"
          hint="بعد خصم العمولة"
        />
        <FinanceMetricCard
          emphasis
          label="المبالغ المستردة"
          definition="قيمة الحجوزات التي تم استرداد مبلغها للعملاء خلال الفترة."
          value={formatMoney(data.refunds)}
          icon={<Undo2 />}
          tone="var(--muted-foreground)"
          hint={data.refunds ? "مستبعدة من إجمالي المبيعات" : "لا استردادات في الفترة"}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceMetricCard
          label="الحجوزات المدفوعة"
          definition="عدد الحجوزات المكتملة التي تم تحصيل مبلغها خلال الفترة."
          value={formatNumber(data.paidOrders)}
          icon={<CircleCheckBig />}
          tone="var(--st-completed)"
          hint={PERIOD_PHRASE[period]}
        />
        <FinanceMetricCard
          label="متوسط قيمة الحجز"
          definition="إجمالي المبيعات ÷ عدد الحجوزات المدفوعة في الفترة."
          value={formatMoney(data.averageOrderValue)}
          icon={<ReceiptText />}
          tone="var(--info)"
          hint="لكل حجز مدفوع"
        />
        <FinanceMetricCard
          label="مستحقات غير مدفوعة"
          definition="المتبقي للمغاسل في الدفعات المستحقة التي لم تُسدد بعد. رصيد حالي لا يتأثر بالفترة."
          value={formatMoney(data.pendingPayouts)}
          icon={<Wallet />}
          tone="var(--warning)"
          hint="رصيد حالي · مدفوعات المغاسل"
          href="/finance/payouts"
        />
        <FinanceMetricCard
          label="فروقات التحصيل"
          definition="معاملات لا يطابق فيها المبلغ المحصّل من الكاشير قيمة فاتورة الحجز وتنتظر المراجعة. رصيد حالي لا يتأثر بالفترة."
          value={formatNumber(data.discrepancies)}
          icon={<AlertTriangle />}
          tone={data.discrepancies > 0 ? "var(--warning)" : "var(--muted-foreground)"}
          highlight={data.discrepancies > 0}
          hint={data.discrepancies > 0 ? "تحتاج تحقيق — افتح الفروقات" : "لا توجد فروقات مفتوحة"}
          href="/finance/transactions?filter=discrepancy"
        />
      </div>
    </>
  );
}

function MetricGridSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[106px] rounded-2xl" />
        ))}
      </div>
    </>
  );
}

export default function FinanceOverviewPageContent() {
  const [state, setState] = useUrlState({ period: "30d" });
  const period: FinancePeriod = state.period === "today" || state.period === "7d" ? state.period : "30d";
  const [metric, setMetric] = useState<Metric>("gmv");
  const { data, isLoading, isPlaceholderData, error, refetch, isRefetching } = useFinanceOverview(period);

  if (error && !data) {
    return <ErrorState message={error.message} onRetry={() => refetch()} isRetrying={isRefetching} />;
  }

  const hasSales = Boolean(data?.series.some((p) => p.gmv > 0));
  const maxTop = data?.topWashes[0]?.gmv || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الملخص المالي"
        description="إجمالي المبيعات، إيراد المنصة وأرباح المغاسل — مع ما يحتاج متابعة مالية الآن."
        actions={
          <>
            <FilterTabs aria-label="الفترة" items={PERIODS} value={period} onChange={(p) => setState({ period: p })} />
            <Button variant="outline" size="lg" render={<Link href="/finance/transactions" />}>
              <Receipt />
              دفتر المعاملات
            </Button>
          </>
        }
      />

      <div className={cn("space-y-6 transition-opacity", isPlaceholderData && "opacity-60")} aria-busy={isLoading || isPlaceholderData}>
        {data ? <MetricGrid data={data} period={period} /> : <MetricGridSkeleton />}

        <div className="grid gap-6 xl:grid-cols-3">
          <SectionCard
            className="xl:col-span-2"
            icon={<BarChart3 />}
            title="الإيرادات اليومية"
            description={`${METRIC_META[metric].description} — ${PERIOD_PHRASE[period]}`}
          >
            <div className="mb-4 grid grid-cols-2 gap-2 sm:w-fit">
              {(["gmv", "commission"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  aria-pressed={metric === m}
                  className={cn(
                    "cursor-pointer rounded-xl border px-4 py-2.5 text-start transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                    metric === m ? "border-primary/40 bg-secondary" : "border-border hover:bg-muted/60",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ backgroundColor: METRIC_META[m].color }} />
                    {METRIC_META[m].label}
                  </span>
                  <span className="num mt-0.5 block text-base font-bold">
                    {data ? formatMoney(m === "gmv" ? data.gmv : data.commission, { decimals: m === "commission" }) : "—"}
                  </span>
                </button>
              ))}
            </div>
            {!data ? (
              <Skeleton className="h-[280px] w-full rounded-xl" />
            ) : hasSales ? (
              <FinanceChart data={data.series} metric={metric} />
            ) : (
              <EmptyState
                icon={<BarChart3 />}
                title="لا توجد مبيعات مدفوعة في هذه الفترة"
                description="جرّب فترة أطول لعرض اتجاه الإيرادات."
                className="h-[280px]"
                action={
                  period !== "30d" ? (
                    <Button variant="outline" size="sm" onClick={() => setState({ period: "30d" })}>
                      عرض آخر 30 يوم
                    </Button>
                  ) : undefined
                }
              />
            )}
          </SectionCard>

          <SectionCard
            icon={<Trophy />}
            title={
              <span className="inline-flex items-center gap-1">
                الأعلى مبيعًا
                <MetricInfo
                  label="الأعلى مبيعًا"
                  definition="ترتيب المغاسل حسب إجمالي المبيعات المدفوعة في الفترة، مع عمولة المنصة وعدد الحجوزات المدفوعة."
                />
              </span>
            }
            description={`حسب إجمالي المبيعات — ${PERIOD_PHRASE[period]}`}
            action={
              <Button variant="ghost" size="sm" render={<Link href="/washes" />}>
                كل المغاسل
                <ChevronLeft />
              </Button>
            }
            flush
          >
            {!data ? (
              <div className="space-y-3 px-5 pb-5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : data.topWashes.length ? (
              <ol className="divide-y divide-border/60 pb-2">
                {data.topWashes.map((w, i) => (
                  <li key={w.id}>
                    <Link href={`/washes/${w.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/60 focus-visible:outline-none">
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
                          <span className="block h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${(w.gmv / maxTop) * 100}%` }} />
                        </span>
                        <span className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <BadgePercent className="size-3" />
                            عمولة <span className="num">{formatMoney(w.commission, { decimals: true })}</span>
                          </span>
                          <span className="num">{formatNumber(w.orders)} حجز</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon={<Trophy />} title="لا توجد مبيعات بعد" description="سيظهر ترتيب المغاسل عند تسجيل حجوزات مدفوعة في الفترة." />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
