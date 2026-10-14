"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle2, ClipboardList, Flag, History, Info, Lock, Receipt } from "lucide-react";

import { AuditTrail } from "@carzen/ui/components/shared/audit-trail";
import { InfoList } from "@carzen/ui/components/shared/info-list";
import { EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import { Button } from "@carzen/ui/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@carzen/ui/components/ui/sheet";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { Textarea } from "@carzen/ui/components/ui/textarea";
import { PAYMENT_METHOD, SHIFT_STATUS, TONES } from "@carzen/ui/lib/constants/labels";
import { formatDate, formatMoney, formatNumber, formatTime } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { DiffValue, timeRange } from "@/components/modules/Shifts/shift-utils";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useReviewShift, useShift, useStaff } from "@/hooks/use-team";
import type { ShiftDetails } from "@/lib/services/team.service";

export function ShiftDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(id)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="gap-0 p-0 data-[side=left]:w-full data-[side=left]:sm:max-w-xl">
        {id ? <ShiftDetailBody id={id} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function Metric({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5", className)}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="num mt-1 text-base font-bold">{children}</div>
    </div>
  );
}

function ShiftDetailBody({ id }: { id: string }) {
  const { data, isLoading, error, refetch, isRefetching } = useShift(id);
  const { branchId } = useBranchScope();
  const roster = useStaff({ branchId, role: "all", period: "today" });
  const actorNames = Object.fromEntries((roster.data?.items ?? []).map((m) => [m.id, m.name]));

  if (isLoading) {
    return (
      <div className="space-y-4 p-5" aria-busy aria-label="جاري التحميل">
        <SheetTitle className="sr-only">تفاصيل الوردية</SheetTitle>
        <Skeleton className="h-12 w-2/3" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <>
        <SheetTitle className="sr-only">تفاصيل الوردية</SheetTitle>
        <ErrorState message={error?.message} onRetry={() => refetch()} isRetrying={isRefetching} className="h-full" />
      </>
    );
  }

  const { shift, orders, auditLogs } = data;
  const ordersTotal = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b px-5 py-4">
        <div className="flex items-start gap-3 pe-8">
          <UserAvatar name={shift.staffName} size="md" />
          <div className="min-w-0 flex-1 space-y-1">
            <SheetTitle className="text-lg font-bold">وردية {shift.staffName}</SheetTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge meta={SHIFT_STATUS[shift.status]} size="sm" live={shift.status === "open"} />
              {(shift.difference ?? 0) !== 0 ? <StatusBadge label="فيها فرق" tone={TONES.danger} size="sm" /> : null}
            </div>
            <SheetDescription className="text-xs">
              {formatDate(shift.scheduledStart, { withDay: true })} · {shift.branchName.ar}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="النقدي المتوقع">{formatMoney(shift.expectedCash)}</Metric>
          <Metric label="النقدي الفعلي">{shift.actualCash !== null ? formatMoney(shift.actualCash) : <span className="text-sm font-normal text-muted-foreground">لم يُسلَّم</span>}</Metric>
          <Metric
            label="الفرق"
            className={cn((shift.difference ?? 0) < 0 && "border-destructive/30 bg-destructive/5", (shift.difference ?? 0) > 0 && "border-warning/30 bg-warning/5")}
          >
            <DiffValue value={shift.difference} />
          </Metric>
          <Metric label="طلبات مكتملة">{formatNumber(shift.ordersCompleted)}</Metric>
        </div>

        <InfoList
          items={[
            { label: "الوقت المجدول", value: <span className="num">{timeRange(shift.scheduledStart, shift.scheduledEnd)}</span> },
            { label: "الوقت الفعلي", value: <span className="num">{timeRange(shift.actualStart, shift.actualEnd)}</span> },
            { label: "مدفوعات نقدية", value: <span className="num">{formatMoney(shift.cashPayments)}</span> },
            { label: "مدفوعات بطاقة", value: <span className="num">{formatMoney(shift.cardPayments)}</span> },
            ...(shift.reason ? [{ label: "سبب الفرق (من الموظف)", value: shift.reason, full: true }] : []),
            ...(shift.reviewNote
              ? [{ label: `ملاحظة المراجعة${shift.reviewedBy ? ` — ${shift.reviewedBy}` : ""}`, value: shift.reviewNote, full: true }]
              : []),
          ]}
        />

        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Receipt className="size-4 text-muted-foreground" /> طلبات الوردية
            <span className="num text-xs font-normal text-muted-foreground">({formatNumber(orders.length)})</span>
          </h3>
          {orders.length ? (
            <div className="overflow-hidden rounded-xl border border-border/70">
              <ul className="max-h-72 divide-y divide-border/60 overflow-y-auto">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50">
                      <span className="min-w-0">
                        <span className="num block font-medium">{o.number}</span>
                        <span className="num text-[11px] text-muted-foreground">
                          {o.plate || "—"} · {formatTime(o.at)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{o.method ? PAYMENT_METHOD[o.method] : "—"}</span>
                        <StatusBadge label={o.paid ? "مدفوع" : "غير مدفوع"} tone={o.paid ? TONES.success : TONES.warning} size="sm" />
                        <span className="num w-20 text-end font-semibold">{formatMoney(o.total)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-3 py-2 text-xs">
                <span className="text-muted-foreground">الإجمالي</span>
                <span className="num font-semibold">{formatMoney(ordersTotal)}</span>
              </div>
            </div>
          ) : (
            <EmptyState icon={<Receipt />} title="لا توجد طلبات مكتملة في هذه الوردية" className="rounded-xl border border-dashed py-6" />
          )}
        </section>

        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <History className="size-4 text-muted-foreground" /> سجل التدقيق
          </h3>
          <AuditTrail logs={auditLogs} actorNames={actorNames} emptyText="لم تتم مراجعة هذه الوردية بعد" />
        </section>
      </div>

      <ReviewPanel details={data} />
    </div>
  );
}

const reviewSchema = z.object({ note: z.string().trim().min(1, "اكتب ملاحظة المراجعة").min(3, "الملاحظة 3 أحرف على الأقل") });
type ReviewValues = z.infer<typeof reviewSchema>;

const NOTE_CHIPS = ["تمت المطابقة", "تم تحصيل العجز من الموظف", "الفرق مبرر", "يحتاج متابعة مع المالك"];

/** MG-07: mark Reviewed / Flagged with a note. Running shifts can't be reviewed. */
function ReviewPanel({ details }: { details: ShiftDetails }) {
  const { account } = useBranchScope();
  const { shift } = details;
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<ReviewValues>({ resolver: zodResolver(reviewSchema), defaultValues: { note: "" } });
  const review = useReviewShift(() => reset({ note: "" }));

  if (shift.status === "open") {
    return (
      <p className="flex items-start gap-2 border-t bg-muted/50 px-5 py-4 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        الوردية ما زالت جارية — تتم المراجعة بعد أن يقفل الموظف ورديته ويسلّم النقدي من التطبيق.
      </p>
    );
  }
  if (!account?.permissions.closeShift) {
    return (
      <p className="flex items-start gap-2 border-t bg-muted/50 px-5 py-4 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" /> مراجعة الورديات تحتاج صلاحية «تقفيل الورديات وإغلاق اليوم».
      </p>
    );
  }

  const submit = (status: "reviewed" | "flagged") => handleSubmit((v) => review.mutate({ id: shift.id, status, note: v.note.trim() }))();
  const busy = (status: "reviewed" | "flagged") => review.isPending && review.variables?.status === status;

  return (
    <form
      className="space-y-3 border-t bg-card px-5 py-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit("reviewed");
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="review-note" className="flex items-center gap-1.5 text-xs font-medium">
          <ClipboardList className="size-3.5" />
          {shift.status === "submitted" ? "ملاحظة المراجعة" : "تحديث المراجعة"} <span className="text-destructive">*</span>
        </label>
        {shift.status !== "submitted" ? <span className="text-[11px] text-muted-foreground">الحالة الحالية: {SHIFT_STATUS[shift.status].label}</span> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {NOTE_CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              const cur = getValues("note").trim();
              setValue("note", cur ? `${cur}، ${c}` : c, { shouldValidate: Boolean(errors.note) });
            }}
            className="cursor-pointer rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-muted"
          >
            {c}
          </button>
        ))}
      </div>
      <Textarea id="review-note" rows={2} {...register("note")} aria-invalid={Boolean(errors.note)} placeholder="ماذا راجعت؟ وما الإجراء المتخذ في حالة الفرق؟" className="resize-none" />
      {errors.note?.message ? (
        <p role="alert" className="text-xs text-destructive">
          {errors.note.message}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" size="lg" variant="destructive" loading={busy("flagged")} disabled={review.isPending} onClick={() => void submit("flagged")}>
          {!busy("flagged") ? <Flag /> : null} تمييز للمتابعة
        </Button>
        <Button type="submit" size="lg" loading={busy("reviewed")} disabled={review.isPending} className="bg-success text-white hover:bg-success/90">
          {!busy("reviewed") ? <CheckCircle2 /> : null} تمت المراجعة
        </Button>
      </div>
    </form>
  );
}
