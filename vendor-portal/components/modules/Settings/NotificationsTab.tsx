"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { BellRing, Lock } from "lucide-react";

import { SaveReasonDialog, SettingsSaveBar } from "@/components/modules/Settings/SettingsSaveBar";
import { SectionCard } from "@carzen/ui/components/shared/section-card";
import { Switch } from "@carzen/ui/components/ui/switch";
import { VENDOR_NOTIFICATION_TYPE } from "@carzen/ui/lib/constants/labels";
import { cn } from "@carzen/ui/lib/utils";
import { useUpdateSettings } from "@/hooks/use-catalog";
import type { VendorNotificationType } from "@carzen/contracts/vendor/catalog";

type Prefs = Record<VendorNotificationType, boolean>;

const DESCRIPTION: Record<VendorNotificationType, string> = {
  new_booking: "عند وصول حجز جديد من التطبيق أو بالهاتف.",
  booking_cancelled: "عند إلغاء عميل لحجز قادم.",
  cash_difference: "عند إغلاق وردية بفرق بين النقدية المتوقعة والمستلمة.",
  high_cancellation: "عند ارتفاع الإلغاءات أو عدم الحضور في أحد الفروع.",
  branch_issue: "تأخير متكرر في الخدمة، امتلاء السعة أو فرع متوقف.",
  daily_summary: "ملخص أرقام اليوم لكل فرع بعد الإغلاق.",
  review: "تقييمات العملاء الجديدة، خاصة المنخفضة منها.",
  platform: "رسائل كارزن الرسمية: حالة الحساب، السياسات والتحديثات.",
  payout: "عند تجهيز مستحقاتك أو تحويلها.",
};

const ORDER: VendorNotificationType[] = ["new_booking", "booking_cancelled", "cash_difference", "high_cancellation", "branch_issue", "review", "daily_summary", "payout", "platform"];

/** Carzen messages can't be muted (suspension notices, policy changes). */
const ALWAYS_ON: VendorNotificationType = "platform";

type NotificationsTabProps = {
  value: Prefs;
  readOnly: boolean;
  onDirtyChange: (dirty: boolean) => void;
};

export function NotificationsTab({ value, readOnly, onDirtyChange }: NotificationsTabProps) {
  const [prefs, setPrefs] = useState<Prefs>({ ...value, [ALWAYS_ON]: true });
  const [reasonOpen, setReasonOpen] = useState(false);
  const update = useUpdateSettings(() => setReasonOpen(false));

  const changed = ORDER.filter((t) => t !== ALWAYS_ON && prefs[t] !== value[t]);
  const dirty = changed.length > 0;
  const enabledCount = ORDER.filter((t) => prefs[t]).length;

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  return (
    <div className="space-y-4">
      <SectionCard
        flush
        icon={<BellRing />}
        title="تفضيلات الإشعارات"
        description={`${enabledCount} من ${ORDER.length} أنواع مفعّلة — تصل داخل البوابة (الجرس وصفحة الإشعارات).`}
      >
        <ul className="divide-y divide-border/60 border-t border-border/60">
          {ORDER.map((type) => {
            const meta = VENDOR_NOTIFICATION_TYPE[type];
            const locked = type === ALWAYS_ON;
            const disabled = readOnly || locked;
            return (
              <li key={type}>
                <label className={cn("flex items-center gap-4 px-5 py-3.5 transition-colors", !disabled && "cursor-pointer hover:bg-muted/30")}>
                  <span style={{ "--tone": meta.tone } as CSSProperties} className="tone-soft flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <span className="tone-dot size-2 rounded-full" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {meta.label}
                      {locked ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                          <Lock className="size-3" /> مفعّل دائمًا
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {DESCRIPTION[type]}
                      {locked ? " لا يمكن إيقافها لأنها تخص حسابك وقدرتك على استقبال الطلبات." : null}
                    </span>
                  </span>
                  <Switch
                    checked={prefs[type]}
                    disabled={disabled}
                    onCheckedChange={(on) => setPrefs((p) => ({ ...p, [type]: on }))}
                    aria-label={`إشعارات ${meta.label}`}
                  />
                </label>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      {!readOnly ? (
        <SettingsSaveBar dirty={dirty} changeCount={changed.length} isPending={update.isPending} onReset={() => setPrefs({ ...value, [ALWAYS_ON]: true })} onSave={() => setReasonOpen(true)} />
      ) : null}

      <SaveReasonDialog
        open={reasonOpen}
        onOpenChange={setReasonOpen}
        sectionLabel="تفضيلات الإشعارات"
        impact={
          <>
            {changed.map((t) => `${prefs[t] ? "تفعيل" : "إيقاف"} «${VENDOR_NOTIFICATION_TYPE[t].label}»`).join("، ")}. يسري على إشعارات المغسلة من الآن.
          </>
        }
        isPending={update.isPending}
        onConfirm={(reason) => update.mutate({ notificationPrefs: { ...prefs, [ALWAYS_ON]: true }, reason })}
      />
    </div>
  );
}
