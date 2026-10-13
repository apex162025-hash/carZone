"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMarkPayoutPaid } from "@/hooks/use-finance";
import { formatDate, formatMoney } from "@/lib/format";
import type { PayoutListItem } from "@/types/finance";

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildSchema(remaining: number) {
  return z.object({
    amount: z
      .string()
      .trim()
      .refine((v) => v !== "" && Number.isFinite(Number(v)) && Number(v) > 0, "أدخل مبلغًا صحيحًا أكبر من صفر")
      .refine((v) => Number(v) <= remaining, `المبلغ لا يتجاوز المتبقي (${formatMoney(remaining)})`),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "اختر تاريخ الدفع")
      .refine((v) => v <= todayLocal(), "لا يمكن أن يكون تاريخ الدفع في المستقبل"),
    reference: z.string().trim().min(4, "أدخل مرجع التحويل (4 أحرف على الأقل)"),
  });
}

type Values = z.infer<ReturnType<typeof buildSchema>>;

type MarkPayoutPaidDialogProps = {
  payout: PayoutListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * AD-39 "Mark as paid": the amount entered is what is being paid now; the
 * total sent to the API is cumulative (already paid + this payment), so a
 * full payment settles the wash's related transactions.
 */
export function MarkPayoutPaidDialog({ payout, open, onOpenChange }: MarkPayoutPaidDialogProps) {
  const remaining = payout ? Math.max(0, payout.amountDue - payout.amountPaid) : 0;
  const schema = useMemo(() => buildSchema(remaining), [remaining]);
  const markPaid = useMarkPayoutPaid(() => onOpenChange(false));
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const amount = Number(useWatch({ control, name: "amount" }) ?? 0);

  useEffect(() => {
    if (open && payout) {
      reset({ amount: String(Math.max(0, payout.amountDue - payout.amountPaid)), date: todayLocal(), reference: "" });
    }
  }, [open, payout, reset]);

  if (!payout) return null;

  const onSubmit = handleSubmit((v) =>
    markPaid.mutate({
      id: payout.id,
      amountPaid: payout.amountPaid + Number(v.amount),
      reference: v.reference.trim(),
      date: new Date(`${v.date}T12:00:00`).toISOString(),
    }),
  );

  const validAmount = Number.isFinite(amount) && amount > 0 && amount <= remaining;
  const leftAfter = remaining - (validAmount ? amount : 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !markPaid.isPending && onOpenChange(o)}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
              <Wallet className="size-5" />
            </span>
            <div className="space-y-1.5 pt-0.5">
              <DialogTitle className="text-base font-semibold">تسجيل دفع لـ {payout.businessName.ar}</DialogTitle>
              <DialogDescription>
                عن الفترة <span className="num">{formatDate(payout.periodStart)} – {formatDate(payout.periodEnd, { withYear: true })}</span>. السداد
                الكامل يُسوّي معاملات المغسلة المدفوعة حتى نهاية الفترة.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <dl className="grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3 text-xs">
          <div>
            <dt className="text-muted-foreground">المستحق</dt>
            <dd className="num mt-0.5 text-sm font-semibold">{formatMoney(payout.amountDue)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">مدفوع سابقًا</dt>
            <dd className="num mt-0.5 text-sm font-semibold">{formatMoney(payout.amountPaid)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">المتبقي</dt>
            <dd className="num mt-0.5 text-sm font-semibold text-warning">{formatMoney(remaining)}</dd>
          </div>
        </dl>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="payout-amount" className="text-xs font-medium">
                المبلغ المدفوع الآن (ج.م)
              </label>
              <Input
                id="payout-amount"
                inputMode="decimal"
                aria-invalid={Boolean(errors.amount)}
                className="num h-9"
                {...register("amount")}
              />
              {errors.amount ? (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              ) : (
                <p className="num text-[11px] text-muted-foreground">
                  {leftAfter > 0 ? `دفعة جزئية — يتبقى ${formatMoney(leftAfter)}` : "سداد كامل للمستحق"}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="payout-date" className="text-xs font-medium">
                تاريخ الدفع
              </label>
              <Input id="payout-date" type="date" max={todayLocal()} aria-invalid={Boolean(errors.date)} className="num h-9" {...register("date")} />
              {errors.date ? <p className="text-xs text-destructive">{errors.date.message}</p> : null}
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="payout-reference" className="text-xs font-medium">
              مرجع التحويل
            </label>
            <Input
              id="payout-reference"
              dir="ltr"
              placeholder="TRX-00000"
              aria-invalid={Boolean(errors.reference)}
              className="num h-9 text-start"
              {...register("reference")}
            />
            {errors.reference ? <p className="text-xs text-destructive">{errors.reference.message}</p> : null}
          </div>
          <DialogFooter className="-mx-4 -mb-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={markPaid.isPending}>
              إلغاء
            </Button>
            <Button type="submit" loading={markPaid.isPending}>
              تسجيل الدفع
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
