"use client";

import { useState } from "react";
import { AlertTriangle, UserCog } from "lucide-react";

import { RoleRadioCards } from "@/components/modules/Admins/RoleRadioCards";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUpdateAdmin } from "@/hooks/use-admins";
import { ADMIN_ROLE } from "@/lib/constants/labels";
import type { AdminRole, AdminUser } from "@/types/auth";

type ChangeRoleDialogProps = {
  admin: AdminUser;
  /** True when this admin is the only active Super Admin left. */
  isLastSuper: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** AD-43 change role: permissions follow the roles matrix immediately. */
export function ChangeRoleDialog({ admin, isLastSuper, open, onOpenChange }: ChangeRoleDialogProps) {
  const update = useUpdateAdmin();
  const [picked, setPicked] = useState<AdminRole | null>(null);
  const role = picked ?? admin.role;
  const unchanged = role === admin.role;
  const demotingLastSuper = isLastSuper && role !== "super";

  const handleOpenChange = (next: boolean) => {
    if (update.isPending) return;
    onOpenChange(next);
    if (!next) {
      window.setTimeout(() => {
        setPicked(null);
        update.reset();
      }, 150);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unchanged) return;
    update.mutate({ id: admin.id, role }, { onSuccess: () => handleOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <UserCog className="size-5" />
            </span>
            <div className="space-y-1.5 pt-0.5">
              <DialogTitle className="text-base font-semibold">تغيير دور {admin.name}</DialogTitle>
              <DialogDescription>
                الدور الحالي: {ADMIN_ROLE[admin.role].label}. تتغير القائمة الجانبية والصلاحيات المتاحة للمسؤول فورًا وفق مصفوفة الأدوار، ويُسجل
                التغيير في سجل التدقيق.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <RoleRadioCards
            name={`role-${admin.id}`}
            legend="الدور الجديد"
            value={role}
            currentRole={admin.role}
            onChange={(r) => {
              setPicked(r);
              if (update.isError) update.reset();
            }}
          />

          {demotingLastSuper ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <p>
                <span className="font-semibold">{admin.name} هو آخر Super Admin نشط.</span> يجب أن يبقى على المنصة Super Admin واحد على الأقل —
                عيّن مسؤولًا آخر كـ Super Admin أولًا.
              </p>
            </div>
          ) : null}

          {update.isError ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {update.error.message}
            </p>
          ) : null}

          <DialogFooter className="-mx-4 -mb-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={update.isPending}>
              إلغاء
            </Button>
            <Button type="submit" loading={update.isPending} disabled={unchanged}>
              حفظ الدور
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
