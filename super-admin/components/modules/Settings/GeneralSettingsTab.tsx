"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Clock, Headset, Lock, Mail, Phone, Settings2, Smartphone } from "lucide-react";

import { describedBy, FormField } from "@/components/modules/Settings/FormField";
import { SaveSectionDialog, SettingsSaveBar } from "@/components/modules/Settings/SettingsSaveBar";
import { useSaveSection } from "@/components/modules/Settings/use-save-section";
import { SectionCard } from "@/components/shared/section-card";
import { Input } from "@/components/ui/input";
import type { PlatformSettings } from "@/types/settings";

type General = PlatformSettings["general"];

const schema = z.object({
  platformName: z.string().trim().min(2, "اسم المنصة مطلوب (حرفان على الأقل)").max(40, "40 حرفًا كحد أقصى"),
  supportPhone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{8,20}$/, "رقم هاتف غير صالح — أرقام ومسافات فقط، مع + اختيارية"),
  supportEmail: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "بريد الدعم مطلوب")
    .pipe(z.email("صيغة البريد الإلكتروني غير صحيحة")),
  hoursAr: z.string().trim().min(3, "اكتب ساعات الدعم بالعربية"),
  hoursEn: z.string().trim().min(3, "Support hours in English are required"),
});

type Values = z.infer<typeof schema>;

const toForm = (v: General): Values => ({
  platformName: v.platformName,
  supportPhone: v.supportPhone,
  supportEmail: v.supportEmail,
  hoursAr: v.supportHours.ar,
  hoursEn: v.supportHours.en,
});

type GeneralSettingsTabProps = {
  value: General;
  onDirtyChange: (dirty: boolean) => void;
};

export function GeneralSettingsTab({ value, onDirtyChange }: GeneralSettingsTabProps) {
  const saver = useSaveSection("general");
  const [pending, setPending] = useState<Values | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toForm(value) });
  const live = useWatch({ control });

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const onSubmit = handleSubmit((v) => {
    setPending(v);
    saver.setReasonOpen(true);
  });

  const confirm = (reason: string) => {
    if (!pending) return;
    saver.save(
      {
        platformName: pending.platformName,
        currency: value.currency,
        supportPhone: pending.supportPhone,
        supportEmail: pending.supportEmail,
        supportHours: { ar: pending.hoursAr, en: pending.hoursEn },
      },
      reason,
      (saved) => reset(toForm(saved)),
    );
  };

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          icon={<Settings2 />}
          title="بيانات المنصة والدعم"
          description="تظهر في شاشة المساعدة بتطبيق العميل وفي رسائل المنصة."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="platformName" label="اسم المنصة" hint="يظهر في عناوين الإشعارات والرسائل." error={errors.platformName?.message}>
              <Input
                id="platformName"
                className="h-9"
                aria-invalid={Boolean(errors.platformName)}
                aria-describedby={describedBy("platformName", errors.platformName?.message)}
                {...register("platformName")}
              />
            </FormField>
            <FormField id="currency" label="العملة" hint="ثابتة على مستوى المنصة في هذه المرحلة.">
              <div className="relative">
                <Input id="currency" value={value.currency} readOnly disabled dir="ltr" className="num h-9 pe-8" aria-describedby="currency-hint" />
                <Lock className="pointer-events-none absolute end-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              </div>
            </FormField>
            <FormField id="supportPhone" label="هاتف الدعم" hint="زر الاتصال في تطبيق العميل يستخدم هذا الرقم." error={errors.supportPhone?.message}>
              <Input
                id="supportPhone"
                type="tel"
                dir="ltr"
                inputMode="tel"
                className="num h-9"
                aria-invalid={Boolean(errors.supportPhone)}
                aria-describedby={describedBy("supportPhone", errors.supportPhone?.message)}
                {...register("supportPhone")}
              />
            </FormField>
            <FormField id="supportEmail" label="بريد الدعم" hint="تصل إليه رسائل «تواصل معنا» من العملاء والمغاسل." error={errors.supportEmail?.message}>
              <Input
                id="supportEmail"
                type="email"
                dir="ltr"
                className="num h-9"
                aria-invalid={Boolean(errors.supportEmail)}
                aria-describedby={describedBy("supportEmail", errors.supportEmail?.message)}
                {...register("supportEmail")}
              />
            </FormField>
            <FormField id="hoursAr" label="ساعات الدعم (عربي)" hint="تُعرض بجانب وسائل التواصل." error={errors.hoursAr?.message}>
              <Input
                id="hoursAr"
                className="h-9"
                aria-invalid={Boolean(errors.hoursAr)}
                aria-describedby={describedBy("hoursAr", errors.hoursAr?.message)}
                {...register("hoursAr")}
              />
            </FormField>
            <FormField id="hoursEn" label="ساعات الدعم (English)" hint="للمستخدمين بالواجهة الإنجليزية." error={errors.hoursEn?.message}>
              <Input
                id="hoursEn"
                dir="ltr"
                className="h-9"
                aria-invalid={Boolean(errors.hoursEn)}
                aria-describedby={describedBy("hoursEn", errors.hoursEn?.message)}
                {...register("hoursEn")}
              />
            </FormField>
          </div>
        </SectionCard>
  
        <SectionCard icon={<Smartphone />} title="معاينة في تطبيق العميل" description="تتحدث مع الكتابة — قبل الحفظ.">
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2.5">
              <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-xl text-white">
                <Headset className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">مساعدة {live.platformName || "—"}</p>
                <p className="text-[11px] text-muted-foreground">نحن هنا لمساعدتك</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-xs">
              <li className="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
                <Phone className="size-3.5 text-primary" aria-hidden />
                <span className="num truncate" dir="ltr">
                  {live.supportPhone || "—"}
                </span>
              </li>
              <li className="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
                <Mail className="size-3.5 text-primary" aria-hidden />
                <span className="num truncate" dir="ltr">
                  {live.supportEmail || "—"}
                </span>
              </li>
              <li className="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
                <Clock className="size-3.5 text-primary" aria-hidden />
                <span className="truncate">{live.hoursAr || "—"}</span>
              </li>
            </ul>
          </div>
        </SectionCard>
  
        <div className="lg:col-span-3">
          <SettingsSaveBar
            dirty={isDirty}
            changeCount={Object.keys(dirtyFields).length}
            isPending={saver.isPending}
            onReset={() => reset(toForm(value))}
          />
        </div>
      </form>

      <SaveSectionDialog
        open={saver.reasonOpen}
        onOpenChange={saver.setReasonOpen}
        sectionLabel="الإعدادات العامة"
        impact="تظهر البيانات الجديدة فورًا في تطبيق العميل ورسائل المنصة، وتُسجل القيم القديمة والجديدة في سجل التدقيق."
        isPending={saver.isPending}
        onConfirm={confirm}
      />
    </>
  );
}
