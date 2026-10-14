"use client";

import { useEffect, useState } from "react";
import { Check, KeyRound, Table2, X } from "lucide-react";

import { SaveReasonDialog, SettingsSaveBar } from "@/components/modules/Settings/SettingsSaveBar";
import { SectionCard } from "@carzen/ui/components/shared/section-card";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { Switch } from "@carzen/ui/components/ui/switch";
import { STAFF_ROLE } from "@carzen/ui/lib/constants/labels";
import { formatPercent } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { useUpdateSettings } from "@/hooks/use-catalog";
import type { VendorSettings } from "@carzen/contracts/vendor/catalog";
import type { StaffPermissions } from "@carzen/contracts/washes";

const PERMISSION_LABEL: Record<keyof StaffPermissions, { label: string; hint: string }> = {
  confirmBooking: { label: "تأكيد الحجوزات", hint: "قبول حجوزات التطبيق والهاتف" },
  cancelOrder: { label: "إلغاء الطلبات", hint: "مع سبب يُسجل في التدقيق" },
  closeShift: { label: "إغلاق الوردية", hint: "تسليم النقدية ومراجعة الفروق" },
  editServices: { label: "تعديل الخدمات والأسعار", hint: "إضافة خدمة، تغيير سعر، إيقاف" },
  refund: { label: "الاسترداد", hint: "رد مبلغ طلب مدفوع" },
  collectPayment: { label: "تحصيل الدفع", hint: "نقدي أو بطاقة" },
  runService: { label: "تنفيذ الخدمة", hint: "بدء وإكمال الخدمة على السيارة" },
  manageStaff: { label: "إدارة الموظفين", hint: "الورديات والتعيين في الفرع" },
};

const PERMISSION_ORDER = Object.keys(PERMISSION_LABEL) as (keyof StaffPermissions)[];

function Mark({ on, highlight }: { on: boolean; highlight?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full transition-colors",
        on ? "bg-success/12 text-success" : "bg-muted text-muted-foreground/70",
        highlight && "ring-2 ring-warning/50",
      )}
    >
      {on ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
      <span className="sr-only">{on ? "مسموح" : "غير مسموح"}</span>
    </span>
  );
}

type PermissionsTabProps = {
  managerCanEditServices: boolean;
  roleMatrix: VendorSettings["roleMatrix"];
  readOnly: boolean;
  onDirtyChange: (dirty: boolean) => void;
};

export function PermissionsTab({ managerCanEditServices, roleMatrix, readOnly, onDirtyChange }: PermissionsTabProps) {
  const [value, setValue] = useState(managerCanEditServices);
  const [reasonOpen, setReasonOpen] = useState(false);
  const update = useUpdateSettings(() => setReasonOpen(false));
  const dirty = value !== managerCanEditServices;

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  return (
    <div className="space-y-4">
      <SectionCard icon={<KeyRound />} title="صلاحيات مديري الفروع" description="تسري على كل مديري الفروع في المغسلة فور الحفظ.">
        <label className={cn("flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors", value ? "border-primary/30 bg-secondary/40" : "border-border", !readOnly && "cursor-pointer")}>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">السماح لمديري الفروع بتعديل الخدمات والأسعار</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              {value
                ? "المدير يستطيع إضافة الخدمات وتعديل أسعارها ومددها وإيقافها في فرعه — كل تغيير يُسجل باسمه."
                : "المدير يرى قائمة الخدمات والأسعار للعرض فقط، والتعديل لك وحدك."}
            </span>
          </span>
          <Switch checked={value} onCheckedChange={setValue} disabled={readOnly} aria-label="السماح لمديري الفروع بتعديل الخدمات والأسعار" className="mt-1" />
        </label>
      </SectionCard>

      {!readOnly ? <SettingsSaveBar dirty={dirty} changeCount={dirty ? 1 : 0} isPending={update.isPending} onReset={() => setValue(managerCanEditServices)} onSave={() => setReasonOpen(true)} /> : null}

      <SectionCard
        flush
        icon={<Table2 />}
        title="مصفوفة الصلاحيات"
        description="ما يستطيعه كل دور افتراضيًا (مرجع للعرض). صلاحيات الموظف الفردية تُعدل من صفحة الموظفين."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <caption className="sr-only">صلاحيات المالك ومدير الفرع والموظف</caption>
            <thead>
              <tr className="border-y border-border/60 bg-muted/40 text-xs text-muted-foreground">
                <th scope="col" className="px-5 py-2.5 text-start font-medium">
                  الصلاحية
                </th>
                {roleMatrix.map((r) => (
                  <th key={r.role} scope="col" className="px-3 py-2.5 text-center font-medium">
                    <StatusBadge meta={STAFF_ROLE[r.role]} size="sm" className="mx-auto" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {PERMISSION_ORDER.map((key) => (
                <tr key={key} className="hover:bg-muted/30">
                  <th scope="row" className="px-5 py-2.5 text-start font-normal">
                    <span className="block font-medium">{PERMISSION_LABEL[key].label}</span>
                    <span className="block text-[11px] text-muted-foreground">{PERMISSION_LABEL[key].hint}</span>
                  </th>
                  {roleMatrix.map((r) => {
                    // The manager's "edit services" follows the switch above (live preview before saving).
                    const live = key === "editServices" && r.role === "manager";
                    const on = live ? value : r.permissions[key];
                    return (
                      <td key={r.role} className="px-3 py-2.5 text-center">
                        <Mark on={on} highlight={live && dirty} />
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-muted/20">
                <th scope="row" className="px-5 py-2.5 text-start font-normal">
                  <span className="block font-medium">أقصى خصم يدوي</span>
                  <span className="block text-[11px] text-muted-foreground">على الطلب الواحد، مع سبب</span>
                </th>
                {roleMatrix.map((r) => (
                  <td key={r.role} className="num px-3 py-2.5 text-center font-semibold">
                    {r.maxDiscountPct >= 100 ? "بلا حد" : formatPercent(r.maxDiscountPct)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        {dirty ? (
          <p className="border-t border-border/60 px-5 py-2.5 text-[11px] text-warning">صلاحية «تعديل الخدمات» للمدير معروضة بالقيمة الجديدة قبل الحفظ.</p>
        ) : null}
      </SectionCard>

      <SaveReasonDialog
        open={reasonOpen}
        onOpenChange={setReasonOpen}
        sectionLabel="صلاحيات المديرين"
        impact={
          value
            ? "سيتمكن كل مديري الفروع من تعديل الخدمات والأسعار في فروعهم فورًا."
            : "ستصبح الخدمات والأسعار للعرض فقط لكل مديري الفروع فورًا."
        }
        isPending={update.isPending}
        onConfirm={(reason) => update.mutate({ managerCanEditServices: value, reason })}
      />
    </div>
  );
}
