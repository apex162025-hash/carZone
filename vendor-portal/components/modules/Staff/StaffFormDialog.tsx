"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { CheckCircle2, Copy, Info, KeyRound, UserCog, UserRound } from "lucide-react";

import { ReasonDialog } from "@carzen/ui/components/shared/reason-dialog";
import { Button } from "@carzen/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@carzen/ui/components/ui/dialog";
import { Switch } from "@carzen/ui/components/ui/switch";
import { STAFF_ROLE } from "@carzen/ui/lib/constants/labels";
import { cn } from "@carzen/ui/lib/utils";
import { MAX_DISCOUNT_CAP, PERMISSIONS, defaultPermissions, isEgyptianMobile } from "@/components/modules/Staff/staff-constants";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useCreateStaff, useUpdateStaff } from "@/hooks/use-team";
import type { VendorStaffMember } from "@carzen/contracts/vendor/team";
import type { StaffPermissions } from "@carzen/contracts/washes";

const permissionsSchema = z.object({
  confirmBooking: z.boolean(),
  cancelOrder: z.boolean(),
  closeShift: z.boolean(),
  editServices: z.boolean(),
  refund: z.boolean(),
  collectPayment: z.boolean(),
  runService: z.boolean(),
  manageStaff: z.boolean(),
});

function buildSchema(mode: "create" | "edit", maxPct: number) {
  return z.object({
    name: mode === "create" ? z.string().trim().min(1, "الاسم مطلوب").min(3, "الاسم 3 أحرف على الأقل") : z.string(),
    phone: mode === "create" ? z.string().trim().min(1, "رقم الموبايل مطلوب").refine(isEgyptianMobile, "رقم موبايل مصري غير صحيح (مثال: 01001234567)") : z.string(),
    role: z.enum(["manager", "employee"]),
    branchId: z.string().min(1, "اختر الفرع"),
    maxDiscountPct: z
      .number({ error: "أدخل نسبة صحيحة" })
      .int("أدخل رقمًا صحيحًا")
      .min(0, "الحد الأدنى 0٪")
      .max(maxPct, `الحد الأقصى ${maxPct}٪`),
    permissions: permissionsSchema,
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

type StaffFormDialogProps =
  | { mode: "create"; open: boolean; onOpenChange: (open: boolean) => void; member?: undefined }
  | { mode: "edit"; open: boolean; onOpenChange: (open: boolean) => void; member: VendorStaffMember };

/** Add (OW-11 / MG-09) or edit (owner only) a team member. */
export function StaffFormDialog(props: StaffFormDialogProps) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-xl">
        {/* Popup content unmounts on close → the form starts clean every time it opens. */}
        <StaffForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

const inputClass =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

function StaffForm({ mode, member, onOpenChange }: StaffFormDialogProps) {
  const { account, branches, singleBranchId } = useBranchScope();
  const isOwner = account?.role === "owner";
  /** Managers add employees to their own branch with the default rights (MG-09). */
  const locked = mode === "create" && !isOwner;
  const maxPct = isOwner ? MAX_DISCOUNT_CAP : Math.min(MAX_DISCOUNT_CAP, account?.maxDiscountPct ?? 0);
  const create = useCreateStaff();
  const update = useUpdateStaff(() => onOpenChange(false));
  const [pending, setPending] = useState<FormValues | null>(null);
  const [noChanges, setNoChanges] = useState(false);

  const editRole = member?.role === "manager" ? "manager" : "employee";
  const defaults: FormValues =
    mode === "edit" && member
      ? { name: member.name, phone: member.phone, role: editRole, branchId: member.branchId, maxDiscountPct: member.maxDiscountPct, permissions: { ...member.permissions } }
      : {
          name: "",
          phone: "",
          role: "employee",
          branchId: isOwner ? singleBranchId : account?.homeBranchId ?? singleBranchId,
          maxDiscountPct: Math.min(10, maxPct),
          permissions: defaultPermissions("employee"),
        };

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(buildSchema(mode, maxPct)), defaultValues: defaults });
  const role = useWatch({ control, name: "role" });
  const branchId = useWatch({ control, name: "branchId" });
  const permissions = useWatch({ control, name: "permissions" });
  const discount = useWatch({ control, name: "maxDiscountPct" });

  const setRole = (next: "manager" | "employee") => {
    if (next === role) return;
    setValue("role", next, { shouldDirty: true });
    // Switching role resets the toggles to that role's defaults (owner can fine-tune after).
    setValue("permissions", defaultPermissions(next), { shouldDirty: true });
  };
  const setPermission = (key: keyof StaffPermissions, on: boolean) => setValue("permissions", { ...permissions, [key]: on }, { shouldDirty: true });

  const onSubmit = handleSubmit((values) => {
    if (mode === "create") {
      create.mutate({
        name: values.name.trim(),
        phone: values.phone.trim(),
        role: values.role,
        branchId: values.branchId,
        maxDiscountPct: values.maxDiscountPct,
        permissions: values.permissions,
      });
      return;
    }
    if (!member) return;
    const changed =
      values.role !== member.role ||
      values.branchId !== member.branchId ||
      values.maxDiscountPct !== member.maxDiscountPct ||
      PERMISSIONS.some((p) => values.permissions[p.key] !== member.permissions[p.key]);
    setNoChanges(!changed);
    if (changed) setPending(values);
  });

  // ── Success step: show the temporary password (create) ──
  if (mode === "create" && create.isSuccess && create.data) {
    const password = create.data.message.match(/المؤقتة\s+(\S+)/)?.[1] ?? null;
    return (
      <div className="flex flex-col">
        <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
            <CheckCircle2 className="size-7" />
          </span>
          <DialogTitle className="text-base font-semibold">تمت إضافة {create.data.data.name}</DialogTitle>
          <DialogDescription>
            يدخل تطبيق الموظفين برقم <bdi className="num inline-block font-medium text-foreground" dir="ltr">{create.data.data.phone}</bdi> وكلمة المرور المؤقتة، ثم يغيّرها من حسابه.
          </DialogDescription>
          {password ? (
            <div className="mt-2 flex w-full max-w-xs items-center justify-between gap-3 rounded-xl border border-dashed border-primary/40 bg-secondary/60 px-4 py-3">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <KeyRound className="size-4" /> كلمة المرور المؤقتة
              </span>
              <span className="num text-lg font-bold tracking-wider" dir="ltr">
                {password}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{create.data.message}</p>
          )}
        </div>
        <DialogFooter className="mx-0 mb-0">
          {password ? (
            <Button variant="ghost" onClick={() => void navigator.clipboard?.writeText(password)}>
              <Copy /> نسخ كلمة المرور
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => {
              create.reset();
              reset(defaults);
            }}
          >
            إضافة موظف آخر
          </Button>
          <Button onClick={() => onOpenChange(false)}>تم</Button>
        </DialogFooter>
      </div>
    );
  }

  const isPending = create.isPending || update.isPending;

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-base font-semibold">{mode === "create" ? "إضافة موظف" : `تعديل ${member?.name}`}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "يستلم الموظف كلمة مرور مؤقتة للدخول إلى تطبيق الموظفين."
              : "تغيير الدور أو الفرع أو حد الخصم أو الصلاحيات — يُطلب سبب ويُسجل في سجل التدقيق."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {mode === "create" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="staff-name" className="text-xs font-medium">
                  الاسم <span className="text-destructive">*</span>
                </label>
                <input id="staff-name" autoFocus {...register("name")} aria-invalid={Boolean(errors.name)} className={inputClass} />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="staff-phone" className="text-xs font-medium">
                  رقم الموبايل <span className="text-destructive">*</span>
                </label>
                <input
                  id="staff-phone"
                  inputMode="tel"
                  dir="ltr"
                  placeholder="01xx xxx xxxx"
                  {...register("phone")}
                  aria-invalid={Boolean(errors.phone)}
                  className={cn(inputClass, "num text-start")}
                />
                <FieldError message={errors.phone?.message} />
              </div>
            </div>
          ) : null}

          <fieldset className="space-y-2" disabled={locked}>
            <legend className="mb-2 text-xs font-medium">الدور</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="الدور">
              {([
                ["employee", "ينفذ الخدمات ويحصّل الدفع", UserRound],
                ["manager", "يدير الفرع والورديات والإغلاق", UserCog],
              ] as const).map(([value, hint, Icon]) => {
                const disabled = locked && value === "manager";
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={role === value}
                    disabled={disabled}
                    onClick={() => setRole(value)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                      role === value ? "border-primary bg-secondary" : "border-border hover:bg-muted/60",
                    )}
                  >
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", role === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{STAFF_ROLE[value].label}</span>
                      <span className="block text-[11px] text-muted-foreground">{hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {locked ? <p className="text-[11px] text-muted-foreground">إضافة مدير فرع للمالك فقط.</p> : null}
          </fieldset>

          {branches.length > 1 || mode === "edit" ? (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-medium">الفرع</legend>
              <div className="flex flex-wrap gap-2">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    disabled={locked}
                    onClick={() => setValue("branchId", b.id, { shouldDirty: true, shouldValidate: true })}
                    aria-pressed={branchId === b.id}
                    className={cn(
                      "cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      branchId === b.id ? "border-primary bg-secondary font-medium" : "border-border hover:bg-muted",
                    )}
                  >
                    {b.name.ar}
                  </button>
                ))}
              </div>
              <FieldError message={errors.branchId?.message} />
            </fieldset>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="staff-discount" className="text-xs font-medium">
              حد الخصم المسموح
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-28">
                <input
                  id="staff-discount"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={maxPct}
                  disabled={locked}
                  {...register("maxDiscountPct", { valueAsNumber: true })}
                  aria-invalid={Boolean(errors.maxDiscountPct)}
                  className={cn(inputClass, "num pe-8 text-center font-semibold disabled:opacity-60")}
                />
                <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted-foreground">٪</span>
              </div>
              {!locked
                ? [0, 5, 10, 15, 20].filter((v) => v <= maxPct).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setValue("maxDiscountPct", v, { shouldDirty: true, shouldValidate: true })}
                      aria-pressed={discount === v}
                      className={cn("num cursor-pointer rounded-lg border px-2.5 py-1 text-xs", discount === v ? "border-primary bg-secondary font-medium" : "border-border hover:bg-muted")}
                    >
                      {v}٪
                    </button>
                  ))
                : null}
            </div>
            <FieldError message={errors.maxDiscountPct?.message} />
            <p className="text-[11px] text-muted-foreground">أقصى نسبة خصم يدوي يطبقها على الطلب (0 – {maxPct}٪). يُسجل كل خصم باسمه وسببه.</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-medium">الصلاحيات</legend>
            <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
              {PERMISSIONS.map((p) => {
                const id = `perm-${p.key}`;
                return (
                  <li key={p.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <label htmlFor={id} className={cn("min-w-0", !locked && "cursor-pointer")}>
                      <span className="block text-[13px] font-medium">{p.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{p.hint}</span>
                    </label>
                    <Switch id={id} checked={permissions[p.key]} disabled={locked} onCheckedChange={(on) => setPermission(p.key, on)} aria-label={p.label} />
                  </li>
                );
              })}
            </ul>
            {locked ? (
              <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Info className="mt-px size-3.5 shrink-0" /> تُطبق صلاحيات الموظف الافتراضية وحد خصم {Math.min(10, maxPct)}٪ — يعدّلها المالك لاحقًا.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">تغيير الدور يعيد الصلاحيات للافتراضي: الموظف = تنفيذ الخدمة وتحصيل الدفع، المدير = الكل عدا تعديل الخدمات.</p>
            )}
          </fieldset>

          {noChanges ? (
            <p role="alert" className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              لم تغيّر أي بيانات بعد.
            </p>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button type="submit" loading={create.isPending}>
            {mode === "create" ? "إضافة الموظف" : "حفظ التعديلات"}
          </Button>
        </DialogFooter>
      </form>

      {/* Outside the <form>: React events bubble through portals, a nested submit would re-submit the edit form. */}
      {mode === "edit" && member ? (
        <ReasonDialog
          open={Boolean(pending)}
          onOpenChange={(o) => !o && setPending(null)}
          title={`تأكيد تعديل ${member.name}`}
          description="يُسجل التعديل والسبب في سجل التدقيق مع القيم قبل وبعد."
          textLabel="سبب التعديل"
          minLength={3}
          confirmLabel="حفظ التعديلات"
          isPending={update.isPending}
          onConfirm={({ text }) =>
            pending &&
            update.mutate({
              id: member.id,
              role: pending.role,
              branchId: pending.branchId,
              maxDiscountPct: pending.maxDiscountPct,
              permissions: pending.permissions,
              reason: text,
            })
          }
        >
          {pending ? <ChangeSummary member={member} next={pending} branchName={(id) => branches.find((b) => b.id === id)?.name.ar ?? id} /> : null}
        </ReasonDialog>
      ) : null}
    </>
  );
}

function ChangeSummary({ member, next, branchName }: { member: VendorStaffMember; next: FormValues; branchName: (id: string) => string }) {
  const rows: { label: string; from: string; to: string }[] = [];
  if (next.role !== member.role) rows.push({ label: "الدور", from: STAFF_ROLE[member.role].label, to: STAFF_ROLE[next.role].label });
  if (next.branchId !== member.branchId) rows.push({ label: "الفرع", from: member.branchName.ar, to: branchName(next.branchId) });
  if (next.maxDiscountPct !== member.maxDiscountPct) rows.push({ label: "حد الخصم", from: `${member.maxDiscountPct}٪`, to: `${next.maxDiscountPct}٪` });
  const granted = PERMISSIONS.filter((p) => next.permissions[p.key] && !member.permissions[p.key]).map((p) => p.label);
  const revoked = PERMISSIONS.filter((p) => !next.permissions[p.key] && member.permissions[p.key]).map((p) => p.label);
  return (
    <ul className="space-y-1.5 rounded-xl bg-muted/50 p-3 text-xs">
      {rows.map((r) => (
        <li key={r.label} className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground">{r.label}:</span>
          <span className="line-through opacity-70">{r.from}</span>
          <span aria-hidden>←</span>
          <span className="font-semibold">{r.to}</span>
        </li>
      ))}
      {granted.length ? (
        <li>
          <span className="text-muted-foreground">صلاحيات جديدة: </span>
          <span className="font-medium text-success">{granted.join("، ")}</span>
        </li>
      ) : null}
      {revoked.length ? (
        <li>
          <span className="text-muted-foreground">صلاحيات مسحوبة: </span>
          <span className="font-medium text-destructive">{revoked.join("، ")}</span>
        </li>
      ) : null}
    </ul>
  );
}
