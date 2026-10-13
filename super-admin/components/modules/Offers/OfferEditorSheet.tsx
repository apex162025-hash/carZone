"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Megaphone, Save, Send } from "lucide-react";

import { BranchPicker } from "@/components/modules/Offers/BranchPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useSaveOffer } from "@/hooks/use-offers";
import { SERVICE_CATEGORY } from "@/lib/constants/labels";
import { formatDuration, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DiscountType, OfferListItem } from "@/types/offers";

const MAX_PERCENT = 50;

const schema = z
  .object({
    titleAr: z.string().trim().min(3, "العنوان بالعربية مطلوب (3 أحرف على الأقل)"),
    titleEn: z.string().trim().min(3, "العنوان بالإنجليزية مطلوب (3 أحرف على الأقل)"),
    descriptionAr: z.string().trim().max(200, "200 حرف كحد أقصى"),
    descriptionEn: z.string().trim().max(200, "200 حرف كحد أقصى"),
    discountType: z.enum(["percent", "fixed"]),
    discountValue: z
      .string()
      .trim()
      .refine((v) => v !== "" && Number.isFinite(Number(v)) && Number(v) > 0, "أدخل قيمة خصم صحيحة أكبر من صفر"),
    startAt: z.string().min(1, "حدد تاريخ ووقت البداية"),
    endAt: z.string().min(1, "حدد تاريخ ووقت النهاية"),
    serviceCategories: z.array(z.string()),
    branchIds: z.array(z.string()).min(1, "اختر فرعًا واحدًا على الأقل"),
  })
  .refine((v) => v.discountType !== "percent" || Number(v.discountValue) <= MAX_PERCENT, {
    path: ["discountValue"],
    message: `الحد الأقصى للخصم ${MAX_PERCENT}٪`,
  })
  .refine((v) => !v.startAt || !v.endAt || new Date(v.endAt) > new Date(v.startAt), {
    path: ["endAt"],
    message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
  });

type Values = z.infer<typeof schema>;

/** ISO → value for <input type="datetime-local"> in the admin's local time. */
function toLocalInput(input: string | Date) {
  const d = new Date(input);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function defaultsFor(offer: OfferListItem | null): Values {
  if (offer) {
    return {
      titleAr: offer.title.ar,
      titleEn: offer.title.en,
      descriptionAr: offer.description.ar,
      descriptionEn: offer.description.en,
      discountType: offer.discountType,
      discountValue: String(offer.discountValue),
      startAt: toLocalInput(offer.startAt),
      endAt: toLocalInput(offer.endAt),
      serviceCategories: offer.serviceCategories,
      branchIds: offer.branchIds,
    };
  }
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return {
    titleAr: "",
    titleEn: "",
    descriptionAr: "",
    descriptionEn: "",
    discountType: "percent",
    discountValue: "",
    startAt: toLocalInput(start),
    endAt: toLocalInput(end),
    serviceCategories: [],
    branchIds: [],
  };
}

function Field({ id, label, error, hint, children }: { id?: string; label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      {id ? (
        <label htmlFor={id} className="block text-xs font-medium">
          {label}
        </label>
      ) : (
        <p className="text-xs font-medium">{label}</p>
      )}
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-2xl border border-border/80 bg-card p-4">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden>
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}

type OfferEditorSheetProps = {
  /** null = create a new platform offer. */
  offer: OfferListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** AD-34 editor for platform promotions (wash-scoped offers are read-only here). */
export function OfferEditorSheet({ offer, open, onOpenChange }: OfferEditorSheetProps) {
  const [intent, setIntent] = useState<"draft" | "publish" | null>(null);
  const save = useSaveOffer(() => onOpenChange(false));
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaultsFor(null) });

  const discountType = useWatch({ control, name: "discountType" });
  const discountValue = Number(useWatch({ control, name: "discountValue" }));
  const startAt = useWatch({ control, name: "startAt" });
  const endAt = useWatch({ control, name: "endAt" });

  useEffect(() => {
    if (open) reset(defaultsFor(offer));
  }, [open, offer, reset]);

  const isDraft = !offer || offer.status === "draft";
  const pending = save.isPending;

  const submit = (publish: boolean) =>
    handleSubmit((v) => {
      setIntent(publish ? "publish" : "draft");
      save.mutate({
        id: offer?.id,
        payload: {
          title: { ar: v.titleAr.trim(), en: v.titleEn.trim() },
          description: { ar: v.descriptionAr.trim(), en: v.descriptionEn.trim() },
          discountType: v.discountType,
          discountValue: Number(v.discountValue),
          startAt: new Date(v.startAt).toISOString(),
          endAt: new Date(v.endAt).toISOString(),
          branchIds: v.branchIds,
          serviceCategories: v.serviceCategories,
          publish,
        },
      });
    })();

  const durationMin = startAt && endAt ? (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000 : 0;
  const durationText =
    durationMin > 0 ? (durationMin >= 1440 ? `مدة العرض ${Math.round(durationMin / 1440)} يوم` : `مدة العرض ${formatDuration(durationMin)}`) : undefined;
  const preview =
    Number.isFinite(discountValue) && discountValue > 0
      ? discountType === "percent"
        ? `خصم ${discountValue}٪ على السعر`
        : `خصم ${formatMoney(discountValue)} من السعر`
      : undefined;

  return (
    <Sheet open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <SheetContent side="right" className="w-full gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border/60 pe-12">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Megaphone className="size-5" />
            </span>
            <div className="space-y-1 pt-0.5">
              <SheetTitle className="font-semibold">{offer ? "تعديل عرض المنصة" : "عرض جديد"}</SheetTitle>
              <SheetDescription className="text-xs">
                يظهر العرض النشط في تطبيق العميل ويُطبق تلقائيًا على أسعار الفروع والخدمات المختارة.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit(!isDraft);
          }}
        >
          <div className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4">
            <Section title="المحتوى" description="يظهر للعملاء بلغة التطبيق.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="offer-title-ar" label="العنوان (عربي)" error={errors.titleAr?.message}>
                  <Input id="offer-title-ar" aria-invalid={Boolean(errors.titleAr)} className="h-9" placeholder="خصم ١٥٪ على الغسيل الخارجي" {...register("titleAr")} />
                </Field>
                <Field id="offer-title-en" label="العنوان (English)" error={errors.titleEn?.message}>
                  <Input id="offer-title-en" dir="ltr" aria-invalid={Boolean(errors.titleEn)} className="h-9 text-start" placeholder="15% off exterior washes" {...register("titleEn")} />
                </Field>
                <Field id="offer-desc-ar" label="الوصف (عربي)" error={errors.descriptionAr?.message}>
                  <Textarea id="offer-desc-ar" rows={2} className="resize-none" aria-invalid={Boolean(errors.descriptionAr)} {...register("descriptionAr")} />
                </Field>
                <Field id="offer-desc-en" label="الوصف (English)" error={errors.descriptionEn?.message}>
                  <Textarea id="offer-desc-en" dir="ltr" rows={2} className="resize-none text-start" aria-invalid={Boolean(errors.descriptionEn)} {...register("descriptionEn")} />
                </Field>
              </div>
            </Section>

            <Section title="الخصم">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="نوع الخصم">
                  <Controller
                    control={control}
                    name="discountType"
                    render={({ field }) => (
                      <div role="radiogroup" aria-label="نوع الخصم" className="grid h-9 grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                        {(
                          [
                            ["percent", "نسبة ٪"],
                            ["fixed", "مبلغ ثابت"],
                          ] as [DiscountType, string][]
                        ).map(([v, label]) => (
                          <button
                            key={v}
                            type="button"
                            role="radio"
                            aria-checked={field.value === v}
                            onClick={() => field.onChange(v)}
                            className={cn(
                              "cursor-pointer rounded-md text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                              field.value === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </Field>
                <Field
                  id="offer-value"
                  label={discountType === "percent" ? `قيمة الخصم (حتى ${MAX_PERCENT}٪)` : "قيمة الخصم (ج.م)"}
                  error={errors.discountValue?.message}
                  hint={preview}
                >
                  <div className="relative">
                    <Input
                      id="offer-value"
                      inputMode="decimal"
                      aria-invalid={Boolean(errors.discountValue)}
                      className="num h-9 pe-12"
                      {...register("discountValue")}
                    />
                    <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {discountType === "percent" ? "٪" : "ج.م"}
                    </span>
                  </div>
                </Field>
              </div>
            </Section>

            <Section title="المدة" description="تُحسب حالة العرض (مجدول / نشط / منتهي) تلقائيًا من التواريخ.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="offer-start" label="يبدأ في" error={errors.startAt?.message}>
                  <Input id="offer-start" type="datetime-local" aria-invalid={Boolean(errors.startAt)} className="num h-9" {...register("startAt")} />
                </Field>
                <Field id="offer-end" label="ينتهي في" error={errors.endAt?.message} hint={durationText}>
                  <Input id="offer-end" type="datetime-local" min={startAt || undefined} aria-invalid={Boolean(errors.endAt)} className="num h-9" {...register("endAt")} />
                </Field>
              </div>
            </Section>

            <Section title="الخدمات المشمولة" description="اتركها دون تحديد لتطبيق العرض على كل الخدمات.">
              <Controller
                control={control}
                name="serviceCategories"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="الخدمات المشمولة">
                    {Object.entries(SERVICE_CATEGORY).map(([key, label]) => {
                      const on = field.value.includes(key);
                      return (
                        <label
                          key={key}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            on ? "border-primary/50 bg-secondary text-secondary-foreground" : "border-border hover:bg-muted",
                          )}
                        >
                          <Checkbox
                            checked={on}
                            onCheckedChange={(c) => field.onChange(c ? [...field.value, key] : field.value.filter((x) => x !== key))}
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                )}
              />
            </Section>

            <Section title="الفروع" description="الفروع التي يظهر فيها العرض ويُطبق على أسعارها.">
              <Controller
                control={control}
                name="branchIds"
                render={({ field }) => <BranchPicker value={field.value} onChange={field.onChange} invalid={Boolean(errors.branchIds)} />}
              />
              {errors.branchIds ? <p className="text-xs text-destructive">{errors.branchIds.message}</p> : null}
            </Section>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-popover p-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              إلغاء
            </Button>
            {isDraft ? (
              <>
                <Button type="button" variant="outline" onClick={() => void submit(false)} loading={pending && intent === "draft"} disabled={pending}>
                  {!(pending && intent === "draft") ? <Save /> : null}
                  حفظ كمسودة
                </Button>
                <Button type="button" onClick={() => void submit(true)} loading={pending && intent === "publish"} disabled={pending}>
                  {!(pending && intent === "publish") ? <Send /> : null}
                  نشر العرض
                </Button>
              </>
            ) : (
              <Button type="submit" loading={pending}>
                {!pending ? <Save /> : null}
                حفظ التعديلات
              </Button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
