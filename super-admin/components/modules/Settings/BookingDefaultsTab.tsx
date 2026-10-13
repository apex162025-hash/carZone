"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarClock, Zap } from "lucide-react";

import { describedBy, FormField } from "@/components/modules/Settings/FormField";
import { SaveSectionDialog, SettingsSaveBar } from "@/components/modules/Settings/SettingsSaveBar";
import { useSaveSection } from "@/components/modules/Settings/use-save-section";
import { SectionCard } from "@/components/shared/section-card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { PlatformSettings } from "@/types/settings";

type BookingDefaults = PlatformSettings["bookingDefaults"];
type NumericKey = Exclude<keyof BookingDefaults, "autoConfirm">;

const FIELDS: { key: NumericKey; label: string; unit: string; min: number; max: number; hint: string }[] = [
  { key: "slotIntervalMin", label: "مدة الخانة الزمنية", unit: "دقيقة", min: 5, max: 240, hint: "طول كل خانة حجز في جدول الفرع؛ تحدد عدد المواعيد المتاحة يوميًا." },
  { key: "leadTimeMin", label: "أقل مهلة قبل الموعد", unit: "دقيقة", min: 0, max: 1440, hint: "أقرب موعد يستطيع العميل حجزه بدءًا من الآن." },
  { key: "maxAdvanceDays", label: "أقصى مدة للحجز المسبق", unit: "أيام", min: 1, max: 90, hint: "إلى أي مدى في المستقبل تظهر المواعيد في تطبيق العميل." },
  { key: "freeCancelMin", label: "نافذة الإلغاء المجاني", unit: "دقيقة", min: 0, max: 2880, hint: "يلغي العميل مجانًا حتى هذه المدة قبل الموعد؛ بعدها يُحتسب إلغاءً متأخرًا." },
  { key: "noShowGraceMin", label: "مهلة عدم الحضور", unit: "دقيقة", min: 0, max: 180, hint: "بعد انقضائها من بداية الموعد يُعتبر الحجز «لم يحضر» ويُحرر المكان." },
  { key: "reminderMin", label: "التذكير قبل الموعد", unit: "دقيقة", min: 0, max: 1440, hint: "يُرسل إشعار تذكير للعميل قبل الموعد بهذه المدة." },
];

const numberField = (min: number, max: number) =>
  z
    .number({ error: "أدخل رقمًا صحيحًا" })
    .int("أدخل رقمًا صحيحًا بدون كسور")
    .min(min, `أقل قيمة ${min}`)
    .max(max, `أقصى قيمة ${max}`);

const schema = z.object({
  autoConfirm: z.boolean(),
  ...(Object.fromEntries(FIELDS.map((f) => [f.key, numberField(f.min, f.max)])) as Record<NumericKey, ReturnType<typeof numberField>>),
});

type Values = z.infer<typeof schema>;

type BookingDefaultsTabProps = {
  value: BookingDefaults;
  onDirtyChange: (dirty: boolean) => void;
};

export function BookingDefaultsTab({ value, onDirtyChange }: BookingDefaultsTabProps) {
  const saver = useSaveSection("bookingDefaults");
  const [pending, setPending] = useState<Values | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: value });

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const onSubmit = handleSubmit((v) => {
    setPending(v);
    saver.setReasonOpen(true);
  });

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <SectionCard
          icon={<CalendarClock />}
          title="قواعد الحجز الافتراضية"
          description="القيم التي يبدأ بها كل فرع جديد عند قبول المغسلة، ويمكن للفرع تعديلها لاحقًا من تطبيق المغسلة."
        >
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
            {FIELDS.map((f) => {
              const error = errors[f.key]?.message;
              return (
                <FormField key={f.key} id={f.key} label={f.label} hint={f.hint} error={error}>
                  <div className="relative">
                    <Input
                      id={f.key}
                      type="number"
                      inputMode="numeric"
                      min={f.min}
                      max={f.max}
                      step={1}
                      dir="ltr"
                      className="num h-9 pe-16 text-start"
                      aria-invalid={Boolean(error)}
                      aria-describedby={describedBy(f.key, error)}
                      {...register(f.key, { valueAsNumber: true })}
                    />
                    <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{f.unit}</span>
                  </div>
                </FormField>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard icon={<Zap />} title="التأكيد">
          <Controller
            control={control}
            name="autoConfirm"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-muted/50 px-4 py-3">
                <span>
                  <span className="block text-sm font-medium">تأكيد الحجوزات تلقائيًا</span>
                  <span id="autoConfirm-hint" className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    عند التفعيل تُؤكد الحجوزات الجديدة فورًا دون انتظار موافقة الفرع. عند الإيقاف يؤكدها طاقم الفرع يدويًا.
                  </span>
                </span>
                <Switch
                  aria-label="تأكيد الحجوزات تلقائيًا"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                  aria-describedby="autoConfirm-hint"
                />
              </label>
            )}
          />
        </SectionCard>

        <SettingsSaveBar
          dirty={isDirty}
          changeCount={Object.keys(dirtyFields).length}
          isPending={saver.isPending}
          onReset={() => reset(value)}
        />
      </form>

      <SaveSectionDialog
        open={saver.reasonOpen}
        onOpenChange={saver.setReasonOpen}
        sectionLabel="إعدادات الحجز"
        impact="تُطبق القيم الجديدة على الفروع التي تنضم بعد الحفظ؛ إعدادات الفروع الحالية لا تتغير. تُسجل القيم القديمة والجديدة في سجل التدقيق."
        isPending={saver.isPending}
        onConfirm={(reason) => pending && saver.save(pending, reason, (saved) => reset(saved))}
      />
    </>
  );
}
