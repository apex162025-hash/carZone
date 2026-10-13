"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Check, Copy, KeyRound, MailPlus, UserPlus } from "lucide-react";

import { RoleRadioCards } from "@/components/modules/Admins/RoleRadioCards";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateAdmin } from "@/hooks/use-admins";
import { ADMIN_ROLE } from "@/lib/constants/labels";
import type { AdminUser } from "@/types/auth";

const schema = z.object({
  name: z.string().trim().min(3, "اكتب الاسم الكامل (3 أحرف على الأقل)"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "البريد الإلكتروني مطلوب")
    .pipe(z.email("صيغة البريد الإلكتروني غير صحيحة")),
  role: z.enum(["super", "operations", "finance", "support"], { error: "اختر دورًا للمسؤول" }),
});

type Values = z.infer<typeof schema>;

type Invited = { admin: AdminUser; tempPassword: string | null; message: string };

type InviteAdminDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Pulls the temporary password out of the API success message, if present. */
function extractTempPassword(message: string) {
  return message.match(/كلمة المرور المؤقتة\s+(\S+)/)?.[1] ?? null;
}

/**
 * AD-43 invite: creates the admin account with a temporary password. The
 * success state repeats the credentials so they can be handed over securely.
 */
export function InviteAdminDialog({ open, onOpenChange }: InviteAdminDialogProps) {
  const create = useCreateAdmin();
  const [invited, setInvited] = useState<Invited | null>(null);
  const [copied, setCopied] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "" },
  });

  const close = (next: boolean) => {
    if (create.isPending) return;
    onOpenChange(next);
    if (!next) {
      // Wait for the close animation before clearing the content.
      window.setTimeout(() => {
        reset({ name: "", email: "" });
        setInvited(null);
        setCopied(false);
        create.reset();
      }, 150);
    }
  };

  const onSubmit = handleSubmit((v) =>
    create.mutate(v, {
      onSuccess: (result) => setInvited({ admin: result.data, tempPassword: extractTempPassword(result.message), message: result.message }),
      onError: (err) => {
        // The error is toasted globally; also pin it to the field it concerns.
        if (/البريد/.test(err.message)) setError("email", { message: err.message });
        else if (/الاسم/.test(err.message)) setError("name", { message: err.message });
        else if (/دور/.test(err.message)) setError("role", { message: err.message });
      },
    }),
  );

  const copyCredentials = async () => {
    if (!invited) return;
    const text = `${invited.admin.email}\n${invited.tempPassword ?? ""}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto sm:max-w-xl">
        {invited ? (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                  <Check className="size-5" />
                </span>
                <div className="space-y-1.5 pt-0.5">
                  <DialogTitle className="text-base font-semibold">تمت دعوة {invited.admin.name}</DialogTitle>
                  <DialogDescription>
                    سلّم بيانات الدخول للمسؤول بطريقة آمنة، واطلب منه تغيير كلمة المرور المؤقتة بعد أول دخول.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-center gap-3">
                <UserAvatar name={invited.admin.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{invited.admin.name}</p>
                  <p className="num truncate text-xs text-muted-foreground" dir="ltr">
                    {invited.admin.email}
                  </p>
                </div>
                <StatusBadge meta={ADMIN_ROLE[invited.admin.role]} size="sm" />
              </div>
              {invited.tempPassword ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2.5">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <KeyRound className="size-4" />
                    كلمة المرور المؤقتة
                  </span>
                  <code className="num rounded-md bg-muted px-2 py-0.5 text-sm font-semibold tracking-wide" dir="ltr">
                    {invited.tempPassword}
                  </code>
                </div>
              ) : (
                <p className="rounded-lg bg-card px-3 py-2.5 text-xs text-muted-foreground">{invited.message}</p>
              )}
            </div>

            <DialogFooter className="-mx-4 -mb-4">
              <Button type="button" variant="outline" onClick={copyCredentials}>
                {copied ? <Check /> : <Copy />}
                {copied ? "تم النسخ" : "نسخ بيانات الدخول"}
              </Button>
              <Button type="button" onClick={() => close(false)}>
                تم
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <MailPlus className="size-5" />
                </span>
                <div className="space-y-1.5 pt-0.5">
                  <DialogTitle className="text-base font-semibold">دعوة مسؤول جديد</DialogTitle>
                  <DialogDescription>
                    يُنشأ الحساب نشطًا بكلمة مرور مؤقتة، وتُطبق عليه صلاحيات الدور المختار فورًا. تُسجل الدعوة في سجل التدقيق.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="invite-name" className="text-xs font-medium">
                    الاسم الكامل
                  </label>
                  <Input
                    id="invite-name"
                    autoComplete="off"
                    placeholder="مثال: Hana Mostafa"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "invite-name-error" : undefined}
                    className="h-9"
                    {...register("name")}
                  />
                  {errors.name ? (
                    <p id="invite-name-error" className="text-xs text-destructive">
                      {errors.name.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="invite-email" className="text-xs font-medium">
                    البريد الإلكتروني للعمل
                  </label>
                  <Input
                    id="invite-email"
                    type="email"
                    dir="ltr"
                    autoComplete="off"
                    placeholder="name@carzen.demo"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "invite-email-error" : undefined}
                    className="num h-9"
                    {...register("email")}
                  />
                  {errors.email ? (
                    <p id="invite-email-error" className="text-xs text-destructive">
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <RoleRadioCards
                    name="invite-role"
                    legend="الدور والصلاحيات"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.role?.message}
                  />
                )}
              />

              <DialogFooter className="-mx-4 -mb-4">
                <Button type="button" variant="outline" onClick={() => close(false)} disabled={create.isPending}>
                  إلغاء
                </Button>
                <Button type="submit" loading={create.isPending}>
                  {!create.isPending ? <UserPlus /> : null}
                  إرسال الدعوة
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
