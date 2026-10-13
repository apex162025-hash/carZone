"use client";

import { useState } from "react";
import { CalendarClock, EyeOff } from "lucide-react";

import { ReasonDialog } from "@/components/shared/reason-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useSuspendWash, useSuspensionImpact } from "@/hooks/use-washes";
import { ORDER_STATUS, SUSPEND_REASON } from "@/lib/constants/labels";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { SuspendReason } from "@/types/washes";

type SuspendWashDialogProps = {
  washId: string;
  washName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * AD-21 + "suspension impact preview": shows the upcoming bookings that would
 * be affected and lets the admin keep or cancel them.
 */
export function SuspendWashDialog({ washId, washName, open, onOpenChange }: SuspendWashDialogProps) {
  const [cancelUpcoming, setCancelUpcoming] = useState(false);
  const impact = useSuspensionImpact(washId, open);
  const suspend = useSuspendWash(washId);
  const upcoming = impact.data?.upcomingOrders ?? [];

  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`تعليق ${washName}`}
      description="التعليق فوري: تختفي المغسلة من نتائج البحث في تطبيق العميل ولا تستقبل حجوزات جديدة، ويتم إبلاغ المالك."
      presets={Object.entries(SUSPEND_REASON).map(([value, label]) => ({ value, label }))}
      presetLabel="سبب التعليق"
      textLabel="ملاحظة توضيحية (تُرسل للمالك وتُسجل)"
      confirmLabel="تأكيد التعليق"
      variant="destructive"
      isPending={suspend.isPending}
      onConfirm={({ preset, text }) =>
        suspend.mutate(
          { reason: preset as SuspendReason, note: text, cancelUpcoming },
          { onSuccess: () => onOpenChange(false) },
        )
      }
    >
      <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="size-4 text-warning" />
            تأثير التعليق
          </p>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <EyeOff className="size-3.5" />
            {impact.data ? `${impact.data.activeBranches} فروع ستُخفى` : "…"}
          </span>
        </div>
        {impact.isLoading ? (
          <Skeleton className="h-16 rounded-lg" />
        ) : upcoming.length ? (
          <>
            <p className="text-xs text-muted-foreground">
              يوجد <span className="num font-semibold text-foreground">{upcoming.length}</span> حجز قادم لدى المغسلة:
            </p>
            <ul className="max-h-32 space-y-1.5 overflow-y-auto">
              {upcoming.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-card px-2.5 py-2 text-xs">
                  <span className="num font-semibold">{o.number}</span>
                  <span className="truncate text-muted-foreground">{o.branchName.ar}</span>
                  <span className="num text-muted-foreground">{formatDateTime(o.scheduledAt)}</span>
                  <span className="num">{formatMoney(o.total)}</span>
                  <StatusBadge meta={ORDER_STATUS[o.status]} size="sm" />
                </li>
              ))}
            </ul>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-card px-3 py-2.5">
              <span className="text-xs">
                <span className="block font-medium">إلغاء الحجوزات القادمة</span>
                <span className="text-muted-foreground">سيتم إبلاغ العملاء بالإلغاء. إن تركتها، تبقى قائمة كما هي.</span>
              </span>
              <Switch checked={cancelUpcoming} onCheckedChange={setCancelUpcoming} aria-label="إلغاء الحجوزات القادمة" />
            </label>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">لا توجد حجوزات قادمة — لن يتأثر أي عميل.</p>
        )}
      </div>
    </ReasonDialog>
  );
}
