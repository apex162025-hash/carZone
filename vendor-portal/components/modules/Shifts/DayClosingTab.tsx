"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  AlertTriangle,
  Banknote,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  History,
  Info,
  Lock,
  Printer,
  Receipt,
  Smartphone,
  Store,
} from "lucide-react";

import { DataTable, type DataTableColumn } from "@carzen/ui/components/shared/data-table";
import { SectionCard } from "@carzen/ui/components/shared/section-card";
import { SelectFilter } from "@carzen/ui/components/shared/select-filter";
import { StatTile } from "@carzen/ui/components/shared/stat-tile";
import { EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { Button } from "@carzen/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@carzen/ui/components/ui/dialog";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { Textarea } from "@carzen/ui/components/ui/textarea";
import { PAYMENT_METHOD, TONES } from "@carzen/ui/lib/constants/labels";
import { formatDate, formatDateTime, formatMoney, formatNumber, serverNow } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import type { SetShiftsUrlState, ShiftsUrlState } from "@/components/modules/Shifts/ShiftsPageContent";
import { DiffValue, diffTone, fromDateKey, shiftDateKey, toDateKey } from "@/components/modules/Shifts/shift-utils";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useCloseDay, useDayClosing } from "@/hooks/use-team";
import type { PaymentMethod } from "@carzen/contracts/orders";
import type { DayClosing, DayClosingSummary, MethodTotals } from "@carzen/contracts/vendor/team";

const METHODS: { key: PaymentMethod; icon: typeof Banknote }[] = [
  { key: "cash", icon: Banknote },
  { key: "card", icon: CreditCard },
  { key: "online", icon: Smartphone },
];

/** MG-08 / OW-15 — end-of-day reconciliation for one branch and one date. */
export function DayClosingTab({ state, setState }: { state: ShiftsUrlState; setState: SetShiftsUrlState }) {
  const { account, branches, singleBranchId, isLocked } = useBranchScope();
  const today = toDateKey(serverNow());
  const branchId = !isLocked && branches.some((b) => b.id === state.branch) ? state.branch : singleBranchId;
  const date = state.date && state.date <= today ? state.date : today;
  const { data, isLoading, error, refetch, isFetching, isRefetching } = useDayClosing(branchId, date);

  const setDate = (d: string) => setState({ date: d === today ? "" : d }, { resetPage: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3 shadow-soft sm:flex-row sm:flex-wrap sm:items-center">
        {!isLocked && branches.length > 1 ? (
          <SelectFilter
            aria-label="الفرع"
            icon={<Store className="size-4" />}
            value={branchId}
            onChange={(branch) => setState({ branch }, { resetPage: false })}
            options={branches.map((b) => ({ value: b.id, label: b.name.ar }))}
            className="min-w-52"
          />
        ) : (
          <span className="flex items-center gap-2 text-sm font-medium">
            <Store className="size-4 text-muted-foreground" /> {data?.branchName.ar ?? branches.find((b) => b.id === branchId)?.name.ar}
          </span>
        )}
        <div className="flex items-center gap-1.5 sm:ms-auto">
          <Button variant="outline" size="icon-lg" aria-label="اليوم السابق" onClick={() => setDate(shiftDateKey(date, -1))}>
            <ChevronRight />
          </Button>
          <input
            type="date"
            aria-label="تاريخ الإغلاق"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="num h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
          <Button variant="outline" size="icon-lg" aria-label="اليوم التالي" disabled={date >= today} onClick={() => setDate(shiftDateKey(date, 1))}>
            <ChevronLeft />
          </Button>
          {date !== today ? (
            <Button variant="ghost" size="lg" onClick={() => setDate(today)}>
              اليوم
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground sm:basis-full">
          {formatDate(fromDateKey(date), { withDay: true, withYear: true })}
          {date === today ? " — اليوم" : ""}
        </p>
      </div>

      {isLoading ? (
        <DayClosingSkeleton />
      ) : error || !data ? (
        <SectionCard>
          <ErrorState message={error?.message} onRetry={() => refetch()} isRetrying={isRefetching} />
        </SectionCard>
      ) : (
        <div className={cn("space-y-6 transition-opacity", isFetching && "opacity-70")}>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatTile label="طلبات مكتملة" icon={<ClipboardList />} value={formatNumber(data.completedOrders)} hint={`المدفوع المتوقع ${formatMoney(data.expected.total)}`} />
            <StatTile label="نقدي متوقع" icon={<Banknote />} tone={TONES.success} value={formatMoney(data.expected.cash)} />
            <StatTile label="بطاقة متوقع" icon={<CreditCard />} tone={TONES.primary} value={formatMoney(data.expected.card)} />
            <StatTile label="أونلاين متوقع" icon={<Smartphone />} tone={TONES.aqua} value={formatMoney(data.expected.online)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {data.closing ? (
                <ClosingReport closing={data.closing} summary={data} businessName={account?.businessName.ar ?? ""} />
              ) : (
                <>
                  <Blockers summary={data} />
                  {account?.permissions.closeShift ? (
                    <CloseDayForm key={`${branchId}-${date}`} summary={data} />
                  ) : (
                    <SectionCard>
                      <p className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Info className="mt-0.5 size-4 shrink-0" /> لم يُغلق هذا اليوم بعد. إغلاق اليوم يحتاج صلاحية «تقفيل الورديات وإغلاق اليوم».
                      </p>
                    </SectionCard>
                  )}
                </>
              )}
            </div>
            <DayOrders summary={data} />
          </div>

          <ClosingHistory summary={data} currentDate={date} onPick={setDate} />
        </div>
      )}
    </div>
  );
}

function DayClosingSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="جاري التحميل">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[98px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}

// ── Blockers ────────────────────────────────────────────────

function Blockers({ summary }: { summary: DayClosingSummary }) {
  if (!summary.inServiceOrders && !summary.unpaidOrders) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-semibold">لا يمكن إغلاق اليوم قبل إنهاء هذه الطلبات</p>
        <ul className="space-y-1 text-muted-foreground">
          {summary.inServiceOrders ? (
            <li>
              <span className="num font-semibold text-foreground">{formatNumber(summary.inServiceOrders)}</span> طلب ما زال في الانتظار أو قيد التنفيذ
            </li>
          ) : null}
          {summary.unpaidOrders ? (
            <li>
              <span className="num font-semibold text-foreground">{formatNumber(summary.unpaidOrders)}</span> طلب مكتمل بدون تحصيل الدفع
            </li>
          ) : null}
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" render={<Link href="/orders?tab=active" />}>
            الطلبات داخل الفرع
          </Button>
          {summary.unpaidOrders ? (
            <Button size="sm" variant="outline" render={<Link href="/orders?tab=payment_pending" />}>
              بانتظار الدفع
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Close form ──────────────────────────────────────────────

const amount = z
  .string()
  .trim()
  .min(1, "أدخل المبلغ (0 إن لم يوجد)")
  .regex(/^\d+(\.\d{1,2})?$/, "رقم غير صحيح");

function buildSchema(expected: MethodTotals) {
  return z
    .object({ cash: amount, card: amount, online: amount, reason: z.string() })
    .superRefine((v, ctx) => {
      const diff = Number(v.cash) + Number(v.card) + Number(v.online) - expected.total;
      if (Math.abs(diff) > 0.001 && v.reason.trim().length < 3) {
        ctx.addIssue({ code: "custom", path: ["reason"], message: "يوجد فرق — اكتب سبب الفرق (3 أحرف على الأقل)" });
      }
    });
}

type CloseValues = z.infer<ReturnType<typeof buildSchema>>;

const toNum = (v: string | undefined) => {
  const n = Number(v);
  return v && !Number.isNaN(n) ? n : 0;
};

function CloseDayForm({ summary }: { summary: DayClosingSummary }) {
  const [confirm, setConfirm] = useState<CloseValues | null>(null);
  const close = useCloseDay(() => setConfirm(null));
  const { expected } = summary;
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CloseValues>({
    resolver: zodResolver(buildSchema(expected)),
    // Card / online are system-verified, cash is counted by hand.
    defaultValues: { cash: "", card: String(expected.card), online: String(expected.online), reason: "" },
  });
  const values = useWatch({ control });
  const actual = { cash: toNum(values.cash), card: toNum(values.card), online: toNum(values.online) };
  const actualTotal = actual.cash + actual.card + actual.online;
  const filled = Boolean(values.cash?.trim());
  const totalDiff = Math.round((actualTotal - expected.total) * 100) / 100;
  const blocked = summary.inServiceOrders + summary.unpaidOrders > 0;
  const lockCount = summary.orders.filter((o) => o.paid).length;

  const onSubmit = handleSubmit((v) => setConfirm(v));

  return (
    <SectionCard icon={<CalendarCheck2 />} title="تسوية نهاية اليوم" description="عدّ النقدي في الصندوق وأدخل المبالغ الفعلية لكل طريقة دفع — الفرق يُحسب مباشرة." flush>
      <form onSubmit={onSubmit} noValidate>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/60 text-xs text-muted-foreground">
                <th scope="col" className="px-5 py-2 text-start font-medium">
                  طريقة الدفع
                </th>
                <th scope="col" className="px-3 py-2 text-end font-medium">
                  المتوقع
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  الفعلي
                </th>
                <th scope="col" className="px-5 py-2 text-end font-medium">
                  الفرق
                </th>
              </tr>
            </thead>
            <tbody>
              {METHODS.map(({ key, icon: Icon }) => {
                const err = errors[key]?.message;
                const typed = Boolean(values[key]?.trim());
                const diff = typed ? Math.round((actual[key] - expected[key]) * 100) / 100 : null;
                return (
                  <tr key={key} className="border-b border-border/60 align-top">
                    <th scope="row" className="px-5 py-3 text-start font-medium">
                      <span className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" /> {PAYMENT_METHOD[key]}
                      </span>
                    </th>
                    <td className="num px-3 py-3 text-end text-muted-foreground">{formatMoney(expected[key])}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          aria-label={`المبلغ الفعلي — ${PAYMENT_METHOD[key]}`}
                          inputMode="decimal"
                          dir="ltr"
                          placeholder="0"
                          {...register(key)}
                          aria-invalid={Boolean(err)}
                          className="num h-9 w-32 rounded-lg border border-input bg-card px-3 text-center font-semibold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 aria-invalid:border-destructive"
                        />
                        <button
                          type="button"
                          onClick={() => setValue(key, String(expected[key]), { shouldValidate: true })}
                          className="cursor-pointer rounded-md px-1.5 py-1 text-[11px] text-primary hover:bg-secondary"
                          title="نسخ المبلغ المتوقع"
                        >
                          = المتوقع
                        </button>
                      </div>
                      {err ? <p className="mt-1 text-[11px] text-destructive">{err}</p> : null}
                    </td>
                    <td className="px-5 py-3 text-end">
                      <DiffValue value={diff} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-semibold">
                <th scope="row" className="px-5 py-3 text-start">
                  الإجمالي
                </th>
                <td className="num px-3 py-3 text-end">{formatMoney(expected.total)}</td>
                <td className="num px-3 py-3">{formatMoney(actualTotal)}</td>
                <td className="px-5 py-3 text-end">
                  <DiffValue value={filled ? totalDiff : null} showLabel />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="space-y-1.5">
            <label htmlFor="close-reason" className="text-xs font-medium">
              سبب الفرق {filled && totalDiff !== 0 ? <span className="text-destructive">*</span> : <span className="text-muted-foreground">(مطلوب فقط عند وجود فرق)</span>}
            </label>
            <Textarea
              id="close-reason"
              rows={2}
              {...register("reason")}
              aria-invalid={Boolean(errors.reason)}
              placeholder="مثال: عجز وردية … — تم إبلاغ المالك"
              className="resize-none"
            />
            {errors.reason?.message ? (
              <p role="alert" className="text-xs text-destructive">
                {errors.reason.message}
              </p>
            ) : null}
          </div>

          <p className="flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            الإغلاق يقفل <span className="num font-semibold text-foreground">{formatNumber(lockCount)}</span> طلب مدفوع لهذا اليوم — لا يمكن بعده تعديل أسعارها أو استردادها (الملاحظات فقط). لا يمكن التراجع عن الإغلاق.
          </p>

          <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
            {blocked ? <p className="text-xs text-warning sm:me-auto">أنهِ الطلبات المفتوحة وحصّل المدفوعات أولًا.</p> : null}
            <Button type="submit" size="lg" disabled={blocked}>
              <Lock /> إغلاق اليوم
            </Button>
          </div>
        </div>
      </form>

      <Dialog open={Boolean(confirm)} onOpenChange={(o) => !close.isPending && !o && setConfirm(null)}>
        <DialogContent className="gap-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">تأكيد إغلاق يوم {formatDate(fromDateKey(summary.date), { withDay: true })}</DialogTitle>
            <DialogDescription>{summary.branchName.ar} — بعد الإغلاق تُقفل طلبات اليوم المدفوعة ولا يمكن التراجع.</DialogDescription>
          </DialogHeader>
          {confirm ? (
            <dl className="space-y-2 rounded-xl bg-muted/50 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">المتوقع</dt>
                <dd className="num font-medium">{formatMoney(expected.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">الفعلي</dt>
                <dd className="num font-medium">{formatMoney(toNum(confirm.cash) + toNum(confirm.card) + toNum(confirm.online))}</dd>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-2">
                <dt className="font-semibold">الفرق</dt>
                <dd>
                  <DiffValue value={Math.round((toNum(confirm.cash) + toNum(confirm.card) + toNum(confirm.online) - expected.total) * 100) / 100} showLabel />
                </dd>
              </div>
              {confirm.reason.trim() ? (
                <div className="border-t border-border/60 pt-2 text-xs">
                  <dt className="text-muted-foreground">السبب</dt>
                  <dd className="mt-0.5">{confirm.reason.trim()}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-border/60 pt-2 text-xs">
                <dt className="text-muted-foreground">طلبات ستُقفل</dt>
                <dd className="num font-semibold">{formatNumber(lockCount)}</dd>
              </div>
            </dl>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={close.isPending}>
              رجوع
            </Button>
            <Button
              loading={close.isPending}
              onClick={() =>
                confirm &&
                close.mutate({
                  branchId: summary.branchId,
                  date: summary.date,
                  actual: { cash: toNum(confirm.cash), card: toNum(confirm.card), online: toNum(confirm.online) },
                  reason: confirm.reason.trim() || undefined,
                })
              }
            >
              تأكيد الإغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

// ── Closing report (printable) ──────────────────────────────

const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #day-closing-report, #day-closing-report * { visibility: visible !important; }
  #day-closing-report { position: absolute; inset-inline: 0; top: 0; border: 0 !important; box-shadow: none !important; }
}`;

function ClosingReport({ closing, summary, businessName }: { closing: DayClosing; summary: DayClosingSummary; businessName: string }) {
  const matched = closing.difference === 0;
  return (
    <section id="day-closing-report" className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-border px-6 py-5">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{businessName}</p>
          <h2 className="text-lg font-bold">تقرير إغلاق اليوم</h2>
          <p className="text-sm text-muted-foreground">
            {summary.branchName.ar} · {formatDate(fromDateKey(closing.date), { withDay: true, withYear: true })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={matched ? "مطابق" : closing.difference < 0 ? "عجز" : "زيادة"} tone={matched ? TONES.success : closing.difference < 0 ? TONES.danger : TONES.warning} />
          <Button variant="outline" size="lg" className="print:hidden" onClick={() => window.print()}>
            <Printer /> طباعة
          </Button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <th scope="col" className="px-6 py-2 text-start font-medium">
              طريقة الدفع
            </th>
            <th scope="col" className="px-3 py-2 text-end font-medium">
              المتوقع
            </th>
            <th scope="col" className="px-3 py-2 text-end font-medium">
              الفعلي
            </th>
            <th scope="col" className="px-6 py-2 text-end font-medium">
              الفرق
            </th>
          </tr>
        </thead>
        <tbody>
          {METHODS.map(({ key, icon: Icon }) => (
            <tr key={key} className="border-b border-border/60">
              <th scope="row" className="px-6 py-2.5 text-start font-medium">
                <span className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" /> {PAYMENT_METHOD[key]}
                </span>
              </th>
              <td className="num px-3 py-2.5 text-end">{formatMoney(closing.expected[key])}</td>
              <td className="num px-3 py-2.5 text-end">{formatMoney(closing.actual[key])}</td>
              <td className="px-6 py-2.5 text-end">
                <DiffValue value={Math.round((closing.actual[key] - closing.expected[key]) * 100) / 100} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/30 text-base font-bold">
            <th scope="row" className="px-6 py-3 text-start">
              الإجمالي
            </th>
            <td className="num px-3 py-3 text-end">{formatMoney(closing.expected.total)}</td>
            <td className="num px-3 py-3 text-end">{formatMoney(closing.actual.total)}</td>
            <td className={cn("px-6 py-3 text-end", diffTone(closing.difference))}>
              <DiffValue value={closing.difference} />
            </td>
          </tr>
        </tfoot>
      </table>

      <dl className="grid gap-x-6 gap-y-4 px-6 py-5 text-sm sm:grid-cols-2">
        {closing.reason ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">سبب الفرق</dt>
            <dd className="mt-1 font-medium">{closing.reason}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs text-muted-foreground">أغلقه</dt>
          <dd className="mt-1 font-medium">{closing.closedByName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">وقت الإغلاق</dt>
          <dd className="num mt-1 font-medium">{formatDateTime(closing.closedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">طلبات مكتملة</dt>
          <dd className="num mt-1 font-medium">{formatNumber(summary.completedOrders)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">طلبات مقفلة</dt>
          <dd className="num mt-1 flex items-center gap-1.5 font-medium">
            <Lock className="size-3.5 text-muted-foreground" /> {formatNumber(closing.ordersLocked)}
          </dd>
        </div>
      </dl>
      <p className="border-t border-dashed border-border px-6 py-3 text-[11px] text-muted-foreground">
        تم إغلاق هذا اليوم — طلباته المدفوعة مقفلة ولا يمكن تعديلها. رقم الإغلاق <span className="num">{closing.id}</span>
      </p>
    </section>
  );
}

// ── Day's orders ────────────────────────────────────────────

function DayOrders({ summary }: { summary: DayClosingSummary }) {
  return (
    <SectionCard icon={<Receipt />} title="طلبات اليوم المكتملة" description={`${formatNumber(summary.orders.length)} طلب — المدفوع منها يدخل في التسوية`} flush className="self-start">
      {summary.orders.length ? (
        <ul className="max-h-[480px] divide-y divide-border/60 overflow-y-auto border-t border-border/60">
          {summary.orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className={cn("flex items-center justify-between gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-muted/50", !o.paid && "bg-warning/5")}>
                <span className="min-w-0">
                  <span className="num block font-medium">{o.number}</span>
                  <span className="num text-[11px] text-muted-foreground">
                    {o.plate || "—"} · {o.method ? PAYMENT_METHOD[o.method] : "لم يُحدد"}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="num font-semibold">{formatMoney(o.total)}</span>
                  {!o.paid ? <StatusBadge label="غير مدفوع" tone={TONES.warning} size="sm" /> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<CircleDollarSign />} title="لا توجد طلبات مكتملة في هذا اليوم" description="تظهر هنا الطلبات بعد إنهاء الخدمة." className="border-t border-border/60 py-10" />
      )}
    </SectionCard>
  );
}

// ── History ─────────────────────────────────────────────────

function ClosingHistory({ summary, currentDate, onPick }: { summary: DayClosingSummary; currentDate: string; onPick: (date: string) => void }) {
  const columns: DataTableColumn<DayClosing>[] = [
    { key: "date", header: "اليوم", cell: (c) => <span className="font-medium">{formatDate(fromDateKey(c.date), { withDay: true })}</span> },
    { key: "expected", header: "المتوقع", align: "end", cell: (c) => <span className="num">{formatMoney(c.expected.total)}</span> },
    { key: "actual", header: "الفعلي", align: "end", cell: (c) => <span className="num font-medium">{formatMoney(c.actual.total)}</span> },
    { key: "difference", header: "الفرق", align: "end", cell: (c) => <DiffValue value={c.difference} /> },
    { key: "reason", header: "السبب", hideBelow: "lg", cell: (c) => (c.reason ? <span className="line-clamp-1 max-w-64 text-xs">{c.reason}</span> : <span className="text-xs text-muted-foreground">—</span>) },
    { key: "locked", header: "طلبات مقفلة", align: "end", hideBelow: "md", cell: (c) => <span className="num text-xs">{formatNumber(c.ordersLocked)}</span> },
    {
      key: "closedBy",
      header: "أغلقه",
      hideBelow: "md",
      cell: (c) => (
        <span className="text-xs">
          {c.closedByName}
          <span className="num block text-[11px] text-muted-foreground">{formatDateTime(c.closedAt)}</span>
        </span>
      ),
    },
  ];
  return (
    <SectionCard icon={<History />} title="آخر الإغلاقات" description="اضغط على يوم لعرض تقرير إغلاقه" flush>
      <DataTable
        columns={columns}
        rows={summary.history}
        rowKey={(c) => c.id}
        onRowClick={(c) => onPick(c.date)}
        rowClassName={(c) => (c.date === currentDate ? "bg-secondary/50" : undefined)}
        empty={{ icon: <History />, title: "لا توجد إغلاقات سابقة لهذا الفرع", description: "يظهر هنا كل يوم بعد إغلاقه." }}
        className="border-t border-border/60"
      />
    </SectionCard>
  );
}
