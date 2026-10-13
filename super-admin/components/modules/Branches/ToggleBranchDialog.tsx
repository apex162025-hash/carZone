"use client";

import { AlertTriangle } from "lucide-react";

import { ReasonDialog } from "@/components/shared/reason-dialog";
import { useToggleBranch } from "@/hooks/use-washes";
import { BUSINESS_STATUS } from "@/lib/constants/labels";
import type { BranchListItem } from "@/types/washes";

type ToggleBranchDialogProps = {
  branch: BranchListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** AD-23: activate / deactivate a branch with a mandatory, audited reason. */
export function ToggleBranchDialog({ branch, open, onOpenChange }: ToggleBranchDialogProps) {
  const toggle = useToggleBranch();
  if (!branch) return null;

  const activating = !branch.active;
  const businessHidden = activating && branch.businessStatus !== "active";

  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={activating ? `تفعيل ${branch.name.ar}` : `إيقاف ${branch.name.ar}`}
      description={
        activating
          ? "سيعود الفرع للظهور في تطبيق العميل ويستقبل حجوزات جديدة فورًا."
          : "يختفي الفرع من تطبيق العميل ولا يستقبل حجوزات جديدة. الحجوزات القائمة تبقى كما هي."
      }
      textLabel={activating ? "سبب التفعيل (يُسجل في سجل التدقيق)" : "سبب الإيقاف (يُسجل في سجل التدقيق)"}
      textPlaceholder={activating ? "مثال: انتهت أعمال الصيانة وعاد الفرع للعمل" : "مثال: الفرع مغلق مؤقتًا للصيانة"}
      confirmLabel={activating ? "تفعيل الفرع" : "إيقاف الفرع"}
      variant={activating ? "default" : "destructive"}
      isPending={toggle.isPending}
      onConfirm={({ text }) =>
        toggle.mutate({ id: branch.id, active: activating, reason: text }, { onSuccess: () => onOpenChange(false) })
      }
    >
      {businessHidden ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs">
          <AlertTriangle className="mt-px size-4 shrink-0 text-warning" />
          <p className="leading-relaxed">
            المغسلة <span className="font-semibold">{branch.businessName.ar}</span> حالتها «{BUSINESS_STATUS[branch.businessStatus].label}» — لن
            يظهر الفرع للعملاء حتى تصبح المغسلة نشطة.
          </p>
        </div>
      ) : null}
    </ReasonDialog>
  );
}
