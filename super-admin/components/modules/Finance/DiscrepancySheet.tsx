"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowLeftRight, CheckCircle2, ExternalLink, FileText, ScanSearch, UserRound } from "lucide-react";

import { AuditTrail } from "@/components/shared/audit-trail";
import { InfoList } from "@/components/shared/info-list";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useResolveDiscrepancy, useTransaction } from "@/hooks/use-finance";
import { PAYMENT_METHOD, TRANSACTION_STATUS } from "@/lib/constants/labels";
import { formatDateTime, formatMoney, formatPercent } from "@/lib/format";

const schema = z.object({
  note: z.string().trim().min(5, "اكتب ملاحظة المراجعة (5 أحرف على الأقل)"),
});

type Values = z.infer<typeof schema>;

type DiscrepancySheetProps = {
  transactionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * AD-40: booking invoice vs cashier collection side by side, the difference,
 * the audit trail, and "mark as reviewed" with a mandatory note.
 */
export function DiscrepancySheet({ transactionId, open, onOpenChange }: DiscrepancySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        {transactionId ? <DiscrepancyBody key={transactionId} id={transactionId} onDone={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function AmountCard({
  icon,
  title,
  amount,
  tone,
  children,
}: {
  icon: ReactNode;
  title: string;
  amount: number;
  tone: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span
          style={{ "--tone": tone } as CSSProperties}
          className="tone-soft flex size-7 items-center justify-center rounded-lg [&_svg]:size-3.5"
        >
          {icon}
        </span>
        {title}
      </p>
      <p className="num mt-3 text-2xl font-bold tracking-tight">{formatMoney(amount, { decimals: true })}</p>
      <dl className="mt-3 space-y-2 border-t border-border/60 pt-3 text-xs">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-end font-medium">{children}</dd>
    </div>
  );
}

function DiscrepancyBody({ id, onDone }: { id: string; onDone: () => void }) {
  const { data, isLoading, error, refetch, isRefetching } = useTransaction(id);
  const resolve = useResolveDiscrepancy(id, onDone);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { note: "" } });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4" aria-busy aria-label="جاري تحميل المعاملة">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <>
        <SheetHeader className="pe-12">
          <SheetTitle className="font-semibold">التحقيق في الفرق</SheetTitle>
        </SheetHeader>
        <ErrorState message={error?.message} onRetry={() => refetch()} isRetrying={isRefetching} />
      </>
    );
  }

  const { transaction: t } = data;
  const flagged = t.flag === "discrepancy";
  const diff = data.difference;
  const diffTone = diff < 0 ? "var(--destructive)" : diff > 0 ? "var(--warning)" : "var(--success)";
  const diffLabel = diff < 0 ? "نقص في التحصيل" : diff > 0 ? "زيادة في التحصيل" : "المبالغ متطابقة";
  const method = t.paymentMethod ? PAYMENT_METHOD[t.paymentMethod] : "—";

  const onSubmit = handleSubmit((v) => resolve.mutate(v.note));

  return (
    <>
      <SheetHeader className="border-b border-border/60 pe-12">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
            <ScanSearch className="size-5" />
          </span>
          <div className="min-w-0 space-y-1 pt-0.5">
            <SheetTitle className="font-semibold">التحقيق في الفرق</SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="num font-medium text-foreground">{t.orderNumber}</span>
              <span>·</span>
              <span>{t.businessName.ar}</span>
              <span>·</span>
              <span className="num">{formatDateTime(t.date)}</span>
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <AmountCard icon={<FileText />} title="فاتورة الحجز" amount={data.orderTotal} tone="var(--primary)">
            <Row label="رقم الحجز">
              <Link href={`/orders/${t.orderId}`} className="num text-primary hover:underline">
                {t.orderNumber}
              </Link>
            </Row>
            <Row label="المغسلة">{t.businessName.ar}</Row>
            <Row label="طريقة الدفع">{method}</Row>
            <Row label="تاريخ المعاملة">
              <span className="num">{formatDateTime(t.date)}</span>
            </Row>
          </AmountCard>
          <AmountCard icon={<UserRound />} title="تحصيل الكاشير" amount={data.collected} tone={diffTone}>
            <Row label="الكاشير">{data.cashier ?? "—"}</Row>
            <Row label="وقت التحصيل">{data.collectedAt ? <span className="num">{formatDateTime(data.collectedAt)}</span> : "—"}</Row>
            <Row label="طريقة التحصيل">{method}</Row>
            <Row label="حالة المعاملة">
              <StatusBadge meta={TRANSACTION_STATUS[t.status]} size="sm" />
            </Row>
          </AmountCard>
        </div>

        <div
          style={{ "--tone": diffTone } as CSSProperties}
          className="tone-soft flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
          role="status"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeftRight className="size-4" />
            {diffLabel}
          </span>
          <span className="num text-lg font-bold" dir="ltr">
            {diff > 0 ? "+" : ""}
            {formatMoney(diff, { decimals: true })}
          </span>
        </div>

        {!flagged ? (
          <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/5 p-4">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
            <div className="text-sm">
              <p className="font-semibold text-success">تمت مراجعة هذا الفرق</p>
              {t.reviewNote ? <p className="mt-0.5 text-muted-foreground">{t.reviewNote}</p> : null}
            </div>
          </div>
        ) : null}

        <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
          <h3 className="mb-3 text-sm font-semibold">تفاصيل المعاملة</h3>
          <InfoList
            columns={3}
            items={[
              { label: "القيمة الإجمالية", value: <span className="num">{formatMoney(t.gross)}</span> },
              { label: "نسبة العمولة", value: <span className="num">{formatPercent(t.commissionRate)}</span> },
              { label: "عمولة المنصة", value: <span className="num">{formatMoney(t.commission, { decimals: true })}</span> },
              { label: "صافي المغسلة", value: <span className="num">{formatMoney(t.netToWash, { decimals: true })}</span> },
              { label: "رقم المعاملة", value: <span className="num text-xs">{t.id}</span> },
            ]}
          />
        </section>

        <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
          <h3 className="mb-3 text-sm font-semibold">سجل التدقيق</h3>
          <AuditTrail logs={data.auditLogs} emptyText="لا توجد إجراءات مسجلة على هذه المعاملة" />
        </section>
      </div>

      <div className="border-t border-border/60 bg-popover p-4">
        {flagged ? (
          <form onSubmit={onSubmit} className="space-y-3" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="review-note" className="text-xs font-medium">
                ملاحظة المراجعة (تُسجل في سجل التدقيق)
              </label>
              <Textarea
                id="review-note"
                rows={2}
                aria-invalid={Boolean(errors.note)}
                className="min-h-16 resize-none"
                placeholder="مثال: تم التواصل مع الكاشير وتحصيل باقي المبلغ نقدًا"
                {...register("note")}
              />
              {errors.note ? <p className="text-xs text-destructive">{errors.note.message}</p> : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" render={<Link href={`/orders/${t.orderId}`} />}>
                <ExternalLink />
                فتح الحجز
              </Button>
              <Button type="submit" loading={resolve.isPending}>
                {!resolve.isPending ? <CheckCircle2 /> : null}
                تعليم كمُراجع
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end">
            <Button variant="outline" render={<Link href={`/orders/${t.orderId}`} />}>
              <ExternalLink />
              فتح الحجز
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
