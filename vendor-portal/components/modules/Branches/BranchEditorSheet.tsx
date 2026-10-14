"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { AlertTriangle, CopyCheck, MapPinned, Save } from "lucide-react";

import { Button } from "@carzen/ui/components/ui/button";
import { Checkbox } from "@carzen/ui/components/ui/checkbox";
import { Input } from "@carzen/ui/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@carzen/ui/components/ui/sheet";
import { Switch } from "@carzen/ui/components/ui/switch";
import { Textarea } from "@carzen/ui/components/ui/textarea";
import { AMENITY, AREAS, WEEK_DAYS } from "@carzen/ui/lib/constants/labels";
import { cn } from "@carzen/ui/lib/utils";
import { clockToMin } from "@/components/modules/Branches/branch-utils";
import { Field, FormSection, Unit, unitInputClass } from "@/components/modules/Branches/form-bits";
import { useUpdateBranch } from "@/hooks/use-catalog";
import type { VendorBranch } from "@carzen/contracts/vendor/catalog";

const schema = z
  .object({
    nameAr: z.string().trim().min(2, "اسم الفرع بالعربية مطلوب"),
    nameEn: z.string().trim().max(80, "80 حرف كحد أقصى"),
    addressAr: z.string().trim().min(3, "العنوان بالعربية مطلوب (3 أحرف على الأقل)"),
    addressEn: z.string().trim().max(160, "160 حرف كحد أقصى"),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s-]{8,20}$/, "أدخل رقم هاتف صحيح"),
    capacity: z.string().refine((v) => /^\d+$/.test(v.trim()) && Number(v) >= 1 && Number(v) <= 30, "السعة رقم صحيح بين 1 و 30 مكان"),
    amenities: z.array(z.string()),
    workingHours: z.array(z.object({ open: z.string(), close: z.string(), closed: z.boolean() })).length(7),
    active: z.boolean(),
    reason: z.string().trim().min(3, "اكتب سبب التعديل (3 أحرف على الأقل)").max(200, "200 حرف كحد أقصى"),
  })
  .superRefine((v, ctx) => {
    v.workingHours.forEach((d, i) => {
      if (d.closed) return;
      if (!d.open || !d.close) ctx.addIssue({ code: "custom", path: ["workingHours", i, "close"], message: "حدد وقت الفتح والإغلاق" });
      else if (clockToMin(d.close, true) <= clockToMin(d.open)) ctx.addIssue({ code: "custom", path: ["workingHours", i, "close"], message: "الإغلاق يجب أن يكون بعد الفتح" });
    });
  });

type Values = z.infer<typeof schema>;

function defaultsFor(b: VendorBranch): Values {
  return {
    nameAr: b.name.ar,
    nameEn: b.name.en,
    addressAr: b.address.ar,
    addressEn: b.address.en,
    phone: b.phone,
    capacity: String(b.capacity),
    amenities: b.amenities,
    workingHours: b.workingHours.map((d) => ({ ...d })),
    active: b.active,
    reason: "",
  };
}

type BranchEditorSheetProps = {
  branch: VendorBranch | null;
  onOpenChange: (open: boolean) => void;
};

/** OW-09: owner-only branch editor (name, address, phone, capacity, amenities, hours, active). */
export function BranchEditorSheet({ branch, onOpenChange }: BranchEditorSheetProps) {
  return (
    <Sheet open={Boolean(branch)} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full gap-0 p-0 data-[side=left]:w-full data-[side=left]:sm:max-w-2xl">
        {/* Body unmounts on close → the form starts from the saved branch every time. */}
        {branch ? <BranchForm branch={branch} onDone={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function BranchForm({ branch, onDone }: { branch: VendorBranch; onDone: () => void }) {
  const update = useUpdateBranch(onDone);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaultsFor(branch) });

  const hours = useWatch({ control, name: "workingHours" });
  const active = useWatch({ control, name: "active" });
  const capacity = Number(useWatch({ control, name: "capacity" }));
  const deactivating = branch.active && !active;
  const pending = update.isPending;

  const copyFirstDay = () => {
    const first = getValues("workingHours.0");
    setValue(
      "workingHours",
      Array.from({ length: 7 }, () => ({ ...first })),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const submit = handleSubmit((v) =>
    update.mutate({
      id: branch.id,
      name: { ar: v.nameAr.trim(), en: v.nameEn.trim() || branch.name.en },
      address: { ar: v.addressAr.trim(), en: v.addressEn.trim() || branch.address.en },
      phone: v.phone.trim(),
      capacity: Number(v.capacity),
      amenities: v.amenities,
      workingHours: v.workingHours,
      active: v.active,
      reason: v.reason.trim(),
    }),
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SheetHeader className="border-b border-border/60 px-5 py-4 pe-12">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <MapPinned className="size-5" />
          </span>
          <div className="space-y-1 pt-0.5">
            <SheetTitle className="font-semibold">تعديل الفرع</SheetTitle>
            <SheetDescription className="text-xs">
              {branch.name.ar} · {AREAS[branch.area] ?? branch.area} — التعديلات تظهر في تطبيق العميل فورًا وتُسجل في سجل التدقيق.
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <form
        className="flex min-h-0 flex-1 flex-col"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4">
          <FormSection title="بيانات الفرع" description="الاسم والعنوان كما يظهران للعملاء في التطبيق.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="br-name-ar" label="اسم الفرع (عربي)" error={errors.nameAr?.message}>
                <Input id="br-name-ar" className="h-9" aria-invalid={Boolean(errors.nameAr)} {...register("nameAr")} />
              </Field>
              <Field id="br-name-en" label="اسم الفرع (English)" error={errors.nameEn?.message}>
                <Input id="br-name-en" dir="ltr" className="h-9 text-start" aria-invalid={Boolean(errors.nameEn)} {...register("nameEn")} />
              </Field>
              <Field id="br-addr-ar" label="العنوان (عربي)" error={errors.addressAr?.message}>
                <Textarea id="br-addr-ar" rows={2} className="resize-none" aria-invalid={Boolean(errors.addressAr)} {...register("addressAr")} />
              </Field>
              <Field id="br-addr-en" label="العنوان (English)" error={errors.addressEn?.message}>
                <Textarea id="br-addr-en" dir="ltr" rows={2} className="resize-none text-start" aria-invalid={Boolean(errors.addressEn)} {...register("addressEn")} />
              </Field>
              <Field id="br-phone" label="هاتف الفرع" error={errors.phone?.message}>
                <Input id="br-phone" dir="ltr" inputMode="tel" className="num h-9 text-start" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
              </Field>
              <Field
                id="br-capacity"
                label="السعة (أماكن الغسيل)"
                error={errors.capacity?.message}
                hint={capacity && capacity < branch.capacity ? "تقليل السعة لا يلغي الحجوزات القائمة، لكنه يقلل الأماكن المتاحة للحجز." : "عدد السيارات التي تُخدم في نفس الوقت (1–30)."}
              >
                <div className="relative">
                  <Input id="br-capacity" type="number" min={1} max={30} inputMode="numeric" className={unitInputClass} aria-invalid={Boolean(errors.capacity)} {...register("capacity")} />
                  <Unit>مكان</Unit>
                </div>
              </Field>
            </div>
          </FormSection>

          <FormSection title="المرافق" description="تظهر للعملاء في صفحة الفرع وتساعدهم على الاختيار.">
            <Controller
              control={control}
              name="amenities"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2" role="group" aria-label="المرافق">
                  {Object.entries(AMENITY).map(([key, label]) => {
                    const on = field.value.includes(key);
                    return (
                      <label
                        key={key}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          on ? "border-primary/50 bg-secondary text-secondary-foreground" : "border-border hover:bg-muted",
                        )}
                      >
                        <Checkbox checked={on} onCheckedChange={(c) => field.onChange(c ? [...field.value, key] : field.value.filter((x) => x !== key))} />
                        {label}
                      </label>
                    );
                  })}
                </div>
              )}
            />
          </FormSection>

          <FormSection
            title="ساعات العمل"
            description="لكل يوم وقت فتح وإغلاق، أو اجعله يوم إجازة. 00:00 كوقت إغلاق = منتصف الليل."
            action={
              <Button type="button" variant="outline" size="sm" onClick={copyFirstDay}>
                <CopyCheck /> نسخ {WEEK_DAYS[0]} لكل الأيام
              </Button>
            }
          >
            <div className="divide-y divide-border/60 rounded-xl border border-border/70">
              {WEEK_DAYS.map((dayName, i) => {
                const closed = hours?.[i]?.closed ?? false;
                const err = errors.workingHours?.[i]?.close?.message;
                return (
                  <div key={dayName} className="grid grid-cols-[72px_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-3 py-2.5 sm:grid-cols-[88px_auto_minmax(0,1fr)]">
                    <span className="text-sm font-medium">{dayName}</span>
                    <Controller
                      control={control}
                      name={`workingHours.${i}.closed`}
                      render={({ field }) => (
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                          <Switch checked={!field.value} onCheckedChange={(on) => field.onChange(!on)} aria-label={`${dayName} يوم عمل`} />
                          <span className="w-10">{field.value ? "إجازة" : "مفتوح"}</span>
                        </label>
                      )}
                    />
                    {closed ? (
                      <span className="text-xs text-muted-foreground">مغلق طوال اليوم</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input type="time" step={900} aria-label={`${dayName} — وقت الفتح`} className="num h-8 w-28" {...register(`workingHours.${i}.open`)} />
                        <span className="text-xs text-muted-foreground">إلى</span>
                        <Input type="time" step={900} aria-label={`${dayName} — وقت الإغلاق`} aria-invalid={Boolean(err)} className="num h-8 w-28" {...register(`workingHours.${i}.close`)} />
                      </div>
                    )}
                    {err ? <p className="col-span-full text-xs text-destructive">{err}</p> : null}
                  </div>
                );
              })}
            </div>
          </FormSection>

          <FormSection title="حالة الفرع">
            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <label className="flex cursor-pointer items-start justify-between gap-4">
                  <span>
                    <span className="block text-sm font-medium">{field.value ? "الفرع نشط" : "الفرع متوقف"}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">إيقاف الفرع يخفيه من تطبيق العميل ويمنع أي حجز جديد فيه.</span>
                  </span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="الفرع نشط" />
                </label>
              )}
            />
            {deactivating ? (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                <AlertTriangle className="mt-px size-3.5 shrink-0" />
                <p className="leading-relaxed">
                  {branch.upcomingOrders ? (
                    <>
                      يوجد <span className="num font-semibold">{branch.upcomingOrders}</span> حجز قادم في هذا الفرع لن يُلغى تلقائيًا — تواصل مع العملاء أو ألغها من{" "}
                      <Link href="/bookings?tab=upcoming" className="font-semibold underline underline-offset-2">
                        الحجوزات القادمة
                      </Link>
                      . سيصل تنبيه لفريق كارزن بالإيقاف.
                    </>
                  ) : (
                    "لا توجد حجوزات قادمة. سيختفي الفرع من تطبيق العميل فور الحفظ وسيصل تنبيه لفريق كارزن."
                  )}
                </p>
              </div>
            ) : null}
          </FormSection>

          <FormSection title="سبب التعديل" description="مطلوب — يُسجل مع التعديل في سجل التدقيق.">
            <Textarea
              id="br-reason"
              aria-label="سبب التعديل"
              rows={2}
              placeholder="مثال: تحديث ساعات العمل لموسم الصيف"
              className="resize-none"
              aria-invalid={Boolean(errors.reason)}
              {...register("reason")}
            />
            {errors.reason ? <p className="text-xs text-destructive">{errors.reason.message}</p> : null}
          </FormSection>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-popover p-4">
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            إلغاء
          </Button>
          <Button
            type="submit"
            loading={pending}
            className={cn(deactivating && "bg-destructive text-white hover:bg-destructive/90")}
          >
            {!pending ? <Save /> : null}
            {deactivating ? "حفظ وإيقاف الفرع" : "حفظ التعديلات"}
          </Button>
        </div>
      </form>
    </div>
  );
}
