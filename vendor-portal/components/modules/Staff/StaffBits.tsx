"use client";

import { Check, Minus } from "lucide-react";

import { Button } from "@carzen/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@carzen/ui/components/ui/dialog";
import { STAFF_ROLE } from "@carzen/ui/lib/constants/labels";
import { formatDuration } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { PERMISSIONS, defaultPermissions } from "@/components/modules/Staff/staff-constants";
import type { StaffRole } from "@carzen/contracts/washes";

/** Average duration vs expected — colored when the member is slower than the services' expected time. */
export function DurationVsExpected({ avg, expected, align = "end" }: { avg: number | null; expected: number | null; align?: "start" | "end" }) {
  if (avg === null) return <span className="text-muted-foreground">—</span>;
  const slowerPct = expected ? ((avg - expected) / expected) * 100 : 0;
  const tone = slowerPct > 15 ? "text-destructive" : slowerPct > 0 ? "text-warning" : "text-success";
  return (
    <span className={cn("num inline-flex flex-col leading-tight", align === "end" ? "items-end" : "items-start")}>
      <span className={cn("font-semibold", tone)} title={slowerPct > 0 ? "أبطأ من المتوقع" : "ضمن الوقت المتوقع"}>
        {formatDuration(avg)}
      </span>
      {expected !== null ? <span className="text-[11px] font-normal text-muted-foreground">متوقع {formatDuration(expected)}</span> : null}
    </span>
  );
}

const ROLES: StaffRole[] = ["owner", "manager", "employee"];

/** Read-only view of the default wash permission matrix (spec 02 §4 / OW-11). */
export function PermissionMatrixDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">مصفوفة الصلاحيات</DialogTitle>
          <DialogDescription>
            الصلاحيات الافتراضية لكل دور. يمكن للمالك تخصيص صلاحيات كل شخص من ملفه، والنظام يرفض أي إجراء خارج صلاحيات صاحبه.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-4 overflow-x-auto">
          <table className="w-full min-w-[440px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/60 text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 text-start font-medium">
                  الصلاحية
                </th>
                {ROLES.map((r) => (
                  <th key={r} scope="col" className="px-3 py-2 text-center font-medium">
                    {STAFF_ROLE[r].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p.key} className="border-b border-border/60 last:border-b-0">
                  <th scope="row" className="px-4 py-2 text-start font-normal">
                    <span className="block text-[13px] font-medium">{p.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{p.hint}</span>
                  </th>
                  {ROLES.map((r) => {
                    const on = defaultPermissions(r)[p.key];
                    return (
                      <td key={r} className="px-3 py-2 text-center">
                        {on ? (
                          <Check className="mx-auto size-4 text-success" aria-label="مسموح" />
                        ) : (
                          <Minus className="mx-auto size-4 text-muted-foreground/60" aria-label="غير مسموح" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">مدير الفرع لا يستطيع تغيير الأدوار أو حدود الخصم أو الصلاحيات أو نقل الموظفين بين الفروع.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
