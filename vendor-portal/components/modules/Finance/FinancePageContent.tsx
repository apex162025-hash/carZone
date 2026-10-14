"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import {
  Banknote,
  BarChart3,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  HandCoins,
  Landmark,
  Percent,
  ReceiptText,
  RefreshCw,
  Scale,
  TicketPercent,
  Undo2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { FilterTabs } from "@carzen/ui/components/shared/filter-tabs";
import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { SectionCard } from "@carzen/ui/components/shared/section-card";
import { EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import { Button } from "@carzen/ui/components/ui/button";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { useUrlState } from "@carzen/ui/hooks/use-url-state";
import { PAYMENT_METHOD, PAYOUT_STATUS, TONES } from "@carzen/ui/lib/constants/labels";
import { downloadCsv, type CsvColumn } from "@carzen/ui/lib/export-csv";
import { formatDate, formatMoney, formatNumber, formatPercent, formatRelative } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { FinanceMetricCard } from "@/components/modules/Finance/FinanceMetricCard";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useFinance } from "@/hooks/use-insights";
import type { PaymentMethod } from "@carzen/contracts/orders";
import type { VendorPeriod } from "@carzen/contracts/vendor/dashboard";
import type { VendorFinance } from "@carzen/contracts/vendor/insights";
import type { VendorOrderListItem } from "@carzen/contracts/vendor/operations";

const FinanceCharts = {
  DailyRevenueBars: dynamic(() => import("@/components/modules/Finance/FinanceCharts").then((m) => m.DailyRevenueBars), {
    ssr: false,
    loading: () => <Skeleton className="h-[260px] w-full rounded-xl" />,
  }),
};

const PERIODS: { value: VendorPeriod; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "7d", label: "7 أيام" },
  { value: "30d", label: "30 يوم" },
];

const PERIOD_TEXT: Record<VendorPeriod, string> = { today: "اليوم", "7d": "آخر 7 أيام", "30d": "آخر 30 يوم" };

const METHOD_ICON: Record<PaymentMethod, typeof Banknote> = { cash: Banknote, card: CreditCard, online: Wallet };

type DayRow = VendorFinance["byDay"][number];

const DAY_CSV: CsvColumn<DayRow>[] = [
  { header: "التاريخ", value: (d) => d.date },
  { header: "الإيراد (ج.م)", value: (d) => d.revenue },
];

/** When the order became payable — the "completed" step, falling back to its slot. */
function completedAt(o: VendorOrderListItem) {
  return o.timeline.find((t) => t.status === "completed")?.at ?? o.scheduledAt;
}

const PENDING_CSV: CsvColumn<VendorOrderListItem>[] = [
  { header: "رقم الطلب", value: (o) => o.number },
  { header: "اللوحة", value: (o) => o.plate },
  { header: "العميل", value: (o) => o.customerName ?? "عميل مباشر" },
  { header: "الخدمة", value: (o) => o.serviceName.ar },
  { header: "الفرع", value: (o) => o.branchName.ar },
  { header: "اكتمل في", value: (o) => completedAt(o) },
  { header: "المبلغ (ج.م)", value: (o) => o.total },
];

function exportCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]) {
  downloadCsv(filename, columns, rows);
  toast.success(`تم تصدير ${rows.length} صف`);
}

function CsvButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled} aria-label={label}>
      <Download />
      CSV
    </Button>
  );
}

const TH = "h-10 border-y border-border bg-muted/60 px-4 text-xs font-medium whitespace-nowrap text-muted-foreground first:ps-5 last:pe-5";
const TD = "h-12 border-b border-border/60 px-4 align-middle first:ps-5 last:pe-5";

function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-11 rounded-xl" />
      ))}
    </div>
  );
}

export default function FinancePageContent() {
  const { branchId, isAll, isLocked, branches, branchName } = useBranchScope();
  const [state, setState] = useUrlState({ period: "30d" });
  const period: VendorPeriod = state.period === "today" || state.period === "7d" ? state.period : "30d";
  const { data, error, refetch, isFetching } = useFinance(branchId, period);
  const [dailyView, setDailyView] = useState<"chart" | "table">("chart");

  const scopeLabel = isAll ? "كل الفروع" : branchName(branchId);
  const periodText = PERIOD_TEXT[period];

  const header = (
    <PageHeader
      title="المالية"
      description={`${scopeLabel} — الإيراد المحصّل وعمولة كارزن وصافي المغسلة والمدفوعات المعلّقة والتحويلات.`}
      actions={
        <>
          <FilterTabs items={PERIODS} value={period} onChange={(p) => setState({ period: p })} aria-label="الفترة" />
          <Button variant="outline" size="icon-lg" onClick={() => refetch()} disabled={isFetching} aria-label="تحديث">
            <RefreshCw className={cn(isFetching && "animate-spin")} />
          </Button>
        </>
      }
    />
  );

  if (error && !data) {
    return (
      <div className="space-y-6">
        {header}
        <SectionCard>
          <ErrorState message={error.message} onRetry={() => refetch()} />
        </SectionCard>
      </div>
    );
  }

  const d = data;
  const rate = d?.commissionRate ?? 0;
  const methodTotal = d ? d.byMethod.reduce((s, m) => s + m.amount, 0) : 0;
  const branchTotal = d ? d.byBranch.reduce((s, b) => s + b.revenue, 0) : 0;
  const discountCount = d ? d.discountsByStaff.reduce((s, x) => s + x.count, 0) : 0;
  const hasDailyRevenue = Boolean(d?.byDay.some((x) => x.revenue > 0));

  const kpis = d
    ? [
        {
          key: "revenue",
          label: "الإيراد",
          icon: <Banknote />,
          tone: TONES.primary,
          value: formatMoney(d.revenue),
          hint: `${periodText} · من الطلبات المدفوعة`,
          definition: "مجموع قيمة الطلبات المدفوعة في الفترة (نقدي + بطاقة + أونلاين). الطلبات غير المدفوعة أو الملغاة أو المستردة لا تُحسب.",
          emphasis: true,
        },
        {
          key: "commission",
          label: "عمولة كارزن",
          icon: <Percent />,
          tone: TONES.violet,
          value: formatMoney(d.commission, { decimals: true }),
          hint: `${formatPercent(rate)} من الإيراد`,
          definition: `نسبة كارزن (${formatPercent(rate)}) من إيراد الطلبات المدفوعة فقط — لا عمولة على الطلبات غير المدفوعة أو الملغاة.`,
          emphasis: true,
        },
        {
          key: "net",
          label: "صافي المغسلة",
          icon: <Scale />,
          tone: TONES.success,
          value: formatMoney(d.net, { decimals: true }),
          hint: "الإيراد ناقص عمولة كارزن",
          definition: "ما يخص المغسلة من الإيراد بعد خصم عمولة كارزن.",
          emphasis: true,
        },
        {
          key: "refunds",
          label: "المبالغ المستردة",
          icon: <Undo2 />,
          tone: TONES.danger,
          value: formatMoney(d.refunds),
          hint: periodText,
          definition: "قيمة الطلبات التي رُدّت للعميل في الفترة — غير داخلة في الإيراد.",
        },
        {
          key: "discounts",
          label: "الخصومات الممنوحة",
          icon: <TicketPercent />,
          tone: TONES.warning,
          value: formatMoney(d.discounts),
          hint: `${formatNumber(discountCount)} طلب بخصم يدوي`,
          definition: "مجموع الخصومات اليدوية التي طبّقها الموظفون على الطلبات غير الملغاة (بدون عروض التطبيق).",
        },
        {
          key: "paidOrders",
          label: "الطلبات المدفوعة",
          icon: <ReceiptText />,
          tone: TONES.aqua,
          value: formatNumber(d.paidOrders),
          hint: d.paidOrders ? `متوسط التذكرة ${formatMoney(Math.round(d.revenue / d.paidOrders))}` : "لا توجد طلبات مدفوعة",
          definition: "عدد الطلبات التي اكتمل دفعها في الفترة.",
        },
      ]
    : [];

  const singleBranch = d && (d.byBranch.length <= 1 || !isAll);

  return (
    <div className="space-y-6">
      {header}

      <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3 transition-opacity", isFetching && d && "opacity-70")}>
        {d
          ? kpis.map((k) => (
              <FinanceMetricCard key={k.key} label={k.label} icon={k.icon} tone={k.tone} value={k.value} hint={k.hint} definition={k.definition} emphasis={k.emphasis} />
            ))
          : Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[112px] rounded-2xl" />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* (a) Daily revenue */}
        <SectionCard
          className="xl:col-span-2"
          icon={<BarChart3 />}
          title="الإيراد اليومي"
          description={`${periodText} · من الطلبات المدفوعة فقط`}
          action={
            <>
              <FilterTabs
                aria-label="طريقة العرض"
                items={[
                  { value: "chart", label: "مخطط" },
                  { value: "table", label: "جدول" },
                ]}
                value={dailyView}
                onChange={setDailyView}
              />
              <CsvButton label="تصدير الإيراد اليومي CSV" disabled={!d?.byDay.length} onClick={() => d && exportCsv(`carzen-daily-revenue-${period}`, DAY_CSV, d.byDay)} />
            </>
          }
        >
          {!d ? (
            <Skeleton className="h-[260px] rounded-xl" />
          ) : !hasDailyRevenue ? (
            <EmptyState icon={<BarChart3 />} title="لا يوجد إيراد في هذه الفترة" description="سيظهر الإيراد هنا عند تحصيل أول طلب." className="py-10" />
          ) : dailyView === "chart" ? (
            <FinanceCharts.DailyRevenueBars data={d.byDay} />
          ) : (
            <div className="max-h-[260px] overflow-y-auto rounded-xl border border-border/70">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-start font-medium">اليوم</th>
                    <th scope="col" className="px-4 py-2 text-end font-medium">الإيراد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {[...d.byDay].reverse().map((x) => (
                    <tr key={x.date}>
                      <td className="num px-4 py-2">{formatDate(`${x.date}T00:00:00`, { withDay: true })}</td>
                      <td className={cn("num px-4 py-2 text-end font-semibold", !x.revenue && "font-normal text-muted-foreground")}>{formatMoney(x.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* (b) Revenue by payment method */}
        <SectionCard icon={<CreditCard />} title="الإيراد حسب طريقة الدفع" description={periodText}>
          {!d ? (
            <ListSkeleton rows={3} />
          ) : !methodTotal ? (
            <EmptyState icon={<CreditCard />} title="لا توجد مدفوعات في هذه الفترة" className="py-10" />
          ) : (
            <ul className="space-y-4">
              {d.byMethod.map((m) => {
                const Icon = METHOD_ICON[m.method];
                const share = methodTotal ? (m.amount / methodTotal) * 100 : 0;
                return (
                  <li key={m.method} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <Icon className="size-4 text-muted-foreground" aria-hidden />
                        {PAYMENT_METHOD[m.method]}
                        <span className="num text-xs font-normal text-muted-foreground">({formatNumber(m.count)} طلب)</span>
                      </span>
                      <span className="num">
                        <span className="font-semibold">{formatMoney(m.amount)}</span>
                        <span className="ms-2 text-xs text-muted-foreground">{formatPercent(share)}</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(share, m.amount ? 2 : 0)}%` }} />
                    </div>
                  </li>
                );
              })}
              <li className="flex items-center justify-between border-t border-border/60 pt-3 text-sm">
                <span className="text-muted-foreground">الإجمالي</span>
                <span className="num font-bold">{formatMoney(methodTotal)}</span>
              </li>
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* (d) Pending payments */}
        <SectionCard
          className="xl:col-span-2"
          flush
          icon={<HandCoins />}
          title="مدفوعات معلّقة"
          description="طلبات مكتملة لم يُحصّل ثمنها بعد — بغض النظر عن الفترة"
          action={
            d ? (
              <>
                {d.pendingPayments.count ? (
                  <span className="num rounded-md bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                    {formatNumber(d.pendingPayments.count)} · {formatMoney(d.pendingPayments.amount)}
                  </span>
                ) : null}
                <CsvButton
                  label="تصدير المدفوعات المعلّقة CSV"
                  disabled={!d.pendingPayments.orders.length}
                  onClick={() => exportCsv("carzen-pending-payments", PENDING_CSV, d.pendingPayments.orders)}
                />
              </>
            ) : null
          }
        >
          {!d ? (
            <ListSkeleton className="px-5 pb-5" />
          ) : !d.pendingPayments.orders.length ? (
            <EmptyState icon={<CheckCircle2 />} title="كل الطلبات المكتملة مدفوعة ✓" description="لا توجد طلبات مكتملة بانتظار التحصيل." className="py-10" />
          ) : (
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-[1]">
                  <tr>
                    <th scope="col" className={cn(TH, "text-start")}>اللوحة</th>
                    <th scope="col" className={cn(TH, "text-start")}>الطلب</th>
                    <th scope="col" className={cn(TH, "hidden text-start lg:table-cell")}>الخدمة</th>
                    {isAll ? <th scope="col" className={cn(TH, "hidden text-start xl:table-cell")}>الفرع</th> : null}
                    <th scope="col" className={cn(TH, "text-start")}>منذ الاكتمال</th>
                    <th scope="col" className={cn(TH, "text-end")}>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {d.pendingPayments.orders.map((o) => (
                    <tr key={o.id} className="transition-colors hover:bg-muted/40">
                      <td className={TD}>
                        <Link href={`/orders/${o.id}`} className="num rounded-md border border-border bg-card px-2 py-0.5 font-bold tracking-wider hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
                          {o.plate || "—"}
                        </Link>
                      </td>
                      <td className={TD}>
                        <Link href={`/orders/${o.id}`} className="num font-semibold hover:text-primary hover:underline">
                          {o.number}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{o.customerName ?? "عميل مباشر"}</p>
                      </td>
                      <td className={cn(TD, "hidden lg:table-cell")}>{o.serviceName.ar}</td>
                      {isAll ? <td className={cn(TD, "hidden text-xs text-muted-foreground xl:table-cell")}>{o.branchName.ar}</td> : null}
                      <td className={cn(TD, "text-xs text-muted-foreground")}>{formatRelative(completedAt(o))}</td>
                      <td className={cn(TD, "num text-end font-semibold")}>{formatMoney(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40 font-semibold">
                    <td className="h-11 px-4 ps-5" colSpan={isAll ? 5 : 4}>
                      <span className="lg:hidden">الإجمالي</span>
                      <span className="hidden lg:inline">إجمالي المعلّق</span>
                    </td>
                    <td className="num h-11 px-4 pe-5 text-end">{formatMoney(d.pendingPayments.amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </SectionCard>

        {/* (c) Revenue by branch */}
        <SectionCard icon={<Building2 />} title="الإيراد حسب الفرع" description={periodText}>
          {!d ? (
            <ListSkeleton rows={2} />
          ) : (
            <div className="space-y-4">
              <ul className="space-y-4">
                {d.byBranch.map((b) => {
                  const share = branchTotal ? (b.revenue / branchTotal) * 100 : 0;
                  return (
                    <li key={b.branchId} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate font-medium">{b.name.ar}</span>
                        <span className="num shrink-0">
                          <span className="font-semibold">{formatMoney(b.revenue)}</span>
                          {!singleBranch ? <span className="ms-2 text-xs text-muted-foreground">{formatPercent(share)}</span> : null}
                        </span>
                      </div>
                      {!singleBranch ? (
                        <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(share, b.revenue ? 2 : 0)}%` }} />
                        </div>
                      ) : null}
                      <p className="num text-[11px] text-muted-foreground">{formatNumber(b.orders)} طلب مدفوع</p>
                    </li>
                  );
                })}
              </ul>
              {singleBranch ? (
                <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  {isLocked
                    ? "تعرض أرقام فرعك فقط."
                    : branches.length > 1
                      ? "تعرض فرعًا واحدًا — اختر «كل الفروع» من مبدّل الفروع للمقارنة بينها."
                      : "عند إضافة فروع أخرى ستظهر المقارنة بينها هنا."}
                </p>
              ) : null}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* (e) Discounts by employee */}
        <SectionCard flush icon={<TicketPercent />} title="الخصومات حسب الموظف" description={`${periodText} · خصومات يدوية على الطلبات`}>
          {!d ? (
            <ListSkeleton rows={3} className="px-5 pb-5" />
          ) : !d.discountsByStaff.length ? (
            <EmptyState icon={<TicketPercent />} title="لا توجد خصومات يدوية في هذه الفترة" className="py-10" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th scope="col" className={cn(TH, "text-start")}>الموظف</th>
                    <th scope="col" className={cn(TH, "text-end")}>عدد الطلبات</th>
                    <th scope="col" className={cn(TH, "text-end")}>قيمة الخصم</th>
                  </tr>
                </thead>
                <tbody>
                  {d.discountsByStaff.map((s) => (
                    <tr key={s.staffId} className="transition-colors hover:bg-muted/40">
                      <td className={TD}>
                        <span className="flex items-center gap-2">
                          <UserAvatar name={s.name} size="xs" />
                          {s.name}
                        </span>
                      </td>
                      <td className={cn(TD, "num text-end")}>{formatNumber(s.count)}</td>
                      <td className={cn(TD, "num text-end font-semibold")}>{formatMoney(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                {d.discountsByStaff.length > 1 ? (
                  <tfoot>
                    <tr className="bg-muted/40 font-semibold">
                      <td className="h-11 px-4 ps-5">الإجمالي</td>
                      <td className="num h-11 px-4 text-end">{formatNumber(discountCount)}</td>
                      <td className="num h-11 px-4 pe-5 text-end">{formatMoney(d.discounts)}</td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          )}
        </SectionCard>

        {/* Definitions */}
        <SectionCard icon={<Scale />} title="كيف نحسب الأرقام">
          <dl className="space-y-3 text-sm">
            {[
              {
                term: "عمولة كارزن",
                desc: `تُحسب على الطلبات المدفوعة فقط بنسبة ${d ? formatPercent(rate) : "—"} من قيمة الطلب بعد الخصم — لا عمولة على الطلبات غير المدفوعة أو الملغاة أو المستردة.`,
              },
              { term: "صافي المغسلة", desc: "الإيراد المحصّل ناقص عمولة كارزن، وهو أساس التحويلات المستحقة لك." },
              { term: "المدفوعات المعلّقة", desc: "طلبات مكتملة لم يُسجَّل تحصيلها بعد — تدخل الإيراد بعد التحصيل وتمنع إغلاق اليوم." },
              { term: "الخصومات", desc: "الخصومات اليدوية من الموظفين في حدود صلاحياتهم، منفصلة عن عروض التطبيق." },
            ].map((x) => (
              <div key={x.term} className="rounded-xl bg-muted/50 px-3 py-2.5">
                <dt className="font-semibold">{x.term}</dt>
                <dd className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{x.desc}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>

      {/* (f) Payouts from Carzen */}
      <SectionCard
        flush
        icon={<Landmark />}
        title="التحويلات من كارزن"
        description="تتم التسوية والتحويل بواسطة فريق مالية كارزن — للاستفسار تواصل مع الدعم. التحويلات على مستوى المغسلة (كل الفروع)."
      >
        {!d ? (
          <ListSkeleton rows={3} className="px-5 pb-5" />
        ) : !d.payouts.length ? (
          <EmptyState icon={<Landmark />} title="لا توجد تحويلات بعد" description="ستظهر هنا فترات التسوية والمبالغ المستحقة والمدفوعة." className="py-10" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th scope="col" className={cn(TH, "text-start")}>الفترة</th>
                  <th scope="col" className={cn(TH, "text-end")}>المستحق</th>
                  <th scope="col" className={cn(TH, "text-end")}>المدفوع</th>
                  <th scope="col" className={cn(TH, "text-start")}>الحالة</th>
                  <th scope="col" className={cn(TH, "text-start")}>المرجع</th>
                  <th scope="col" className={cn(TH, "text-start")}>تاريخ الدفع</th>
                </tr>
              </thead>
              <tbody>
                {d.payouts.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-muted/40">
                    <td className={cn(TD, "num whitespace-nowrap")}>
                      {formatDate(p.periodStart)} – {formatDate(p.periodEnd, { withYear: true })}
                    </td>
                    <td className={cn(TD, "num text-end font-semibold")}>{formatMoney(p.amountDue, { decimals: true })}</td>
                    <td className={cn(TD, "num text-end")}>{p.amountPaid ? formatMoney(p.amountPaid, { decimals: true }) : <span className="text-muted-foreground">—</span>}</td>
                    <td className={TD}>
                      <StatusBadge meta={PAYOUT_STATUS[p.status]} size="sm" />
                    </td>
                    <td className={cn(TD, "text-xs")}>
                      {p.reference ? (
                        <span className="num" dir="ltr">
                          {p.reference}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={cn(TD, "num text-xs text-muted-foreground")}>{p.paidAt ? formatDate(p.paidAt, { withYear: true }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
