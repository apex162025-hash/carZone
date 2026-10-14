"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { AlertTriangle, Ban, Info } from "lucide-react";

import { SelectFilter } from "@carzen/ui/components/shared/select-filter";
import { Button } from "@carzen/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@carzen/ui/components/ui/dialog";
import { Textarea } from "@carzen/ui/components/ui/textarea";
import { formatDuration, formatTime } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { addMinutes, fullDayLabel, overlaps } from "@/components/modules/Schedule/schedule-utils";
import { useCreateBlock } from "@/hooks/use-operations";
import type { ScheduleDay } from "@carzen/contracts/vendor/operations";

const REASONS = ["صيانة معدات", "نقص في العمالة", "تنظيف وتعقيم الفرع", "حجز جماعي / حدث خاص", "انقطاع مياه أو كهرباء"];

const schema = z
  .object({
    start: z.string().min(1, "اختر بداية الفترة"),
    end: z.string().min(1, "اختر نهاية الفترة"),
    reason: z.string().trim().min(3, "اكتب سبب الحجب (3 أحرف على الأقل)").max(160, "160 حرف كحد أقصى"),
  })
  .refine((v) => !v.start || !v.end || new Date(v.end) > new Date(v.start), { path: ["end"], message: "نهاية الفترة يجب أن تكون بعد بدايتها" });

type Values = z.infer<typeof schema>;

type BlockSlotDialogProps = {
  day: ScheduleDay;
  branchName: string;
  /** Pre-selected slot start (clicked from the grid). */
  initialStart: string | null;
  onOpenChange: (open: boolean) => void;
};

/** MG-05: remove a time range from customer availability, with a reason. Mounted only while open. */
export function BlockSlotDialog({ day, branchName, initialStart, onOpenChange }: BlockSlotDialogProps) {
  const step = day.slotIntervalMin;
  const lastSlot = day.slots[day.slots.length - 1];
  const dayEnd = lastSlot ? addMinutes(lastSlot.start, step) : "";
  const startOptions = day.slots.filter((s) => !s.past).map((s) => s.start);
  const firstStart = initialStart && startOptions.includes(initialStart) ? initialStart : startOptions[0] ?? "";

  const create = useCreateBlock(() => onOpenChange(false));
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { start: firstStart, end: firstStart ? addMinutes(firstStart, step) : "", reason: "" },
  });

  const start = useWatch({ control, name: "start" });
  const end = useWatch({ control, name: "end" });
  const reason = useWatch({ control, name: "reason" });

  const endCandidates = [...day.slots.slice(1).map((s) => s.start), dayEnd].filter(Boolean);
  const endOptions = endCandidates.filter((e) => !start || new Date(e) > new Date(start));
  const endLabel = (iso: string) => (iso === dayEnd ? `${formatTime(iso)} (نهاية اليوم)` : formatTime(iso));

  /** Snap "start + N minutes" to the first available end on the grid (capped at closing time). */
  const snapEnd = (from: string, minutes: number) => {
    const target = new Date(addMinutes(from, minutes));
    return endCandidates.find((e) => new Date(e) >= target) ?? dayEnd;
  };

  const affected = new Set(
    day.slots.filter((s) => start && end && overlaps(s.start, addMinutes(s.start, step), start, end)).flatMap((s) => s.orders.map((o) => o.id)),
  ).size;
  const clashing = day.blocks.filter((b) => start && end && overlaps(b.start, b.end, start, end));
  const durationMin = start && end ? (new Date(end).getTime() - new Date(start).getTime()) / 60_000 : 0;

  const presets = [
    { label: "فترة واحدة", minutes: step },
    { label: "ساعة", minutes: 60 },
    { label: "ساعتين", minutes: 120 },
    { label: "حتى نهاية اليوم", minutes: 24 * 60 },
  ];

  const submit = handleSubmit((v) => create.mutate({ branchId: day.branchId, start: v.start, end: v.end, reason: v.reason.trim() }));
  const pending = create.isPending;

  return (
    <Dialog open onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Ban className="size-5" />
            </span>
            <div className="space-y-1.5 pt-0.5">
              <DialogTitle className="text-base font-semibold">حجب فترة</DialogTitle>
              <DialogDescription className="leading-relaxed">
                {branchName} · {fullDayLabel(day.date)} — الفترة المحجوبة تختفي من تطبيق العميل فورًا ولا تُقبل فيها حجوزات جديدة.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {startOptions.length ? (
          <form
            id="block-slot-form"
            noValidate
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs font-medium">من</p>
                <Controller
                  control={control}
                  name="start"
                  render={({ field }) => (
                    <SelectFilter
                      aria-label="بداية الفترة"
                      className="num w-full"
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                        if (!end || new Date(end) <= new Date(v)) setValue("end", addMinutes(v, step), { shouldValidate: true });
                      }}
                      options={startOptions.map((s) => ({ value: s, label: formatTime(s) }))}
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium">إلى</p>
                <Controller
                  control={control}
                  name="end"
                  render={({ field }) => (
                    <SelectFilter
                      aria-label="نهاية الفترة"
                      className="num w-full"
                      value={field.value}
                      onChange={field.onChange}
                      options={endOptions.map((e) => ({ value: e, label: endLabel(e) }))}
                    />
                  )}
                />
                {errors.end ? <p className="text-xs text-destructive">{errors.end.message}</p> : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {presets.map((p) => {
                const target = start ? snapEnd(start, p.minutes) : "";
                return (
                  <button
                    key={p.label}
                    type="button"
                    disabled={!start}
                    aria-pressed={Boolean(target) && target === end}
                    onClick={() => setValue("end", target, { shouldValidate: true })}
                    className={cn(
                      "cursor-pointer rounded-lg border px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      target && target === end ? "border-primary bg-secondary font-medium" : "border-border hover:bg-muted",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
              {durationMin > 0 ? <span className="num ms-auto text-xs text-muted-foreground">المدة {formatDuration(durationMin)}</span> : null}
            </div>

            {affected || clashing.length ? (
              <div className="space-y-1.5 rounded-xl bg-warning/10 px-3 py-2.5 text-xs text-foreground [&_svg]:text-warning">
                {affected ? (
                  <p className="flex items-start gap-2">
                    <AlertTriangle className="mt-px size-3.5 shrink-0" />
                    <span>
                      يوجد <span className="num font-semibold">{affected}</span> حجز قائم في هذه الفترة — لن يُلغى تلقائيًا، تابعه من صفحة الحجوزات.
                    </span>
                  </p>
                ) : null}
                {clashing.length ? (
                  <p className="flex items-start gap-2">
                    <Info className="mt-px size-3.5 shrink-0" />
                    <span>
                      تتداخل مع فترة محجوبة بالفعل ({clashing.map((b) => `${formatTime(b.start)} – ${formatTime(b.end)}`).join("، ")}).
                    </span>
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="block-reason" className="text-xs font-medium">
                السبب <span className="text-destructive">*</span> <span className="font-normal text-muted-foreground">(يُسجل في سجل التدقيق)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={reason === r}
                    onClick={() => setValue("reason", r, { shouldValidate: true })}
                    className={cn("cursor-pointer rounded-lg border px-2.5 py-1 text-xs", reason === r ? "border-primary bg-secondary" : "border-border hover:bg-muted")}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Textarea
                id="block-reason"
                rows={2}
                placeholder="أو اكتب السبب…"
                className="resize-none"
                aria-invalid={Boolean(errors.reason)}
                {...register("reason")}
              />
              {errors.reason ? <p className="text-xs text-destructive">{errors.reason.message}</p> : null}
            </div>
          </form>
        ) : (
          <p className="rounded-xl bg-muted/60 px-3 py-4 text-center text-xs text-muted-foreground">انتهت كل فترات هذا اليوم — اختر يومًا قادمًا لحجب فترة فيه.</p>
        )}

        <DialogFooter className="-mx-4 -mb-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            إلغاء
          </Button>
          <Button type="submit" form="block-slot-form" loading={pending} disabled={!startOptions.length}>
            {!pending ? <Ban /> : null}
            حجب الفترة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
