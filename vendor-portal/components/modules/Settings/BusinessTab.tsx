"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Building2, Lock, ShieldCheck } from "lucide-react";

import { SaveReasonDialog, SettingsSaveBar } from "@/components/modules/Settings/SettingsSaveBar";
import { InfoList } from "@carzen/ui/components/shared/info-list";
import { SectionCard } from "@carzen/ui/components/shared/section-card";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { Input } from "@carzen/ui/components/ui/input";
import { BUSINESS_STATUS } from "@carzen/ui/lib/constants/labels";
import { formatPercent } from "@carzen/ui/lib/format";
import { useUpdateSettings } from "@/hooks/use-catalog";
import type { VendorSettings } from "@carzen/contracts/vendor/catalog";
import type { BusinessStatus } from "@carzen/contracts/washes";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const schema = z.object({
  nameAr: z.string().trim().min(2, "اسم المغسلة بالعربية مطلوب (حرفان على الأقل)").max(60, "60 حرفًا كحد أقصى"),
  nameEn: z.string().trim().max(60, "60 حرفًا كحد أقصى"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{8,20}$/, "رقم هاتف غير صالح — أرقام ومسافات فقط، مع + اختيارية"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => !v || EMAIL_RE.test(v), "صيغة البريد الإلكتروني غير صحيحة"),
});

type Values = z.infer<typeof schema>;
type Business = VendorSettings["business"];

const toForm = (b: Business): Values => ({ nameAr: b.name.ar, nameEn: b.name.en, phone: b.phone, email: b.email });

function FormField({ id, label, hint, error, children }: { id: string; label: ReactNode; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string) => (error ? `${id}-error` : `${id}-hint`);

type BusinessTabProps = {
  value: Business;
  readOnly: boolean;
  onDirtyChange: (dirty: boolean) => void;
};

export function BusinessTab({ value, readOnly, onDirtyChange }: BusinessTabProps) {
  const [pending, setPending] = useState<Values | null>(null);
  const update = useUpdateSettings(() => setPending(null));
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toForm(value) });

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const status = BUSINESS_STATUS[value.status as BusinessStatus];

  return (
    <>
      <form onSubmit={handleSubmit((v) => setPending(v))} noValidate className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          icon={<Building2 />}
          title="بيانات المغسلة"
          description="الاسم يظهر للعملاء في تطبيق كارزن، والهاتف والبريد لتواصل كارزن والعملاء معك."
        >
          <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
            <legend className="sr-only">بيانات المغسلة</legend>
            <FormField id="biz-name-ar" label="اسم المغسلة (عربي)" hint="يظهر في نتائج البحث وصفحة المغسلة." error={errors.nameAr?.message}>
              <Input
                id="biz-name-ar"
                className="h-9"
                aria-invalid={Boolean(errors.nameAr)}
                aria-describedby={describedBy("biz-name-ar", errors.nameAr?.message)}
                {...register("nameAr")}
              />
            </FormField>
            <FormField id="biz-name-en" label="اسم المغسلة (English)" hint="للعملاء بالواجهة الإنجليزية." error={errors.nameEn?.message}>
              <Input
                id="biz-name-en"
                dir="ltr"
                className="h-9 text-start"
                aria-invalid={Boolean(errors.nameEn)}
                aria-describedby={describedBy("biz-name-en", errors.nameEn?.message)}
                {...register("nameEn")}
              />
            </FormField>
            <FormField id="biz-phone" label="هاتف المغسلة" hint="رقم التواصل الرئيسي لدى كارزن." error={errors.phone?.message}>
              <Input
                id="biz-phone"
                type="tel"
                dir="ltr"
                inputMode="tel"
                className="num h-9 text-start"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={describedBy("biz-phone", errors.phone?.message)}
                {...register("phone")}
              />
            </FormField>
            <FormField id="biz-email" label={<>البريد الإلكتروني <span className="text-muted-foreground">(اختياري)</span></>} hint="تصل عليه كشوف المستحقات والتنبيهات المهمة." error={errors.email?.message}>
              <Input
                id="biz-email"
                type="email"
                dir="ltr"
                className="num h-9 text-start"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={describedBy("biz-email", errors.email?.message)}
                {...register("email")}
              />
            </FormField>
          </fieldset>
        </SectionCard>

        <SectionCard icon={<ShieldCheck />} title="حسابك لدى كارزن" description="بيانات تديرها كارزن ولا تُعدل من هنا.">
          <InfoList
            columns={1}
            items={[
              { label: "حالة المغسلة", value: status ? <StatusBadge meta={status} size="sm" /> : value.status },
              { label: "المالك", value: value.ownerName },
              {
                label: "نسبة العمولة",
                value: (
                  <span className="flex items-center gap-2">
                    <span className="num text-base font-bold">{formatPercent(value.commissionRate)}</span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
                      <Lock className="size-3" /> تحددها كارزن
                    </span>
                  </span>
                ),
              },
            ]}
          />
          <p className="mt-4 rounded-xl bg-muted/60 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            تُخصم العمولة من قيمة الطلبات المدفوعة. لأي استفسار عن العمولة أو حالة الحساب تواصل مع فريق كارزن.
          </p>
        </SectionCard>

        {!readOnly ? (
          <div className="lg:col-span-3">
            <SettingsSaveBar dirty={isDirty} changeCount={Object.keys(dirtyFields).length} isPending={update.isPending} onReset={() => reset(toForm(value))} />
          </div>
        ) : null}
      </form>

      <SaveReasonDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        sectionLabel="بيانات المغسلة"
        impact="يظهر الاسم الجديد فورًا في تطبيق العميل، وتُسجل التغييرات وسببها في سجل التدقيق."
        isPending={update.isPending}
        onConfirm={(reason) =>
          pending &&
          update.mutate({
            business: { name: { ar: pending.nameAr.trim(), en: pending.nameEn.trim() }, phone: pending.phone.trim(), email: pending.email.trim() },
            reason,
          })
        }
      />
    </>
  );
}
