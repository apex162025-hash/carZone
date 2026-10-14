"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { CalendarCog, Save } from "lucide-react";

import { SelectFilter } from "@carzen/ui/components/shared/select-filter";
import { Button } from "@carzen/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@carzen/ui/components/ui/dialog";
import { Input } from "@carzen/ui/components/ui/input";
import { Switch } from "@carzen/ui/components/ui/switch";
import { Textarea } from "@carzen/ui/components/ui/textarea";
import { formatDuration } from "@carzen/ui/lib/format";
import { Unit, unitInputClass } from "@/components/modules/Branches/form-bits";
import { useUpdateBookingRules } from "@/hooks/use-catalog";
import type { BranchSettings } from "@carzen/contracts/washes";
import type { VendorBranch } from "@carzen/contracts/vendor/catalog";

export const SLOT_INTERVALS = [15, 20, 30, 45, 60] as const;

const intIn = (min: number, max: number, label: string) =>
  z.string().refine((v) => /^\d+$/.test(v.trim()) && Number(v) >= min && Number(v) <= max, `${label} بين ${min} و ${max}`);

const schema = z.object({
  autoConfirm: z.boolean(),
  slotIntervalMin: z.enum(["15", "20", "30", "45", "60"]),
  leadTimeMin: intIn(0, 240, "مهلة الحجز"),
  maxAdvanceDays: intIn(1, 30, "أقصى أيام مسبقة"),
  freeCancelMin: intIn(0, 1440, "نافذة الإلغاء المجاني"),
  noShowGraceMin: intIn(5, 120, "مهلة عدم الحضور"),
  reminderMin: intIn(5, 1440, "توقيت التذكير"),
  reason: z.string().trim().min(3, "اكتب سبب التعديل (3 أحرف على الأقل)").max(200, "200 حرف كحد أقصى"),
});

type Values = z.infer<typeof schema>;
type NumericKey = "leadTimeMin" | "maxAdvanceDays" | "freeCancelMin" | "noShowGraceMin" | "reminderMin";

const NUMERIC_RULES: { key: NumericKey; label: string; explain: string; unit: string; min: number; max: number; minutes: boolean }[] = [
  { key: "leadTimeMin", label: "مهلة الحجز المسبق", explain: "أقل وقت بين لحظة الحجز وموعد الخدمة — يمنع حجز موعد يبدأ فورًا.", unit: "دقيقة", min: 0, max: 240, minutes: true },
  { key: "maxAdvanceDays", label: "أقصى حجز مقدمًا", explain: "إلى كم يوم قادم يستطيع العميل اختيار موعد.", unit: "يوم", min: 1, max: 30, minutes: false },
  { key: "freeCancelMin", label: "نافذة الإلغاء المجاني", explain: "يستطيع العميل الإلغاء مجانًا حتى هذا الوقت قبل الموعد.", unit: "دقيقة", min: 0, max: 1440, minutes: true },
  { key: "noShowGraceMin", label: "مهلة عدم الحضور", explain: "بعد مرور هذه المدة من الموعد يمكن تسجيل الحجز «لم يحضر» وتحرير المكان.", unit: "دقيقة", min: 5, max: 120, minutes: true },
  { key: "reminderMin", label: "توقيت التذكير", explain: "يصل للعميل تذكير بالموعد قبل بدايته بهذه المدة.", unit: "دقيقة", min: 5, max: 1440, minutes: true },
];

function defaultsFor(s: BranchSettings): Values {
  const interval = String(s.slotIntervalMin) as Values["slotIntervalMin"];
  return {
    autoConfirm: s.autoConfirm,
    slotIntervalMin: (SLOT_INTERVALS as readonly number[]).includes(s.slotIntervalMin) ? interval : "30",
    leadTimeMin: String(s.leadTimeMin),
    maxAdvanceDays: String(s.maxAdvanceDays),
    freeCancelMin: String(s.freeCancelMin),
    noShowGraceMin: String(s.noShowGraceMin),
    reminderMin: String(s.reminderMin),
    reason: "",
  };
}

type BookingRulesDialogProps = {
  branch: VendorBranch | null;
  onOpenChange: (open: boolean) => void;
};

/** OW-12: per-branch booking rules, saved to `branch.settings` and reflected in the customer app. */
export function BookingRulesDialog({ branch, onOpenChange }: BookingRulesDialogProps) {
  return (
    <Dialog open={Boolean(branch)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-xl">
        {branch ? <RulesForm branch={branch} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function RulesForm({ branch, onDone }: { branch: VendorBranch; onDone: () => void }) {
  const save = useUpdateBookingRules(onDone);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaultsFor(branch.settings) });
  const values = useWatch({ control });
  const pending = save.isPending;
  const intervalChanged = values.slotIntervalMin !== undefined && Number(values.slotIntervalMin) !== branch.settings.slotIntervalMin;

  const submit = handleSubmit((v) =>
    save.mutate({
      id: branch.id,
      settings: {
        autoConfirm: v.autoConfirm,
        slotIntervalMin: Number(v.slotIntervalMin),
        leadTimeMin: Number(v.leadTimeMin),
        maxAdvanceDays: Number(v.maxAdvanceDays),
        freeCancelMin: Number(v.freeCancelMin),
        noShowGraceMin: Number(v.noShowGraceMin),
        reminderMin: Number(v.reminderMin),
      },
      reason: v.reason.trim(),
    }),
  );

  return (
    <form
      noValidate
      className="flex max-h-[92vh] min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <DialogHeader className="border-b border-border/60 p-4 pe-12">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <CalendarCog className="size-5" />
          </span>
          <div className="space-y-1 pt-0.5">
            <DialogTitle className="text-base font-semibold">قواعد الحجز</DialogTitle>
            <DialogDescription className="text-xs">{branch.name.ar} — تنعكس في تطبيق العميل فور الحفظ.</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto px-4">
        <Controller
          control={control}
          name="autoConfirm"
          render={({ field }) => (
            <label className="flex cursor-pointer items-start justify-between gap-4 py-3.5">
              <span>
                <span className="block text-sm font-medium">التأكيد التلقائي</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {field.value ? "حجوزات التطبيق تُؤكد فورًا دون تدخل من الفرع." : "كل حجز من التطبيق ينتظر تأكيد الفرع يدويًا."}
                </span>
              </span>
              <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="التأكيد التلقائي" />
            </label>
          )}
        />

        <div className="grid items-center gap-2 py-3.5 sm:grid-cols-[minmax(0,1fr)_160px] sm:gap-4">
          <div>
            <p className="text-sm font-medium">مدة الفترة</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              طول كل فترة في الجدول ومواعيد الحجز.
              {intervalChanged ? <span className="text-warning"> سيتغير شكل الجدول؛ الحجوزات القائمة لا تتأثر.</span> : null}
            </p>
          </div>
          <Controller
            control={control}
            name="slotIntervalMin"
            render={({ field }) => (
              <SelectFilter
                aria-label="مدة الفترة"
                className="num w-full"
                value={field.value}
                onChange={(v) => field.onChange(v)}
                options={SLOT_INTERVALS.map((m) => ({ value: String(m), label: `${m} دقيقة` }))}
              />
            )}
          />
        </div>

        {NUMERIC_RULES.map((r) => {
          const raw = values[r.key];
          const n = Number(raw);
          const err = errors[r.key]?.message;
          const pretty = r.minutes && raw && /^\d+$/.test(raw) && n >= 60 ? formatDuration(n) : null;
          return (
            <div key={r.key} className="grid items-start gap-2 py-3.5 sm:grid-cols-[minmax(0,1fr)_160px] sm:gap-4">
              <div>
                <label htmlFor={`rule-${r.key}`} className="text-sm font-medium">
                  {r.label}
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.explain}</p>
              </div>
              <div className="space-y-1">
                <div className="relative">
                  <Input
                    id={`rule-${r.key}`}
                    type="number"
                    inputMode="numeric"
                    min={r.min}
                    max={r.max}
                    aria-invalid={Boolean(err)}
                    className={unitInputClass}
                    {...register(r.key)}
                  />
                  <Unit>{r.unit}</Unit>
                </div>
                {err ? (
                  <p className="text-xs text-destructive">{err}</p>
                ) : (
                  <p className="num text-[11px] text-muted-foreground">
                    {r.min}–{r.max}
                    {pretty ? ` · ${pretty}` : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        <div className="space-y-2 py-3.5">
          <label htmlFor="rules-reason" className="text-sm font-medium">
            سبب التعديل <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="rules-reason"
            rows={2}
            placeholder="مثال: تقليل الإلغاءات المتأخرة"
            className="resize-none"
            aria-invalid={Boolean(errors.reason)}
            {...register("reason")}
          />
          {errors.reason ? <p className="text-xs text-destructive">{errors.reason.message}</p> : <p className="text-[11px] text-muted-foreground">يُسجل في سجل التدقيق.</p>}
        </div>
      </div>

      <DialogFooter className="m-0 border-t">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          إلغاء
        </Button>
        <Button type="submit" loading={pending}>
          {!pending ? <Save /> : null}
          حفظ القواعد
        </Button>
      </DialogFooter>
    </form>
  );
}
