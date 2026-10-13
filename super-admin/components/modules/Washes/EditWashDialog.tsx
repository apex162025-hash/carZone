"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LockOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateWash } from "@/hooks/use-washes";
import type { Business } from "@/types/washes";

const schema = z.object({
  nameAr: z.string().trim().min(2, "الاسم بالعربية مطلوب"),
  nameEn: z.string().trim().min(2, "الاسم بالإنجليزية مطلوب"),
  ownerName: z.string().trim().min(3, "اسم المالك مطلوب"),
  commission: z
    .string()
    .trim()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 30), "بين 0 و 30٪ أو اتركه فارغًا"),
  reason: z.string().trim().min(5, "اكتب سبب التعديل (5 أحرف على الأقل)"),
});

type Values = z.infer<typeof schema>;

type EditWashDialogProps = {
  business: Business;
  defaultCommission: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * AD-24 "Edit as admin": business-owned data is read-only by default; editing
 * requires a documented reason and old → new values land in the audit log.
 */
export function EditWashDialog({ business, defaultCommission, open, onOpenChange }: EditWashDialogProps) {
  const update = useUpdateWash(business.id);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({
        nameAr: business.name.ar,
        nameEn: business.name.en,
        ownerName: business.ownerName,
        commission: business.commissionRate === null ? "" : String(business.commissionRate),
        reason: "",
      });
    }
  }, [open, business, reset]);

  const onSubmit = handleSubmit((v) =>
    update.mutate(
      {
        reason: v.reason,
        patch: {
          name: { ar: v.nameAr, en: v.nameEn },
          ownerName: v.ownerName,
          commissionRate: v.commission === "" ? null : Number(v.commission),
        },
      },
      { onSuccess: () => onOpenChange(false) },
    ),
  );

  const field = (id: keyof Values, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <Input id={id} aria-invalid={Boolean(errors[id])} className="h-9" {...register(id)} {...props} />
      {errors[id] ? <p className="text-xs text-destructive">{errors[id]?.message}</p> : null}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !update.isPending && onOpenChange(o)}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <LockOpen className="size-5" />
            </span>
            <div className="space-y-1.5 pt-0.5">
              <DialogTitle className="text-base font-semibold">تعديل كمسؤول</DialogTitle>
              <DialogDescription>هذه بيانات تملكها المغسلة. أي تعديل يُسجل بالقيمة القديمة والجديدة وسببه في سجل التدقيق.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("nameAr", "الاسم (عربي)")}
            {field("nameEn", "الاسم (English)", { dir: "ltr" })}
            {field("ownerName", "اسم المالك", { dir: "ltr" })}
            {field("commission", `عمولة خاصة ٪ (الافتراضي ${defaultCommission}٪)`, { inputMode: "decimal", placeholder: "افتراضي", className: "num h-9" })}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reason" className="text-xs font-medium">
              سبب التعديل
            </label>
            <Textarea id="reason" rows={3} aria-invalid={Boolean(errors.reason)} className="resize-none" placeholder="مثال: تصحيح اسم المغسلة بناءً على السجل التجاري" {...register("reason")} />
            {errors.reason ? <p className="text-xs text-destructive">{errors.reason.message}</p> : null}
          </div>
          <DialogFooter className="-mx-4 -mb-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
              إلغاء
            </Button>
            <Button type="submit" loading={update.isPending}>
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
