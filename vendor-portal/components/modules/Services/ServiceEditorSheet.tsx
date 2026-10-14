"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Archive, Info, Save, Sparkles, TriangleAlert } from "lucide-react";

import { Button } from "@carzen/ui/components/ui/button";
import { Input } from "@carzen/ui/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@carzen/ui/components/ui/sheet";
import { Switch } from "@carzen/ui/components/ui/switch";
import { Textarea } from "@carzen/ui/components/ui/textarea";
import { SERVICE_CATEGORY } from "@carzen/ui/lib/constants/labels";
import { formatMoney, formatNumber } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { DURATION_MAX, DURATION_MIN, PRICE_MAX, PRICE_MIN, SERVICE_TYPE_LABEL } from "@/components/modules/Services/service-utils";
import { useSaveService } from "@/hooks/use-catalog";
import type { ServicePayload, VendorService } from "@carzen/contracts/vendor/catalog";
import type { ServiceType } from "@carzen/contracts/washes";

const CATEGORY_KEYS = Object.keys(SERVICE_CATEGORY) as [string, ...string[]];

const intInRange = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v !== "" && Number.isInteger(Number(v)) && Number(v) >= min && Number(v) <= max, message);

const schema = z.object({
  branchId: z.string().min(1, "اختر الفرع"),
  nameAr: z.string().trim().min(2, "اسم الخدمة بالعربية مطلوب (حرفان على الأقل)").max(60, "60 حرفًا كحد أقصى"),
  nameEn: z.string().trim().min(2, "اسم الخدمة بالإنجليزية مطلوب (حرفان على الأقل)").max(60, "60 حرفًا كحد أقصى"),
  descriptionAr: z.string().trim().max(200, "200 حرف كحد أقصى"),
  descriptionEn: z.string().trim().max(200, "200 حرف كحد أقصى"),
  category: z.enum(CATEGORY_KEYS),
  type: z.enum(["primary", "addon"]),
  price: intInRange(PRICE_MIN, PRICE_MAX, `السعر رقم صحيح بين ${PRICE_MIN} و ${PRICE_MAX} ج.م`),
  durationMin: intInRange(DURATION_MIN, DURATION_MAX, `المدة رقم صحيح بين ${DURATION_MIN} و ${DURATION_MAX} دقيقة`),
  active: z.boolean(),
  reason: z.string().trim().max(200, "200 حرف كحد أقصى"),
});

type Values = z.infer<typeof schema>;

export type ServicePreset = { branchId: string; type: ServiceType };

function defaultsFor(service: VendorService | null, preset: ServicePreset): Values {
  if (service) {
    return {
      branchId: service.branchId,
      nameAr: service.name.ar,
      nameEn: service.name.en,
      descriptionAr: service.description.ar,
      descriptionEn: service.description.en,
      category: CATEGORY_KEYS.includes(service.category) ? service.category : "exterior",
      type: service.type,
      price: String(service.price),
      durationMin: String(service.durationMin),
      active: service.active,
      reason: "",
    };
  }
  return {
    branchId: preset.branchId,
    nameAr: "",
    nameEn: "",
    descriptionAr: "",
    descriptionEn: "",
    category: "exterior",
    type: preset.type,
    price: "",
    durationMin: preset.type === "addon" ? "10" : "30",
    active: true,
    reason: "",
  };
}

function Field({ id, label, error, hint, children }: { id?: string; label: ReactNode; error?: string; hint?: ReactNode; children: ReactNode }) {
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
      {error ? (
        <p id={id ? `${id}-error` : undefined} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
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

type ServiceEditorSheetProps = {
  /** null = create. */
  service: VendorService | null;
  /** Branch + type a new service starts with. */
  preset: ServicePreset;
  /** Branches the owner may pick from when creating on "all branches" (empty = branch is fixed). */
  branchChoices: { id: string; name: string }[];
  branchName: (id: string) => string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** D8 / OW-10 — create or edit a service in a side drawer. */
export function ServiceEditorSheet({ service, preset, branchChoices, branchName, open, onOpenChange }: ServiceEditorSheetProps) {
  // A fresh form per opening (keeps content visible during the close animation).
  const [session, setSession] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSession((s) => s + 1);
  }
  const save = useSaveService(() => onOpenChange(false));

  return (
    <Sheet open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <SheetContent side="right" className="w-full gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border/60 pe-12">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Sparkles className="size-5" />
            </span>
            <div className="space-y-1 pt-0.5">
              <SheetTitle className="font-semibold">{service ? `تعديل «${service.name.ar}»` : "خدمة جديدة"}</SheetTitle>
              <SheetDescription className="text-xs">
                تظهر الخدمة المفعّلة فورًا في تطبيق العميل وفي شاشة الطلب الجديد. السعر يُحسب تلقائيًا ولا يُكتب يدويًا على الطلب.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <ServiceForm
          key={`${service?.id ?? "new"}-${session}`}
          service={service}
          preset={preset}
          branchChoices={branchChoices}
          branchName={branchName}
          isPending={save.isPending}
          onCancel={() => onOpenChange(false)}
          onSubmit={(id, payload) => save.mutate({ id, payload })}
        />
      </SheetContent>
    </Sheet>
  );
}

type ServiceFormProps = Pick<ServiceEditorSheetProps, "service" | "preset" | "branchChoices" | "branchName"> & {
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (id: string | undefined, payload: ServicePayload & { reason?: string }) => void;
};

function ServiceForm({ service, preset, branchChoices, branchName, isPending, onCancel, onSubmit }: ServiceFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaultsFor(service, preset) });

  const price = useWatch({ control, name: "price" });
  const type = useWatch({ control, name: "type" });
  const active = useWatch({ control, name: "active" });
  const branchId = useWatch({ control, name: "branchId" });

  const newPrice = Number(price);
  const priceChanged = Boolean(service) && price.trim() !== "" && Number.isFinite(newPrice) && newPrice !== service?.price;
  const deactivating = Boolean(service?.active) && !active;
  const canPickBranch = !service && branchChoices.length > 1;

  const submit = handleSubmit((v) =>
    onSubmit(service?.id, {
      branchId: v.branchId,
      name: { ar: v.nameAr.trim(), en: v.nameEn.trim() },
      description: { ar: v.descriptionAr.trim(), en: v.descriptionEn.trim() },
      category: v.category,
      type: v.type,
      price: Number(v.price),
      durationMin: Number(v.durationMin),
      active: v.active,
      ...(priceChanged && v.reason.trim() ? { reason: v.reason.trim() } : {}),
    }),
  );

  return (
    <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={submit}>
      <div className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4">
        <Section title="الفرع والنوع">
          {canPickBranch ? (
            <Controller
              control={control}
              name="branchId"
              render={({ field }) => (
                <Field label="الفرع" error={errors.branchId?.message}>
                  <div role="radiogroup" aria-label="الفرع" className="flex flex-wrap gap-2">
                    {branchChoices.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        role="radio"
                        aria-checked={field.value === b.id}
                        onClick={() => field.onChange(b.id)}
                        className={cn(
                          "cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                          field.value === b.id ? "border-primary bg-secondary font-medium" : "border-border hover:bg-muted",
                        )}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
            />
          ) : (
            <p className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-xs">
              <span className="text-muted-foreground">الفرع</span>
              <span className="font-medium">{branchName(branchId)}</span>
            </p>
          )}

          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Field label="نوع الخدمة" hint={SERVICE_TYPE_LABEL[type].hint}>
                <div role="radiogroup" aria-label="نوع الخدمة" className="grid h-9 grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                  {(["primary", "addon"] as const).map((v) => (
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
                      {SERVICE_TYPE_LABEL[v].label}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          />

          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Field label="التصنيف" hint="يُستخدم في فلاتر تطبيق العميل وفي تحديد الخدمات المشمولة بالعروض.">
                <div role="radiogroup" aria-label="التصنيف" className="flex flex-wrap gap-2">
                  {Object.entries(SERVICE_CATEGORY).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={field.value === key}
                      onClick={() => field.onChange(key)}
                      className={cn(
                        "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                        field.value === key ? "border-primary/50 bg-secondary text-secondary-foreground" : "border-border hover:bg-muted",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          />
        </Section>

        <Section title="الاسم والوصف" description="يظهران للعملاء بلغة التطبيق.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="svc-name-ar" label="الاسم (عربي)" error={errors.nameAr?.message}>
              <Input
                id="svc-name-ar"
                className="h-9"
                placeholder="غسيل خارجي"
                aria-invalid={Boolean(errors.nameAr)}
                aria-describedby={errors.nameAr ? "svc-name-ar-error" : undefined}
                {...register("nameAr")}
              />
            </Field>
            <Field id="svc-name-en" label="الاسم (English)" error={errors.nameEn?.message}>
              <Input
                id="svc-name-en"
                dir="ltr"
                className="h-9 text-start"
                placeholder="Exterior wash"
                aria-invalid={Boolean(errors.nameEn)}
                aria-describedby={errors.nameEn ? "svc-name-en-error" : undefined}
                {...register("nameEn")}
              />
            </Field>
            <Field id="svc-desc-ar" label={<>الوصف (عربي) <span className="text-muted-foreground">(اختياري)</span></>} error={errors.descriptionAr?.message}>
              <Textarea id="svc-desc-ar" rows={2} className="resize-none" aria-invalid={Boolean(errors.descriptionAr)} {...register("descriptionAr")} />
            </Field>
            <Field id="svc-desc-en" label={<>الوصف (English) <span className="text-muted-foreground">(اختياري)</span></>} error={errors.descriptionEn?.message}>
              <Textarea id="svc-desc-en" dir="ltr" rows={2} className="resize-none text-start" aria-invalid={Boolean(errors.descriptionEn)} {...register("descriptionEn")} />
            </Field>
          </div>
        </Section>

        <Section title="السعر والمدة" description="المدة تحدد حجز المكان في الجدول، وتُجمع مع مدة الإضافات.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="svc-price" label={`السعر (${PRICE_MIN}–${PRICE_MAX} ج.م)`} error={errors.price?.message}>
              <div className="relative">
                <Input
                  id="svc-price"
                  inputMode="numeric"
                  className="num h-9 pe-12"
                  aria-invalid={Boolean(errors.price)}
                  aria-describedby={errors.price ? "svc-price-error" : undefined}
                  {...register("price")}
                />
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ج.م</span>
              </div>
            </Field>
            <Field id="svc-duration" label={`المدة (${DURATION_MIN}–${DURATION_MAX} دقيقة)`} error={errors.durationMin?.message}>
              <div className="relative">
                <Input
                  id="svc-duration"
                  inputMode="numeric"
                  className="num h-9 pe-14"
                  aria-invalid={Boolean(errors.durationMin)}
                  aria-describedby={errors.durationMin ? "svc-duration-error" : undefined}
                  {...register("durationMin")}
                />
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">دقيقة</span>
              </div>
            </Field>
          </div>

          {priceChanged && service ? (
            <div className="space-y-3 rounded-xl border border-warning/40 bg-warning/10 p-3">
              <p className="flex items-start gap-2 text-xs leading-relaxed">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                <span>
                  <span className="font-semibold">يُطبق السعر الجديد على الطلبات الجديدة فقط</span> — الطلبات الحالية والحجوزات المؤكدة تحتفظ بسعرها.
                  التغيير <span className="num">({formatMoney(service.price)} ← {formatMoney(newPrice)})</span> يُسجل في سجل التدقيق.
                </span>
              </p>
              <Field id="svc-reason" label={<>سبب تغيير السعر <span className="text-muted-foreground">(اختياري)</span></>} error={errors.reason?.message}>
                <Textarea id="svc-reason" rows={2} className="resize-none bg-card" placeholder="مثال: زيادة أسعار المواد" {...register("reason")} />
              </Field>
            </div>
          ) : null}
        </Section>

        <Section title="الحالة">
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">{field.value ? "مفعّلة — تظهر للعملاء" : "موقوفة — مخفية عن العملاء"}</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                    لا تُحذف الخدمات: الإيقاف يخفيها من تطبيق العميل وشاشة الطلب الجديد، ويحتفظ بسجل طلباتها وإيراداتها.
                  </span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="تفعيل الخدمة" className="mt-1" />
              </label>
            )}
          />
          {deactivating && service ? (
            <p className="flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <Archive className="mt-0.5 size-3.5 shrink-0" />
              <span>
                ستُخفى «{service.name.ar}» من الحجوزات الجديدة.
                {service.ordersCount ? (
                  <>
                    {" "}
                    طلباتها السابقة (<span className="num">{formatNumber(service.ordersCount)}</span>) تبقى في التقارير والسجل.
                  </>
                ) : null}
                {service.type === "primary" ? " لا يمكن إيقاف آخر خدمة أساسية مفعّلة في الفرع." : null}
              </span>
            </p>
          ) : null}
        </Section>

        {!service ? (
          <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            العروض النشطة على تصنيف الخدمة تُطبق عليها تلقائيًا عند التسعير.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-popover p-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          إلغاء
        </Button>
        <Button type="submit" loading={isPending} disabled={Boolean(service) && !isDirty}>
          {!isPending ? <Save /> : null}
          {service ? "حفظ التعديلات" : "إضافة الخدمة"}
        </Button>
      </div>
    </form>
  );
}
