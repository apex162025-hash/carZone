"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { CalendarRange, Info, PencilLine, Plus, Trash2, Users } from "lucide-react";

import { EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import { Button } from "@carzen/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@carzen/ui/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@carzen/ui/components/ui/sheet";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { STAFF_ROLE, STAFF_STATUS, WEEK_DAYS } from "@carzen/ui/lib/constants/labels";
import { formatNumber, serverNow } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { canEditSchedule, clockToMin, formatClock, shiftsOnDay, weeklyHours } from "@/components/modules/Staff/staff-constants";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useStaff, useUpdateSchedule } from "@/hooks/use-team";
import type { VendorStaffMember } from "@carzen/contracts/vendor/team";
import type { ShiftPattern } from "@carzen/contracts/washes";

// ── Weekly grid (MG-09: employee × day) ─────────────────────

/** Weekly shift grid for one branch: every member × day, with a per-member pattern editor. */
export function ScheduleSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="gap-0 p-0 data-[side=left]:w-full data-[side=left]:sm:max-w-5xl">
        {open ? <ScheduleBody /> : null}
      </SheetContent>
    </Sheet>
  );
}

function ScheduleBody() {
  const { account, branches, singleBranchId, isLocked } = useBranchScope();
  const [branchId, setBranchId] = useState(singleBranchId);
  const [editing, setEditing] = useState<VendorStaffMember | null>(null);
  const { data, isLoading, error, refetch, isFetching } = useStaff({ branchId, role: "all", period: "today" });
  const members = (data?.items ?? [])
    .filter((m) => m.role !== "owner")
    .sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || (a.role === "manager" ? -1 : 0) - (b.role === "manager" ? -1 : 0) || a.name.localeCompare(b.name));
  const today = serverNow().getDay();
  const activeMembers = members.filter((m) => m.status === "active");
  const canEdit = Boolean(account?.permissions.manageStaff);

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle className="flex items-center gap-2 text-lg font-bold">
          <CalendarRange className="size-5 text-primary" /> جدول الورديات الأسبوعي
        </SheetTitle>
        <SheetDescription>
          الوردية المتكررة لكل موظف. يحدد الجدول من يظهر «في الوردية الآن» ومن يمكن تعيينه على الطلبات.
          {canEdit ? " اضغط «تعديل» لتغيير أوقات وأيام أي موظف." : ""}
        </SheetDescription>
        {!isLocked && branches.length > 1 ? (
          <div className="flex flex-wrap gap-2 pt-2" role="radiogroup" aria-label="الفرع">
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={branchId === b.id}
                onClick={() => setBranchId(b.id)}
                className={cn("cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors", branchId === b.id ? "border-primary bg-secondary font-medium" : "border-border hover:bg-muted")}
              >
                {b.name.ar}
              </button>
            ))}
          </div>
        ) : null}
      </SheetHeader>

      <div className="flex-1 overflow-y-auto">
        {isLoading && !data ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : error && !data ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : !members.length ? (
          <EmptyState icon={<Users />} title="لا يوجد موظفون في هذا الفرع" description="أضف موظفين من صفحة الموظفين ثم حدد ورديّاتهم هنا." />
        ) : (
          <div className={cn("overflow-x-auto transition-opacity", isFetching && "opacity-60")}>
            <table className="w-full min-w-[860px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th scope="col" className="sticky top-0 z-10 h-10 border-b border-border bg-muted/80 ps-5 pe-3 text-start text-xs font-medium text-muted-foreground backdrop-blur">
                    الموظف
                  </th>
                  {WEEK_DAYS.map((d, i) => (
                    <th
                      key={d}
                      scope="col"
                      className={cn(
                        "sticky top-0 z-10 h-10 border-b border-border bg-muted/80 px-1.5 text-center text-xs font-medium text-muted-foreground backdrop-blur",
                        i === today && "text-primary",
                      )}
                    >
                      {d}
                      {i === today ? <span className="block text-[10px] font-normal">اليوم</span> : null}
                    </th>
                  ))}
                  <th scope="col" className="sticky top-0 z-10 h-10 border-b border-border bg-muted/80 px-3 pe-5 text-end text-xs font-medium text-muted-foreground backdrop-blur">
                    الساعات
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const editable = canEditSchedule(account, m);
                  return (
                    <tr key={m.id} className={cn("group", m.status !== "active" && "opacity-55")}>
                      <th scope="row" className="border-b border-border/60 py-2.5 ps-5 pe-3 text-start font-normal">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={m.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium">{m.name}</p>
                            <div className="mt-0.5 flex items-center gap-1">
                              <StatusBadge meta={m.status === "active" ? STAFF_ROLE[m.role] : STAFF_STATUS[m.status]} size="sm" />
                            </div>
                          </div>
                          {editable ? (
                            <Button variant="ghost" size="icon-sm" className="ms-auto" aria-label={`تعديل ورديات ${m.name}`} onClick={() => setEditing(m)}>
                              <PencilLine />
                            </Button>
                          ) : null}
                        </div>
                      </th>
                      {WEEK_DAYS.map((d, i) => {
                        const shifts = shiftsOnDay(m.scheduledShifts, i);
                        return (
                          <td key={d} className={cn("border-b border-border/60 px-1 py-1.5 text-center align-middle", i === today && "bg-primary/[0.03]")}>
                            {shifts.length ? (
                              <div className="space-y-1">
                                {shifts.map((s) => (
                                  <span
                                    key={`${s.start}-${s.end}`}
                                    className="num block rounded-md bg-secondary px-1 py-1 text-[11px] leading-tight font-medium text-secondary-foreground"
                                  >
                                    {formatClock(s.start)}
                                    <span className="block text-[10px] font-normal opacity-75">{formatClock(s.end)}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="block rounded-md border border-dashed border-border py-2 text-[11px] text-muted-foreground">راحة</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="num border-b border-border/60 px-3 pe-5 text-end text-xs font-semibold">{formatNumber(weeklyHours(m.scheduledShifts), true)} س</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 text-xs">
                  <th scope="row" className="py-2.5 ps-5 pe-3 text-start font-medium text-muted-foreground">
                    على الوردية
                  </th>
                  {WEEK_DAYS.map((d, i) => {
                    const n = activeMembers.filter((m) => shiftsOnDay(m.scheduledShifts, i).length).length;
                    return (
                      <td key={d} className={cn("num py-2.5 text-center font-semibold", n === 0 && "text-destructive")}>
                        {formatNumber(n)}
                      </td>
                    );
                  })}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {!canEdit ? (
        <p className="flex items-center gap-2 border-t bg-card px-5 py-3 text-xs text-muted-foreground">
          <Info className="size-3.5" /> عرض فقط — تعديل الورديات يحتاج صلاحية «إدارة الموظفين والورديات».
        </p>
      ) : null}

      {editing ? <PatternEditorDialog member={editing} open onOpenChange={(o) => !o && setEditing(null)} /> : null}
    </div>
  );
}

// ── Pattern editor (one member) ─────────────────────────────

const HHMM = /^\d{2}:\d{2}$/;

const scheduleSchema = z
  .object({
    patterns: z.array(
      z
        .object({
          start: z.string().regex(HHMM, "وقت غير صحيح"),
          end: z.string().regex(HHMM, "وقت غير صحيح"),
          days: z.array(z.number().int().min(0).max(6)).min(1, "اختر يومًا واحدًا على الأقل"),
        })
        .refine((p) => !HHMM.test(p.start) || !HHMM.test(p.end) || clockToMin(p.end, true) > clockToMin(p.start), {
          message: "نهاية الوردية يجب أن تكون بعد بدايتها",
          path: ["end"],
        }),
    ),
  })
  .superRefine((v, ctx) => {
    // Two patterns can't overlap on the same day.
    v.patterns.forEach((a, i) => {
      v.patterns.forEach((b, j) => {
        if (j <= i) return;
        const sharedDay = a.days.find((d) => b.days.includes(d));
        if (sharedDay === undefined) return;
        const overlap = clockToMin(a.start) < clockToMin(b.end, true) && clockToMin(b.start) < clockToMin(a.end, true);
        if (overlap) ctx.addIssue({ code: "custom", path: ["patterns", j, "days"], message: `تتداخل مع الوردية ${i + 1} يوم ${WEEK_DAYS[sharedDay]}` });
      });
    });
  });

type ScheduleValues = z.infer<typeof scheduleSchema>;

const PRESETS: { label: string; start: string; end: string }[] = [
  { label: "صباحي", start: "09:00", end: "17:00" },
  { label: "مسائي", start: "15:00", end: "23:00" },
  { label: "كامل", start: "09:00", end: "23:00" },
];

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function PatternEditorDialog({ member, open, onOpenChange }: { member: VendorStaffMember; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <PatternEditorForm member={member} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PatternEditorForm({ member, onDone }: { member: VendorStaffMember; onDone: () => void }) {
  const save = useUpdateSchedule(onDone);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { patterns: member.scheduledShifts.map((p) => ({ start: p.start, end: p.end, days: [...p.days] })) },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "patterns" });
  const patterns = useWatch({ control, name: "patterns" });

  const toggleDay = (index: number, day: number) => {
    const days = patterns[index]?.days ?? [];
    setValue(`patterns.${index}.days`, days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort(), { shouldValidate: true });
  };
  const validPatterns = (patterns ?? []).filter((p) => HHMM.test(p.start) && HHMM.test(p.end) && clockToMin(p.end, true) > clockToMin(p.start)) as ShiftPattern[];

  const onSubmit = handleSubmit((values) => save.mutate({ id: member.id, shifts: values.patterns.map((p) => ({ start: p.start, end: p.end, days: [...p.days].sort() })) }));

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-h-[calc(100dvh-2rem)] flex-col">
      <DialogHeader className="border-b px-5 py-4">
        <DialogTitle className="text-base font-semibold">ورديات {member.name}</DialogTitle>
        <DialogDescription>حدد وقت البداية والنهاية والأيام. يمكن إضافة أكثر من نمط (مثلًا صباحي أيام الأسبوع ومسائي الجمعة).</DialogDescription>
      </DialogHeader>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {fields.map((field, index) => {
          const err = errors.patterns?.[index];
          const days = patterns?.[index]?.days ?? [];
          return (
            <fieldset key={field.id} aria-label={`الوردية ${index + 1}`} className="space-y-3 rounded-xl border border-border/80 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">الوردية {formatNumber(index + 1)}</p>
                <div className="flex items-center gap-1">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setValue(`patterns.${index}.start`, p.start, { shouldValidate: true });
                        setValue(`patterns.${index}.end`, p.end, { shouldValidate: true });
                      }}
                      className="cursor-pointer rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {p.label}
                    </button>
                  ))}
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`حذف الوردية ${index + 1}`} onClick={() => remove(index)}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor={`p-${field.id}-start`} className="text-[11px] text-muted-foreground">
                    من
                  </label>
                  <input
                    id={`p-${field.id}-start`}
                    type="time"
                    step={900}
                    {...register(`patterns.${index}.start`)}
                    aria-invalid={Boolean(err?.start)}
                    className="num h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 aria-invalid:border-destructive"
                  />
                  {err?.start?.message ? <p className="text-[11px] text-destructive">{err.start.message}</p> : null}
                </div>
                <div className="space-y-1">
                  <label htmlFor={`p-${field.id}-end`} className="text-[11px] text-muted-foreground">
                    إلى
                  </label>
                  <input
                    id={`p-${field.id}-end`}
                    type="time"
                    step={900}
                    {...register(`patterns.${index}.end`)}
                    aria-invalid={Boolean(err?.end)}
                    className="num h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 aria-invalid:border-destructive"
                  />
                  {err?.end?.message ? <p className="text-[11px] text-destructive">{err.end.message}</p> : null}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">الأيام</span>
                  <button
                    type="button"
                    onClick={() => setValue(`patterns.${index}.days`, days.length === 7 ? [] : ALL_DAYS, { shouldValidate: true })}
                    className="cursor-pointer text-[11px] font-medium text-primary hover:underline"
                  >
                    {days.length === 7 ? "إلغاء الكل" : "كل الأيام"}
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1" role="group" aria-label="أيام الوردية">
                  {WEEK_DAYS.map((d, day) => {
                    const on = days.includes(day);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleDay(index, day)}
                        className={cn(
                          "cursor-pointer truncate rounded-md border px-0.5 py-1.5 text-[11px] font-medium transition-colors",
                          on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                {err?.days?.message ? <p className="text-[11px] text-destructive">{err.days.message}</p> : null}
              </div>
            </fieldset>
          );
        })}

        {!fields.length ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            لا توجد ورديات — سيظهر الموظف «راحة» طوال الأسبوع ولن يظهر في الوردية.
          </p>
        ) : null}

        <Button type="button" variant="outline" className="w-full" onClick={() => append({ start: "09:00", end: "17:00", days: [] })}>
          <Plus /> إضافة وردية
        </Button>
      </div>

      <DialogFooter className="mx-0 mb-0 items-center">
        <span className="num me-auto text-xs text-muted-foreground">إجمالي {formatNumber(weeklyHours(validPatterns), true)} ساعة أسبوعيًا</span>
        <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
          إلغاء
        </Button>
        <Button type="submit" loading={save.isPending}>
          حفظ الجدول
        </Button>
      </DialogFooter>
    </form>
  );
}
